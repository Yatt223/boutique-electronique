import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { EmployeService } from '../../../core/services/employe.service';
import { AuthService } from '../../../core/services/auth.service';
import { Employe, LISTE_ROLES, Role } from '../../../core/models/employe.model';

@Component({
  selector: 'app-employe-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './employe-form.component.html',
  styleUrl: './employe-form.component.css',
})
export class EmployeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(EmployeService);
  private auth = inject(AuthService);

  roles = LISTE_ROLES;
  employeId: number | null = null;
  enregistrement = signal(false);
  erreur = signal('');

  form = this.fb.nonNullable.group({
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    nom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    motDePasse: [''],
    role: ['CAISSIER' as Role, Validators.required],
    dateEmbauche: [new Date().toLocaleDateString('sv-SE'), Validators.required],
    actif: [true],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      // Création : le mot de passe est obligatoire
      this.form.controls.motDePasse.setValidators([
        Validators.required,
        Validators.minLength(6),
      ]);
      this.form.controls.motDePasse.updateValueAndValidity();
      return;
    }

    this.employeId = Number(id);
    this.service.getById(this.employeId).subscribe({
      next: (employe) => {
        this.form.patchValue({ ...employe, motDePasse: '' });
        // On ne peut pas changer son propre rôle ni se désactiver
        if (employe.id === this.auth.utilisateur()?.id) {
          this.form.controls.role.disable();
          this.form.controls.actif.disable();
        }
      },
      error: () => this.router.navigate(['/admin/employes']),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.erreur.set('');
    this.enregistrement.set(true);

    const { motDePasse, ...valeurs } = this.form.getRawValue();

    this.service
      .existeEmail(valeurs.email, this.employeId ?? undefined)
      .pipe(
        switchMap((existe) => {
          if (existe) {
            throw new Error('EMAIL_EXISTANT');
          }
          if (this.employeId) {
            // Mot de passe vide = on ne le modifie pas
            const modifications: Partial<Omit<Employe, 'id'>> = motDePasse
              ? { ...valeurs, motDePasse }
              : valeurs;
            return this.service.modifier(this.employeId, modifications);
          }
          return this.service.creer({ ...valeurs, motDePasse });
        }),
      )
      .subscribe({
        next: () => this.router.navigate(['/admin/employes']),
        error: (err) => {
          this.enregistrement.set(false);
          this.erreur.set(
            err instanceof HttpErrorResponse
              ? 'Impossible de joindre le serveur.'
              : 'Cet email est déjà utilisé par un autre employé.',
          );
        },
      });
  }
}
