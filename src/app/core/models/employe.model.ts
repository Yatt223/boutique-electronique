export type Role =  'ADMIN' | 'MANAGER' | 'CAISSIER';

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