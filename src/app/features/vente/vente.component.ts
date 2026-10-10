import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ProduitService } from '../../core/services/produit.service';
import { CategorieService } from '../../core/services/categorie.service';
import { StockService } from '../../core/services/stock.service';
import { VenteService } from '../../core/services/vente.service';
import { AuthService } from '../../core/services/auth.service';
import { LignePanier, PanierService } from '../../core/services/panier.service';
import { Produit } from '../../core/models/produit.model';
import { Categorie } from '../../core/models/categorie.model';
import { MouvementStock } from '../../core/models/mouvement-stock.model';
import { LigneArticle } from '../../core/models/ligne-article.model';
import {
  LIBELLES_PAIEMENT,
  ModePaiement,
  Vente,
} from '../../core/models/vente.model';
import {
  CLASSES_STATUT_STOCK,
  statutStock,
  stockParProduit,
} from '../../core/utils/stock.utils';
import { FcfaPipe } from '../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-vente',
  imports: [FcfaPipe, DatePipe],
  providers: [PanierService], // une instance de panier propre à cet écran
  templateUrl: './vente.component.html',
  styleUrl: './vente.component.css',
})
export class VenteComponent implements OnInit {
  panier = inject(PanierService);
  private produitService = inject(ProduitService);
  private categorieService = inject(CategorieService);
  private stockService = inject(StockService);
  private venteService = inject(VenteService);
  private auth = inject(AuthService);

  utilisateur = this.auth.utilisateur;

  produits = signal<Produit[]>([]);
  categories = signal<Categorie[]>([]);
  mouvements = signal<MouvementStock[]>([]);
  chargement = signal(true);
  erreurChargement = signal('');

  recherche = signal('');
  categorieActive = signal(0);

  modePaiement = signal<ModePaiement>('ESPECES');
  montantRecu = signal(0);

  message = signal(''); // petite alerte temporaire
  erreur = signal('');
  enregistrement = signal(false);
  recu = signal<Vente | null>(null); // la vente qui vient d'être encaissée

  libelles = LIBELLES_PAIEMENT;
  modes = (Object.keys(LIBELLES_PAIEMENT) as ModePaiement[]).map((valeur) => ({
    valeur,
    libelle: LIBELLES_PAIEMENT[valeur],
  }));

  stocks = computed(() => stockParProduit(this.mouvements()));

  produitsAffiches = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    const categorieId = this.categorieActive();

    return this.produits().filter(
      (p) =>
        p.actif &&
        (!categorieId || p.categorieId === categorieId) &&
        (!terme || `${p.nom} ${p.reference}`.toLowerCase().includes(terme)),
    );
  });

  monnaie = computed(() =>
    this.modePaiement() === 'ESPECES'
      ? this.montantRecu() - this.panier.total()
      : 0,
  );

  peutEncaisser = computed(
    () =>
      this.panier.lignes().length > 0 &&
      !this.enregistrement() &&
      (this.modePaiement() !== 'ESPECES' ||
        this.montantRecu() >= this.panier.total()),
  );

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
        this.erreurChargement.set(
          'Impossible de charger le catalogue. Vérifie que « npm run api » est lancé.',
        );
        this.chargement.set(false);
      },
    });
  }

  stockDe(produit: Produit): number {
    return this.stocks().get(produit.id) ?? 0;
  }

  classeStock(produit: Produit): string {
    return CLASSES_STATUT_STOCK[
      statutStock(this.stockDe(produit), produit.seuilAlerte)
    ];
  }

  // ----- Catalogue -----

  onRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  /** Touche Entrée : ajoute le produit dont la référence correspond (douchette) ou l'unique résultat. */
  onEntree(): void {
    const terme = this.recherche().trim().toLowerCase();
    if (!terme) {
      return;
    }
    const exact = this.produits().find(
      (p) => p.actif && p.reference.toLowerCase() === terme,
    );
    const candidats = this.produitsAffiches();
    const produit =
      exact ?? (candidats.length === 1 ? candidats[0] : undefined);

    if (produit) {
      this.ajouter(produit);
      this.recherche.set('');
    } else {
      this.notifier('Aucun produit unique ne correspond à cette saisie.');
    }
  }

  // ----- Panier -----

  ajouter(produit: Produit): void {
    const stock = this.stockDe(produit);
    if (!this.panier.ajouter(produit, stock)) {
      this.notifier(
        stock <= 0
          ? `« ${produit.nom} » est en rupture de stock.`
          : `Stock maximum atteint pour « ${produit.nom} » (${stock}).`,
      );
    }
  }

  changerQuantite(ligne: LignePanier, variation: number): void {
    if (
      !this.panier.changerQuantite(ligne.produit.id, ligne.quantite + variation)
    ) {
      this.notifier(
        `Stock maximum atteint pour « ${ligne.produit.nom} » (${ligne.stockDisponible}).`,
      );
    }
  }

  onMontantRecu(event: Event): void {
    this.montantRecu.set(Number((event.target as HTMLInputElement).value) || 0);
  }

  private notifier(texte: string): void {
    this.message.set(texte);
    setTimeout(() => this.message.set(''), 2500);
  }

  // ----- Encaissement -----

  encaisser(): void {
    const utilisateur = this.auth.utilisateur();
    if (!utilisateur || !this.peutEncaisser()) {
      return;
    }

    this.erreur.set('');
    this.enregistrement.set(true);

    const lignes: LigneArticle[] = this.panier.lignes().map((l) => ({
      produitId: l.produit.id,
      nomProduit: l.produit.nom,
      prixUnitaire: l.produit.prixVente,
      quantite: l.quantite,
    }));

    this.venteService
      .encaisser({
        lignes,
        modePaiement: this.modePaiement(),
        employeId: utilisateur.id,
        montantRecu:
          this.modePaiement() === 'ESPECES' ? this.montantRecu() : undefined,
      })
      .subscribe({
        next: (vente) => {
          this.recu.set(vente);
          this.panier.vider();
          this.montantRecu.set(0);
          this.enregistrement.set(false);
          this.rechargerStocks();
        },
        error: (err) => {
          this.enregistrement.set(false);
          this.erreur.set(
            err instanceof HttpErrorResponse
              ? 'Impossible de joindre le serveur.'
              : err.message,
          );
          this.rechargerStocks();
        },
      });
  }

  private rechargerStocks(): void {
    this.stockService.getMouvements().subscribe((m) => this.mouvements.set(m));
  }

  imprimer(): void {
    window.print();
  }

  nouvelleVente(): void {
    this.recu.set(null);
  }
}
