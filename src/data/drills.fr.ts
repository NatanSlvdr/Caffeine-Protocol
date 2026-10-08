/**
 * The drills of every kind in French, keyed by id: a gap's title, question and idea, a moment's title and why, a
 * kit's title, question, rule and idea, and a flight's title and idea. Blocks keep their English names, as in the
 * shifts' briefs, and what a guest says stays English, quoted the French way.
 */
export const drillsFr: Record<string, { title: string; question: string; idea: string }> = {
  'paper-first': {
    title: 'Le papier, puis le stylo',
    question: 'Query écrit chaque commande sur un ticket. Dans quel ordre vont ces deux blocs ?',
    idea: 'Query écrit sur la feuille qu’il tient : Take up passe avant tout ce qui s’écrit.',
  },
  'loop-destination': {
    title: 'Où revient la boucle',
    question: 'Jump listen renvoie Query en haut pour le client suivant. Où va la destination ?',
    idea: 'Jump revient à sa destination et repart de là : la destination se place au-dessus de Wait for Orders.',
  },
  'if-else': {
    title: 'L’un ou l’autre',
    question: 'Les clients demandent du thé ou du café. Quel passage écrit la bonne boisson ?',
    idea: 'Else ne s’exécute que si la condition est fausse : une commande de thé n’arrive jamais jusqu’au café.',
  },
  'without-sugar': {
    title: 'Sans, c’est aucun',
    question: 'Certains clients veulent du sucre, d’autres disent « without sugar ». Quel passage écrit leur sucre ?',
    idea: '« Without sugar » dit quand même « sugar » : cherchez la négation à l’intérieur de la condition sur le sucre.',
  },
  'ticket-per-drink': {
    title: 'Un ticket par boisson',
    question: 'Un client peut commander plus d’une boisson. Où Query prend-il une feuille ?',
    idea: 'Chaque boisson a son propre ticket : la feuille se prend dans la boucle, une fois par commande.',
  },
  'help-first': {
    title: 'Demander avant d’écrire',
    question: 'Certains clients marmonnent. Quel passage garantit que Query connaît d’abord la commande ?',
    idea: 'Une commande que personne n’a comprise s’éclaircit avec Help avant d’écrire le moindre ticket.',
  },
  'sugar-count': {
    title: 'Autant de morceaux que demandé',
    question: 'Les tickets disent combien de sucres. Quel passage en met le bon nombre ?',
    idea: 'Rangez le nombre du ticket, puis répétez autant de fois : zéro fois, c’est aucun sucre.',
  },
  'back-after-call': {
    title: 'Retour en haut après l’appel',
    question: 'La recette est maintenant une fonction. Qu’est-ce qui suit l’appel dans la boucle principale ?',
    idea: 'Une fonction revient au bloc qui suit son appel : sans Jump à cet endroit, Brew continue tout droit dans la fonction.',
  },
  'table-variable': {
    title: 'La table, où qu’elle soit',
    question: 'Porter vient de ranger la table de la boisson. Comment Porter y va-t-il ?',
    idea: 'Move vers une table rangée mène à la table de la boisson, quelle qu’elle soit, là où des pas fixes n’en atteignent qu’une.',
  },
  'wait-for-dirty': {
    title: 'Attendre que la tasse soit vide',
    question: 'Porter s’apprête à débarrasser une table. Qu’est-ce qui vient d’abord ?',
    idea: 'Une tasse se débarrasse une fois que le client a fini de boire : Wait for Dirty cups en choisit une qui est prête.',
  },
  'lid-to-go': {
    title: 'Un couvercle seulement à emporter',
    question: 'Les boissons à emporter ont besoin d’un couvercle. Quel passage en met un ?',
    idea: 'Seule une boisson à emporter a un couvercle : un client qui reste boit dans la tasse ouverte.',
  },
  'stop-at-closing': {
    title: 'S’arrêter à la fermeture',
    question: 'À la fermeture, le café annonce les dernières commandes. Que fait Porter après Wait for Orders ?',
    idea: 'L’annonce de la fermeture arrive comme une commande : vérifiez-la d’abord, et arrêtez-vous au lieu d’attendre une boisson.',
  },
};

