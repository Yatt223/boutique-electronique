import { Component,inject,computed } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-caisse-layout',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './caisse-layout.component.html',
  styleUrl: './caisse-layout.component.css',
})
export class CaisseLayoutComponent {
  private auth = inject(AuthService);

  utilisateur = this.auth.utilisateur;
  peutAdministrer = computed(() => this.auth.role() !== 'CAISSIER');

  deconnexion(): void {
    this.auth.logout();
  }
}
