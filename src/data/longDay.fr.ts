/** A wave's words in French: when it comes, its name, what it adds, its brief and its scenes line for line. */
export interface WaveFr {
  hour: string;
  title: string;
  adds: string;
  story: string;
  concept: string;
  intro: readonly string[];
  outro: readonly string[];
}

/** The Long Day's words in French: its place on the board, each wave in order, and what is said around the waves. */
export interface LongDayFr {
  title: string;
  story: string;
  hint: string;
  waves: readonly WaveFr[];
  /** A wave's goal, around what it adds, already lowercased; `more` once there are waves before it. */
  objective: (adds: string, more: boolean) => string;
  /** The receipt after a wave, with the next one's hour and what it adds, already lowercased. */
  next: (number: number, waves: number, hour: string, adds: string) => string;
  /** The receipt after the last wave. */
  last: string;
}

/**
 * The Long Day in French. Who speaks, and in what mood, comes from the English; Juno says “vous” to Niko, as in the
 * shifts. Written with plain spaces: the French is set with French typography as it is laid over the English.
 */
export const longDayFr: LongDayFr = {
  title: 'La longue journée',
  story:
    'Semaine d’examens, et la bibliothèque est fermée : toute la promo de Juno révise au café, par vagues, de l’ouverture à la fermeture.',
  hint: 'Les mêmes routines toute la journée. Arrêtez-vous après n’importe quelle vague, et reprenez plus tard.',
  waves: [
    {
      hour: 'Huit heures',
      title: 'L’ouverture',
      adds: 'Café et thé, le sucre compté, et de temps en temps deux boissons pour un client.',
      story:
        'Semaine d’examens, et la bibliothèque est fermée. Les premiers étudiants entrent avant que le rideau soit tout à fait levé.',
      concept:
        'Une longue journée se sert avec un seul jeu de routines. Ce qu’une vague demande et qu’elles ne font pas encore, il le leur faudra pour chaque vague d’après.',
      intro: [
        'Semaine d’examens. La bibliothèque est fermée pour travaux, et Juno l’a dit à tout le monde.',
        'Alors toute la promo révise ici aujourd’hui. Par vagues, sûrement, entre deux examens.',
        'Les mêmes routines toute la journée. Changez-les entre deux vagues s’il le faut ; les étudiants n’attendront pas longtemps.',
        'Vague par vague, alors. Et on s’arrête quand il le faut.',
      ],
      outro: ['Première vague passée. Ils sont tous encore réveillés, c’est déjà ça.'],
    },
    {
      hour: 'Dix heures',
      title: 'Entre deux examens',
      adds: 'Certains prennent le leur à emporter, pour retourner en salle d’examen.',
      story:
        'Le premier examen se termine. La moitié reste pour comparer les réponses ; les autres repartent en courant pour le suivant.',
      concept:
        'Une boisson à emporter reçoit un couvercle et va sur l’étagère, pas à une table. Les clients qui restent sont servis comme avant.',
      intro: [
        'L’examen de neuf heures est fini. La moitié repart en courant pour le suivant.',
        '*bip* Couvercles pour ceux qui partent. Compris.',
      ],
      outro: ['*ding* Étagère à emporter : vidée. Deux fois.'],
    },
    {
      hour: 'Midi',
      title: 'Le déjeuner',
      adds: 'Des clients pressés, et seulement quatre tasses dans tout le café.',
      story:
        'Le déjeuner. Tout le monde est en retard pour quelque chose, et les tasses de rechange sont parties en salle d’examen avec les surveillants.',
      concept:
        'Un client pressé est préparé et servi avant tous ceux qui attendent. Avec quatre tasses, chacune est lavée à son retour.',
      intro: [
        'Le déjeuner. Tout le monde est en retard pour quelque chose, et quelqu’un a emporté les tasses de rechange en salle d’examen.',
        '*BIP BIP !* Quatre tasses seulement. Brew lave très vite !',
      ],
      outro: ['*bip fier* Lavée, lavée, lavée. Toujours quatre tasses !'],
    },
    {
      hour: 'Quatorze heures',
      title: 'Révisions',
      adds: 'Certains marmonnent leur commande sans lever le nez de leurs notes, et il faut leur demander.',
      story:
        'Les heures calmes. Personne ne lève les yeux de ses notes, et la moitié des commandes sortent dans un marmonnement.',
      concept:
        'Une commande que personne ne comprend se demande, elle ne se devine jamais : Query demande, et écrit ce qu’il entend en retour.',
      intro: [
        'Quatorze heures, c’est le pire. Ils commandent sans lever les yeux de leurs notes.',
        '*bip* Les commandes pas claires seront demandées. Poliment.',
      ],
      outro: ['Personne n’a eu une boisson qu’il n’avait pas commandée. C’est plus que ce que fait la bibliothèque.'],
    },
    {
      hour: 'Seize heures',
      title: 'Groupes de travail',
      adds: 'Des tables qui commandent ensemble, et veulent leurs boissons à 4 secondes d’écart au plus.',
      story:
        'Les groupes de travail rapprochent les tables pour l’après-midi, et commandent pour toute la table d’un coup.',
      concept:
        'Une table qui commande ensemble reçoit ses boissons sur un seul plateau, en un seul voyage, toutes dans les 4 secondes qui suivent la première.',
      intro: [
        'Seize heures, les groupes de travail. Une table qui commande ensemble veut ses boissons ensemble.',
        '*ding* Même table. Même plateau. Même voyage.',
      ],
      outro: ['*ding ding* Tables servies ensemble : toutes.'],
    },
    {
      hour: 'Dix-huit heures',
      title: 'Dernières commandes',
      adds: 'L’annonce de la fermeture : une fois le dernier client servi, chaque robot s’arrête.',
      story:
        'Le dernier examen est fini. Tout le monde arrive en même temps pour fêter ça, puis le café ferme pour la nuit.',
      concept:
        'À l’annonce de la fermeture, chaque robot termine ce qu’il tient et s’arrête : la journée finit sans personne qui attend encore.',
      intro: [
        'Le dernier examen est fini. Tout le monde arrive en même temps, et ensuite vous fermez.',
        'Dernière vague. Ensuite tout le monde s’arrête, les robots compris.',
      ],
      outro: [
        'Voilà la journée. J’ai réussi, au fait. Je crois que le café aussi.',
        '*bip bip* Longue journée : servie.',
      ],
    },
  ],
  objective: (adds, more) =>
    `Servez chaque client et débarrassez chaque table. Nouveau dans cette vague : ${adds}${
      more ? ' Tout ce que demandaient les vagues d’avant revient aussi.' : ''
    }`,
  next: (number, waves, hour, adds) => `Vague ${number} sur ${waves} servie. Ensuite, à ${hour} : ${adds}`,
  last: 'Merci. Même table demain ? Je plaisante. Enfin, presque.',
};
