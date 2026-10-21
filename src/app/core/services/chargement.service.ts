import { computed, Injectable, signal } from '@angular/core';

/** Compte les requêtes HTTP en cours. */
@Injectable({ providedIn: 'root' })
export class ChargementService {
  private actifs = signal(0);
  readonly enCours = computed(() => this.actifs() > 0);

  debut(): void {
    this.actifs.update((n) => n + 1);
  }

  fin(): void {
    this.actifs.update((n) => Math.max(0, n - 1));
  }
}
