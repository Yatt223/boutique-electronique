import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const utilisateur = inject(AuthService).utilisateur();

  if (!utilisateur) {
    return next(req);
  }

  // Une requête est immuable : on en crée une copie modifiée
  const requeteAvecJeton = req.clone({
    setHeaders: { Authorization: `Bearer jeton-demo-${utilisateur.id}` },
  });
  return next(requeteAvecJeton);
};
