/** A memory's words in French: its card, its brief and lesson note, and its scenes line for line with the English. */
export interface MemoryFr {
  title: string;
  from: string;
  hint: string;
  thanks: string;
  note: string;
  brief: { story: string; objective: string; concept: string };
  intro: readonly string[];
  outro: readonly string[];
}

/**
 * The memories in French, by id. Who speaks, and in what mood, comes from the English; a block in a line, like
 * [IF tea IN CUSTOMER SPEECH|If], is the same block, and block names stay English. Written with plain spaces: the
 * French catalog sets them with French typography.
 */
export const memoriesFr: Readonly<Record<string, MemoryFr>> = {
  'day-one': {
    title: 'Premier jour',
    from: 'Journal de Query',
    hint: 'Les mêmes étapes pour tout le monde.',
    thanks: 'Dernière ligne du journal, de la main de Lou : « Bon robot. Même heure samedi prochain. »',
    note: 'Lou a écrit chaque étape deux fois, une pour le thé et une pour le café, et les copies ont divergé : celle du café ne teste jamais Negation. D’une copie à l’autre, seule la tasse change. Gardez Write Tea et Write Coffee dans If Tea IN Orders, et placez le test du sucre et le trajet jusqu’au passe après son End, une seule fois, pour tout le monde.',
    brief: {
      story:
        'Il y a deux hivers, un samedi. Lou a écrit la première routine de Query en pensant à ses trois habitués, et l’équipe de nuit de la boulangerie est arrivée derrière eux.',
      objective:
        'Écrivez un ticket pour chaque client de la matinée, thé ou café, avec sucre, sans, ou comme il l’a demandé.',
      concept:
        'Des étapes copiées des deux côtés d’un If finissent par diverger : une correction faite dans une copie n’atteint jamais l’autre. Ce que reçoit chaque client va après le End, écrit une seule fois.',
    },
    intro: [
      'Après la fermeture. Query bourdonne au comptoir, sa visière parcourue par quelque chose d’ancien.',
      '*bip* Ancien journal trouvé. Opératrice : Lou. Premier jour.',
      'Ton premier jour chez Lou ? Fais voir.',
      'Il y a deux hivers, un samedi. Six heures pile, et un robot de comptoir tout juste sorti de sa caisse.',
      '*bip* Note de l’opératrice : « Le facteur, café, un sucre. Rosa, thé, sans sucre. Le boulanger, café. » Routine écrite.',
      'Trois ? On est samedi, Lou. L’équipe de nuit de la boulangerie sort à six heures.',
      'Je m’occupe des tasses vides ! Lou a dit que je pouvais !',
      '*bip* Note de l’opératrice, soulignée deux fois : « Les mêmes étapes pour tout le monde. Seule la tasse change. »',
      'Elle a écrit chaque étape deux fois, une de chaque côté de [IF tea IN CUSTOMER SPEECH|If]. Le côté thé et le côté café, sucre compris.',
    ],
    outro: [
      '*bip* Premier jour. Tickets : neuf. Aucune erreur.',
      'Hm. Ça ira. Les tasses vont à gauche, robot.',
      'Lou ! Il les a tous bien faits ! Il peut apprendre le chocolat chaud ?',
      'Le journal s’arrête. Le café retombe dans le noir, et la visière de Query reprend son vert menthe habituel.',
      'Elle a écrit cette note pour toi. Les mêmes étapes pour tout le monde.',
      '*bip* Enregistré.',
    ],
  },
};
