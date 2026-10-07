import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EmployeService } from '../../../core/services/employe.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employe, LIBELLES_ROLES, LISTE_ROLES, Role } from '../../../core/models/employe.model';

@Component({
  selector: 'app-employe-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './employe-list.component.html',
  styleUrl: './employe-list.component.css'
})
export class EmployeListComponent implements OnInit {
  private service = inject(EmployeService);
  private auth = inject(AuthService);

  roles = LISTE_ROLES;
  libelles = LIBELLES_ROLES;

  employes = signal<Employe[]>([]);
  chargement = signal(true);
  erreur = signal('');
  recherche = signal('');
  filtreRole = signal<Role | ''>('');

  moiId = computed(() => this.auth.utilisateur()?.id);

  employesFiltres = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    const role = this.filtreRole();
    return this.employes().filter(e =>
      (!role || e.role === role) &&
      (!terme || `${e.prenom} ${e.nom} ${e.email}`.toLowerCase().includes(terme))
    );
  });

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: liste => {
        this.employes.set(liste);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set("Impossible de charger les employés. Vérifie que « npm run api » est lancé.");
        this.chargement.set(false);
      },
    });
  }

  onRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  onFiltreRole(event: Event): void {
    this.filtreRole.set((event.target as HTMLSelectElement).value as Role | '');
  }

  basculerStatut(employe: Employe): void {
    const action = employe.actif ? 'désactiver' : 'réactiver';
    if (!confirm(`Voulez-vous ${action} ${employe.prenom} ${employe.nom} ?`)) {
      return;
    }
    this.service.modifier(employe.id, { actif: !employe.actif }).subscribe(maj => {
      this.employes.update(liste => liste.map(e => (e.id === maj.id ? maj : e)));
    });
  }

  initiales(e: Employe): string {
    return (e.prenom.charAt(0) + e.nom.charAt(0)).toUpperCase();
  }

  classeRole(role: Role): string {
    return role === 'ADMIN' ? 'badge-violet' : role === 'MANAGER' ? 'badge-bleu' : '';
  }
}