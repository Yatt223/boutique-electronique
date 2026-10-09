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
        loadComponent: placeholder,
        data: { titre: 'Tableau de bord', permission: 'dashboard:voir' },
      },
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
      {
        path: 'ventes',
        loadComponent: placeholder,
        data: { titre: 'Ventes', permission: 'ventes:voir' },
      },
      {
        path: 'commandes',
        loadComponent: placeholder,
        data: { titre: 'Commandes', permission: 'commandes:gerer' },
      },
      {
        path: 'caisse',
        loadComponent: placeholder,
        data: { titre: 'Caisse', permission: 'caisse:gerer' },
      },
      {
        path: 'depenses',
        loadComponent: placeholder,
        data: { titre: 'Dépenses', permission: 'depenses:gerer' },
      },
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
        loadComponent: placeholder,
        data: { titre: 'Interface de vente' },
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
