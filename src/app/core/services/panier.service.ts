import { computed, Injectable, signal } from '@angular/core';
import { Produit } from '../models/produit.model';

export interface LignePanier {
  produit: Produit;
  quantite: number;
  stockDisponible: number; // photo du stock au moment de l'ajout
}

/** Pas de `providedIn` : le service est fourni par le composant qui l'utilise. */
@Injectable()
export class PanierService {
  private _lignes = signal<LignePanier[]>([]);

  readonly lignes = this._lignes.asReadonly();

  readonly total = computed(() =>
    this._lignes().reduce(
      (somme, l) => somme + l.produit.prixVente * l.quantite,
      0,
    ),
  );

  readonly nombreArticles = computed(() =>
    this._lignes().reduce((somme, l) => somme + l.quantite, 0),
  );

  /** Ajoute 1 exemplaire. Renvoie false si le stock disponible est atteint. */
  ajouter(produit: Produit, stockDisponible: number): boolean {
    const existante = this._lignes().find((l) => l.produit.id === produit.id);

    if ((existante?.quantite ?? 0) + 1 > stockDisponible) {
      return false;
    }

    if (existante) {
      this._lignes.update((lignes) =>
        lignes.map((l) =>
          l.produit.id === produit.id ? { ...l, quantite: l.quantite + 1 } : l,
        ),
      );
    } else {
      this._lignes.update((lignes) => [
        ...lignes,
        { produit, quantite: 1, stockDisponible },
      ]);
    }
    return true;
  }

  /** Fixe la quantité. Renvoie false si elle dépasse le stock disponible. */
  changerQuantite(produitId: number, quantite: number): boolean {
    if (quantite <= 0) {
      this.retirer(produitId);
      return true;
    }
    const ligne = this._lignes().find((l) => l.produit.id === produitId);
    if (!ligne || quantite > ligne.stockDisponible) {
      return false;
    }
    this._lignes.update((lignes) =>
      lignes.map((l) => (l.produit.id === produitId ? { ...l, quantite } : l)),
    );
    return true;
  }

  retirer(produitId: number): void {
    this._lignes.update((lignes) =>
      lignes.filter((l) => l.produit.id !== produitId),
    );
  }

  vider(): void {
    this._lignes.set([]);
  }
}
