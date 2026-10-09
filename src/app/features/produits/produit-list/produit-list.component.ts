import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProduitService } from '../../../core/services/produit.service';
import { CategorieService } from '../../../core/services/categorie.service';
import { Produit, EtatProduit } from '../../../core/models/produit.model';
import { Categorie } from '../../../core/models/categorie.model';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { StockService } from '../../../core/services/stock.service';
import { MouvementStock } from '../../../core/models/mouvement-stock.model';
import {
  CLASSES_STATUT_STOCK,
  statutStock,
  stockParProduit,
} from '../../../core/utils/stock.utils';

@Component({
  selector: 'app-produit-list',
  imports: [RouterLink, FcfaPipe],
  templateUrl: './produit-list.component.html',
  styleUrl: './produit-list.component.css',
})
export class ProduitListComponent implements OnInit {
  private produitService = inject(ProduitService);
  private categorieService = inject(CategorieService);

  produits = signal<Produit[]>([]);
  categories = signal<Categorie[]>([]);
  chargement = signal(true);
  erreur = signal('');

  recherche = signal('');
  filtreCategorie = signal(0);
  filtreEtat = signal<EtatProduit | ''>('');

  /** id de catégorie → nom, pour l'affichage. */
  nomsCategories = computed(
    () => new Map(this.categories().map((c) => [c.id, c.nom])),
  );

  produitsFiltres = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    const categorieId = this.filtreCategorie();
    const etat = this.filtreEtat();

    return this.produits().filter(
      (p) =>
        (!categorieId || p.categorieId === categorieId) &&
        (!etat || p.etat === etat) &&
        (!terme || `${p.nom} ${p.reference}`.toLowerCase().includes(terme)),
    );
  });

  ngOnInit(): void {
    forkJoin({
      produits: this.produitService.getAll(),
      categories: this.categorieService.getAll(),
      mouvements:this.stockService.getMouvements(),
    }).subscribe({
      next: ({ produits, categories, mouvements }) => {
        this.produits.set(produits);
        this.categories.set(categories);
        this.mouvements.set(mouvements);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set(
          'Impossible de charger le catalogue. Vérifie que « npm run api » est lancé.',
        );
        this.chargement.set(false);
      },
    });
  }

  onRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  onFiltreCategorie(event: Event): void {
    this.filtreCategorie.set(Number((event.target as HTMLSelectElement).value));
  }

  onFiltreEtat(event: Event): void {
    this.filtreEtat.set(
      (event.target as HTMLSelectElement).value as EtatProduit | '',
    );
  }

  basculerStatut(produit: Produit): void {
    const action = produit.actif ? 'désactiver' : 'réactiver';
    if (!confirm(`Voulez-vous ${action} « ${produit.nom} » ?`)) {
      return;
    }
    this.produitService
      .modifier(produit.id, { actif: !produit.actif })
      .subscribe((maj) => {
        this.produits.update((liste) =>
          liste.map((p) => (p.id === maj.id ? maj : p)),
        );
      });
  }

  // dans la classe :
  private stockService = inject(StockService);
  mouvements = signal<MouvementStock[]>([]);
  stocks = computed(() => stockParProduit(this.mouvements()));

  stockDe(produit: Produit): number {
    return this.stocks().get(produit.id) ?? 0;
  }

  classeStock(produit: Produit): string {
    return CLASSES_STATUT_STOCK[
      statutStock(this.stockDe(produit), produit.seuilAlerte)
    ];
  }
}
