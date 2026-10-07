import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/employe.model';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 1. Pas connecté : direction la page de connexion
  if (!auth.estConnecte()) {
    return router.createUrlTree(['/login']);
  }

  // 2. Rôles autorisés (définis dans `data` de la route)
  const rolesAutorises = route.data['roles'] as Role[] | undefined;
  const role = auth.role();

  if (!rolesAutorises || (role && rolesAutorises.includes(role))) {
    return true;
  }

  // 3. Connecté mais pas le bon rôle : retour à SA page d'accueil
  return router.createUrlTree([auth.routeParDefaut()]);
};
