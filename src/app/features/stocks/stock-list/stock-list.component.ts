import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProduitService } from '../../../core/services/produit.service';
import { CategorieService } from '../../../core/services/categorie.service';
import { StockService } from '../../../core/services/stock.service';
import { Produit } from '../../../core/models/produit.model';
import { Categorie } from '../../../core/models/categorie.model';
import { MouvementStock } from '../../../core/models/mouvement-stock.model';
import {
  CLASSES_STATUT_STOCK, LIBELLES_STATUT_STOCK, LigneStock, statutStock, StatutStock, stockParProduit,
} from '../../../core/utils/stock.utils';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-stock-list',
  imports: [RouterLink, FcfaPipe],
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.css'
})
export class StockListComponent implements OnInit {
  private produitService = inject(ProduitService);
  private categorieService = inject(CategorieService);
  private stockService = inject(StockService);

  produits = signal<Produit[]>([]);
  categories = signal<Categorie[]>([]);
  mouvements = signal<MouvementStock[]>([]);
  chargement = signal(true);
  erreur = signal('');

  recherche = signal('');
  seulementAlertes = signal(false);

  libelles = LIBELLES_STATUT_STOCK;
  classes = CLASSES_STATUT_STOCK;

  nomsCategories = computed(() => new Map(this.categories().map(c => [c.id, c.nom])));

  /** Une ligne par produit, avec son stock calculé. */
  lignes = computed<LigneStock[]>(() => {
    const stocks = stockParProduit(this.mouvements());
    return this.produits().map(produit => {
      const stock = stocks.get(produit.id) ?? 0;
      return {
        produit,
        stock,
        statut: statutStock(stock, produit.seuilAlerte),
        valeur: Math.max(stock, 0) * produit.prixAchat,
      };
    });
  });

  resume = computed(() => {
    const lignes = this.lignes();
    return {
      valeurTotale: lignes.reduce((total, l) => total + l.valeur, 0),
      unites: lignes.reduce((total, l) => total + Math.max(l.stock, 0), 0),
      alertes: lignes.filter(l => l.statut === 'BAS').length,
      ruptures: lignes.filter(l => l.statut === 'RUPTURE').length,
    };
  });

  lignesFiltrees = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    const urgence: Record<StatutStock, number> = { RUPTURE: 0, BAS: 1, OK: 2 };

    return this.lignes()
      .filter(l =>
        (!this.seulementAlertes() || l.statut !== 'OK') &&
        (!terme || `${l.produit.nom} ${l.produit.reference}`.toLowerCase().includes(terme))
      )
      .sort((a, b) => urgence[a.statut] - urgence[b.statut] || a.produit.nom.localeCompare(b.produit.nom));
  });

  ngOnInit(): void {
    forkJoin({
      produits: this.produitService.getAll(),
      categories: this.categorieService.getAll(),
      mouvements: this.stockService.getMouvements(),
    }).subscribe({
      next: ({ produits, categories, mouvements }) => {
        this.produits.set(produits);
        this.categories.set(categories);
        this.mouvements.set(mouvements);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set("Impossible de charger les stocks. Vérifie que « npm run api » est lancé.");
        this.chargement.set(false);
      },
    });
  }

  onRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  onAlertes(event: Event): void {
    this.seulementAlertes.set((event.target as HTMLInputElement).checked);
  }
}