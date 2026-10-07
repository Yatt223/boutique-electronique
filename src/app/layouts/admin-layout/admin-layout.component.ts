import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Permission } from '../../core/models/permission.model';

interface ItemMenu {
  libelle: string;
  lien: string;
  icone: string;
  permission: Permission;
}

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  private auth = inject(AuthService);

  utilisateur = this.auth.utilisateur;
  menuOuvert = signal(false);

  private menu: ItemMenu[] = [
    {
      libelle: 'Tableau de bord',
      lien: '/admin/dashboard',
      icone: '📊',
      permission: 'dashboard:voir',
    },
    {
      libelle: 'Produits',
      lien: '/admin/produits',
      icone: '📦',
      permission: 'produits:gerer',
    },
    {
      libelle: 'Stocks',
      lien: '/admin/stocks',
      icone: '🏬',
      permission: 'stocks:gerer',
    },
    {
      libelle: 'Ventes',
      lien: '/admin/ventes',
      icone: '🧾',
      permission: 'ventes:voir',
    },
    {
      libelle: 'Commandes',
      lien: '/admin/commandes',
      icone: '🛒',
      permission: 'commandes:gerer',
    },
    {
      libelle: 'Caisse',
      lien: '/admin/caisse',
      icone: '💰',
      permission: 'caisse:gerer',
    },
    {
      libelle: 'Dépenses',
      lien: '/admin/depenses',
      icone: '💸',
      permission: 'depenses:gerer',
    },
    {
      libelle: 'Employés',
      lien: '/admin/employes',
      icone: '👥',
      permission: 'employes:gerer',
    },
  ];

  /** Seules les entrées autorisées pour le rôle de l'utilisateur connecté. */
  menuVisible = computed(() =>
    this.menu.filter((item) => this.auth.peut(item.permission)),
  );

  basculerMenu(): void {
    this.menuOuvert.update((ouvert) => !ouvert);
  }

  fermerMenu(): void {
    this.menuOuvert.set(false);
  }

  deconnexion(): void {
    this.auth.logout();
  }
}
