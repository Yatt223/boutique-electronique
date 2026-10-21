import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const erreurInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((erreur: HttpErrorResponse) => {
      if (erreur.status === 401 && auth.estConnecte()) {
        // Jeton expiré ou refusé : retour à la connexion
        notifications.erreur('Ta session a expiré. Reconnecte-toi.');
        auth.logout();
      } else if (erreur.status === 403) {
        notifications.erreur("Tu n'as pas le droit d'effectuer cette action.");
      } else if (erreur.status === 0) {
        notifications.erreur('Serveur injoignable. Vérifie ta connexion.');
      } else if (erreur.status >= 500) {
        notifications.erreur('Erreur du serveur. Réessaie dans un instant.');
      }
      // On relance l'erreur : chaque écran peut encore afficher son propre message
      return throwError(() => erreur);
    }),
  );
};
