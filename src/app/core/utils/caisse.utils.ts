import { SessionCaisse } from '../models/session-caisse.model';
import { ModePaiement, Vente } from '../models/vente.model';

export interface TotauxSession {
  parMode: Record<ModePaiement, number>;
  totalEncaisse: number;
  nombreVentes: number;
  especesAttendues: number; // fond de caisse + espèces encaissées
}

function somme(valeurs: number[]): number {
  return valeurs.reduce((total, v) => total + v, 0);
}

/** Totaux « en direct » d'une session : seules les ventes payées comptent. */
export function calculerTotaux(
  session: SessionCaisse,
  ventes: Vente[],
): TotauxSession {
  const payees = ventes.filter(
    (v) => v.sessionId === session.id && v.statut === 'PAYEE',
  );
  const parMode: Record<ModePaiement, number> = {
    ESPECES: 0,
    CARTE: 0,
    MOBILE_MONEY: 0,
  };

  for (const vente of payees) {
    parMode[vente.modePaiement] += vente.total;
  }

  return {
    parMode,
    totalEncaisse: somme(Object.values(parMode)),
    nombreVentes: payees.length,
    especesAttendues: session.fondInitial + parMode.ESPECES,
  };
}

/** Session clôturée : on affiche la photo enregistrée. Session ouverte : calcul en direct. */
export function totauxAffiches(
  session: SessionCaisse,
  ventes: Vente[],
): TotauxSession {
  if (session.statut === 'CLOTUREE' && session.encaissements) {
    const parMode = session.encaissements;
    return {
      parMode,
      totalEncaisse: somme(Object.values(parMode)),
      nombreVentes: session.nombreVentes ?? 0,
      especesAttendues:
        session.montantAttendu ?? session.fondInitial + parMode.ESPECES,
    };
  }
  return calculerTotaux(session, ventes);
}
