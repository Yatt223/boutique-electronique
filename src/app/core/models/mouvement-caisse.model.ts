export type TypeMouvementCaisse = 'ENTREE' | 'SORTIE';

export type MotifMouvementCaisse =
  | 'DEPENSE'
  | 'REMBOURSEMENT'
  | 'ANNULATION_DEPENSE'
  | 'VERSEMENT_BANQUE'
  | 'APPORT_MONNAIE'
  | 'AUTRE';

export const LIBELLES_MOTIFS_CAISSE: Record<MotifMouvementCaisse, string> = {
  DEPENSE: 'Dépense',
  REMBOURSEMENT: 'Remboursement',
  ANNULATION_DEPENSE: 'Annulation de dépense',
  VERSEMENT_BANQUE: 'Versement en banque',
  APPORT_MONNAIE: 'Apport de monnaie',
  AUTRE: 'Autre',
};

/** Motifs proposés à la main. Les autres sont créés automatiquement. */
export const MOTIFS_MANUELS_PAR_TYPE: Record<
  TypeMouvementCaisse,
  MotifMouvementCaisse[]
> = {
  ENTREE: ['APPORT_MONNAIE', 'AUTRE'],
  SORTIE: ['VERSEMENT_BANQUE', 'AUTRE'],
};

/** Mouvement d'espèces dans le tiroir-caisse. */
export interface MouvementCaisse {
  id: number;
  sessionId: number;
  type: TypeMouvementCaisse;
  montant: number;
  motif: MotifMouvementCaisse;
  date: string;
  employeId: number;
  commentaire?: string;
  depenseId?: number;
  venteId?: number;
  commandeId?: number;
}
