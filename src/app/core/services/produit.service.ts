import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Produit } from '../models/produit.model';

@Injectable({ providedIn: 'root' })
export class ProduitService {
  private http = inject(HttpClient);
  private url = `${API_URL}/produits`;

  getAll(): Observable<Produit[]> {
    return this.http.get<Produit[]>(this.url);
  }

  getById(id: number): Observable<Produit> {
    return this.http.get<Produit>(`${this.url}/${id}`);
  }

  /** Vrai si un AUTRE produit utilise déjà cette référence. */
  existeReference(reference: string, ignoreId?: number): Observable<boolean> {
    return this.http
      .get<Produit[]>(this.url, { params: { reference } })
      .pipe(map(liste => liste.some(p => p.id !== ignoreId)));
  }

  creer(produit: Omit<Produit, 'id'>): Observable<Produit> {
    return this.http.post<Produit>(this.url, produit);
  }

  modifier(id: number, modifications: Partial<Omit<Produit, 'id'>>): Observable<Produit> {
    return this.http.patch<Produit>(`${this.url}/${id}`, modifications);
  }
}