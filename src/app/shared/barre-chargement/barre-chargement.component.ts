import { Component, inject } from '@angular/core';
import { ChargementService } from '../../core/services/chargement.service';

@Component({
  selector: 'app-barre-chargement',
  imports: [],
  templateUrl: './barre-chargement.component.html',
  styleUrl: './barre-chargement.component.css',
})
export class BarreChargementComponent {
  chargement = inject(ChargementService);
}
