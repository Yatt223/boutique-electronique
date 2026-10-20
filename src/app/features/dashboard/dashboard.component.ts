import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { VenteService } from '../../core/services/vente.service';
import { ProduitService } from '../../core/services/produit.service';
import { StockService } from '../../core/services/stock.service';
import { DepenseService } from '../../core/services/depense.service';
import { CommandeService } from '../../core/services/commande.service';
import { CaisseService } from '../../core/services/caisse.service';
import { EmployeService } from '../../core/services/employe.service';
import { Commande } from '../../core/models/commande.model';
import { Depense } from '../../core/models/depense.model';
import { Employe } from '../../core/models/employe.model';
import { MouvementStock } from '../../core/models/mouvement-stock.model';
import { Produit } from '../../core/models/produit.model';
import { SessionCaisse } from '../../core/models/session-caisse.model';
import {
  LIBELLES_PAIEMENT,
  ModePaiement,
  Vente,
} from '../../core/models/vente.model';
import {
  CLASSES_STATUT_STOCK,
  LIBELLES_STATUT_STOCK,
  statutStock,
  StatutStock,
  stockParProduit,
} from '../../core/utils/stock.utils';
import {
  dansPeriode,
  joursDeLaPeriode,
  LIBELLES_PERIODES,
  Periode,
  periodePour,
  periodePrecedente,
  PresetPeriode,
} from '../../core/utils/stats.utils';
import { maintenantLocal } from '../../core/utils/date.utils';
import { FcfaPipe } from '../../shared/pipes/fcfa.pipe';

interface BarreJour {
  jour: string;
  montant: number;
  hauteur: number; // pourcentage de la plus haute barre
  etiquette: string; // numéro du jour
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, FcfaPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private venteService = inject(VenteService);
  private produitService = inject(ProduitService);
  private stockService = inject(StockService);
  private depenseService = inject(DepenseService);
  private commandeService = inject(CommandeService);
  private caisseService = inject(CaisseService);
  private employeService = inject(EmployeService);

  ventes = signal<Vente[]>([]);
  produits = signal<Produit[]>([]);
  mouvements = signal<MouvementStock[]>([]);
  depenses = signal<Depense[]>([]);
  commandes = signal<Commande[]>([]);
  sessions = signal<SessionCaisse[]>([]);
  employes = signal<Employe[]>([]);

  chargement = signal(true);
  erreur = signal('');

  // ----- Période -----
  preset = signal<PresetPeriode>('SEPT_JOURS');
  debutPerso = signal('');
  finPerso = signal('');

  presets = (Object.keys(LIBELLES_PERIODES) as PresetPeriode[]).map(
    (valeur) => ({
      valeur,
      libelle: LIBELLES_PERIODES[valeur],
    }),
  );

  periode = computed<Periode>(() => {
    const preset = this.preset();
    if (preset !== 'PERSO') {
      return periodePour(preset);
    }
    const aujourdhui = maintenantLocal().slice(0, 10);
    const debut = this.debutPerso() || aujourdhui;
    const fin = this.finPerso() || aujourdhui;
    return debut <= fin ? { debut, fin } : { debut: fin, fin: debut };
  });

  libellesStatutStock = LIBELLES_STATUT_STOCK;
  classesStatutStock = CLASSES_STATUT_STOCK;
  libellesPaiement = LIBELLES_PAIEMENT;

  // ----- Ventes -----
  private coutsProduits = computed(
    () => new Map(this.produits().map((p) => [p.id, p.prixAchat])),
  );

  private ventesPayeesDe(periode: Periode): Vente[] {
    return this.ventes().filter(
      (v) => v.statut === 'PAYEE' && dansPeriode(v.date, periode),
    );
  }

  ventesPayees = computed(() => this.ventesPayeesDe(this.periode()));

  chiffreAffaires = computed(() =>
    this.ventesPayees().reduce((total, v) => total + v.total, 0),
  );
  nombreVentes = computed(() => this.ventesPayees().length);
  panierMoyen = computed(() =>
    this.nombreVentes()
      ? Math.round(this.chiffreAffaires() / this.nombreVentes())
      : 0,
  );

  /** Évolution du chiffre d'affaires par rapport à la période précédente. */
  variation = computed(() => {
    const precedent = this.ventesPayeesDe(
      periodePrecedente(this.periode()),
    ).reduce((total, v) => total + v.total, 0);

    if (precedent === 0) {
      return null;
    }
    const valeur = Math.round(
      ((this.chiffreAffaires() - precedent) / precedent) * 100,
    );
    return { valeur, positive: valeur >= 0 };
  });

  // ----- Marge et bénéfice -----
  coutMarchandises = computed(() =>
    this.ventesPayees().reduce(
      (total, vente) =>
        total +
        vente.lignes.reduce(
          (sousTotal, l) =>
            sousTotal +
            (l.prixAchat ?? this.coutsProduits().get(l.produitId) ?? 0) *
              l.quantite,
          0,
        ),
      0,
    ),
  );

  margeBrute = computed(() => this.chiffreAffaires() - this.coutMarchandises());
  tauxMarge = computed(() =>
    this.chiffreAffaires()
      ? Math.round((this.margeBrute() / this.chiffreAffaires()) * 100)
      : 0,
  );

  depensesPeriode = computed(() =>
    this.depenses()
      .filter(
        (d) => d.statut === 'VALIDEE' && dansPeriode(d.date, this.periode()),
      )
      .reduce((total, d) => total + d.montant, 0),
  );

  benefice = computed(() => this.margeBrute() - this.depensesPeriode());

