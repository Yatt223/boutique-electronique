import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/employe.model';
import { Permission } from '../models/permission.model';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.estConnecte()) {
    return router.createUrlTree(['/login']);
  }

  const roles = route.data['roles'] as Role[] | undefined;
  const permission = route.data['permission'] as Permission | undefined;
  const role = auth.role();

  const roleOk = !roles || (role !== null && roles.includes(role));
  const permissionOk = !permission || auth.peut(permission);

  // Refusé : retour à SA page d'accueil
  return roleOk && permissionOk
    ? true
    : router.createUrlTree([auth.routeParDefaut()]);
};
