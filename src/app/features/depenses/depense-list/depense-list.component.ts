import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DepenseService } from '../../../core/services/depense.service';
import { CaisseService } from '../../../core/services/caisse.service';
import { EmployeService } from '../../../core/services/employe.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  CategorieDepense,
  Depense,
  LIBELLES_CATEGORIE_DEPENSE,
  StatutDepense,
} from '../../../core/models/depense.model';
import { Employe } from '../../../core/models/employe.model';
import { SessionCaisse } from '../../../core/models/session-caisse.model';
import {
  LIBELLES_PAIEMENT,
  ModePaiement,
} from '../../../core/models/vente.model';
import { maintenantLocal } from '../../../core/utils/date.utils';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-depense-list',
  imports: [RouterLink, DatePipe, FcfaPipe],
  templateUrl: './depense-list.component.html',
  styleUrl: './depense-list.component.css',
})
export class DepenseListComponent implements OnInit {
  private depenseService = inject(DepenseService);
  private caisseService = inject(CaisseService);
  private employeService = inject(EmployeService);
  private auth = inject(AuthService);

  depenses = signal<Depense[]>([]);
  employes = signal<Employe[]>([]);
  session = signal<SessionCaisse | null>(null); // la caisse ouverte de l'utilisateur connecté
  chargement = signal(true);
  erreur = signal('');
  erreurAction = signal('');
  justificatifOuvert = signal(''); // image affichée en grand

  recherche = signal('');
  filtreCategorie = signal<CategorieDepense | ''>('');
  filtreMode = signal<ModePaiement | ''>('');
  filtreStatut = signal<StatutDepense | ''>('VALIDEE');
  dateDebut = signal('');
  dateFin = signal('');

  libellesCategories = LIBELLES_CATEGORIE_DEPENSE;
  libellesPaiement = LIBELLES_PAIEMENT;

  categories = (
    Object.keys(LIBELLES_CATEGORIE_DEPENSE) as CategorieDepense[]
  ).map((valeur) => ({
    valeur,
    libelle: LIBELLES_CATEGORIE_DEPENSE[valeur],
  }));
  modes = (Object.keys(LIBELLES_PAIEMENT) as ModePaiement[]).map((valeur) => ({
    valeur,
    libelle: LIBELLES_PAIEMENT[valeur],
  }));

  nomsEmployes = computed(
    () => new Map(this.employes().map((e) => [e.id, `${e.prenom} ${e.nom}`])),
  );

  depensesFiltrees = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    const categorie = this.filtreCategorie();
    const mode = this.filtreMode();
    const statut = this.filtreStatut();
    const debut = this.dateDebut();
    const fin = this.dateFin();

    return this.depenses()
      .filter(
        (d) =>
          (!categorie || d.categorie === categorie) &&
          (!mode || d.modePaiement === mode) &&
          (!statut || d.statut === statut) &&
          (!debut || d.date >= debut) &&
          (!fin || d.date <= fin) &&
          (!terme || d.libelle.toLowerCase().includes(terme)),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  });

  /** Total des dépenses validées de la liste affichée. */
  totalPeriode = computed(() =>
    this.depensesFiltrees()
      .filter((d) => d.statut === 'VALIDEE')
      .reduce((total, d) => total + d.montant, 0),
  );

  /** Total du mois en cours, quels que soient les filtres. */
  totalMois = computed(() => {
    const mois = maintenantLocal().slice(0, 7);
    return this.depenses()
      .filter((d) => d.statut === 'VALIDEE' && d.date.slice(0, 7) === mois)
      .reduce((total, d) => total + d.montant, 0);
  });

  /** Répartition par catégorie des dépenses validées de la liste affichée. */
  parCategorie = computed(() => {
    const totaux = new Map<CategorieDepense, number>();
    for (const d of this.depensesFiltrees().filter(
      (x) => x.statut === 'VALIDEE',
    )) {
      totaux.set(d.categorie, (totaux.get(d.categorie) ?? 0) + d.montant);
    }
    const total = this.totalPeriode() || 1;

    return Array.from(totaux, ([categorie, montant]) => ({
      categorie,
      montant,
      pourcentage: Math.round((montant / total) * 100),
    })).sort((a, b) => b.montant - a.montant);
  });

  ngOnInit(): void {
    forkJoin({
      depenses: this.depenseService.getAll(),
      employes: this.employeService.getAll(),
    }).subscribe({
      next: ({ depenses, employes }) => {
        this.depenses.set(depenses);
        this.employes.set(employes);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set(
          'Impossible de charger les dépenses. Vérifie que « npm run api » est lancé.',
        );
        this.chargement.set(false);
      },
    });

    const utilisateur = this.auth.utilisateur();
    if (utilisateur) {
      this.caisseService
        .getOuverte(utilisateur.id)
        .subscribe((s) => this.session.set(s));
    }
  }

  onRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  onCategorie(event: Event): void {
    this.filtreCategorie.set(
      (event.target as HTMLSelectElement).value as CategorieDepense | '',
    );
  }

  onMode(event: Event): void {
    this.filtreMode.set(
      (event.target as HTMLSelectElement).value as ModePaiement | '',
    );
  }

  onStatut(event: Event): void {
    this.filtreStatut.set(
      (event.target as HTMLSelectElement).value as StatutDepense | '',
    );
  }

  onDateDebut(event: Event): void {
    this.dateDebut.set((event.target as HTMLInputElement).value);
  }

  onDateFin(event: Event): void {
    this.dateFin.set((event.target as HTMLInputElement).value);
  }

  reinitialiser(): void {
    this.recherche.set('');
    this.filtreCategorie.set('');
    this.filtreMode.set('');
    this.filtreStatut.set('VALIDEE');
    this.dateDebut.set('');
    this.dateFin.set('');
  }

  annuler(depense: Depense): void {
    const utilisateur = this.auth.utilisateur();
    if (!utilisateur) {
      return;
    }

    const consequence =
      depense.modePaiement === 'ESPECES'
        ? ' Le montant sera remis dans la caisse en cours.'
        : '';
    if (!confirm(`Annuler la dépense « ${depense.libelle} » ?${consequence}`)) {
      return;
    }

    this.erreurAction.set('');
    this.depenseService
      .annuler(depense.id, utilisateur.id, this.session()?.id)
      .subscribe({
        next: (maj) =>
          this.depenses.update((liste) =>
            liste.map((d) => (d.id === maj.id ? maj : d)),
          ),
        error: (err) =>
          this.erreurAction.set(
            err.message ?? "Impossible d'annuler la dépense.",
          ),
      });
  }

  ouvrirJustificatif(url: string): void {
    this.justificatifOuvert.set(url);
  }

  fermerJustificatif(): void {
    this.justificatifOuvert.set('');
  }
}
