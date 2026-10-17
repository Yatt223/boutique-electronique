import { ModePaiement } from './vente.model';

export type StatutSession = 'OUVERTE' | 'CLOTUREE';

export const LIBELLES_STATUT_SESSION: Record<StatutSession, string> = {
  OUVERTE: 'Ouverte',
  CLOTUREE: 'Clôturée',
};

export interface SessionCaisse {
  id: number;
  employeId: number;
  dateOuverture: string;
  dateCloture?: string;
  fondInitial: number; // argent dans le tiroir à l'ouverture
  statut: StatutSession;

  // Photo enregistrée à la clôture
  encaissements?: Record<ModePaiement, number>; // total par mode de paiement
  nombreVentes?: number;
  montantAttendu?: number; // espèces attendues dans le tiroir
  montantCompte?: number; // espèces réellement comptées
  ecart?: number; // compté − attendu
  commentaire?: string;
  nombreAcomptes?: number; // acomptes de commandes encaissés pendant la session
}
