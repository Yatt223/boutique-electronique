export type StatutSession = 'OUVERTE' | 'CLOTUREE';

export interface SessionCaisse {
  id: number;
  employeId: number;
  dateOuverture: string;
  dateCloture?: string;
  fondInitial: number; // argent dans le tiroir à l'ouverture
  montantCompte?: number; // argent compté à la clôture
  statut: StatutSession;
}
