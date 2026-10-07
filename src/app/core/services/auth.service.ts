import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { Employe, Role } from '../models/employe.model';
import { Utilisateur } from '../models/utilisateur.model';
import { Permission, ROLE_PERMISSIONS } from '../models/permission.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly CLE_SESSION = 'boutique_utilisateur';

  private _utilisateur = signal<Utilisateur | null>(this.lireSession());

  /** Lecture seule : seuls les services de ce fichier peuvent modifier l'état. */
  readonly utilisateur = this._utilisateur.asReadonly();
  readonly estConnecte = computed(() => this._utilisateur() !== null);
  readonly role = computed<Role | null>(
    () => this._utilisateur()?.role ?? null,
  );

  login(email: string, motDePasse: string): Observable<Utilisateur> {
    return this.http
      .get<Employe[]>(`${API_URL}/employes`, { params: { email, motDePasse } })
      .pipe(
        map((employes) => {
          const employe = employes[0];
          if (!employe || !employe.actif) {
            throw new Error('Identifiants invalides');
          }
          const { motDePasse: _mdp, ...utilisateur } = employe;
          return utilisateur;
        }),
        tap((utilisateur) => {
          this._utilisateur.set(utilisateur);
          localStorage.setItem(this.CLE_SESSION, JSON.stringify(utilisateur));
        }),
      );
  }

  logout(): void {
    this._utilisateur.set(null);
    localStorage.removeItem(this.CLE_SESSION);
    this.router.navigate(['/login']);
  }

  /** Page d'accueil selon le rôle : la caissière va à la caisse, les autres à l'administration. */
  routeParDefaut(): string {
    return this.role() === 'CAISSIER' ? '/vente' : '/admin/dashboard';
  }

  private lireSession(): Utilisateur | null {
    try {
      const brut = localStorage.getItem(this.CLE_SESSION);
      return brut ? (JSON.parse(brut) as Utilisateur) : null;
    } catch {
      return null;
    }
  }

  peut(permission: Permission): boolean {
    const role = this.role();
    return role !== null && ROLE_PERMISSIONS[role].includes(permission);
  }
}
