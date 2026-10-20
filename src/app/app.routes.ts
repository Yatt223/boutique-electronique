import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

const placeholder = () =>
  import('./shared/placeholder/placeholder.component').then(
    (m) => m.PlaceholderComponent,
  );

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },

  // ===== Zone d'administration =====
  {
    path: 'admin',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    data: { roles: ['ADMIN', 'MANAGER'] },
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        data: { permission: 'dashboard:voir' },
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },

      // Produits
      {
        path: 'produits',
        data: { permission: 'produits:gerer' },
        loadComponent: () =>
          import('./features/produits/produit-list/produit-list.component').then(
            (m) => m.ProduitListComponent,
          ),
      },
      {
        path: 'produits/categories',
        data: { permission: 'produits:gerer' },
        loadComponent: () =>
          import('./features/produits/categorie-list/categorie-list.component').then(
            (m) => m.CategorieListComponent,
          ),
      },
      {
        path: 'produits/nouveau',
        data: { permission: 'produits:gerer' },
        loadComponent: () =>
          import('./features/produits/produit-form/produit-form.component').then(
            (m) => m.ProduitFormComponent,
          ),
      },
      {
        path: 'produits/:id/modifier',
        data: { permission: 'produits:gerer' },
        loadComponent: () =>
          import('./features/produits/produit-form/produit-form.component').then(
            (m) => m.ProduitFormComponent,
          ),
      },

      // Stocks
      {
        path: 'stocks',
        data: { permission: 'stocks:gerer' },
        loadComponent: () =>
          import('./features/stocks/stock-list/stock-list.component').then(
            (m) => m.StockListComponent,
          ),
      },
      {
        path: 'stocks/mouvements',
        data: { permission: 'stocks:gerer' },
        loadComponent: () =>
          import('./features/stocks/mouvement-list/mouvement-list.component').then(
            (m) => m.MouvementListComponent,
          ),
      },
      {
        path: 'stocks/mouvements/nouveau',
        data: { permission: 'stocks:gerer' },
        loadComponent: () =>
          import('./features/stocks/mouvement-form/mouvement-form.component').then(
            (m) => m.MouvementFormComponent,
          ),
      },

      // À construire dans les prochaines étapes
      {
        path: 'ventes',
        loadComponent: placeholder,
        data: { titre: 'Ventes', permission: 'ventes:voir' },
      },
      {
        path: 'commandes',
        data: { permission: 'commandes:gerer' },
        loadComponent: () =>
          import('./features/commandes/commande-list/commande-list.component').then(
            (m) => m.CommandeListComponent,
          ),
      },
      {
        path: 'commandes/nouvelle',
        data: { permission: 'commandes:gerer' },
        loadComponent: () =>
          import('./features/commandes/commande-form/commande-form.component').then(
            (m) => m.CommandeFormComponent,
          ),
      },
      {
        path: 'commandes/:id',
        data: { permission: 'commandes:gerer' },
        loadComponent: () =>
          import('./features/commandes/commande-detail/commande-detail.component').then(
            (m) => m.CommandeDetailComponent,
          ),
      },
      {
        path: 'caisse',
        data: { permission: 'caisse:gerer' },
        loadComponent: () =>
          import('./features/caisse/session-list/session-list.component').then(
            (m) => m.SessionListComponent,
          ),
      },
      {
        path: 'caisse/:id',
        data: { permission: 'caisse:gerer' },
        loadComponent: () =>
          import('./features/caisse/session-detail/session-detail.component').then(
            (m) => m.SessionDetailComponent,
          ),
      },
      {
        path: 'depenses',
        data: { permission: 'depenses:gerer' },
        loadComponent: () =>
          import('./features/depenses/depense-list/depense-list.component').then(
            (m) => m.DepenseListComponent,
          ),
      },
      {
        path: 'depenses/nouvelle',
        data: { permission: 'depenses:gerer' },
        loadComponent: () =>
          import('./features/depenses/depense-form/depense-form.component').then(
            (m) => m.DepenseFormComponent,
          ),
      },

      // Employés
      {
        path: 'employes',
        data: { permission: 'employes:gerer' },
        loadComponent: () =>
          import('./features/employes/employe-list/employe-list.component').then(
            (m) => m.EmployeListComponent,
          ),
      },
      {
        path: 'employes/nouveau',
        data: { permission: 'employes:gerer' },
        loadComponent: () =>
          import('./features/employes/employe-form/employe-form.component').then(
            (m) => m.EmployeFormComponent,
          ),
      },
      {
        path: 'employes/:id/modifier',
        data: { permission: 'employes:gerer' },
        loadComponent: () =>
          import('./features/employes/employe-form/employe-form.component').then(
            (m) => m.EmployeFormComponent,
          ),
      },
    ],
  },

  // ===== Interface de vente (caissières) =====
  {
    path: 'vente',
    canActivate: [authGuard],
    data: { permission: 'ventes:creer' },
    loadComponent: () =>
      import('./layouts/caisse-layout/caisse-layout.component').then(
        (m) => m.CaisseLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/vente/vente.component').then(
            (m) => m.VenteComponent,
          ),
      },
    ],
  },

  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
