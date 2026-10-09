import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { StockService } from '../../../core/services/stock.service';
import { ProduitService } from '../../../core/services/produit.service';
import { EmployeService } from '../../../core/services/employe.service';
import { Produit } from '../../../core/models/produit.model';
import { Employe } from '../../../core/models/employe.model';
import {
  LIBELLES_MOTIFS,
  MotifMouvement,
  MouvementStock,
  TypeMouvement,
} from '../../../core/models/mouvement-stock.model';

@Component({
  selector: 'app-mouvement-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './mouvement-list.component.html',
  styleUrl: './mouvement-list.component.css',
})
export class MouvementListComponent implements OnInit {
  private stockService = inject(StockService);
  private produitService = inject(ProduitService);
  private employeService = inject(EmployeService);

  mouvements = signal<MouvementStock[]>([]);
  produits = signal<Produit[]>([]);
  employes = signal<Employe[]>([]);
  chargement = signal(true);
  erreur = signal('');

  filtreProduit = signal(0);
  filtreType = signal<TypeMouvement | ''>('');
  filtreMotif = signal<MotifMouvement | ''>('');

  libellesMotifs = LIBELLES_MOTIFS;
  motifs = (Object.keys(LIBELLES_MOTIFS) as MotifMouvement[]).map((valeur) => ({
    valeur,
    libelle: LIBELLES_MOTIFS[valeur],
  }));

  nomsProduits = computed(
    () => new Map(this.produits().map((p) => [p.id, p.nom])),
  );
  nomsEmployes = computed(
    () => new Map(this.employes().map((e) => [e.id, `${e.prenom} ${e.nom}`])),
  );

  mouvementsFiltres = computed(() => {
    const produitId = this.filtreProduit();
    const type = this.filtreType();
    const motif = this.filtreMotif();

    return this.mouvements()
      .filter(
        (m) =>
          (!produitId || m.produitId === produitId) &&
          (!type || m.type === type) &&
          (!motif || m.motif === motif),
      )
      .sort((a, b) => b.date.localeCompare(a.date)); // le plus récent d'abord
  });

  totaux = computed(() => {
    let entrees = 0;
    let sorties = 0;
    for (const m of this.mouvementsFiltres()) {
      if (m.type === 'ENTREE') {
        entrees += m.quantite;
      } else {
        sorties += m.quantite;
      }
    }
    return { entrees, sorties };
  });

  ngOnInit(): void {
    forkJoin({
      mouvements: this.stockService.getMouvements(),
      produits: this.produitService.getAll(),
      employes: this.employeService.getAll(),
    }).subscribe({
      next: ({ mouvements, produits, employes }) => {
        this.mouvements.set(mouvements);
        this.produits.set(produits);
        this.employes.set(employes);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set("Impossible de charger l'historique.");
        this.chargement.set(false);
      },
    });
  }

  onFiltreProduit(event: Event): void {
    this.filtreProduit.set(Number((event.target as HTMLSelectElement).value));
  }

  onFiltreType(event: Event): void {
    this.filtreType.set(
      (event.target as HTMLSelectElement).value as TypeMouvement | '',
    );
  }

  onFiltreMotif(event: Event): void {
    this.filtreMotif.set(
      (event.target as HTMLSelectElement).value as MotifMouvement | '',
    );
  }
}
