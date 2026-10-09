import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fcfa' })
export class FcfaPipe implements PipeTransform {
  private formateur = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  });

  transform(valeur: number | null | undefined): string {
    if (valeur === null || valeur === undefined || Number.isNaN(valeur)) {
      return '-';
    }
    return `${this.formateur.format(valeur)} FCFA`;
  }
}
