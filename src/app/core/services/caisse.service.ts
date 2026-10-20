import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, switchMap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { SessionCaisse } from '../models/session-caisse.model';
import { calculerTotaux } from '../utils/caisse.utils';
import { maintenantLocal } from '../utils/date.utils';
import { CommandeService } from './commande.service';
import { MouvementCaisseService } from './mouvement-caisse.service';
import { VenteService } from './vente.service';

@Injectable({ providedIn: 'root' })
export class CaisseService {
  private http = inject(HttpClient);
  private venteService = inject(VenteService);
  private commandeService = inject(CommandeService);
  private mouvementsCaisse = inject(MouvementCaisseService);
  private url = `${API_URL}/sessions`;

  getAll(): Observable<SessionCaisse[]> {
    return this.http.get<SessionCaisse[]>(this.url);
  }

  getById(id: number): Observable<SessionCaisse> {
    return this.http.get<SessionCaisse>(`${this.url}/${id}`);
  }

  /** La session ouverte d'un employé, ou null s'il n'en a pas. */
  getOuverte(employeId: number): Observable<SessionCaisse | null> {
    return this.http
      .get<
        SessionCaisse[]
      >(this.url, { params: { employeId, statut: 'OUVERTE' } })
      .pipe(map((liste) => liste[0] ?? null));
  }

  ouvrir(employeId: number, fondInitial: number): Observable<SessionCaisse> {
    return this.getOuverte(employeId).pipe(
      switchMap((existante) => {
        if (existante) {
          throw new Error('Une caisse est déjà ouverte pour cet employé.');
        }
        if (fondInitial < 0) {
          throw new Error('Le fond de caisse ne peut pas être négatif.');
        }
        const nouvelle: Omit<SessionCaisse, 'id'> = {
          employeId,
          dateOuverture: maintenantLocal(),
          fondInitial,
          statut: 'OUVERTE',
        };
        return this.http.post<SessionCaisse>(this.url, nouvelle);
      }),
    );
  }

  /** Clôture : calcule les totaux, les enregistre, et mesure l'écart avec les espèces comptées. */
  /** Clôture : calcule les totaux, les enregistre, et mesure l'écart avec les espèces comptées. */
  cloturer(
    id: number,
    montantCompte: number,
    commentaire?: string,
  ): Observable<SessionCaisse> {
    return forkJoin({
      session: this.getById(id),
      ventes: this.venteService.getBySession(id),
      commandes: this.commandeService.getBySession(id),
      mouvements: this.mouvementsCaisse.getBySession(id),
    }).pipe(
      switchMap(({ session, ventes, commandes, mouvements }) => {
        if (session.statut !== 'OUVERTE') {
          throw new Error('Cette caisse est déjà clôturée.');
        }
        if (montantCompte < 0) {
          throw new Error('Le montant compté ne peut pas être négatif.');
        }

        const totaux = calculerTotaux(session, ventes, commandes, mouvements);

        return this.http.patch<SessionCaisse>(`${this.url}/${id}`, {
          statut: 'CLOTUREE',
          dateCloture: maintenantLocal(),
          encaissements: totaux.parMode,
          nombreVentes: totaux.nombreVentes,
          nombreAcomptes: totaux.nombreAcomptes,
          entreesCaisse: totaux.entrees,
          sortiesCaisse: totaux.sorties,
          montantAttendu: totaux.especesAttendues,
          montantCompte,
          ecart: montantCompte - totaux.especesAttendues,
          commentaire,
        });
      }),
    );
  }
}
