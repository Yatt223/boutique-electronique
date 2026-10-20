import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, map, startWith } from 'rxjs';
import { CaisseService } from '../../../core/services/caisse.service';
import { VenteService } from '../../../core/services/vente.service';
import { CommandeService } from '../../../core/services/commande.service';
import { MouvementCaisseService } from '../../../core/services/mouvement-caisse.service';
import { EmployeService } from '../../../core/services/employe.service';
import { AuthService } from '../../../core/services/auth.service';
import { Commande } from '../../../core/models/commande.model';
import { Employe } from '../../../core/models/employe.model';
import {
  LIBELLES_MOTIFS_CAISSE,
  MotifMouvementCaisse,
  MouvementCaisse,
  MOTIFS_MANUELS_PAR_TYPE,
  TypeMouvementCaisse,
} from '../../../core/models/mouvement-caisse.model';
import {
  LIBELLES_STATUT_SESSION,
  SessionCaisse,
} from '../../../core/models/session-caisse.model';
import {
  CLASSES_STATUT,
  LIBELLES_PAIEMENT,
  LIBELLES_STATUT,
  Vente,
} from '../../../core/models/vente.model';
import { totauxAffiches } from '../../../core/utils/caisse.utils';
import { maintenantLocal } from '../../../core/utils/date.utils';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-session-detail',
  imports: [RouterLink, DatePipe, FcfaPipe, ReactiveFormsModule],
  templateUrl: './session-detail.component.html',
  styleUrl: './session-detail.component.css',
})
export class SessionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private caisseService = inject(CaisseService);
  private venteService = inject(VenteService);
  private commandeService = inject(CommandeService);
  private mouvementCaisseService = inject(MouvementCaisseService);
  private employeService = inject(EmployeService);
  private auth = inject(AuthService);

  session = signal<SessionCaisse | null>(null);
  ventes = signal<Vente[]>([]);
  commandes = signal<Commande[]>([]);
  mouvements = signal<MouvementCaisse[]>([]);
  employes = signal<Employe[]>([]);

  erreur = signal('');
  enregistrement = signal(false);

  libellesPaiement = LIBELLES_PAIEMENT;
  libellesStatutSession = LIBELLES_STATUT_SESSION;
  libellesStatut = LIBELLES_STATUT;
  classesStatut = CLASSES_STATUT;
  libellesMotifs = LIBELLES_MOTIFS_CAISSE;

  form = this.fb.nonNullable.group({
    type: ['SORTIE' as TypeMouvementCaisse],
    montant: [0, [Validators.required, Validators.min(1)]],
    motif: ['VERSEMENT_BANQUE' as MotifMouvementCaisse],
    commentaire: [''],
  });

  private valeurs = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { requireSync: true },
  );

  motifsDisponibles = computed(
    () => MOTIFS_MANUELS_PAR_TYPE[this.valeurs().type],
  );

  totaux = computed(() => {
    const session = this.session();
    return session
      ? totauxAffiches(
          session,
          this.ventes(),
          this.commandes(),
          this.mouvements(),
        )
      : null;
  });

  nomEmploye = (id: number) => {
    const e = this.employes().find((x) => x.id === id);
    return e ? `${e.prenom} ${e.nom}` : '-';
  };

  nomCaissier = computed(() => {
    const session = this.session();
    return session ? this.nomEmploye(session.employeId) : '-';
  });

  ventesTriees = computed(() =>
    [...this.ventes()].sort((a, b) => b.date.localeCompare(a.date)),
  );

  mouvementsTries = computed(() =>
    [...this.mouvements()].sort((a, b) => b.date.localeCompare(a.date)),
  );

  ngOnInit(): void {
    this.charger();

    // Quand le type change, on revient au premier motif autorisé pour ce type
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) =>
        this.form.controls.motif.setValue(MOTIFS_MANUELS_PAR_TYPE[type][0]),
      );
  }

  private charger(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      session: this.caisseService.getById(id),
      ventes: this.venteService.getBySession(id),
      commandes: this.commandeService.getBySession(id),
      mouvements: this.mouvementCaisseService.getBySession(id),
      employes: this.employeService.getAll(),
    }).subscribe({
      next: ({ session, ventes, commandes, mouvements, employes }) => {
        this.session.set(session);
        this.ventes.set(ventes);
        this.commandes.set(commandes);
        this.mouvements.set(mouvements);
        this.employes.set(employes);
      },
      error: () => this.router.navigate(['/admin/caisse']),
    });
  }

  ajouterMouvement(): void {
    const session = this.session();
    const utilisateur = this.auth.utilisateur();

    if (!session || !utilisateur || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const attendues = this.totaux()?.especesAttendues ?? 0;

    if (v.type === 'SORTIE' && v.montant > attendues) {
      this.erreur.set(
        'Ce montant dépasse les espèces présentes dans la caisse.',
      );
      return;
    }

    this.erreur.set('');
    this.enregistrement.set(true);

    this.mouvementCaisseService
      .creer({
        sessionId: session.id,
        type: v.type,
        montant: v.montant,
        motif: v.motif,
        date: maintenantLocal(),
        employeId: utilisateur.id,
        commentaire: v.commentaire.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.enregistrement.set(false);
          this.form.patchValue({ montant: 0, commentaire: '' });
          this.form.controls.montant.markAsUntouched();
          this.charger();
        },
        error: (err) => {
          this.enregistrement.set(false);
          this.erreur.set(
            err.message ?? "Impossible d'enregistrer le mouvement.",
          );
        },
      });
  }
}
