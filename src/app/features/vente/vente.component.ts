import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ProduitService } from '../../core/services/produit.service';
import { CategorieService } from '../../core/services/categorie.service';
import { StockService } from '../../core/services/stock.service';
import { VenteService } from '../../core/services/vente.service';
import { CaisseService } from '../../core/services/caisse.service';
import { AuthService } from '../../core/services/auth.service';
import { LignePanier, PanierService } from '../../core/services/panier.service';
import { Produit } from '../../core/models/produit.model';
import { Categorie } from '../../core/models/categorie.model';
import { MouvementStock } from '../../core/models/mouvement-stock.model';
import { LigneArticle } from '../../core/models/ligne-article.model';
import { SessionCaisse } from '../../core/models/session-caisse.model';
import { CommandeService } from '../../core/services/commande.service';
import { Commande } from '../../core/models/commande.model';
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
import { calculerTotaux } from '../../core/utils/caisse.utils';
import { maintenantLocal } from '../../core/utils/date.utils';
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
  private caisseService = inject(CaisseService);
  private auth = inject(AuthService);
  private commandeService = inject(CommandeService);

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

  enAttente = signal<Vente[]>([]);
  venteReprise = signal<Vente | null>(null);
  afficherAttente = signal(false);

  // ----- Caisse -----
  session = signal<SessionCaisse | null>(null);
  chargementSession = signal(true);
  ventesSession = signal<Vente[]>([]);
  fondSaisi = signal(0);
  erreurCaisse = signal('');
  traitementCaisse = signal(false);
  clotureOuverte = signal(false);
  especesComptees = signal<number | null>(null); // null = pas encore compté
  commentaireCloture = signal('');
  resultatCloture = signal<SessionCaisse | null>(null);
  commandesSession = signal<Commande[]>([]);

  libelles = LIBELLES_PAIEMENT;
  modes = (Object.keys(LIBELLES_PAIEMENT) as ModePaiement[]).map((valeur) => ({
    valeur,
    libelle: LIBELLES_PAIEMENT[valeur],
  }));

  stocks = computed(() => stockParProduit(this.mouvements()));

  totaux = computed(() => {
    const session = this.session();
    return session
      ? calculerTotaux(session, this.ventesSession(), this.commandesSession())
      : null;
  });

  ecartCloture = computed(
    () =>
      (this.especesComptees() ?? 0) - (this.totaux()?.especesAttendues ?? 0),
  );

  /** Vrai si la caisse ouverte date d'un autre jour (oubli de clôture). */
  sessionAncienne = computed(() => {
    const session = this.session();
    return (
      !!session &&
      session.dateOuverture.slice(0, 10) !== maintenantLocal().slice(0, 10)
    );
  });

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
      !!this.session() &&
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

    this.chargerEnAttente();
    this.chargerSession();
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

  basculerAttente(): void {
    this.afficherAttente.update((ouvert) => !ouvert);
  }

  viderPanier(): void {
    this.panier.vider();
    this.venteReprise.set(null);
  }

  private lignesDuPanier(): LigneArticle[] {
    return this.panier.lignes().map((l) => ({
      produitId: l.produit.id,
      nomProduit: l.produit.nom,
      prixUnitaire: l.produit.prixVente,
      quantite: l.quantite,
    }));
  }

  private notifier(texte: string): void {
    this.message.set(texte);
    setTimeout(() => this.message.set(''), 2500);
  }

  // ----- Mise en attente -----

  private chargerEnAttente(): void {
    this.venteService
      .getEnAttente()
      .subscribe((liste) => this.enAttente.set(liste));
  }

  mettreEnAttente(): void {
    const utilisateur = this.auth.utilisateur();
    if (!utilisateur || this.panier.lignes().length === 0) {
      return;
    }

    this.venteService
      .mettreEnAttente({
        lignes: this.lignesDuPanier(),
        modePaiement: this.modePaiement(),
        employeId: utilisateur.id,
        venteId: this.venteReprise()?.id,
      })
      .subscribe({
        next: (vente) => {
          this.panier.vider();
          this.venteReprise.set(null);
          this.notifier(`Vente ${vente.numero} mise en attente.`);
          this.chargerEnAttente();
        },
        error: (err) =>
          this.erreur.set(err.message ?? 'Mise en attente impossible.'),
      });
  }

  reprendre(vente: Vente): void {
    if (
      this.panier.lignes().length > 0 &&
      !confirm('Le panier actuel sera remplacé. Continuer ?')
    ) {
      return;
    }

    this.panier.vider();
    const problemes: string[] = [];

    for (const ligne of vente.lignes) {
      const produit = this.produits().find((p) => p.id === ligne.produitId);
      if (!produit || !this.panier.ajouter(produit, this.stockDe(produit))) {
        problemes.push(ligne.nomProduit);
        continue;
      }
      if (!this.panier.changerQuantite(produit.id, ligne.quantite)) {
        problemes.push(`${ligne.nomProduit} (quantité réduite)`);
      }
    }

    this.venteReprise.set(vente);
    this.modePaiement.set(vente.modePaiement);
    this.afficherAttente.set(false);

    if (problemes.length > 0) {
      this.notifier(`Stock insuffisant pour : ${problemes.join(', ')}.`);
    }
  }

  // ----- Caisse : ouverture et clôture -----

  private chargerSession(): void {
    const utilisateur = this.auth.utilisateur();
    if (!utilisateur) {
      this.chargementSession.set(false);
      return;
    }

    this.caisseService.getOuverte(utilisateur.id).subscribe({
      next: (session) => {
        this.session.set(session);
        this.chargementSession.set(false);
        if (session) {
          this.chargerVentesSession();
        }
      },
      error: () => {
        this.chargementSession.set(false);
        this.erreurCaisse.set("Impossible de lire l'état de la caisse.");
      },
    });
  }

  private chargerVentesSession(): void {
    const session = this.session();
    if (session) {
      forkJoin({
        ventes: this.venteService.getBySession(session.id),
        commandes: this.commandeService.getBySession(session.id),
      }).subscribe(({ ventes, commandes }) => {
        this.ventesSession.set(ventes);
        this.commandesSession.set(commandes);
      });
    }
  }

  onFond(event: Event): void {
    this.fondSaisi.set(Number((event.target as HTMLInputElement).value) || 0);
  }

  ouvrirCaisse(): void {
    const utilisateur = this.auth.utilisateur();
    if (!utilisateur) {
      return;
    }

    this.erreurCaisse.set('');
    this.traitementCaisse.set(true);

    this.caisseService.ouvrir(utilisateur.id, this.fondSaisi()).subscribe({
      next: (session) => {
        this.session.set(session);
        this.ventesSession.set([]);
        this.fondSaisi.set(0);
        this.traitementCaisse.set(false);
      },
      error: (err) => {
        this.traitementCaisse.set(false);
        this.erreurCaisse.set(
          err instanceof HttpErrorResponse
            ? 'Impossible de joindre le serveur.'
            : err.message,
        );
      },
    });
  }

  ouvrirCloture(): void {
    if (this.panier.lignes().length > 0) {
      this.notifier(
        'Vide le panier ou mets-le en attente avant de clôturer la caisse.',
      );
      return;
    }
    this.especesComptees.set(null);
    this.commentaireCloture.set('');
    this.erreurCaisse.set('');
    this.clotureOuverte.set(true);
  }

  annulerCloture(): void {
    this.clotureOuverte.set(false);
  }

  onComptees(event: Event): void {
    const valeur = (event.target as HTMLInputElement).value;
    this.especesComptees.set(valeur === '' ? null : Number(valeur));
  }

  onCommentaire(event: Event): void {
    this.commentaireCloture.set((event.target as HTMLTextAreaElement).value);
  }

  confirmerCloture(): void {
    const session = this.session();
    const comptees = this.especesComptees();
    if (!session || comptees === null) {
      return;
    }

    this.erreurCaisse.set('');
    this.traitementCaisse.set(true);

    this.caisseService
      .cloturer(
        session.id,
        comptees,
        this.commentaireCloture().trim() || undefined,
      )
      .subscribe({
        next: (cloturee) => {
          this.resultatCloture.set(cloturee);
          this.session.set(null);
          this.clotureOuverte.set(false);
          this.traitementCaisse.set(false);
        },
        error: (err) => {
          this.traitementCaisse.set(false);
          this.erreurCaisse.set(
            err instanceof HttpErrorResponse
              ? 'Impossible de joindre le serveur.'
              : err.message,
          );
        },
      });
  }

  terminer(): void {
    this.auth.logout();
  }

  // ----- Encaissement -----

  encaisser(): void {
    const utilisateur = this.auth.utilisateur();
    const session = this.session();
    if (!utilisateur || !session || !this.peutEncaisser()) {
      return;
    }

    this.erreur.set('');
    this.enregistrement.set(true);

    this.venteService
      .encaisser({
        lignes: this.lignesDuPanier(),
        modePaiement: this.modePaiement(),
        employeId: utilisateur.id,
        montantRecu:
          this.modePaiement() === 'ESPECES' ? this.montantRecu() : undefined,
        venteId: this.venteReprise()?.id,
        sessionId: session.id,
      })
      .subscribe({
        next: (vente) => {
          this.recu.set(vente);
          this.panier.vider();
          this.venteReprise.set(null);
          this.montantRecu.set(0);
          this.enregistrement.set(false);
          this.rechargerStocks();
          this.chargerEnAttente();
          this.chargerVentesSession();
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
