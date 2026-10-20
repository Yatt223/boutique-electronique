import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { VenteService } from '../../../core/services/vente.service';
import { EmployeService } from '../../../core/services/employe.service';
import { StockService } from '../../../core/services/stock.service';
import { AuthService } from '../../../core/services/auth.service';
import { CaisseService } from '../../../core/services/caisse.service';
import { SessionCaisse } from '../../../core/models/session-caisse.model';
import { Employe } from '../../../core/models/employe.model';
import {
  LIBELLES_MOTIFS,
  MouvementStock,
} from '../../../core/models/mouvement-stock.model';
import {
  CLASSES_STATUT,
  LIBELLES_PAIEMENT,
  LIBELLES_STATUT,
  TRANSITIONS,
  Vente,
} from '../../../core/models/vente.model';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-vente-detail',
  imports: [RouterLink, DatePipe, FcfaPipe],
  templateUrl: './vente-detail.component.html',
  styleUrl: './vente-detail.component.css',
})
export class VenteDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private venteService = inject(VenteService);
  private employeService = inject(EmployeService);
  private stockService = inject(StockService);
  private auth = inject(AuthService);
  private caisseService = inject(CaisseService);
  session = signal<SessionCaisse | null>(null); // la caisse ouverte de l'utilisateur connecté

  /** Vrai si le remboursement fera sortir des espèces de la caisse. */
  remboursementEnEspeces = computed(() => {
    const v = this.vente();
    return (
      !!v &&
      v.statut === 'PAYEE' &&
      v.modePaiement === 'ESPECES' &&
      v.total - (v.acompteVerse ?? 0) > 0
    );
  });

  vente = signal<Vente | null>(null);
  employes = signal<Employe[]>([]);
  mouvements = signal<MouvementStock[]>([]);
  chargement = signal(true);
  traitement = signal(false);
  erreur = signal('');

  libelles = LIBELLES_STATUT;
  classes = CLASSES_STATUT;
  libellesPaiement = LIBELLES_PAIEMENT;
  libellesMotifs = LIBELLES_MOTIFS;

  nomEmploye = (id: number) => {
    const e = this.employes().find((x) => x.id === id);
    return e ? `${e.prenom} ${e.nom}` : '-';
  };

  peutAgir = computed(() => this.auth.peut('ventes:annuler'));

  peutRembourser = computed(() => {
    const v = this.vente();
    return (
      this.peutAgir() && !!v && TRANSITIONS[v.statut].includes('REMBOURSEE')
    );
  });

  peutAnnuler = computed(() => {
    const v = this.vente();
    return this.peutAgir() && !!v && TRANSITIONS[v.statut].includes('ANNULEE');
  });

  ngOnInit(): void {
    this.charger();
    const utilisateur = this.auth.utilisateur();
    if (utilisateur) {
      this.caisseService
        .getOuverte(utilisateur.id)
        .subscribe((s) => this.session.set(s));
    }
  }

  private charger(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      vente: this.venteService.getById(id),
      employes: this.employeService.getAll(),
      mouvements: this.stockService.getMouvementsVente(id),
    }).subscribe({
      next: ({ vente, employes, mouvements }) => {
        this.vente.set(vente);
        this.employes.set(employes);
        this.mouvements.set(mouvements);
        this.chargement.set(false);
      },
      error: () => this.router.navigate(['/admin/ventes']),
    });
  }

  annuler(): void {
    const vente = this.vente();
    if (!vente) {
      return;
    }
    const consequence =
      vente.statut === 'PAYEE' ? ' Les articles seront remis en stock.' : '';

    if (confirm(`Annuler la vente ${vente.numero} ?${consequence}`)) {
      this.executer((utilisateurId) =>
        this.venteService.annuler(vente.id, utilisateurId, this.session()?.id),
      );
    }
  }

  rembourser(): void {
    const vente = this.vente();
    if (!vente) {
      return;
    }
    if (
      confirm(
        `Rembourser la vente ${vente.numero} (${vente.total} FCFA) ? Les articles seront remis en stock.`,
      )
    ) {
      this.executer((utilisateurId) =>
        this.venteService.annuler(vente.id, utilisateurId, this.session()?.id),
      );
    }
  }

  private executer(
    action: (employeId: number) => ReturnType<VenteService['annuler']>,
  ): void {
    const utilisateur = this.auth.utilisateur();
    if (!utilisateur) {
      return;
    }

    this.erreur.set('');
    this.traitement.set(true);

    action(utilisateur.id).subscribe({
      next: () => {
        this.traitement.set(false);
        this.charger(); // recharge la vente et ses mouvements
      },
      error: (err) => {
        this.traitement.set(false);
        this.erreur.set(err.message ?? 'Opération impossible.');
        this.charger();
      },
    });
  }
}
