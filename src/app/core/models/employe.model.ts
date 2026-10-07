export type Role = 'ADMIN' | 'MANAGER' | 'CAISSIER';

export interface Employe {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string; // Démo uniuement (voir l'avertissement plus bas)
  role: Role;
  actif: boolean;
  dateEmbauche: string;
}

export const LIBELLES_ROLES: Record<Role, string> = {
  ADMIN: 'Administrateur',
  MANAGER: 'Gérant',
  CAISSIER: 'Caissier(ère)',
};

/** Liste prête à afficher dans une liste déroulante. */
export const LISTE_ROLES = (Object.keys(LIBELLES_ROLES) as Role[]).map(
  (valeur) => ({
    valeur,
    libelle: LIBELLES_ROLES[valeur],
  }),
);
