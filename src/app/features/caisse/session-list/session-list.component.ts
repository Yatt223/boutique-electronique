import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CaisseService } from '../../../core/services/caisse.service';
import { VenteService } from '../../../core/services/vente.service';
import { EmployeService } from '../../../core/services/employe.service';
import { Employe } from '../../../core/models/employe.model';
import { CommandeService } from '../../../core/services/commande.service';
import { Commande } from '../../../core/models/commande.model';
import {
  LIBELLES_STATUT_SESSION,
  SessionCaisse,
  StatutSession,
} from '../../../core/models/session-caisse.model';
import { Vente } from '../../../core/models/vente.model';
import { MouvementCaisseService } from '../../../core/services/mouvement-caisse.service';
import { MouvementCaisse } from '../../../core/models/mouvement-caisse.model';
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
  private commandeService = inject(CommandeService);
  private mouvementCaisseService = inject(MouvementCaisseService);

  commandes = signal<Commande[]>([]);
  sessions = signal<SessionCaisse[]>([]);
  ventes = signal<Vente[]>([]);
  employes = signal<Employe[]>([]);
  mouvements = signal<MouvementCaisse[]>([]);
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
        totaux: totauxAffiches(
          session,
          this.ventes(),
          this.commandes(),
          this.mouvements(),
        ),
      }))
      .sort((a, b) =>
        b.session.dateOuverture.localeCompare(a.session.dateOuverture),
      );
  });

  resume = computed(() => {
    const aujourdhui = maintenantLocal().slice(0, 10);
    const sessions = this.sessions();

    const ventesDuJour = this.ventes()
      .filter((v) => v.statut === 'PAYEE' && v.date.slice(0, 10) === aujourdhui)
      .reduce((total, v) => total + v.total - (v.acompteVerse ?? 0), 0);

    const acomptesDuJour = this.commandes()
      .filter(
        (c) =>
          c.statut !== 'ANNULEE' &&
          c.sessionId !== undefined &&
          c.date.slice(0, 10) === aujourdhui,
      )
      .reduce((total, c) => total + c.acompte, 0);

    return {
      ouvertes: sessions.filter((s) => s.statut === 'OUVERTE').length,
      encaisseAujourdhui: ventesDuJour + acomptesDuJour,
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
      commandes: this.commandeService.getAll(),
      mouvements: this.mouvementCaisseService.getAll(),
      employes: this.employeService.getAll(),
    }).subscribe({
      next: ({ sessions, ventes, commandes, mouvements, employes }) => {
        this.sessions.set(sessions);
        this.ventes.set(ventes);
        this.commandes.set(commandes);
        this.mouvements.set(mouvements);
        this.employes.set(employes);
        this.chargement.set(false);
      },
      // error: inchangé
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
