import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { ProduitService } from '../../../core/services/produit.service';
import { CategorieService } from '../../../core/services/categorie.service';
import { Categorie } from '../../../core/models/categorie.model';
import { EtatProduit } from '../../../core/models/produit.model';
import { redimensionnerImage } from '../../../core/utils/images.utils';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

const TAILLE_MAX_FICHIER = 5 * 1024 * 1024; // 5 Mo

@Component({
  selector: 'app-produit-form',
  imports: [ReactiveFormsModule, RouterLink, FcfaPipe],
  templateUrl: './produit-form.component.html',
  styleUrl: './produit-form.component.css',
})
export class ProduitFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private produitService = inject(ProduitService);
  private categorieService = inject(CategorieService);

  categories = signal<Categorie[]>([]);
  produitId: number | null = null;

  imageUrl = signal(''); // data URL de l'image ('' = aucune)
  erreurImage = signal('');
  erreur = signal('');
  enregistrement = signal(false);

  form = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    reference: ['', Validators.required],
    categorieId: [0, [Validators.required, Validators.min(1)]],
    etat: ['NEUF' as EtatProduit, Validators.required],
    prixAchat: [0, [Validators.required, Validators.min(0)]],
    prixVente: [0, [Validators.required, Validators.min(1)]],
    seuilAlerte: [5, [Validators.required, Validators.min(0)]],
    description: [''],
    actif: [true],
  });

  /** Les valeurs du formulaire, converties en signal pour calculer la marge en direct. */
  private valeurs = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  marge = computed(
    () => (this.valeurs().prixVente ?? 0) - (this.valeurs().prixAchat ?? 0),
  );

  ngOnInit(): void {
    this.categorieService
      .getAll()
      .subscribe((liste) => this.categories.set(liste));

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.produitId = Number(id);
    this.produitService.getById(this.produitId).subscribe({
      next: (produit) => {
        this.form.patchValue(produit);
        this.imageUrl.set(produit.imageUrl ?? '');
      },
      error: () => this.router.navigate(['/admin/produits']),
    });
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
        'Le fichier doit être une image (JPG, PNG, WebP...).',
      );
      return;
    }
    if (fichier.size > TAILLE_MAX_FICHIER) {
      this.erreurImage.set('Image trop lourde (5 Mo maximum).');
      return;
    }

    try {
      this.imageUrl.set(await redimensionnerImage(fichier));
    } catch {
      this.erreurImage.set('Impossible de lire cette image.');
    }
  }

  retirerImage(): void {
    this.imageUrl.set('');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.erreur.set('');
    this.enregistrement.set(true);

    const valeurs = {
      ...this.form.getRawValue(),
      reference: this.form.controls.reference.value.trim().toUpperCase(),
      imageUrl: this.imageUrl(),
    };

    this.produitService
      .existeReference(valeurs.reference, this.produitId ?? undefined)
      .pipe(
        switchMap((existe) => {
          if (existe) {
            throw new Error('REFERENCE_EXISTANTE');
          }
          return this.produitId
            ? this.produitService.modifier(this.produitId, valeurs)
            : this.produitService.creer(valeurs);
        }),
      )
      .subscribe({
        next: () => this.router.navigate(['/admin/produits']),
        error: (err) => {
          this.enregistrement.set(false);
          this.erreur.set(
            err instanceof HttpErrorResponse
              ? 'Impossible de joindre le serveur.'
              : 'Cette référence est déjà utilisée par un autre produit.',
          );
        },
      });
  }
}
