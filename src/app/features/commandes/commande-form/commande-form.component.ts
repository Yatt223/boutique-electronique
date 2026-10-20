import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map,startWith } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommandeService } from '../../../core/services/commande.service';
import { CaisseService } from '../../../core/services/caisse.service';
import { ProduitService } from '../../../core/services/produit.service';
import { AuthService } from '../../../core/services/auth.service';
import { Produit } from '../../../core/models/produit.model';
import { LigneArticle } from '../../../core/models/ligne-article.model';
import { SessionCaisse } from '../../../core/models/session-caisse.model';
import {
  LIBELLES_PAIEMENT,
  ModePaiement,
} from '../../../core/models/vente.model';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-commande-form',
  imports: [ReactiveFormsModule, RouterLink, FcfaPipe],
  templateUrl: './commande-form.component.html',
  styleUrl: './commande-form.component.css',
})
export class CommandeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private commandeService = inject(CommandeService);
  private caisseService = inject(CaisseService);
  private produitService = inject(ProduitService);
  private auth = inject(AuthService);

  produits = signal<Produit[]>([]);
  session = signal<SessionCaisse | null>(null); // la caisse ouverte de l'employé connecté
  erreur = signal('');
  enregistrement = signal(false);

  modes = (Object.keys(LIBELLES_PAIEMENT) as ModePaiement[]).map((valeur) => ({
    valeur,
    libelle: LIBELLES_PAIEMENT[valeur],
  }));

  form = this.fb.nonNullable.group({
    clientNom: ['', [Validators.required, Validators.minLength(2)]],
    clientTelephone: [
      '',
      [Validators.required, Validators.pattern(/^[0-9 +().-]{6,20}$/)],
    ],
    lignes: this.fb.nonNullable.array(
      [this.nouvelleLigne()],
      [Validators.minLength(1)],
    ),
    acompte: [0, [Validators.required, Validators.min(0)]],
    modeAcompte: ['ESPECES' as ModePaiement],
    notes: [''],
  });

   /** Valeurs complètes du formulaire, relues à chaque changement (saisie, ajout ou retrait de ligne). */
  private valeurs = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue())
    ),
    { requireSync: true }
  );

  total = computed(() => {
    const prix = new Map(this.produits().map(p => [p.id, p.prixVente]));
    return this.valeurs().lignes.reduce(
      (somme, l) => somme + (prix.get(Number(l.produitId)) ?? 0) * (Number(l.quantite) || 0),
      0
    );
  });
  acompte = computed(() => Number(this.valeurs().acompte) || 0);
  reste = computed(() => this.total() - this.acompte());
  acompteTropEleve = computed(() => this.acompte() > this.total());
  
  /** Un acompte ne peut être encaissé que si l'employé a une caisse ouverte. */
  caisseRequise = computed(() => this.acompte() > 0 && !this.session());

  get lignes() {
    return this.form.controls.lignes;
  }

  ngOnInit(): void {
    this.produitService
      .getAll()
      .subscribe((liste) => this.produits.set(liste.filter((p) => p.actif)));

    const utilisateur = this.auth.utilisateur();
    if (utilisateur) {
      this.caisseService
        .getOuverte(utilisateur.id)
        .subscribe((s) => this.session.set(s));
    }
  }

  private nouvelleLigne() {
    return this.fb.nonNullable.group({
      produitId: [0, [Validators.required, Validators.min(1)]],
      quantite: [1, [Validators.required, Validators.min(1)]],
    });
  }

  ajouterLigne(): void {
    this.lignes.push(this.nouvelleLigne());
  }

  retirerLigne(index: number): void {
    if (this.lignes.length > 1) {
      this.lignes.removeAt(index);
    }
  }

  prixDe(produitId: number): number {
    return (
      this.produits().find((p) => p.id === Number(produitId))?.prixVente ?? 0
    );
  }

  onSubmit(): void {
    const utilisateur = this.auth.utilisateur();

    if (
      this.form.invalid ||
      this.acompteTropEleve() ||
      this.caisseRequise() ||
      !utilisateur
    ) {
      this.form.markAllAsTouched();
      return;
    }

    this.erreur.set('');
    this.enregistrement.set(true);
    const v = this.form.getRawValue();

    // Si le même produit est choisi sur deux lignes, on additionne les quantités
    const quantites = new Map<number, number>();
    for (const l of v.lignes) {
      quantites.set(
        l.produitId,
        (quantites.get(l.produitId) ?? 0) + l.quantite,
      );
    }

    const lignes: LigneArticle[] = [];
    for (const [produitId, quantite] of quantites) {
      const produit = this.produits().find((p) => p.id === produitId);
      if (produit) {
        lignes.push({
          produitId,
          nomProduit: produit.nom,
          prixUnitaire: produit.prixVente,
          quantite,
        });
      }
    }

    this.commandeService
      .creer({
        clientNom: v.clientNom.trim(),
        clientTelephone: v.clientTelephone.trim(),
        employeId: utilisateur.id,
        lignes,
        acompte: v.acompte,
        modeAcompte: v.modeAcompte,
        sessionId: v.acompte > 0 ? this.session()?.id : undefined,
        notes: v.notes.trim() || undefined,
      })
      .subscribe({
        next: (commande) =>
          this.router.navigate(['/admin/commandes', commande.id]),
        error: (err) => {
          this.enregistrement.set(false);
          this.erreur.set(
            err instanceof HttpErrorResponse
              ? 'Impossible de joindre le serveur.'
              : err.message,
          );
        },
      });
  }
}
