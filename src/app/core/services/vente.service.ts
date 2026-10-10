import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, switchMap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { LigneArticle } from '../models/ligne-article.model';
import { ModePaiement, Vente } from '../models/vente.model';
import { StockService } from './stock.service';
import { maintenantLocal } from '../utils/date.utils';
import { stockParProduit } from '../utils/stock.utils';

export interface DemandeVente {
  lignes: LigneArticle[];
  modePaiement: ModePaiement;
  employeId: number;
  montantRecu?: number;
}

@Injectable({ providedIn: 'root' })
export class VenteService {
  private http = inject(HttpClient);
  private stockService = inject(StockService);
  private url = `${API_URL}/ventes`;

  getAll(): Observable<Vente[]> {
    return this.http.get<Vente[]>(this.url);
  }

  /**
   * Encaisse une vente :
   * 1. relit le stock réel, 2. enregistre la vente, 3. crée une sortie de stock par article.
   */
  encaisser(demande: DemandeVente): Observable<Vente> {
    return forkJoin({
      mouvements: this.stockService.getMouvements(),
      ventes: this.getAll(),
    }).pipe(
      switchMap(({ mouvements, ventes }) => {
        const { lignes, modePaiement, employeId, montantRecu } = demande;

        if (lignes.length === 0) {
          throw new Error('Le panier est vide.');
        }

        // 1. Contrôle du stock au dernier moment
        const stocks = stockParProduit(mouvements);
        for (const ligne of lignes) {
          const disponible = stocks.get(ligne.produitId) ?? 0;
          if (ligne.quantite > disponible) {
            throw new Error(
              `Stock insuffisant pour « ${ligne.nomProduit} » : ${disponible} disponible(s).`,
            );
          }
        }

        // 2. Numéro de vente : V-2026-0001, V-2026-0002...
        const date = maintenantLocal();
        const annee = date.slice(0, 4);
        const rang =
          ventes.filter((v) => v.numero.startsWith(`V-${annee}-`)).length + 1;
        const numero = `V-${annee}-${String(rang).padStart(4, '0')}`;

        // Le total est recalculé ici à partir des lignes
        const total = lignes.reduce(
          (somme, l) => somme + l.prixUnitaire * l.quantite,
          0,
        );

        const nouvelleVente: Omit<Vente, 'id'> = {
          numero,
          date,
          employeId,
          lignes,
          total,
          modePaiement,
          montantRecu,
          statut: 'PAYEE',
        };

        // 3. Vente, puis une sortie de stock par article
        return this.http.post<Vente>(this.url, nouvelleVente).pipe(
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
}
