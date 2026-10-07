import { Role } from './employe.model';

export type Permission =
  | 'dashboard:voir'
  | 'produits:gerer'
  | 'stocks:gerer'
  | 'ventes:voir'
  | 'ventes:creer'
  | 'ventes:annuler'
  | 'commandes:gerer'
  | 'caisse:gerer'
  | 'depenses:gerer'
  | 'employes:gerer';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'dashboard:voir',
    'produits:gerer',
    'stocks:gerer',
    'ventes:voir',
    'ventes:creer',
    'ventes:annuler',
    'commandes:gerer',
    'caisse:gerer',
    'depenses:gerer',
    'employes:gerer',
  ],
  MANAGER: [
    'dashboard:voir',
    'produits:gerer',
    'stocks:gerer',
    'ventes:voir',
    'ventes:creer',
    'ventes:annuler',
    'commandes:gerer',
    'caisse:gerer',
    'depenses:gerer',
  ],
  CAISSIER: ['ventes:creer'],
};
