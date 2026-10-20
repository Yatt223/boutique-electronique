import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, switchMap, throwError } from 'rxjs';
import { API_URL } from '../config/api.config';
import { CategorieDepense, Depense } from '../models/depense.model';
import { ModePaiement } from '../models/vente.model';
import { maintenantLocal } from '../utils/date.utils';
import { MouvementCaisseService } from './mouvement-caisse.service';

export interface NouvelleDepense {
  date: string;
  libelle: string;
  montant: number;
  categorie: CategorieDepense;
  modePaiement: ModePaiement;
  employeId: number;
  sessionId?: number; // la caisse qui paie (obligatoire en espèces)
  justificatifUrl?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class DepenseService {
  private http = inject(HttpClient);
  private mouvementsCaisse = inject(MouvementCaisseService);
  private url = `${API_URL}/depenses`;

  getAll(): Observable<Depense[]> {
    return this.http.get<Depense[]>(this.url);
  }

  getById(id: number): Observable<Depense> {
    return this.http.get<Depense>(`${this.url}/${id}`);
  }

  /** Enregistre une dépense. En espèces, elle sort aussi de la caisse. */
  creer(demande: NouvelleDepense): Observable<Depense> {
    if (!(demande.montant > 0)) {
      return throwError(
        () => new Error('Le montant doit être supérieur à zéro.'),
      );
    }
    if (demande.modePaiement === 'ESPECES' && !demande.sessionId) {
      return throwError(
        () =>
          new Error(
            "Ouvre ta caisse avant d'enregistrer une dépense en espèces.",
          ),
      );
    }

    const nouvelle: Omit<Depense, 'id'> = {
      ...demande,
      sessionId:
        demande.modePaiement === 'ESPECES' ? demande.sessionId : undefined,
      statut: 'VALIDEE',
    };

    return this.http.post<Depense>(this.url, nouvelle).pipe(
      switchMap((depense) =>
        depense.modePaiement === 'ESPECES' && depense.sessionId
          ? this.mouvementsCaisse
              .creer({
                sessionId: depense.sessionId,
                type: 'SORTIE',
                montant: depense.montant,
                motif: 'DEPENSE',
                date: maintenantLocal(),
                employeId: depense.employeId,
                depenseId: depense.id,
                commentaire: depense.libelle,
              })
              .pipe(map(() => depense))
          : of(depense),
      ),
    );
  }

  /** Annule une dépense. Payée en espèces, l'argent revient dans la caisse en cours. */
  annuler(
    id: number,
    employeId: number,
    sessionId?: number,
  ): Observable<Depense> {
    return this.getById(id).pipe(
      switchMap((depense) => {
        if (depense.statut !== 'VALIDEE') {
          throw new Error('Cette dépense est déjà annulée.');
        }

        const enEspeces = depense.modePaiement === 'ESPECES';
        if (enEspeces && !sessionId) {
          throw new Error(
            'Ouvre ta caisse pour annuler une dépense payée en espèces.',
          );
        }

        const retour$: Observable<unknown> =
          enEspeces && sessionId
            ? this.mouvementsCaisse.creer({
                sessionId,
                type: 'ENTREE',
                montant: depense.montant,
                motif: 'ANNULATION_DEPENSE',
                date: maintenantLocal(),
                employeId,
                depenseId: depense.id,
                commentaire: depense.libelle,
              })
            : of(null);

        return retour$.pipe(
          switchMap(() =>
            this.http.patch<Depense>(`${this.url}/${id}`, {
              statut: 'ANNULEE',
            }),
          ),
        );
      }),
    );
  }
}
