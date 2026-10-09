import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CategorieService } from '../../../core/services/categorie.service';
import { ProduitService } from '../../../core/services/produit.service';
import { Categorie } from '../../../core/models/categorie.model';
import { Produit } from '../../../core/models/produit.model';

@Component({
  selector: 'app-categorie-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './categorie-list.component.html',
  styleUrl: './categorie-list.component.css',
})
export class CategorieListComponent implements OnInit {
  private categorieService = inject(CategorieService);
  private produitService = inject(ProduitService);

  categories = signal<Categorie[]>([]);
  produits = signal<Produit[]>([]);
  erreur = signal('');

  nom = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2)],
  });

  /** id de catégorie → nombre de produits. */
  nombreProduits = computed(() => {
    const compteur = new Map<number, number>();
    for (const p of this.produits()) {
      compteur.set(p.categorieId, (compteur.get(p.categorieId) ?? 0) + 1);
    }
    return compteur;
  });

  ngOnInit(): void {
    forkJoin({
      categories: this.categorieService.getAll(),
      produits: this.produitService.getAll(),
    }).subscribe(({ categories, produits }) => {
      this.categories.set(categories);
      this.produits.set(produits);
    });
  }

  ajouter(): void {
    this.erreur.set('');
    const nom = this.nom.value.trim();

    if (this.nom.invalid || !nom) {
      this.nom.markAsTouched();
      return;
    }
    if (
      this.categories().some((c) => c.nom.toLowerCase() === nom.toLowerCase())
    ) {
      this.erreur.set('Cette catégorie existe déjà.');
      return;
    }

    this.categorieService.creer({ nom }).subscribe((creee) => {
      this.categories.update((liste) => [...liste, creee]);
      this.nom.reset();
    });
  }

  supprimer(categorie: Categorie): void {
    this.erreur.set('');

    if ((this.nombreProduits().get(categorie.id) ?? 0) > 0) {
      this.erreur.set(
        `Impossible de supprimer « ${categorie.nom} » : des produits l'utilisent encore.`,
      );
      return;
    }
    if (!confirm(`Supprimer la catégorie « ${categorie.nom} » ?`)) {
      return;
    }

    this.categorieService.supprimer(categorie.id).subscribe(() => {
      this.categories.update((liste) =>
        liste.filter((c) => c.id !== categorie.id),
      );
    });
  }
}