export const predictionsFr: Record<string, { title: string; why: string }> = {
  'tea-or-coffee': {
    title: 'De quel côté du If',
    why: 'Le client a dit « tea », donc la condition est vraie : Query exécute les blocs du If, et Else est sauté.',
  },
  'sugar-but-without': {
    title: 'Du sucre, mais sans',
    why: '« Without sugar » contient les deux mots. La condition intérieure trouve la négation, donc le ticket dit 0 sucre.',
  },
  'second-drink': {
    title: 'Un ticket remis, un autre à faire',
    why: 'Le client a demandé deux boissons et la boucle n’a fait que le café : elle refait un tour pour le thé.',
  },
  'no-number': {
    title: 'Du sucre sans nombre',
    why: '« With sugar » ne donne aucun nombre : c’est Else qui s’exécute, et les anciennes conditions sur le sucre qu’il contient décident du ticket.',
  },
  'clear-order': {
    title: 'Rien à demander',
    why: 'Un simple « coffee » est clair : Help est sauté et la boucle sur les commandes commence aussitôt.',
  },
  'zero-times': {
    title: 'Zéro tour',
    why: 'Le ticket dit 0 sucre, donc la boucle tourne zéro fois : Brew saute le sucre et continue son chemin.',
  },
  'after-return': {
    title: 'Où va Return',
    why: 'Return revient au bloc qui suit l’appel qui a lancé la fonction, ici Jump listen dans la boucle principale.',
  },
  'after-deliver': {
    title: 'D’une fonction à la suivante',
    why: 'Deliver a été appelée depuis la boucle principale : Return revient au bloc qui suit cet appel, Call clear.',
  },
  'skip-the-else': {
    title: 'Le If terminé',
    why: 'La boisson était à emporter, donc les blocs du If se sont exécutés ; une fois finis, Else est sauté et la boucle principale continue.',
  },
  'no-lid': {
    title: 'Pas de couvercle sur place',
    why: 'Ce client reste sur place, donc la condition « à emporter » est fausse et Brew passe devant les couvercles sans en prendre.',
  },
};

export const kitsFr: Record<string, { title: string; question: string; rule: string; idea: string }> = {
  'two-ifs': {
    title: 'Deux If pour un Else',
    question:
      'Les clients demandent du thé ou du café, et ce kit n’a pas de Else. Construisez le passage qui écrit la boisson.',
    rule: 'Sans Else',
    idea: 'Chaque client demande l’un ou l’autre : un If par boisson fait ce que faisaient If et Else.',
  },
  'last-word': {
    title: 'Le dernier mot sur le sucre',
    question:
      'Ce kit n’a pas de Else, donc un If ne peut pas se loger dans l’autre. Construisez le passage qui écrit le sucre.',
    rule: 'Sans Else',
    idea: 'Un sucre écrit plus tard remplace le précédent : chercher « without » en dernier lui donne le dernier mot.',
  },
  'grinder-if': {
    title: 'Le thé a son propre If',
    question:
      'Seul le café passe par le moulin, et ce kit n’a pas de Else. Construisez le trajet de Brew jusqu’au poste suivant.',
    rule: 'Sans Else',
    idea: 'Les deux If finissent au même poste : quel que soit celui qui s’est exécuté, Brew repart de la même case.',
  },
  'no-call': {
    title: 'La fonction, écrite en entier',
    question:
      'Ce kit n’a pas de Call. Construisez ce que fait Porter de la boisson, directement dans la boucle principale.',
    rule: 'Sans Call',
    idea: 'Une fonction est un passage qui porte un nom : écrite là où on l’appelait, elle fait la même chose.',
  },
  'jump-past': {
    title: 'Jump au lieu de Else',
    question:
      'Les boissons à emporter vont sur l’étagère, et ce kit n’a pas de Else. Construisez le choix de Porter entre l’étagère et la table.',
    rule: 'Sans Else',
    idea: 'Un Jump à la fin des blocs du If renvoie en haut pour la commande suivante : les blocs d’après sont sautés.',
  },
};

export const flightsFr: Record<string, { title: string; idea: string }> = {
  'in-order': { title: 'Où va un bloc', idea: 'Les mêmes blocs dans un autre ordre font une autre routine.' },
  'which-way': {
    title: 'Par où passer',
    idea: 'Une condition décide quels blocs s’exécutent et lesquels sont sautés.',
  },
  listening: {
    title: 'Bien écouter',
    idea: 'Ce que dit un client et ce qu’il ne dit pas : un « without », un nombre qui manque, un marmonnement.',
  },
  'round-again': {
    title: 'Encore un tour',
    idea: 'Une boucle répète ses blocs une fois par commande, ou autant de fois que le dit un ticket, même zéro.',
  },
  'out-and-back': {
    title: 'Aller-retour',
    idea: 'Une fonction s’exécute ailleurs, puis revient au bloc qui suit son appel.',
  },
  'wherever-whenever': {
    title: 'Où et quand',
    idea: 'Aller là où va la boisson, attendre qu’une tasse soit prête, et s’arrêter quand le café ferme.',
  },
  'another-way': {
    title: 'Une autre façon de l’écrire',
    idea: 'Le même travail, construit sans le bloc qu’utilise l’exemple corrigé.',
  },
};
