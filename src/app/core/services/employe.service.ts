import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Employe } from '../models/employe.model';

@Injectable({ providedIn: 'root' })
export class EmployeService {
  private http = inject(HttpClient);
  private url = `${API_URL}/employes`;

  getAll(): Observable<Employe[]> {
    return this.http.get<Employe[]>(this.url);
  }

  getById(id: number): Observable<Employe> {
    return this.http.get<Employe>(`${this.url}/${id}`);
  }

  /** Vrai si un AUTRE employé utilise déjà cet email. */
  existeEmail(email: string, ignoreId?: number): Observable<boolean> {
    return this.http
      .get<Employe[]>(this.url, { params: { email } })
      .pipe(map((liste) => liste.some((e) => e.id !== ignoreId)));
  }

  creer(employe: Omit<Employe, 'id'>): Observable<Employe> {
    return this.http.post<Employe>(this.url, employe);
  }

  modifier(
    id: number,
    modifications: Partial<Omit<Employe, 'id'>>,
  ): Observable<Employe> {
    return this.http.patch<Employe>(`${this.url}/${id}`, modifications);
  }
}
