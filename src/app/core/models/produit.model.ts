export type EtatProduit = 'NEUF' | 'RECONDITIONNE';

export interface Produit {
  id: number;
  nom: string;
  reference: string;       // code interne, ex : TEL-001
  description?: string;
  categorieId: number;
  etat: EtatProduit;       // distingue neuf et reconditionné
  prixAchat: number;
  prixVente: number;
  seuilAlerte: number;     // en dessous : alerte de stock bas
  imageUrl?: string;       // utilisé à l'étape 6
  actif: boolean;
}