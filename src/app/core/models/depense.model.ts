export type CategorieDepense =
  | 'LOYER'
  | 'SALAIRES'
  | 'ELECTRICITE'
  | 'TRANSPORT'
  | 'FOURNITURES'
  | 'AUTRE';

export interface Depense {
  id: number;
  date: string;
  libelle: string;
  montant: number;
  categorie: CategorieDepense;
  employeId: number; // qui a enregistré la dépense
}
