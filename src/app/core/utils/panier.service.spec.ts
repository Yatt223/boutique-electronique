import { Produit } from '../models/produit.model';
import { PanierService } from './panier.service';

const galaxy: Produit = {
  id: 1,
  nom: 'Smartphone Galaxy A15',
  reference: 'TEL-001',
  categorieId: 1,
  etat: 'NEUF',
  prixAchat: 85000,
  prixVente: 110000,
  seuilAlerte: 3,
  actif: true,
};

describe('PanierService', () => {
  let panier: PanierService;

  beforeEach(() => {
    panier = new PanierService();
  });

  it('ajoute des articles et calcule le total', () => {
    panier.ajouter(galaxy, 5);
    panier.ajouter(galaxy, 5);

    expect(panier.lignes().length).toBe(1);
    expect(panier.nombreArticles()).toBe(2);
    expect(panier.total()).toBe(220000);
  });

  it("refuse d'ajouter au-delà du stock disponible", () => {
    expect(panier.ajouter(galaxy, 2)).toBe(true);
    expect(panier.ajouter(galaxy, 2)).toBe(true);
    expect(panier.ajouter(galaxy, 2)).toBe(false);
    expect(panier.nombreArticles()).toBe(2);
  });

  it('modifie une quantité dans la limite du stock', () => {
    panier.ajouter(galaxy, 5);

    expect(panier.changerQuantite(1, 3)).toBe(true);
    expect(panier.total()).toBe(330000);
    expect(panier.changerQuantite(1, 6)).toBe(false);
    expect(panier.nombreArticles()).toBe(3);
  });

  it('retire la ligne quand la quantité tombe à zéro', () => {
    panier.ajouter(galaxy, 5);
    panier.changerQuantite(1, 0);

    expect(panier.lignes().length).toBe(0);
  });

  it('vide le panier', () => {
    panier.ajouter(galaxy, 5);
    panier.vider();

    expect(panier.total()).toBe(0);
  });

  it('crée un nouveau tableau à chaque modification (indispensable aux signaux)', () => {
    const avant = panier.lignes();
    panier.ajouter(galaxy, 5);

    expect(panier.lignes()).not.toBe(avant);
  });
});
