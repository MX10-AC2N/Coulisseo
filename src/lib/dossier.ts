import { useEffect, useState } from 'react';

/**
 * Identité du demandeur, utilisée pour le dossier imprimable.
 *
 * Volontairement rangée à part du modèle de simulation : elle n'intervient dans
 * aucun calcul, et le dossier est un document à part. Elle reste dans le
 * navigateur, comme le reste.
 */
export interface Identite {
  nom: string;
  prenom: string;
  naissance: string;
  nir: string;
  adresse: string;
  email: string;
  telephone: string;
  /** Qualité : artiste, technicien, régisseur… */
  qualite: string;
  /** Organisme de rattachement (France Travail, Audiens…). */
  organisme: string;
  /** Pièces jointes au dossier. */
  pieces: string;
}

const CLE = 'simulateur-intermittence:dossier';

export const identiteVide: Identite = {
  nom: '',
  prenom: '',
  naissance: '',
  nir: '',
  adresse: '',
  email: '',
  telephone: '',
  qualite: '',
  organisme: '',
  pieces: '',
};

function lire(): Identite {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return identiteVide;
    const r = JSON.parse(brut) as Partial<Identite>;
    return { ...identiteVide, ...r };
  } catch {
    return identiteVide;
  }
}

/** Identité persistée dans le navigateur. */
export function useIdentite(): [Identite, (champ: keyof Identite, valeur: string) => void] {
  const [identite, setIdentite] = useState<Identite>(identiteVide);

  useEffect(() => {
    setIdentite(lire());
  }, []);

  const maj = (champ: keyof Identite, valeur: string) => {
    setIdentite((prec) => {
      const suivant = { ...prec, [champ]: valeur };
      try {
        localStorage.setItem(CLE, JSON.stringify(suivant));
      } catch {
        /* stockage indisponible : la saisie reste valable pour la session */
      }
      return suivant;
    });
  };

  return [identite, maj];
}
