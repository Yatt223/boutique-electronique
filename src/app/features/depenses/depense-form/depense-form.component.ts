import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { map, startWith } from 'rxjs';
import { DepenseService } from '../../../core/services/depense.service';
import { CaisseService } from '../../../core/services/caisse.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  CategorieDepense,
  LIBELLES_CATEGORIE_DEPENSE,
} from '../../../core/models/depense.model';
import { SessionCaisse } from '../../../core/models/session-caisse.model';
import {
  LIBELLES_PAIEMENT,
  ModePaiement,
} from '../../../core/models/vente.model';
import { redimensionnerImage } from '../../../core/utils/images.utils';
import { maintenantLocal } from '../../../core/utils/date.utils';

const TAILLE_MAX_FICHIER = 5 * 1024 * 1024; // 5 Mo

@Component({
  selector: 'app-depense-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './depense-form.component.html',
  styleUrl: './depense-form.component.css',
})
export class DepenseFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private depenseService = inject(DepenseService);
  private caisseService = inject(CaisseService);
  private auth = inject(AuthService);

  session = signal<SessionCaisse | null>(null); // la caisse ouverte de l'utilisateur connecté
  justificatif = signal(''); // data URL de l'image ('' = aucune)
  erreurImage = signal('');
  erreur = signal('');
  enregistrement = signal(false);

  categories = (
    Object.keys(LIBELLES_CATEGORIE_DEPENSE) as CategorieDepense[]
  ).map((valeur) => ({
    valeur,
    libelle: LIBELLES_CATEGORIE_DEPENSE[valeur],
  }));
  modes = (Object.keys(LIBELLES_PAIEMENT) as ModePaiement[]).map((valeur) => ({
    valeur,
    libelle: LIBELLES_PAIEMENT[valeur],
  }));

  form = this.fb.nonNullable.group({
    date: [maintenantLocal().slice(0, 10), Validators.required],
    libelle: ['', [Validators.required, Validators.minLength(3)]],
    categorie: ['AUTRE' as CategorieDepense, Validators.required],
    montant: [0, [Validators.required, Validators.min(1)]],
    modePaiement: ['ESPECES' as ModePaiement, Validators.required],
    notes: [''],
  });

  private valeurs = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { requireSync: true },
  );

  /** Une dépense en espèces ne peut être enregistrée que si l'employé a une caisse ouverte. */
  caisseRequise = computed(
    () => this.valeurs().modePaiement === 'ESPECES' && !this.session(),
  );

  ngOnInit(): void {
    const utilisateur = this.auth.utilisateur();
    if (utilisateur) {
      this.caisseService
        .getOuverte(utilisateur.id)
        .subscribe((s) => this.session.set(s));
    }
  }

  async onFichier(event: Event): Promise<void> {
    const champ = event.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = ''; // permet de re-choisir le même fichier plus tard

    if (!fichier) {
      return;
    }
    this.erreurImage.set('');

    if (!fichier.type.startsWith('image/')) {
      this.erreurImage.set(
        'Le justificatif doit être une image (JPG, PNG, WebP...).',
      );
      return;
    }
    if (fichier.size > TAILLE_MAX_FICHIER) {
      this.erreurImage.set('Image trop lourde (5 Mo maximum).');
      return;
    }

    try {
      // Plus large et de meilleure qualité qu'une photo de produit : un reçu doit rester lisible
      this.justificatif.set(await redimensionnerImage(fichier, 900, 0.8));
    } catch {
      this.erreurImage.set('Impossible de lire cette image.');
    }
  }

  retirerJustificatif(): void {
    this.justificatif.set('');
  }

  onSubmit(): void {
    const utilisateur = this.auth.utilisateur();

    if (this.form.invalid || this.caisseRequise() || !utilisateur) {
      this.form.markAllAsTouched();
      return;
    }

    this.erreur.set('');
    this.enregistrement.set(true);
    const v = this.form.getRawValue();

    this.depenseService
      .creer({
        date: v.date,
        libelle: v.libelle.trim(),
        montant: v.montant,
        categorie: v.categorie,
        modePaiement: v.modePaiement,
        employeId: utilisateur.id,
        sessionId:
          v.modePaiement === 'ESPECES' ? this.session()?.id : undefined,
        justificatifUrl: this.justificatif() || undefined,
        notes: v.notes.trim() || undefined,
      })
      .subscribe({
        next: () => this.router.navigate(['/admin/depenses']),
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
