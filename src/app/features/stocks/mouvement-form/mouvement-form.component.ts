import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { ProduitService } from '../../../core/services/produit.service';
import { StockService } from '../../../core/services/stock.service';
import { AuthService } from '../../../core/services/auth.service';
import { Produit } from '../../../core/models/produit.model';
import {
  LIBELLES_MOTIFS,
  MotifMouvement,
  MOTIFS_PAR_TYPE,
  TypeMouvement,
} from '../../../core/models/mouvement-stock.model';
import { maintenantLocal } from '../../../core/utils/date.utils';

@Component({
  selector: 'app-mouvement-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './mouvement-form.component.html',
  styleUrl: './mouvement-form.component.css',
})
export class MouvementFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private produitService = inject(ProduitService);
  private stockService = inject(StockService);
  private auth = inject(AuthService);

  libellesMotifs = LIBELLES_MOTIFS;
  produits = signal<Produit[]>([]);
  stockCourant = signal<number | null>(null);
  erreur = signal('');
  enregistrement = signal(false);

  form = this.fb.nonNullable.group({
    produitId: [0, [Validators.required, Validators.min(1)]],
    type: ['ENTREE' as TypeMouvement, Validators.required],
    quantite: [1, [Validators.required, Validators.min(1)]],
    motif: ['ACHAT_FOURNISSEUR' as MotifMouvement, Validators.required],
    commentaire: [''],
  });

  private valeurs = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  motifsDisponibles = computed(
    () => MOTIFS_PAR_TYPE[this.valeurs().type ?? 'ENTREE'],
  );

  stockApres = computed(() => {
    const stock = this.stockCourant();
    if (stock === null) {
      return null;
    }
    const quantite = this.valeurs().quantite ?? 0;
    return this.valeurs().type === 'SORTIE'
      ? stock - quantite
      : stock + quantite;
  });

  depassement = computed(() => {
    const apres = this.stockApres();
    return apres !== null && apres < 0;
  });

  ngOnInit(): void {
    this.produitService.getAll().subscribe((liste) => this.produits.set(liste));

    // Quand le type change, on revient au premier motif autorisé pour ce type
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) =>
        this.form.controls.motif.setValue(MOTIFS_PAR_TYPE[type][0]),
      );

    // Quand le produit change, on recharge son stock
    this.form.controls.produitId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => this.chargerStock(Number(id)));

    // Préremplissage depuis l'état des stocks : ?produitId=3&type=SORTIE
    const params = this.route.snapshot.queryParamMap;
    const type = params.get('type');
    const produitId = Number(params.get('produitId'));

    if (type === 'ENTREE' || type === 'SORTIE') {
      this.form.controls.type.setValue(type);
    }
    if (produitId) {
      this.form.controls.produitId.setValue(produitId);
    }
  }

  private chargerStock(produitId: number): void {
    if (!produitId) {
      this.stockCourant.set(null);
      return;
    }
    this.stockService
      .stockActuel(produitId)
      .subscribe((stock) => this.stockCourant.set(stock));
  }

  onSubmit(): void {
    const utilisateur = this.auth.utilisateur();

    if (this.form.invalid || !utilisateur) {
      this.form.markAllAsTouched();
      return;
    }

    this.erreur.set('');
    this.enregistrement.set(true);
    const v = this.form.getRawValue();

    // On relit le stock au dernier moment : il a pu changer depuis l'affichage du formulaire
    this.stockService
      .stockActuel(v.produitId)
      .pipe(
        switchMap((stock) => {
          if (v.type === 'SORTIE' && v.quantite > stock) {
            throw new Error(
              `Stock insuffisant : seulement ${stock} unité(s) disponible(s).`,
            );
          }
          return this.stockService.creerMouvement({
            produitId: v.produitId,
            type: v.type,
            quantite: v.quantite,
            motif: v.motif,
            date: maintenantLocal(),
            employeId: utilisateur.id,
            commentaire: v.commentaire.trim() || undefined,
          });
        }),
      )
      .subscribe({
        next: () => this.router.navigate(['/admin/stocks']),
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
