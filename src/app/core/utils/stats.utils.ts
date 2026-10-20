import { maintenantLocal } from './date.utils';

/** Une période, bornes incluses, au format "2026-10-17". */
export interface Periode {
  debut: string;
  fin: string;
}

export type PresetPeriode =
  | 'AUJOURDHUI'
  | 'SEPT_JOURS'
  | 'TRENTE_JOURS'
  | 'MOIS'
  | 'PERSO';

export const LIBELLES_PERIODES: Record<PresetPeriode, string> = {
  AUJOURDHUI: "Aujourd'hui",
  SEPT_JOURS: '7 derniers jours',
  TRENTE_JOURS: '30 derniers jours',
  MOIS: 'Ce mois',
  PERSO: 'Personnalisée',
};

function formater(date: Date): string {
  const deuxChiffres = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
}

/** Ajoute (ou retire, si négatif) des jours à une date "AAAA-MM-JJ". */
export function ajouterJours(date: string, jours: number): string {
  const [annee, mois, jour] = date.split('-').map(Number);
  return formater(new Date(annee, mois - 1, jour + jours));
}

export function periodePour(
  preset: Exclude<PresetPeriode, 'PERSO'>,
  aujourdhui = maintenantLocal().slice(0, 10),
): Periode {
  switch (preset) {
    case 'AUJOURDHUI':
      return { debut: aujourdhui, fin: aujourdhui };
    case 'SEPT_JOURS':
      return { debut: ajouterJours(aujourdhui, -6), fin: aujourdhui };
    case 'TRENTE_JOURS':
      return { debut: ajouterJours(aujourdhui, -29), fin: aujourdhui };
    case 'MOIS':
      return { debut: aujourdhui.slice(0, 8) + '01', fin: aujourdhui };
  }
}

/** Vrai si la date (avec ou sans heure) tombe dans la période. */
export function dansPeriode(date: string, periode: Periode): boolean {
  const jour = date.slice(0, 10);
  return jour >= periode.debut && jour <= periode.fin;
}

/** La liste de tous les jours de la période (limitée à une année pour éviter les excès). */
export function joursDeLaPeriode(periode: Periode): string[] {
  const jours: string[] = [];
  for (
    let jour = periode.debut;
    jour <= periode.fin && jours.length < 366;
    jour = ajouterJours(jour, 1)
  ) {
    jours.push(jour);
  }
  return jours;
}

/** La période de même durée, juste avant celle-ci (pour comparer). */
export function periodePrecedente(periode: Periode): Periode {
  const duree = joursDeLaPeriode(periode).length;
  return {
    debut: ajouterJours(periode.debut, -duree),
    fin: ajouterJours(periode.debut, -1),
  };
}
