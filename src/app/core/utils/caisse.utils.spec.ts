import { Commande } from '../models/commande.model';
import { MouvementCaisse } from '../models/mouvement-caisse.model';
import { SessionCaisse } from '../models/session-caisse.model';
import { Vente } from '../models/vente.model';
import { calculerTotaux } from './caisse.utils';

const session: SessionCaisse = {
  id: 1,
  employeId: 2,
  dateOuverture: '2026-10-17T08:00:00',
  fondInitial: 20000,
  statut: 'OUVERTE',
};

function vente(partiel: Partial<Vente>): Vente {
  return {
    id: 1,
    numero: 'V-2026-0001',
    date: '2026-10-17T09:00:00',
    employeId: 2,
    lignes: [],
    total: 0,
    modePaiement: 'ESPECES',
    statut: 'PAYEE',
    sessionId: 1,
    ...partiel,
  };
}

function commande(partiel: Partial<Commande>): Commande {
  return {
    id: 1,
    numero: 'C-2026-0001',
    clientNom: 'Moussa',
    clientTelephone: '770000000',
    date: '2026-10-17T08:30:00',
    employeId: 2,
    lignes: [],
    total: 0,
    acompte: 0,
    modeAcompte: 'ESPECES',
    statut: 'NOUVELLE',
    ...partiel,
  };
}

function mouvement(partiel: Partial<MouvementCaisse>): MouvementCaisse {
  return {
    id: 1,
    sessionId: 1,
    type: 'SORTIE',
    montant: 0,
    motif: 'DEPENSE',
    date: '2026-10-17T10:00:00',
    employeId: 2,
    ...partiel,
  };
}

describe('calculerTotaux', () => {
  it('additionne les ventes par mode de paiement', () => {
    const totaux = calculerTotaux(session, [
      vente({ total: 10000 }),
      vente({ id: 2, total: 5000, modePaiement: 'CARTE' }),
    ]);

    expect(totaux.parMode.ESPECES).toBe(10000);
    expect(totaux.parMode.CARTE).toBe(5000);
    expect(totaux.totalEncaisse).toBe(15000);
    expect(totaux.nombreVentes).toBe(2);
    expect(totaux.especesAttendues).toBe(30000); // fond de caisse 20 000 + espèces 10 000
  });

  it("ne compte que le solde pour une vente issue d'une commande", () => {
    const totaux = calculerTotaux(session, [
      vente({ total: 100000, acompteVerse: 40000 }),
    ]);
    expect(totaux.parMode.ESPECES).toBe(60000);
  });

  it("compte l'acompte dans le mode de paiement utilisé", () => {
    const totaux = calculerTotaux(
      session,
      [],
      [commande({ sessionId: 1, acompte: 25000, modeAcompte: 'CARTE' })],
    );

    expect(totaux.parMode.CARTE).toBe(25000);
    expect(totaux.nombreAcomptes).toBe(1);
    expect(totaux.especesAttendues).toBe(20000); // une carte ne touche pas le tiroir
  });

  it('applique les entrées et sorties de caisse', () => {
    const totaux = calculerTotaux(
      session,
      [vente({ total: 10000 })],
      [],
      [
        mouvement({
          id: 1,
          type: 'ENTREE',
          montant: 5000,
          motif: 'APPORT_MONNAIE',
        }),
        mouvement({ id: 2, type: 'SORTIE', montant: 8000 }),
      ],
    );

    expect(totaux.entrees).toBe(5000);
    expect(totaux.sorties).toBe(8000);
    expect(totaux.especesAttendues).toBe(27000); // 20 000 + 10 000 + 5 000 − 8 000
  });

  it("ignore les opérations d'une autre session", () => {
    const totaux = calculerTotaux(session, [
      vente({ sessionId: 2, total: 9999 }),
    ]);
    expect(totaux.totalEncaisse).toBe(0);
  });

  it('garde une vente remboursée dans les encaissements, sans la compter comme vente', () => {
    const totaux = calculerTotaux(session, [
      vente({ statut: 'REMBOURSEE', total: 7000 }),
    ]);

    expect(totaux.parMode.ESPECES).toBe(7000);
    expect(totaux.nombreVentes).toBe(0);
  });
});
