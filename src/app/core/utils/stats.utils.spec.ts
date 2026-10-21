import {
  ajouterJours,
  dansPeriode,
  joursDeLaPeriode,
  periodePour,
  periodePrecedente,
} from './stats.utils';

describe('ajouterJours', () => {
  it('passe au mois suivant', () => {
    expect(ajouterJours('2026-10-31', 1)).toBe('2026-11-01');
  });

  it("passe à l'année suivante", () => {
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('recule au mois précédent (février non bissextile)', () => {
    expect(ajouterJours('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('periodePour', () => {
  it("« aujourd'hui » commence et finit le même jour", () => {
    expect(periodePour('AUJOURDHUI', '2026-10-17')).toEqual({
      debut: '2026-10-17',
      fin: '2026-10-17',
    });
  });

  it("« 7 derniers jours » inclut aujourd'hui", () => {
    expect(periodePour('SEPT_JOURS', '2026-10-17')).toEqual({
      debut: '2026-10-11',
      fin: '2026-10-17',
    });
  });

  it('« ce mois » commence le premier du mois', () => {
    expect(periodePour('MOIS', '2026-10-17')).toEqual({
      debut: '2026-10-01',
      fin: '2026-10-17',
    });
  });
});

describe('périodes', () => {
  const periode = { debut: '2026-10-11', fin: '2026-10-17' };

  it('liste tous les jours, bornes incluses', () => {
    expect(joursDeLaPeriode(periode).length).toBe(7);
  });

  it('calcule la période précédente de même durée', () => {
    expect(periodePrecedente(periode)).toEqual({
      debut: '2026-10-04',
      fin: '2026-10-10',
    });
  });

  it('reconnaît une date avec heure dans la période', () => {
    expect(dansPeriode('2026-10-17T23:59:00', periode)).toBe(true);
    expect(dansPeriode('2026-10-18T00:00:00', periode)).toBe(false);
  });
});
