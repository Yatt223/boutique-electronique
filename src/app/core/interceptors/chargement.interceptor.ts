import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { ChargementService } from '../services/chargement.service';

export const chargementInterceptor: HttpInterceptorFn = (req, next) => {
  const chargement = inject(ChargementService);
  chargement.debut();
  return next(req).pipe(finalize(() => chargement.fin()));
};
