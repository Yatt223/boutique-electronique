export interface LigneArticle {
  produitId: number;
  nomProduit: string; // copie au moment de la vente
  prixUnitaire: number; // copie au moment de la vente
  prixAchat?: number; // copie du coût d'achat, pour calculer la marge
  quantite: number;
}
