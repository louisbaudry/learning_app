/**
 * Generate a device link code in the format "WORD-NNNN"
 * e.g., "TIGRE-7342"
 *
 * Words are from a safe list to avoid offensive terms.
 * Numbers are random 0-9999.
 */

const SAFE_WORDS = [
  'TIGRE', 'LEVRE', 'RENARD', 'MOUTARDE', 'SOURIS', 'GIRAFE', 'CERISE', 'SOLEIL',
  'NUAGE', 'PRAIRIE', 'RIVIERE', 'MONTAGNE', 'PAPILLON', 'FLEUR', 'ARBRE', 'CHAT',
  'CHIEN', 'OISEAU', 'PAPIER', 'CRAYON', 'COULEUR', 'CLASSE', 'ECOLE', 'AMIE',
  'FAMILLE', 'MAISON', 'CUISINE', 'JARDIN', 'PARC', 'ROUTE', 'VOITURE', 'BICYCLE',
  'BALLON', 'PUZZLE', 'LIVRE', 'MUSIQUE', 'DANSE', 'SPORT', 'JEUX', 'HISTOIRE',
  'SAISON', 'HIVER', 'ETE', 'AUTOMNE', 'PRINTEMPS', 'PLUIE', 'ORAGE', 'TEMPS',
]

export function generateDeviceLinkCode(): string {
  const word = SAFE_WORDS[Math.floor(Math.random() * SAFE_WORDS.length)]
  const number = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${word}-${number}`
}
