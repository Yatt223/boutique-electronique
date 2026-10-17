import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CaisseService } from '../../../core/services/caisse.service';
import { VenteService } from '../../../core/services/vente.service';
import { CommandeService } from '../../../core/services/commande.service';
import { EmployeService } from '../../../core/services/employe.service';
import { Commande } from '../../../core/models/commande.model';
import { Employe } from '../../../core/models/employe.model';
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
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-session-detail',
  imports: [RouterLink, DatePipe, FcfaPipe],
  templateUrl: './session-detail.component.html',
  styleUrl: './session-detail.component.css',
})
export class SessionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private caisseService = inject(CaisseService);
  private venteService = inject(VenteService);
  private commandeService = inject(CommandeService);
  private employeService = inject(EmployeService);

  session = signal<SessionCaisse | null>(null);
  ventes = signal<Vente[]>([]);
  commandes = signal<Commande[]>([]);
  employes = signal<Employe[]>([]);

  libellesPaiement = LIBELLES_PAIEMENT;
  libellesStatutSession = LIBELLES_STATUT_SESSION;
  libellesStatut = LIBELLES_STATUT;
  classesStatut = CLASSES_STATUT;

  totaux = computed(() => {
    const session = this.session();
    return session
      ? totauxAffiches(session, this.ventes(), this.commandes())
      : null;
  });

  nomCaissier = computed(() => {
    const session = this.session();
    const employe = this.employes().find((e) => e.id === session?.employeId);
    return employe ? `${employe.prenom} ${employe.nom}` : '-';
  });

  ventesTriees = computed(() =>
    [...this.ventes()].sort((a, b) => b.date.localeCompare(a.date)),
  );

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      session: this.caisseService.getById(id),
      ventes: this.venteService.getBySession(id),
      commandes: this.commandeService.getBySession(id),
      employes: this.employeService.getAll(),
    }).subscribe({
      next: ({ session, ventes, commandes, employes }) => {
        this.session.set(session);
        this.ventes.set(ventes);
        this.commandes.set(commandes);
        this.employes.set(employes);
      },
      error: () => this.router.navigate(['/admin/caisse']),
    });
  }
}
