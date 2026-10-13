import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { VenteService } from '../../../core/services/vente.service';
import { EmployeService } from '../../../core/services/employe.service';
import { Employe } from '../../../core/models/employe.model';
import {
  CLASSES_STATUT,
  LIBELLES_PAIEMENT,
  LIBELLES_STATUT,
  ModePaiement,
  StatutVente,
  Vente,
} from '../../../core/models/vente.model';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-vente-list',
  imports: [RouterLink, DatePipe, FcfaPipe],
  templateUrl: './vente-list.component.html',
  styleUrl: './vente-list.component.css',
})
export class VenteListComponent implements OnInit {
  private venteService = inject(VenteService);
  private employeService = inject(EmployeService);

  ventes = signal<Vente[]>([]);
  employes = signal<Employe[]>([]);
  chargement = signal(true);
  erreur = signal('');

  recherche = signal('');
  filtreStatut = signal<StatutVente | ''>('');
  filtreMode = signal<ModePaiement | ''>('');
  dateDebut = signal('');
  dateFin = signal('');

  libelles = LIBELLES_STATUT;
  classes = CLASSES_STATUT;
  libellesPaiement = LIBELLES_PAIEMENT;

  statuts = (Object.keys(LIBELLES_STATUT) as StatutVente[]).map((valeur) => ({
    valeur,
    libelle: LIBELLES_STATUT[valeur],
  }));
  modes = (Object.keys(LIBELLES_PAIEMENT) as ModePaiement[]).map((valeur) => ({
    valeur,
    libelle: LIBELLES_PAIEMENT[valeur],
  }));

  nomsEmployes = computed(
    () => new Map(this.employes().map((e) => [e.id, `${e.prenom} ${e.nom}`])),
  );

  ventesFiltrees = computed(() => {
    const terme = this.recherche().trim().toUpperCase();
    const statut = this.filtreStatut();
    const mode = this.filtreMode();
    const debut = this.dateDebut();
    const fin = this.dateFin();

    return this.ventes()
      .filter(
        (v) =>
          (!statut || v.statut === statut) &&
          (!mode || v.modePaiement === mode) &&
          (!debut || v.date.slice(0, 10) >= debut) &&
          (!fin || v.date.slice(0, 10) <= fin) &&
          (!terme || v.numero.toUpperCase().includes(terme)),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  /** Indicateurs : seules les ventes payées comptent dans le chiffre d'affaires. */
  resume = computed(() => {
    const filtrees = this.ventesFiltrees();
    const payees = filtrees.filter((v) => v.statut === 'PAYEE');
    const chiffreAffaires = payees.reduce((total, v) => total + v.total, 0);

    return {
      chiffreAffaires,
      nombre: payees.length,
      panierMoyen: payees.length
        ? Math.round(chiffreAffaires / payees.length)
        : 0,
      enAttente: filtrees.filter((v) => v.statut === 'EN_ATTENTE').length,
    };
  });

  ngOnInit(): void {
    forkJoin({
      ventes: this.venteService.getAll(),
      employes: this.employeService.getAll(),
    }).subscribe({
      next: ({ ventes, employes }) => {
        this.ventes.set(ventes);
        this.employes.set(employes);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les ventes.');
        this.chargement.set(false);
      },
    });
  }

  nombreArticles(vente: Vente): number {
    return vente.lignes.reduce((total, l) => total + l.quantite, 0);
  }

  onRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  onStatut(event: Event): void {
    this.filtreStatut.set(
      (event.target as HTMLSelectElement).value as StatutVente | '',
    );
  }

  onMode(event: Event): void {
    this.filtreMode.set(
      (event.target as HTMLSelectElement).value as ModePaiement | '',
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
    this.filtreStatut.set('');
    this.filtreMode.set('');
    this.dateDebut.set('');
    this.dateFin.set('');
  }
}
