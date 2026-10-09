import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Categorie } from '../models/categorie.model';

@Injectable({ providedIn: 'root' })
export class CategorieService {
  private http = inject(HttpClient);
  private url = `${API_URL}/categories`;

  getAll(): Observable<Categorie[]> {
    return this.http.get<Categorie[]>(this.url);
  }

  creer(categorie: Omit<Categorie, 'id'>): Observable<Categorie> {
    return this.http.post<Categorie>(this.url, categorie);
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
