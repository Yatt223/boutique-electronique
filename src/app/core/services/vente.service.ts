import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { LigneArticle } from '../models/ligne-article.model';
import { MotifMouvement } from '../models/mouvement-stock.model';
import {
  LIBELLES_STATUT,
  ModePaiement,
  StatutVente,
  TRANSITIONS,
  Vente,
} from '../models/vente.model';
import { StockService } from './stock.service';
import { maintenantLocal } from '../utils/date.utils';
import { stockParProduit } from '../utils/stock.utils';

export interface DemandeVente {
  lignes: LigneArticle[];
  modePaiement: ModePaiement;
  employeId: number;
  montantRecu?: number;
  venteId?: number; // renseigné quand on reprend une vente en attente
  sessionId?: number; // la session de caisse qui encaisse
}

@Injectable({ providedIn: 'root' })
export class VenteService {
  private http = inject(HttpClient);
  private stockService = inject(StockService);
  private url = `${API_URL}/ventes`;

  getAll(): Observable<Vente[]> {
    return this.http.get<Vente[]>(this.url);
  }

  getById(id: number): Observable<Vente> {
    return this.http.get<Vente>(`${this.url}/${id}`);
  }

  getEnAttente(): Observable<Vente[]> {
    return this.http.get<Vente[]>(this.url, {
      params: { statut: 'EN_ATTENTE' },
    });
  }

  getBySession(sessionId: number): Observable<Vente[]> {
    return this.http.get<Vente[]>(this.url, { params: { sessionId } });
  }

  /** Met un panier de côté : aucune sortie de stock, aucun encaissement. */
  mettreEnAttente(demande: DemandeVente): Observable<Vente> {
    return this.getAll().pipe(
      switchMap((ventes) => {
        const { lignes, modePaiement, employeId, venteId } = demande;

        if (lignes.length === 0) {
          throw new Error('Le panier est vide.');
        }
        const date = maintenantLocal();
        const total = this.calculerTotal(lignes);

        if (venteId) {
          return this.http.patch<Vente>(`${this.url}/${venteId}`, {
            lignes,
            total,
            date,
            modePaiement,
          });
        }

        const nouvelle: Omit<Vente, 'id'> = {
          numero: this.numeroSuivant(ventes, date),
          date,
          employeId,
          lignes,
          total,
          modePaiement,
          statut: 'EN_ATTENTE',
        };
        return this.http.post<Vente>(this.url, nouvelle);
      }),
    );
  }

  /**
   * Encaisse une vente (nouvelle, ou reprise d'une vente en attente) :
   * 1. relit le stock réel, 2. enregistre la vente, 3. crée une sortie de stock par article.
   */
  encaisser(demande: DemandeVente): Observable<Vente> {
    return forkJoin({
      mouvements: this.stockService.getMouvements(),
      ventes: this.getAll(),
    }).pipe(
      switchMap(({ mouvements, ventes }) => {
        const {
          lignes,
          modePaiement,
          employeId,
          montantRecu,
          venteId,
          sessionId,
        } = demande;

        if (lignes.length === 0) {
          throw new Error('Le panier est vide.');
        }

        // Une reprise n'est possible que si la vente est toujours en attente
        const existante = venteId
          ? ventes.find((v) => v.id === venteId)
          : undefined;
        if (venteId && existante?.statut !== 'EN_ATTENTE') {
          throw new Error("Cette vente n'est plus en attente.");
        }

        // Contrôle du stock au dernier moment
        const stocks = stockParProduit(mouvements);
        for (const ligne of lignes) {
          const disponible = stocks.get(ligne.produitId) ?? 0;
          if (ligne.quantite > disponible) {
            throw new Error(
              `Stock insuffisant pour « ${ligne.nomProduit} » : ${disponible} disponible(s).`,
            );
          }
        }

        const date = maintenantLocal();
        const total = this.calculerTotal(lignes);

        const enregistrement$: Observable<Vente> = existante
          ? this.http.patch<Vente>(`${this.url}/${existante.id}`, {
              lignes,
              total,
              date,
              modePaiement,
              montantRecu,
              employeId,
              sessionId,
              statut: 'PAYEE',
            })
          : this.http.post<Vente>(this.url, {
              numero: this.numeroSuivant(ventes, date),
              date,
              employeId,
              lignes,
              total,
              modePaiement,
              montantRecu,
              sessionId,
              statut: 'PAYEE',
            } as Omit<Vente, 'id'>);

        return enregistrement$.pipe(
          switchMap((vente) =>
            forkJoin(
              lignes.map((l) =>
                this.stockService.creerMouvement({
                  produitId: l.produitId,
                  type: 'SORTIE',
                  quantite: l.quantite,
                  motif: 'VENTE',
                  date,
                  employeId,
                  venteId: vente.id,
                }),
              ),
            ).pipe(map(() => vente)),
          ),
        );
      }),
    );
  }

  annuler(venteId: number, employeId: number): Observable<Vente> {
    return this.changerStatut(
      venteId,
      'ANNULEE',
      'ANNULATION_VENTE',
      employeId,
    );
  }

  rembourser(venteId: number, employeId: number): Observable<Vente> {
    return this.changerStatut(
      venteId,
      'REMBOURSEE',
      'RETOUR_CLIENT',
      employeId,
    );
  }

  /**
   * Change le statut d'une vente. Si elle était payée, les articles retournent en stock.
   * La vente est relue sur le serveur pour éviter un double traitement.
   */
  private changerStatut(
    venteId: number,
    nouveauStatut: StatutVente,
    motif: MotifMouvement,
    employeId: number,
  ): Observable<Vente> {
    return this.getById(venteId).pipe(
      switchMap((vente) => {
        if (!TRANSITIONS[vente.statut].includes(nouveauStatut)) {
          throw new Error(
            `Opération impossible : la vente est déjà « ${LIBELLES_STATUT[vente.statut].toLowerCase()} ».`,
          );
        }

        const date = maintenantLocal();
        const retours$: Observable<unknown> =
          vente.statut === 'PAYEE'
            ? forkJoin(
                vente.lignes.map((l) =>
                  this.stockService.creerMouvement({
                    produitId: l.produitId,
                    type: 'ENTREE',
                    quantite: l.quantite,
                    motif,
                    date,
                    employeId,
                    venteId: vente.id,
                  }),
                ),
              )
            : of(null);

        return retours$.pipe(
          switchMap(() =>
            this.http.patch<Vente>(`${this.url}/${vente.id}`, {
              statut: nouveauStatut,
            }),
          ),
        );
      }),
    );
  }

  private calculerTotal(lignes: LigneArticle[]): number {
    return lignes.reduce((somme, l) => somme + l.prixUnitaire * l.quantite, 0);
  }

  /** V-2026-0001, V-2026-0002... basé sur le plus grand numéro existant de l'année. */
  private numeroSuivant(ventes: Vente[], date: string): string {
    const prefixe = `V-${date.slice(0, 4)}-`;
    const dernier = ventes
      .filter((v) => v.numero.startsWith(prefixe))
      .map((v) => Number(v.numero.slice(prefixe.length)))
      .reduce((max, n) => Math.max(max, n), 0);
    return `${prefixe}${String(dernier + 1).padStart(4, '0')}`;
  }
}
