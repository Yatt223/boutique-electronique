import { FcfaPipe } from './fcfa.pipe';

describe('FcfaPipe', () => {
  const pipe = new FcfaPipe();

  it('formate un montant avec séparateur de milliers', () => {
    // Le séparateur est une espace insécable fine : on la ramène à une espace simple
    expect(pipe.transform(110000).replace(/\s/g, ' ')).toBe('110 000 FCFA');
  });

  it('affiche zéro', () => {
    expect(pipe.transform(0)).toBe('0 FCFA');
  });

  it('affiche un tiret quand la valeur est absente', () => {
    expect(pipe.transform(null)).toBe('-');
    expect(pipe.transform(undefined)).toBe('-');
  });
});
