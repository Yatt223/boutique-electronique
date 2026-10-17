import { Commande } from '../models/commande.model';
import { SessionCaisse } from '../models/session-caisse.model';
import { ModePaiement, Vente } from '../models/vente.model';

export interface TotauxSession {
  parMode: Record<ModePaiement, number>;
  totalEncaisse: number;
  nombreVentes: number;
  nombreAcomptes: number;
  especesAttendues: number; // fond de caisse + espèces encaissées
}

function somme(valeurs: number[]): number {
  return valeurs.reduce((total, v) => total + v, 0);
}

/**
 * Totaux « en direct » d'une session : ventes payées (solde seulement pour les ventes de commandes)
 * et acomptes de commandes non annulées.
 */
export function calculerTotaux(
  session: SessionCaisse,
  ventes: Vente[],
  commandes: Commande[] = [],
): TotauxSession {
  const parMode: Record<ModePaiement, number> = {
    ESPECES: 0,
    CARTE: 0,
    MOBILE_MONEY: 0,
  };

  const payees = ventes.filter(
    (v) => v.sessionId === session.id && v.statut === 'PAYEE',
  );
  for (const vente of payees) {
    // Pour une vente issue d'une commande, l'acompte est déjà compté : on ne garde que le solde
    parMode[vente.modePaiement] += vente.total - (vente.acompteVerse ?? 0);
  }

  const acomptes = commandes.filter(
    (c) =>
      c.sessionId === session.id && c.statut !== 'ANNULEE' && c.acompte > 0,
  );
  for (const commande of acomptes) {
    parMode[commande.modeAcompte] += commande.acompte;
  }

  return {
    parMode,
    totalEncaisse: somme(Object.values(parMode)),
    nombreVentes: payees.length,
    nombreAcomptes: acomptes.length,
    especesAttendues: session.fondInitial + parMode.ESPECES,
  };
}

/** Session clôturée : on affiche la photo enregistrée. Session ouverte : calcul en direct. */
export function totauxAffiches(
  session: SessionCaisse,
  ventes: Vente[],
  commandes: Commande[] = [],
): TotauxSession {
  if (session.statut === 'CLOTUREE' && session.encaissements) {
    const parMode = session.encaissements;
    return {
      parMode,
      totalEncaisse: somme(Object.values(parMode)),
      nombreVentes: session.nombreVentes ?? 0,
      nombreAcomptes: session.nombreAcomptes ?? 0,
      especesAttendues:
        session.montantAttendu ?? session.fondInitial + parMode.ESPECES,
    };
  }
  return calculerTotaux(session, ventes, commandes);
}
