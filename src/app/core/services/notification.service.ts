import { Injectable, signal } from '@angular/core';

export type TypeNotification = 'succes' | 'erreur' | 'info';

export interface Notification {
  id: number;
  type: TypeNotification;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();
  private compteur = 0;

  succes(message: string): void {
    this.afficher('succes', message, 3500);
  }

  erreur(message: string): void {
    this.afficher('erreur', message, 6000);
  }

  info(message: string): void {
    this.afficher('info', message, 4000);
  }

  fermer(id: number): void {
    this._notifications.update((liste) => liste.filter((n) => n.id !== id));
  }

  private afficher(
    type: TypeNotification,
    message: string,
    duree: number,
  ): void {
    // Évite d'empiler dix fois le même message
    if (this._notifications().some((n) => n.message === message)) {
      return;
    }
    const id = ++this.compteur;
    this._notifications.update((liste) => [...liste, { id, type, message }]);
    setTimeout(() => this.fermer(id), duree);
  }
}
