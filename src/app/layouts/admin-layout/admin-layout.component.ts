import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  private auth = inject(AuthService);
  utilisateur = this.auth.utilisateur;

  menuOuvert = signal(false); // utile sur telephone et tablette pour ouvrir/fermer le menu latéral
  menu = [
    { libelle: 'Tableau de bord', lien: '/admin/dashboard', icone: '📊' },
    { libelle: 'Produits', lien: '/admin/produits', icone: '📦' },
    { libelle: 'Stocks', lien: '/admin/stocks', icone: '🏬' },
    { libelle: 'Ventes', lien: '/admin/ventes', icone: '🧾' },
    { libelle: 'Commandes', lien: '/admin/commandes', icone: '🛒' },
    { libelle: 'Caisse', lien: '/admin/caisse', icone: '💰' },
    { libelle: 'Dépenses', lien: '/admin/depenses', icone: '💸' },
    { libelle: 'Employés', lien: '/admin/employes', icone: '👥' },
  ];

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
