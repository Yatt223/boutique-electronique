import { Routes } from '@angular/router';

const placeholder = () =>
  import('./shared/placeholder/placeholder.component').then(m => m.PlaceholderComponent);

export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: placeholder, data: { titre: 'Tableau de bord' } },
      { path: 'produits', loadComponent: placeholder, data: { titre: 'Produits' } },
      { path: 'stocks', loadComponent: placeholder, data: { titre: 'Stocks' } },
      { path: 'ventes', loadComponent: placeholder, data: { titre: 'Ventes' } },
      { path: 'commandes', loadComponent: placeholder, data: { titre: 'Commandes' } },
      { path: 'caisse', loadComponent: placeholder, data: { titre: 'Caisse' } },
      { path: 'depenses', loadComponent: placeholder, data: { titre: 'Dépenses' } },
      { path: 'employes', loadComponent: placeholder, data: { titre: 'Employés' } },
    ],
  },
  {
    path: 'vente',
    loadComponent: () =>
      import('./layouts/caisse-layout/caisse-layout.component').then(m => m.CaisseLayoutComponent),
    children: [
      { path: '', loadComponent: placeholder, data: { titre: 'Interface de vente' } },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
  { path: '**', redirectTo: '' },
];