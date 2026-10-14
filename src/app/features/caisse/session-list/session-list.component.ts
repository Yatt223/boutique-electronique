import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CaisseService } from '../../../core/services/caisse.service';
import { VenteService } from '../../../core/services/vente.service';
import { EmployeService } from '../../../core/services/employe.service';
import { Employe } from '../../../core/models/employe.model';
import {
  LIBELLES_STATUT_SESSION,
  SessionCaisse,
  StatutSession,
} from '../../../core/models/session-caisse.model';
import { Vente } from '../../../core/models/vente.model';
import {
  TotauxSession,
  totauxAffiches,
} from '../../../core/utils/caisse.utils';
import { maintenantLocal } from '../../../core/utils/date.utils';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

interface LigneSession {
  session: SessionCaisse;
  totaux: TotauxSession;
}

@Component({
  selector: 'app-session-list',
  imports: [RouterLink, DatePipe, FcfaPipe],
  templateUrl: './session-list.component.html',
  styleUrl: './session-list.component.css',
})
export class SessionListComponent implements OnInit {
  private caisseService = inject(CaisseService);
  private venteService = inject(VenteService);
  private employeService = inject(EmployeService);

  sessions = signal<SessionCaisse[]>([]);
  ventes = signal<Vente[]>([]);
  employes = signal<Employe[]>([]);
  chargement = signal(true);
  erreur = signal('');

  filtreStatut = signal<StatutSession | ''>('');
  libelles = LIBELLES_STATUT_SESSION;

  nomsEmployes = computed(
    () => new Map(this.employes().map((e) => [e.id, `${e.prenom} ${e.nom}`])),
  );

  lignes = computed<LigneSession[]>(() => {
    const statut = this.filtreStatut();
    return this.sessions()
      .filter((s) => !statut || s.statut === statut)
      .map((session) => ({
        session,
        totaux: totauxAffiches(session, this.ventes()),
      }))
      .sort((a, b) =>
        b.session.dateOuverture.localeCompare(a.session.dateOuverture),
      );
  });

  resume = computed(() => {
    const aujourdhui = maintenantLocal().slice(0, 10);
    const sessions = this.sessions();

    return {
      ouvertes: sessions.filter((s) => s.statut === 'OUVERTE').length,
      encaisseAujourdhui: this.ventes()
        .filter(
          (v) => v.statut === 'PAYEE' && v.date.slice(0, 10) === aujourdhui,
        )
        .reduce((total, v) => total + v.total, 0),
      ecartDuJour: sessions
        .filter(
          (s) =>
            s.statut === 'CLOTUREE' &&
            s.dateCloture?.slice(0, 10) === aujourdhui,
        )
        .reduce((total, s) => total + (s.ecart ?? 0), 0),
    };
  });

  ngOnInit(): void {
    forkJoin({
      sessions: this.caisseService.getAll(),
      ventes: this.venteService.getAll(),
      employes: this.employeService.getAll(),
    }).subscribe({
      next: ({ sessions, ventes, employes }) => {
        this.sessions.set(sessions);
        this.ventes.set(ventes);
        this.employes.set(employes);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les sessions de caisse.');
        this.chargement.set(false);
      },
    });
  }

  onStatut(event: Event): void {
    this.filtreStatut.set(
      (event.target as HTMLSelectElement).value as StatutSession | '',
    );
  }

  classeEcart(ecart: number | undefined): string {
    if (ecart === undefined || ecart === 0) {
      return 'badge-vert';
    }
    return ecart < 0 ? 'badge-rouge' : 'badge-orange';
  }
}
