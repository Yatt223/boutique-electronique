import { Commande } from '../models/commande.model';
import { MouvementCaisse } from '../models/mouvement-caisse.model';
import { SessionCaisse } from '../models/session-caisse.model';
import { ModePaiement, Vente } from '../models/vente.model';

export interface TotauxSession {
  parMode: Record<ModePaiement, number>; // encaissements bruts, par mode de paiement
  totalEncaisse: number;
  nombreVentes: number;
  nombreAcomptes: number;
  entrees: number; // entrées d'espèces (hors ventes)
  sorties: number; // sorties d'espèces
  especesAttendues: number; // ce qui doit se trouver dans le tiroir
}

function somme(valeurs: number[]): number {
  return valeurs.reduce((total, v) => total + v, 0);
}

/**
 * Totaux « en direct » d'une session.
 * - Ventes : tout ce qui a été encaissé pendant la session (les remboursements apparaissent
 *   à part, comme sorties). Pour une vente de commande, seul le solde compte.
 * - Acomptes : encaissés pendant la session.
 * - Mouvements : entrées et sorties d'espèces.
 */
export function calculerTotaux(
  session: SessionCaisse,
  ventes: Vente[],
  commandes: Commande[] = [],
  mouvements: MouvementCaisse[] = [],
): TotauxSession {
  const parMode: Record<ModePaiement, number> = {
    ESPECES: 0,
    CARTE: 0,
    MOBILE_MONEY: 0,
  };

  const encaissees = ventes.filter((v) => v.sessionId === session.id);
  for (const vente of encaissees) {
    parMode[vente.modePaiement] += vente.total - (vente.acompteVerse ?? 0);
  }

  const acomptes = commandes.filter(
    (c) => c.sessionId === session.id && c.acompte > 0,
  );
  for (const commande of acomptes) {
    parMode[commande.modeAcompte] += commande.acompte;
  }

  const duJour = mouvements.filter((m) => m.sessionId === session.id);
  const entrees = somme(
    duJour.filter((m) => m.type === 'ENTREE').map((m) => m.montant),
  );
  const sorties = somme(
    duJour.filter((m) => m.type === 'SORTIE').map((m) => m.montant),
  );

  return {
    parMode,
    totalEncaisse: somme(Object.values(parMode)),
    nombreVentes: encaissees.filter((v) => v.statut === 'PAYEE').length,
    nombreAcomptes: acomptes.length,
    entrees,
    sorties,
    especesAttendues: session.fondInitial + parMode.ESPECES + entrees - sorties,
  };
}

/** Session clôturée : on affiche la photo enregistrée. Session ouverte : calcul en direct. */
export function totauxAffiches(
  session: SessionCaisse,
  ventes: Vente[],
  commandes: Commande[] = [],
  mouvements: MouvementCaisse[] = [],
): TotauxSession {
  if (session.statut === 'CLOTUREE' && session.encaissements) {
    const parMode = session.encaissements;
    const entrees = session.entreesCaisse ?? 0;
    const sorties = session.sortiesCaisse ?? 0;
    return {
      parMode,
      totalEncaisse: somme(Object.values(parMode)),
      nombreVentes: session.nombreVentes ?? 0,
      nombreAcomptes: session.nombreAcomptes ?? 0,
      entrees,
      sorties,
      especesAttendues:
        session.montantAttendu ??
        session.fondInitial + parMode.ESPECES + entrees - sorties,
    };
  }
  return calculerTotaux(session, ventes, commandes, mouvements);
}
