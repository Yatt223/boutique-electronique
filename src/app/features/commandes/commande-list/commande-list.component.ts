import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommandeService } from '../../../core/services/commande.service';
import {
  CLASSES_STATUT_COMMANDE,
  Commande,
  LIBELLES_STATUT_COMMANDE,
  StatutCommande,
} from '../../../core/models/commande.model';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-commande-list',
  imports: [RouterLink, DatePipe, FcfaPipe],
  templateUrl: './commande-list.component.html',
  styleUrl: './commande-list.component.css',
})
export class CommandeListComponent implements OnInit {
  private service = inject(CommandeService);

  commandes = signal<Commande[]>([]);
  chargement = signal(true);
  erreur = signal('');

  recherche = signal('');
  filtreStatut = signal<StatutCommande | ''>('');

  libelles = LIBELLES_STATUT_COMMANDE;
  classes = CLASSES_STATUT_COMMANDE;
  statuts = (Object.keys(LIBELLES_STATUT_COMMANDE) as StatutCommande[]).map(
    (valeur) => ({
      valeur,
      libelle: LIBELLES_STATUT_COMMANDE[valeur],
    }),
  );

  commandesFiltrees = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    const statut = this.filtreStatut();

    return this.commandes()
      .filter(
        (c) =>
          (!statut || c.statut === statut) &&
          (!terme ||
            `${c.numero} ${c.clientNom} ${c.clientTelephone}`
              .toLowerCase()
              .includes(terme)),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  resume = computed(() => {
    const liste = this.commandes();
    const ouvertes = liste.filter((c) =>
      ['NOUVELLE', 'CONFIRMEE', 'PRETE'].includes(c.statut),
    );

    return {
      nouvelles: liste.filter((c) => c.statut === 'NOUVELLE').length,
      enCours: liste.filter((c) => c.statut === 'CONFIRMEE').length,
      pretes: liste.filter((c) => c.statut === 'PRETE').length,
      resteAEncaisser: ouvertes.reduce(
        (total, c) => total + (c.total - c.acompte),
        0,
      ),
    };
  });

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: (liste) => {
        this.commandes.set(liste);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les commandes.');
        this.chargement.set(false);
      },
    });
  }

  compte(statut: StatutCommande): number {
    return this.commandes().filter((c) => c.statut === statut).length;
  }

  reste(commande: Commande): number {
    return commande.total - commande.acompte;
  }

  onRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
  }
}
