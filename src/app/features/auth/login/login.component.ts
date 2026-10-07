import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  erreur = signal('');
  chargement = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', Validators.required],
  });

  constructor() {
    // Déjà connecté : inutile de revoir la page de connexion
    if (this.auth.estConnecte()) {
      this.router.navigate([this.auth.routeParDefaut()]);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.erreur.set('');
    this.chargement.set(true);
    const { email, motDePasse } = this.form.getRawValue();

    this.auth.login(email, motDePasse).subscribe({
      next: () => this.router.navigate([this.auth.routeParDefaut()]),
      error: err => {
        this.chargement.set(false);
        this.erreur.set(
          err instanceof HttpErrorResponse
            ? "Impossible de joindre le serveur. Vérifie que « npm run api » est lancé."
            : 'Email ou mot de passe incorrect.'
        );
      },
    });
  }
}