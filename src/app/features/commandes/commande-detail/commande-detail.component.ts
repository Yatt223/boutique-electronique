import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { CommandeService } from '../../../core/services/commande.service';
import { CaisseService } from '../../../core/services/caisse.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ACTION_SUIVANTE,
  CLASSES_STATUT_COMMANDE,
  Commande,
  ETAPES_COMMANDE,
  LIBELLES_STATUT_COMMANDE,
  TRANSITIONS_COMMANDE,
} from '../../../core/models/commande.model';
import { SessionCaisse } from '../../../core/models/session-caisse.model';
import {
  LIBELLES_PAIEMENT,
  ModePaiement,
} from '../../../core/models/vente.model';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-commande-detail',
  imports: [RouterLink, DatePipe, FcfaPipe],
  templateUrl: './commande-detail.component.html',
  styleUrl: './commande-detail.component.css',
})
export class CommandeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(CommandeService);
  private caisseService = inject(CaisseService);
  private auth = inject(AuthService);

  commande = signal<Commande | null>(null);
  session = signal<SessionCaisse | null>(null); // la caisse ouverte de l'employé connecté
  chargement = signal(true);
  traitement = signal(false);
  erreur = signal('');

  modePaiement = signal<ModePaiement>('ESPECES');
  montantRecu = signal(0);

  libelles = LIBELLES_STATUT_COMMANDE;
  classes = CLASSES_STATUT_COMMANDE;
  libellesPaiement = LIBELLES_PAIEMENT;
  etapes = ETAPES_COMMANDE;
  modes = (Object.keys(LIBELLES_PAIEMENT) as ModePaiement[]).map((valeur) => ({
    valeur,
    libelle: LIBELLES_PAIEMENT[valeur],
  }));

  etapeActive = computed(() => {
    const c = this.commande();
    return c ? ETAPES_COMMANDE.indexOf(c.statut) : -1; // -1 = commande annulée
  });

  reste = computed(() => {
    const c = this.commande();
    return c ? c.total - c.acompte : 0;
  });

  action = computed(() => {
    const c = this.commande();
    return c ? ACTION_SUIVANTE[c.statut] : undefined;
  });

  peutAnnuler = computed(() => {
    const c = this.commande();
    return !!c && TRANSITIONS_COMMANDE[c.statut].includes('ANNULEE');
  });

  monnaie = computed(() =>
    this.modePaiement() === 'ESPECES' ? this.montantRecu() - this.reste() : 0,
  );

  /** Encaisser un solde demande une caisse ouverte. */
  caisseRequise = computed(() => this.reste() > 0 && !this.session());

  peutLivrer = computed(
    () =>
      !this.traitement() &&
      !this.caisseRequise() &&
      (this.reste() === 0 ||
        this.modePaiement() !== 'ESPECES' ||
        this.montantRecu() >= this.reste()),
  );

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
    this.service.getById(id).subscribe({
      next: (commande) => {
        this.commande.set(commande);
        this.chargement.set(false);
      },
      error: () => this.router.navigate(['/admin/commandes']),
    });
  }

  onMode(event: Event): void {
    this.modePaiement.set(
      (event.target as HTMLSelectElement).value as ModePaiement,
    );
  }

  onMontantRecu(event: Event): void {
    this.montantRecu.set(Number((event.target as HTMLInputElement).value) || 0);
  }

  avancer(): void {
    const commande = this.commande();
    const action = this.action();
    if (commande && action) {
      this.executer(this.service.changerStatut(commande.id, action.suivant));
    }
  }

  annuler(): void {
    const commande = this.commande();
    const utilisateur = this.auth.utilisateur();
    if (!commande || !utilisateur) {
      return;
    }

    const remboursement =
      commande.acompte > 0 && commande.modeAcompte === 'ESPECES'
        ? ` Rends ${commande.acompte} FCFA d'acompte au client : une sortie de caisse sera enregistrée.`
        : commande.acompte > 0
          ? ` L'acompte de ${commande.acompte} FCFA a été payé par ${LIBELLES_PAIEMENT[commande.modeAcompte].toLowerCase()} : il doit être remboursé par le même moyen.`
          : '';

    if (confirm(`Annuler la commande ${commande.numero} ?${remboursement}`)) {
      this.executer(
        this.service.changerStatut(
          commande.id,
          'ANNULEE',
          utilisateur.id,
          this.session()?.id,
        ),
      );
    }
  }

  livrer(): void {
    const commande = this.commande();
    const utilisateur = this.auth.utilisateur();
    if (!commande || !utilisateur || !this.peutLivrer()) {
      return;
    }

    // Rien à encaisser : on garde le mode de paiement de l'acompte
    const mode =
      this.reste() === 0 ? commande.modeAcompte : this.modePaiement();
    const montant =
      mode === 'ESPECES' && this.reste() > 0 ? this.montantRecu() : undefined;

    this.executer(
      this.service.livrer(
        commande.id,
        mode,
        montant,
        utilisateur.id,
        this.session()?.id,
      ),
    );
  }

  private executer(action: Observable<unknown>): void {
    this.erreur.set('');
    this.traitement.set(true);

    action.subscribe({
      next: () => {
        this.traitement.set(false);
        this.montantRecu.set(0);
        this.charger();
      },
      error: (err) => {
        this.traitement.set(false);
        this.erreur.set(err.message ?? 'Opération impossible.');
        this.charger();
      },
    });
  }
}
