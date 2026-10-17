import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { API_URL } from '../config/api.config';
import {
  Commande,
  LIBELLES_STATUT_COMMANDE,
  StatutCommande,
  TRANSITIONS_COMMANDE,
} from '../models/commande.model';
import { LigneArticle } from '../models/ligne-article.model';
import { ModePaiement } from '../models/vente.model';
import { VenteService } from './vente.service';
import { maintenantLocal } from '../utils/date.utils';

export interface NouvelleCommande {
  clientNom: string;
  clientTelephone: string;
  employeId: number;
  lignes: LigneArticle[];
  acompte: number;
  modeAcompte: ModePaiement;
  sessionId?: number; // la caisse qui encaisse l'acompte
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CommandeService {
  private http = inject(HttpClient);
  private venteService = inject(VenteService);
  private url = `${API_URL}/commandes`;

  getAll(): Observable<Commande[]> {
    return this.http.get<Commande[]>(this.url);
  }

  getById(id: number): Observable<Commande> {
    return this.http.get<Commande>(`${this.url}/${id}`);
  }

  /** Les commandes dont l'acompte a été encaissé pendant une session de caisse. */
  getBySession(sessionId: number): Observable<Commande[]> {
    return this.http.get<Commande[]>(this.url, { params: { sessionId } });
  }

  creer(demande: NouvelleCommande): Observable<Commande> {
    return this.getAll().pipe(
      switchMap((commandes) => {
        if (demande.lignes.length === 0) {
          throw new Error('La commande est vide.');
        }

        // Le total est recalculé ici, à partir des lignes
        const total = demande.lignes.reduce(
          (somme, l) => somme + l.prixUnitaire * l.quantite,
          0,
        );

        if (demande.acompte < 0 || demande.acompte > total) {
          throw new Error(
            "L'acompte doit être compris entre 0 et le total de la commande.",
          );
        }
        if (demande.acompte > 0 && !demande.sessionId) {
          throw new Error("Ouvre ta caisse avant d'encaisser un acompte.");
        }

        const date = maintenantLocal();
        const nouvelle: Omit<Commande, 'id'> = {
          numero: this.numeroSuivant(commandes, date),
          date,
          ...demande,
          total,
          statut: 'NOUVELLE',
        };
        return this.http.post<Commande>(this.url, nouvelle);
      }),
    );
  }

  /** Confirmer, marquer prête ou annuler. (La livraison passe par `livrer`.) */
  changerStatut(
    id: number,
    nouveauStatut: StatutCommande,
  ): Observable<Commande> {
    return this.getById(id).pipe(
      switchMap((commande) => {
        if (nouveauStatut === 'LIVREE') {
          throw new Error(
            'Une commande se livre avec le bouton « Livrer et encaisser ».',
          );
        }
        if (!TRANSITIONS_COMMANDE[commande.statut].includes(nouveauStatut)) {
          throw new Error(
            `Opération impossible : la commande est déjà « ${LIBELLES_STATUT_COMMANDE[commande.statut].toLowerCase()} ».`,
          );
        }
        return this.http.patch<Commande>(`${this.url}/${id}`, {
          statut: nouveauStatut,
        });
      }),
    );
  }

  /**
   * Livre une commande prête : encaisse le solde, crée la vente (qui sort le stock),
   * puis passe la commande à « Livrée » en gardant le lien vers la vente.
   */
  livrer(
    id: number,
    modePaiement: ModePaiement,
    montantRecu: number | undefined,
    employeId: number,
    sessionId?: number,
  ): Observable<Commande> {
    return this.getById(id).pipe(
      switchMap((commande) => {
        if (commande.statut !== 'PRETE') {
          throw new Error('Seule une commande prête peut être livrée.');
        }
        if (commande.total - commande.acompte > 0 && !sessionId) {
          throw new Error("Ouvre ta caisse avant d'encaisser le solde.");
        }

        return this.venteService
          .encaisser({
            lignes: commande.lignes,
            modePaiement,
            employeId,
            montantRecu,
            sessionId,
            commandeId: commande.id,
            acompteVerse: commande.acompte,
          })
          .pipe(
            switchMap((vente) =>
              this.http.patch<Commande>(`${this.url}/${id}`, {
                statut: 'LIVREE',
                venteId: vente.id,
              }),
            ),
          );
      }),
    );
  }

  /** C-2026-0001, C-2026-0002... basé sur le plus grand numéro existant de l'année. */
  private numeroSuivant(commandes: Commande[], date: string): string {
    const prefixe = `C-${date.slice(0, 4)}-`;
    const dernier = commandes
      .filter((c) => c.numero.startsWith(prefixe))
      .map((c) => Number(c.numero.slice(prefixe.length)))
      .reduce((max, n) => Math.max(max, n), 0);
    return `${prefixe}${String(dernier + 1).padStart(4, '0')}`;
  }
}