  // ----- Graphique -----
  barresParJour = computed<BarreJour[]>(() => {
    const jours = joursDeLaPeriode(this.periode()).slice(-62);
    const parJour = new Map<string, number>();

    for (const vente of this.ventesPayees()) {
      const jour = vente.date.slice(0, 10);
      parJour.set(jour, (parJour.get(jour) ?? 0) + vente.total);
    }

    const maximum = Math.max(...jours.map((j) => parJour.get(j) ?? 0), 1);

    return jours.map((jour) => {
      const montant = parJour.get(jour) ?? 0;
      return {
        jour,
        montant,
        hauteur: Math.round((montant / maximum) * 100),
        etiquette: jour.slice(8),
      };
    });
  });

  meilleurJour = computed(() => {
    const barres = this.barresParJour();
    return barres.reduce<BarreJour | null>(
      (meilleur, b) => (b.montant > (meilleur?.montant ?? 0) ? b : meilleur),
      null,
    );
  });

  // ----- Classements -----
  meilleursProduits = computed(() => {
    const totaux = new Map<
      number,
      { nom: string; quantite: number; ca: number }
    >();

    for (const vente of this.ventesPayees()) {
      for (const l of vente.lignes) {
        const actuel = totaux.get(l.produitId) ?? {
          nom: l.nomProduit,
          quantite: 0,
          ca: 0,
        };
        actuel.quantite += l.quantite;
        actuel.ca += l.quantite * l.prixUnitaire;
        totaux.set(l.produitId, actuel);
      }
    }

    return Array.from(totaux.values())
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 5);
  });

  parModePaiement = computed(() => {
    const totaux: Record<ModePaiement, number> = {
      ESPECES: 0,
      CARTE: 0,
      MOBILE_MONEY: 0,
    };
    for (const vente of this.ventesPayees()) {
      totaux[vente.modePaiement] += vente.total;
    }
    const total = this.chiffreAffaires() || 1;

    return (Object.keys(totaux) as ModePaiement[]).map((mode) => ({
      mode,
      montant: totaux[mode],
      pourcentage: Math.round((totaux[mode] / total) * 100),
    }));
  });

  parCaissier = computed(() => {
    const noms = new Map(
      this.employes().map((e) => [e.id, `${e.prenom} ${e.nom}`]),
    );
    const totaux = new Map<
      number,
      { nom: string; ventes: number; ca: number }
    >();

    for (const vente of this.ventesPayees()) {
      const actuel = totaux.get(vente.employeId) ?? {
        nom: noms.get(vente.employeId) ?? 'Inconnu',
        ventes: 0,
        ca: 0,
      };
      actuel.ventes += 1;
      actuel.ca += vente.total;
      totaux.set(vente.employeId, actuel);
    }

    return Array.from(totaux.values()).sort((a, b) => b.ca - a.ca);
  });

  // ----- Stock, caisses, commandes -----
  alertesStock = computed(() => {
    const stocks = stockParProduit(this.mouvements());
    const urgence: Record<StatutStock, number> = { RUPTURE: 0, BAS: 1, OK: 2 };

    return this.produits()
      .filter((p) => p.actif)
      .map((produit) => {
        const stock = stocks.get(produit.id) ?? 0;
        return {
          produit,
          stock,
          statut: statutStock(stock, produit.seuilAlerte),
        };
      })
      .filter((ligne) => ligne.statut !== 'OK')
      .sort((a, b) => urgence[a.statut] - urgence[b.statut])
      .slice(0, 6);
  });

  sessionsOuvertes = computed(
    () => this.sessions().filter((s) => s.statut === 'OUVERTE').length,
  );

  ecartCaisses = computed(() =>
    this.sessions()
      .filter(
        (s) =>
          s.statut === 'CLOTUREE' &&
          !!s.dateCloture &&
          dansPeriode(s.dateCloture, this.periode()),
      )
      .reduce((total, s) => total + (s.ecart ?? 0), 0),
  );

  commandesOuvertes = computed(() =>
    this.commandes().filter((c) =>
      ['NOUVELLE', 'CONFIRMEE', 'PRETE'].includes(c.statut),
    ),
  );
  commandesPretes = computed(
    () => this.commandes().filter((c) => c.statut === 'PRETE').length,
  );
  resteAEncaisser = computed(() =>
    this.commandesOuvertes().reduce(
      (total, c) => total + (c.total - c.acompte),
      0,
    ),
  );

  ngOnInit(): void {
    this.charger();
  }

  actualiser(): void {
    this.charger();
  }

  private charger(): void {
    this.chargement.set(true);
    this.erreur.set('');

    forkJoin({
      ventes: this.venteService.getAll(),
      produits: this.produitService.getAll(),
      mouvements: this.stockService.getMouvements(),
      depenses: this.depenseService.getAll(),
      commandes: this.commandeService.getAll(),
      sessions: this.caisseService.getAll(),
      employes: this.employeService.getAll(),
    }).subscribe({
      next: (donnees) => {
        this.ventes.set(donnees.ventes);
        this.produits.set(donnees.produits);
        this.mouvements.set(donnees.mouvements);
        this.depenses.set(donnees.depenses);
        this.commandes.set(donnees.commandes);
        this.sessions.set(donnees.sessions);
        this.employes.set(donnees.employes);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set(
          'Impossible de charger les statistiques. Vérifie que « npm run api » est lancé.',
        );
        this.chargement.set(false);
      },
    });
  }

  choisirPreset(preset: PresetPeriode): void {
    this.preset.set(preset);
  }

  onDebut(event: Event): void {
    this.debutPerso.set((event.target as HTMLInputElement).value);
  }

  onFin(event: Event): void {
    this.finPerso.set((event.target as HTMLInputElement).value);
  }
}
