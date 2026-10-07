import { Employe } from './employe.model';

/** L'employé connecté, sans son mot de passe. */
export type Utilisateur = Omit<Employe, 'motDePasse'>;