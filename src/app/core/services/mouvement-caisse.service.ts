import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { API_URL } from '../config/api.config';
import { MouvementCaisse } from '../models/mouvement-caisse.model';

@Injectable({ providedIn: 'root' })
export class MouvementCaisseService {
  private http = inject(HttpClient);
  private url = `${API_URL}/mouvementsCaisse`;

  getAll(): Observable<MouvementCaisse[]> {
    return this.http.get<MouvementCaisse[]>(this.url);
  }

  getBySession(sessionId: number): Observable<MouvementCaisse[]> {
    return this.http.get<MouvementCaisse[]>(this.url, {
      params: { sessionId },
    });
  }

  creer(mouvement: Omit<MouvementCaisse, 'id'>): Observable<MouvementCaisse> {
    if (!(mouvement.montant > 0)) {
      return throwError(
        () => new Error('Le montant doit être supérieur à zéro.'),
      );
    }
    return this.http.post<MouvementCaisse>(this.url, mouvement);
  }
}
