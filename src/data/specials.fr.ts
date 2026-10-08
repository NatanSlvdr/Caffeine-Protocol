/** A special's words in French: its card, brief and lesson note, its receipt line, and its scenes line for line. */
export interface SpecialFr {
  title: string;
  hint: string;
  thanks: string;
  /** A menu card's note is what its card says, as in English, so only a special on its own has one. */
  note?: string;
  card?: { recipes: string; demand: string; constraint: string };
  brief: { story: string; objective: string; concept: string };
  /** A menu card's own lines, after the menu's opening. */
  intro: readonly string[];
  outro: readonly string[];
}

/** A menu's words in French: its place on the board, and the lines every one of its cards opens on. */
export interface MenuFr {
  title: string;
  story: string;
  hint: string;
  opening: readonly string[];
}

/**
 * The specials in French, by id. Who speaks, and in what mood, comes from the English; a block in a line is the same
 * block, and block names stay English, Together and Sold out among them. Rosa and Juno say “vous” to Niko; Dot calls
 * everyone “mes petits”. Written with plain spaces: the French is set with French typography as it is laid over the
 * English.
 */
export const specialsFr: Readonly<Record<string, SpecialFr>> = {
  together: {
    title: 'Tous reliés',
    hint: 'Un plateau, un seul voyage.',
    thanks: 'Merci. Le club de lecture reviendra jeudi prochain.',
    note: 'Le club de lecture de Rosa commande pour la table, et personne ne commence avant que chaque tasse soit posée. Query écrit Together sur chaque ticket d’une table qui commande ensemble. Porter teste If Together IN Orders : Wait for Orders lui apporte aussitôt le reste de la commande de cette table, si bien que les deux boissons vont sur un même plateau et sont servies en un seul voyage, en 4 secondes au plus.',
    brief: {
      story:
        'Le club de lecture de Rosa cherche où passer ses jeudis. On y commande pour la table, et la lecture commence une fois chaque tasse posée.',
      objective:
        'Servez chaque client et débarrassez chaque table. Une table qui commande ensemble reçoit toutes ses boissons dans les 4 secondes qui suivent la première.',
      concept:
        'Une marque sur un ticket transmet ce qu’a dit le client aux robots qui ne l’entendent jamais. Together dit à Porter d’attendre le reste de la commande, et de tout porter d’un coup.',
    },
    intro: [
      'Un après-midi tranquille, une semaine après la plus grosse journée. Rosa entre avec une pile de livres de poche.',
      'Mon club de lecture a besoin d’un nouveau foyer. Le jeudi, ici, si vous voulez bien de nous.',
      'Une seule règle. On commande pour la table, et personne ne commence avant que chaque tasse soit posée. Un thé qui attend un café refroidit.',
      'Alors une table qui commande ensemble reçoit ses boissons ensemble. [WRITE together|Write Together] va sur chacun de ses tickets.',
      'Porter teste [IF together IN CUSTOMER SPEECH|If Together IN Orders]. Wait for Orders lui apporte aussitôt le reste de la commande de cette table, et les deux tasses vont sur un même plateau.',
      'Et Rosa chronomètre : toutes les boissons d’une table dans les 4 secondes qui suivent la première.',
      '*ding* Un plateau. Un voyage. Compris.',
    ],
    outro: [
      'Toutes les tasses posées en même temps, et chacune encore chaude. Même heure jeudi prochain ?',
      '*ding ding* Même plateau. Même voyage.',
    ],
  },
  fresh: {
    title: 'Tant que c’est chaud',
    hint: 'Rien n’attend au comptoir de retrait.',
    thanks: 'Merci, mes petits. Le cercle se retrouve mardi, et moi avec.',
    note: 'Le cercle de tricot de Dot veut chaque tasse chaude : une boisson reste chaude 20 secondes une fois que Brew l’a posée au comptoir de retrait. Porter sert la boisson suivante avant de débarrasser la tasse d’avant, pour qu’aucune boisson n’attende un client encore en train de boire. À la fermeture, Porter débarrasse la dernière tasse, puis s’arrête.',
    brief: {
      story:
        'Le cercle de tricot de Dot se réunit le mardi, et le thé de la bibliothèque était toujours tiède. Le cercle aimerait le sien comme Dot aime son sucre : pile comme il faut.',
      objective:
        'Servez chaque client et débarrassez chaque table, chaque boisson dans les 20 secondes après son arrivée au comptoir de retrait. À la fermeture, chaque robot s’arrête.',
      concept:
        'Attendre, c’est un choix de la routine. Porter peut attendre une tasse pendant qu’une boisson refroidit, ou servir la boisson et aller chercher la tasse après : le même travail, dans un autre ordre.',
    },
    intro: [
      'Mardi après-midi. Dot entre avec un panier de laine, et son cercle de tricot derrière elle.',
      'On se retrouvait à la bibliothèque, mes petits, mais leur thé est toujours tiède.',
      'Une seule condition. Chaque tasse arrive chaude. Pas tiède. Chaude.',
      'Une boisson reste chaude 20 secondes une fois que Brew l’a posée au comptoir de retrait. Après, elle est froide avant d’arriver à la table.',
      'Et Porter attend la tasse de chaque client avant d’aller chercher la boisson suivante. Mettez le service en pause et ouvrez Porter : il montre combien de temps il reste à chaque boisson.',
      '*ding* Attendre moins. Compris.',
    ],
    outro: [
      'Chaudes, toutes autant qu’elles sont. La bibliothèque peut garder son thé tiède.',
      '*ding ding* La boisson suivante d’abord. Puis l’ancienne tasse.',
    ],
  },
  'sold-out': {
    title: 'Le fond de la boîte',
    hint: 'Demander avant d’écrire.',
    thanks: 'Merci. La livraison arrive demain, promis.',
    note: 'Le thé s’épuise après les trois dernières tasses de la boîte. Query entend Sold out avec chaque thé demandé ensuite : If Sold out IN Orders, Help demande à Niko ce que le client prendra à la place, et Query l’écrit. Un café de la même façon, ou rien du tout, et alors pas de ticket.',
    brief: {
      story:
        'La livraison de thé est coincée derrière les camions du marché jusqu’à demain, et Juno a compté de quoi faire trois tasses dans la boîte.',
      objective:
        'Servez chaque client et débarrassez chaque table. Un client qui demande une boisson épuisée est interrogé sur ce qu’il prendra à la place, avant que rien ne soit écrit.',
      concept:
        'Une routine demande quand elle ne peut pas savoir. Une commande impossible à préparer est aussi floue qu’une commande que personne n’a comprise : le même Help, pour une autre raison.',
    },
    intro: [
      'Lundi matin. La livraison de thé est coincée derrière les camions du marché jusqu’à demain.',
      'Il reste de quoi faire trois tasses dans la boîte. J’ai vérifié deux fois.',
      'Les gens vont quand même demander du thé. S’il vous plaît, ne leur donnez pas juste un café.',
      'Une fois la boîte vide, Query l’entend avec la commande : [IF soldout IN CUSTOMER SPEECH|If Sold out IN Orders].',
      'Alors il me demande avec [HELP|Help], comme pour une commande que personne n’a comprise, et je découvre ce qu’ils veulent à la place. Un café de la même façon, ou rien du tout.',
      'Jamais un café que personne n’a demandé, et jamais un thé qu’on n’a plus.',
      '*bip* Demander d’abord. Écrire ensuite. Compris.',
    ],
    outro: [
      'Tout le monde a été interrogé, et personne n’a eu un café dont il ne voulait pas. La dernière tasse, c’était pour moi, au fait.',
      '*bip bip* Boîte : vide. Clients : interrogés.',
    ],
  },
  grinder: {
    title: 'La visite du réparateur',
    hint: 'Vérifier avant de moudre.',
    thanks: 'Merci. Henri dit que le moulin tiendra encore vingt ans. Moi aussi, je lui ai dit.',
    note: 'Le moulin est en révision de 1:30 à 4:30. Le café monté de la réserve pendant ce temps arrive déjà moulu : Brew teste If Pre-ground IN Orders, et le porte directement à l’évier, comme le thé. Avant et après, le moulin marche comme toujours.',
    brief: {
      story:
        'Henri, un vieil ami de M. Albert, entretient les machines à café, et il a entendu le moulin du café depuis l’autre côté de la rue. Il passe en milieu de matinée, qu’il y ait du monde ou non.',
      objective:
        'Servez chaque client et débarrassez chaque table. Le moulin est en révision de 1:30 à 4:30 : le café monté de la réserve entre-temps arrive déjà moulu.',
      concept:
        'Une routine qui connaît l’horaire vérifie avant d’utiliser une machine. Quand le moulin est absent, le café arrive autrement, et la routine prend ce chemin-là.',
    },
    intro: [
      'Mercredi matin. M. Albert entre avec un homme qui porte une caisse à outils.',
      'Voici Henri. Il a fait tourner les machines de Lou pendant trente ans. Il a entendu votre moulin depuis l’autre côté de la rue.',
      'Il lui faut le moulin de 1:30 à 4:30. J’ai moulu une boîte ce matin : tout café monté pendant ce temps arrive déjà moulu.',
      'Brew teste [IF preground IN CUSTOMER SPEECH|If Pre-ground IN Orders], et porte ce café directement à l’évier, comme le thé.',
      'Et avant et après, il moud comme toujours. Henri n’aime pas qu’on le presse.',
      '*bip* Vérifier, puis moudre ! Matinée très prudente.',
    ],
    outro: [
      'Pas une tasse en retard, et le moulin ronronne de nouveau. Henri était impressionné. Il ne le dit pas, mais il l’était.',
      '*bip bip* Moulin revenu ! Il manquait à Brew !',
    ],
  },
  'tea-table': {
    title: 'La table à thé',
    hint: 'Pas un café de la matinée : de quoi Brew a-t-il encore besoin ?',
    thanks: 'Merci. Gardez-nous la table à thé samedi prochain, si la bouilloire veut bien.',
    card: {
      recipes: 'Du thé uniquement, avec jusqu’à deux sucres comptés.',
      demand: 'Douze clients, un toutes les cinq secondes ; un sur quatre commande une théière pour deux.',
      constraint: 'Quatre tasses dans tout le café : elles sont lavées à leur retour.',
    },
    brief: {
      story:
        'Une table à thé pour le marché : du thé uniquement, le sucre compté, et de temps en temps une théière pour deux. Le café sort quatre tasses, pas une de plus.',
      objective: 'Servez chaque client et débarrassez chaque table, avec quatre tasses dans tout le café.',
      concept:
        'Une routine s’ajuste au travail qu’elle a devant elle. Avec une seule boisson au menu, un test qui part toujours du même côté est un bloc qu’on peut enlever.',
    },
    intro: [
      'Du thé, alors. Quatre tasses de sorties : Brew les lave à mesure qu’elles reviennent.',
      '*BIP BIP !* Bouilloire toute la matinée ! Est très bonne matinée.',
    ],
    outro: [
      'Pas un café de la matinée, et il ne m’a pas manqué. Ne le dites à personne.',
      '*petit bip* Quatre tasses. Lavées beaucoup de fois. Toujours quatre.',
    ],
  },
  'espresso-bar': {
    title: 'Le bar à expresso',
    hint: 'La matinée la plus rapide : ni thé, ni couvercles, ni fermeture.',
    thanks: 'Merci. Pour une fois, chaque étal de la rue a ouvert à l’heure.',
    card: {
      recipes: 'Du café uniquement, avec jusqu’à deux sucres comptés.',
      demand: 'Quatorze clients, un toutes les trois secondes ; un sur deux est pressé.',
      constraint: 'Un client pressé est préparé et servi avant tous ceux qui attendent.',
    },
    brief: {
      story:
        'Un bar à expresso pour le marché : du café uniquement, aussi vite qu’il coule, et la moitié de la rue pressée d’ouvrir son étal.',
      objective:
        'Servez chaque client et débarrassez chaque table. Un client pressé est servi avant tous ceux qui attendent.',
      concept:
        'La carte la plus chargée demande le moins à chaque boisson. Elle en demande d’autant plus à l’ordre dans lequel les choses se font.',
    },
    intro: ['Du café, vite. Les pressés passent en premier.', '*ding* Pressés d’abord. Compris.'],
    outro: [
      'Tout le marché a eu son café avant que le pain soit sorti. Lou aurait aimé ça.',
      '*ding ding* Quatorze cafés. Zéro attente.',
    ],
  },
  'market-hatch': {
    title: 'Le guichet du marché',
    hint: 'Des couvercles, les dernières commandes, et une table de temps en temps.',
    thanks: 'Merci. Laissez le guichet ouvert samedi prochain ; le marché le cherchera.',
    card: {
      recipes: 'Café et thé, avec jusqu’à deux sucres comptés.',
      demand: 'Dix clients, un toutes les quatre secondes ; deux sur trois prennent le leur à emporter.',
      constraint: 'Le guichet ferme quand le marché remballe : chaque robot s’arrête aux dernières commandes.',
    },
    brief: {
      story:
        'Un guichet ouvert sur le marché : les deux boissons, la plupart à emporter, jusqu’à ce que les étals remballent et que le café ferme avec eux.',
      objective: 'Servez chaque client et débarrassez chaque table. Aux dernières commandes, chaque robot s’arrête.',
      concept:
        'Une carte à deux règles et moins de clients : la routine doit encore s’occuper de chacune, mais de rien que la matinée ne demandera pas.',
    },
    intro: [
      'Le guichet, alors. Tout à emporter, jusqu’à ce que le marché remballe.',
      '*bip* Couvercles mis. Arrêt aux dernières commandes. Compris.',
    ],
    outro: [
      'Chaque tasse est sortie du guichet avec un couvercle. J’ai même gardé le mien pour la semaine prochaine.',
      '*bip bip* Guichet : fermé. Marché : servi.',
    ],
  },
};

export const menusFr: Readonly<Record<string, MenuFr>> = {
  saturday: {
    title: 'Le marché du samedi',
    story:
      'Le marché de la rue revient le samedi, et Lou écrivait toujours un menu à la craie pour l’occasion, toute la matinée. Mr. Albert veut savoir lequel.',
    hint: 'Choisissez un menu, puis programmez pour ce qu’il apporte.',
    opening: [
      'Samedi matin. Les étals se montent le long de la rue.',
      'Le marché est de retour. Lou écrivait toujours une ardoise pour l’occasion : un menu, toute la matinée.',
      'Ce que le café fait de mieux. Les gens du marché ne se le feront pas dire deux fois.',
    ],
  },
};
