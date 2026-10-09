import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { MouvementStock } from '../models/mouvement-stock.model';
import { stockParProduit } from '../utils/stock.utils';

@Injectable({ providedIn: 'root' })
export class StockService {
  private http = inject(HttpClient);
  private url = `${API_URL}/mouvements`;

  getMouvements(): Observable<MouvementStock[]> {
    return this.http.get<MouvementStock[]>(this.url);
  }

  getMouvementsProduit(produitId: number): Observable<MouvementStock[]> {
    return this.http.get<MouvementStock[]>(this.url, { params: { produitId } });
  }

  /** Stock actuel d'UN produit, recalculé depuis ses mouvements. */
  stockActuel(produitId: number): Observable<number> {
    return this.getMouvementsProduit(produitId).pipe(
      map(mouvements => stockParProduit(mouvements).get(produitId) ?? 0)
    );
  }

  creerMouvement(mouvement: Omit<MouvementStock, 'id'>): Observable<MouvementStock> {
    return this.http.post<MouvementStock>(this.url, mouvement);
  }
}