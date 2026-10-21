import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/toast/toast.component';
import { BarreChargementComponent } from './shared/barre-chargement/barre-chargement.component';

// dans @Component, tableau imports :

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,ToastComponent, BarreChargementComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'boutique-electronique';
}
