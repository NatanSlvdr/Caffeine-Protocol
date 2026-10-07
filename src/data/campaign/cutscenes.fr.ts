/** A scene between shifts in French, line for line with the English: who speaks, and in what mood, comes from there. */
export interface SceneFr {
  title: string;
  logline: string;
  /** Each panel's art note, then the text of its lines in order, the recalled ones included. */
  panels: readonly (readonly [art: string, ...lines: string[]])[];
  /** Each answer to the scene's choice, by option id: its button, then the lines it plays. */
  options?: Readonly<Record<string, readonly [label: string, ...lines: string[]]>>;
}

/**
 * The scenes between shifts in French, keyed by scene id. Moka and Niko say “vous” to each other; Lou's card says “tu”
 * to Niko, and so does everyone to Pip. Mr. Albert keeps the name the café calls him by, on every speaker's plate.
 * Written with plain spaces: the French catalog sets them with French typography.
 */
export const cutscenesFr: Readonly<Record<string, SceneFr>> = {
  'the-keys': {
    title: 'Les clés',
    logline: 'La dernière carte de tante Lou apporte son café à Niko, avec sept mois de retard.',
    panels: [
      [
        'Un soir de pluie. Niko attend devant le café aux volets fermés, avec une valise, un trousseau de clés et une carte postale de bord de mer.',
        'Les clés sont arrivées dans une enveloppe matelassée, avec une carte postale de la main de tante Lou.',
      ],
      [
        'Gros plan : la carte postale dans la main de Niko, la pluie tachant l’encre.',
        '« Le café est à toi maintenant, Niko. Sois gentil avec la vieille machine. — Lou »',
        'Lou l’a écrite en mars, une semaine avant de mourir. Le cachet de la poste dit octobre.',
      ],
      [
        'À l’intérieur, dans le noir. Les chaises retournées sur les tables. Niko tire la housse poussiéreuse de la machine à espresso.',
        'Tiens. Plus petite que dans mon souvenir.',
        'La vieille machine. D’accord. Je serai gentil avec toi.',
      ],
      [
        'Gros plan : la pique à tickets près de la caisse. Le dernier ticket est d’une écriture inconnue, daté de juin.',
        'Quelqu’un est venu ici après Lou. Le dernier ticket sur la pique est d’une écriture inconnue, daté de juin.',
      ],
      [
        'Une silhouette sombre sur le seuil, à contre-jour sous le réverbère. Niko fait volte-face en brandissant un porte-filtre.',
        'Derrière lui, la porte s’ouvre.',
        'On est… on est fermés ! Très fermés ! J’ai un… porte-filtre !',
      ],
      [
        'Moka entre en secouant son parapluie. Elle n’est pas impressionnée.',
        'Posez ça avant d’abîmer la machine.',
        'Moka. Quarante ans sur cette machine, à côté de votre tante. J’habite en face.',
      ],
      [
        'Niko tend la carte postale. Moka y jette un œil et détourne le regard, une main dans la poche de son tablier.',
        'Sa carte a mis sept mois à arriver.',
        'La poste est lente, par ici.',
      ],
      [
        'Moka pousse les tasses vers la gauche de l’étagère sous le regard de Niko.',
        'On ouvre demain. Six heures pile. Les tasses vont à gauche. Lou les rangeait à gauche.',
      ],
      [
        'Le lendemain matin, plein soleil. Pip a le nez collé à la vitrine.',
        'C’est ouvert ? Chez Lou, c’est rouvert ?',
        'Pip. Il habite au-dessus. Lou lui faisait un chocolat chaud tous les samedis, depuis qu’il arrive à hauteur du comptoir.',
      ],
      [
        'À l’intérieur, Pip porte fièrement une pile de tasses vides pendant que Niko noue son tablier sous l’œil de Moka.',
        'Et elle me laissait porter les tasses vides ! J’en ai jamais fait tomber une. Je peux aider ? J’économise pour un vélo. Cette semaine.',
        'Bienvenue dans l’équipe, Pip.',
        'Les tasses à gauche, Pip.',
        'Je sais !',
      ],
    ],
  },
  'the-scrapyard': {
    title: 'La casse',
    logline: 'Trop de tickets pour une seule paire de mains, et le robot que Moka a jeté.',
    panels: [
      [
        'Après le coup de feu. Niko s’affale sur le comptoir sous une montagne de tickets manuscrits pendant que Moka balaie.',
        'Quatre-vingt-trois tickets. À la main. Comment Lou faisait ?',
        'Elle ne faisait pas, à la fin. Elle avait un robot de comptoir.',
      ],
      [
        'Niko se redresse d’un coup. Moka a cessé de balayer et s’appuie sur son balai, sans croiser son regard.',
        'Un robot ? Où est-il ?',
        'Il est tombé en panne en juin. Je n’ai pas su le réparer, alors je l’ai sorti pour la casse. Les machines cassent. Les mains, non.',
      ],
      [
        'Au coucher du soleil, Niko pousse une brouette sous le portail peint à la main de la casse.',
        'La casse, au bout de la ville. De vieux grille-pains, des distributeurs, un juke-box qui ne joue qu’une seule chanson.',
      ],
      [
        'La casse au coucher du soleil. Une tête de robot crème dépasse d’un tas de vieux grille-pains.',
        'Q-U-E-R-Y. Et sous le nom, au feutre : « À Lou ».',
        'Je t’ai trouvé.',
      ],
      [
        'Le soir tombe. Niko ramène le robot devant le perron d’en face, où Moka regarde, bras croisés.',
        'Moka l’a regardé passer devant son perron, la brouette chargée. Elle n’a pas dit un mot.',
      ],
      [
        'L’arrière-boutique, à deux heures du matin. Le robot est ouvert sur l’établi, à côté de trois stations de recharge vides.',
        'Deux heures du matin. Trois cafés froids. Un manuel, avec presque toutes ses pages.',
        'Moka n’a pas su te réparer. Voyons si moi, j’y arrive.',
      ],
      [
        'Gros plan : la visière du robot s’allume en vert menthe, et la lueur tombe sur le visage de Niko.',
        '*bip… bip… BOUP*',
        'Unité en ligne. Dernière opératrice : Moka. Dernier ticket : juin.',
      ],
      ['Query se redresse sur l’établi et serre la main que Niko lui tend.', '*bip* Nouvel opérateur. Identification.'],
    ],
    options: {
      mine: [
        'C’est mon café, maintenant.',
        'Bonjour, Query. Moi, c’est Niko. C’est mon café, maintenant.',
        'Je crois.',
        '*bip* Opérateur : Niko. Café : Chez Niko. Enregistré.',
      ],
      minding: [
        'Je garde le café de Lou.',
        'Bonjour, Query. Moi, c’est Niko. Je garde le café de Lou.',
        'Pour l’instant.',
        '*bip* Opérateur : Niko. Gardien. Enregistré.',
      ],
    },
  },
  'a-second-pair-of-hands': {
    title: 'Une deuxième paire de mains',
    logline: 'Query gagne son badge, et Moka ne veut pas de robot dans la cuisine de Lou.',
    panels: [
      [
        'Une photo « Employé du mois » au mur. Query porte son badge ; Mr. Albert applaudit.',
        'Employé du mois. Premier mois. Seul employé. Ça compte quand même.',
        '*bip* Badge astiqué. Quarante-deux fois.',
      ],
      [
        'Query tend sa tasse à Mr. Albert par-dessus le comptoir. Il rayonne.',
        'Monsieur Albert. Comme d’habitude. Café.',
        'Il s’est souvenu de mon habitude. Avant, il oubliait toujours.',
      ],
      [
        'Le bac à tickets du passe déborde jusqu’au sol. Moka disparaît derrière.',
        'Votre robot écrit plus vite que je ne verse. Il neige des tickets, ici.',
      ],
      [
        'Niko montre les deux stations vides de l’arrière-boutique. Moka barre le passage, bras croisés.',
        'Il reste deux stations vides au fond. Si on en trouvait un pour la cuisine…',
        'Pas dans la cuisine de Lou. J’ai déjà tenu cet endroit seule. Je peux recommencer.',
      ],
      [
        'Aube grise. Niko passe sur la pointe des pieds devant le perron éteint de Moka, Query assis dans la brouette.',
        'Niko y est allé quand même. Tôt, avant que Moka se lève.',
      ],
      [
        'De retour à la casse, Query voyage dans la brouette. Sous une bâche, un robot bleu acier serre une vieille machine à espresso dans ses bras.',
        '*bip* Même modèle détecté. Frère.',
        '*bip* Frère rejoint café Chez Niko.',
        '*bip* Niko garde deux robots, maintenant.',
        'Il ne veut pas lâcher cette machine. Moka va détester l’aimer autant.',
      ],
      [
        'Brew se réveille sur l’établi. Moka regarde depuis la porte, bras croisés.',
        '*BIP BIP !* Moulin ? Où moulin ?',
        'S’il touche à ma machine avant d’être formé, je le débranche.',
      ],
      [
        'À la machine à espresso, Moka tapote le manomètre pour Brew, qui se penche tout près. Niko sourit derrière eux.',
        'Alors aidez-moi à le former.',
        '…Quatre-vingt-douze degrés. Pas quatre-vingt-onze.',
      ],
    ],
  },
  'ninety-two-degrees': {
    title: 'Quatre-vingt-douze degrés',
    logline: 'Le dernier matin de Moka en cuisine, et la vérité sur la carte.',
    panels: [
      [
        'L’aube. Seule dans la cuisine, Moka astique la machine à espresso une dernière fois.',
        'Moka est arrivée avant tout le monde, comme depuis quarante ans.',
      ],
      [
        'Gros plan : la main de Moka posée sur la poche de son tablier, à côté du tasseur en laiton.',
        'Le tasseur voyage toujours dans cette poche. Pendant un temps, autre chose aussi.',
      ],
      [
        'Niko arrive à la porte avec Brew. Moka reste tournée vers la machine.',
        'La poste n’était pas lente. J’ai gardé la carte de Lou dans la poche de mon tablier pendant sept mois.',
      ],
      [
        'Moka, fatiguée, sur un tabouret près de la machine. Niko s’assoit en face d’elle et l’écoute.',
        'Je croyais pouvoir garder son café à elle. Six heures pile, tous les matins, toute seule. En juin, je n’arrivais plus à soulever le lait.',
        'Moka…',
      ],
      [
        'Brew tire un espresso. Moka le goûte dans une petite tasse, les yeux fermés.',
        'Et puis votre robot a tiré un espresso que je n’aurais pas su distinguer des siens.',
      ],
      [
        'Moka tend son tasseur à Brew sous le regard de Niko et de Query.',
        'Quatre-vingt-douze degrés, Brew. Toujours.',
        '*petit bip* Quatre-vingt-douze. Toujours.',
      ],
      [
        'Son tablier pend à un crochet près de la porte de la cuisine, une note épinglée dessus : 92°.',
        'Ça fait un moment que ce n’est plus le café de Lou, Niko. Faites-en le vôtre.',
        'Et vous, qui écrivez son code : il ne sait que ce que vous lui dites. Prenez soin de ma cuisine.',
      ],
      [
        'Moka sur son perron, en face, une tasse à la main, regarde la vitrine du café.',
        'Depuis son perron, en face, Moka voit la machine par la vitrine. Au cas où.',
      ],
    ],
  },
  'the-floor-robot': {
    title: 'Le robot de salle',
    logline: 'La rentrée approche, et Pip ne veut pas de robot dans sa salle.',
    panels: [
      [
        'Une salle bondée. Pip court avec trop de plateaux pendant que la tablée de Rosa lui fait signe.',
        'Table quatre ! Table deux ! Table… c’était laquelle, la quatre ?!',
      ],
      [
        'La table de Rosa, tout le monde fait signe. Pip pivote vers eux, une tasse vacillant sur son plateau du haut.',
        'Par ici, mon chou ! Et une autre tournée quand tu peux !',
      ],
      [
        'Un calendrier mural, la fin août entourée : RENTRÉE.',
        'L’école reprend lundi. Il reste une station. On pourrait trouver quelqu’un pour la salle.',
      ],
      [
        'Pip, bras croisés à la porte de l’arrière-boutique, devant la dernière station vide.',
        'Un robot ? Pas question. Lou disait que la salle, c’est le meilleur poste, parce qu’on apprend à connaître tout le monde.',
        'Les robots, ils connaissent personne.',
      ],
      [
        'Pip franchit le portail de la casse devant Niko et sa brouette, le menton levé.',
        'Pip est venu pour le prouver.',
      ],
      [
        'La casse. Sous un parasol cassé est assis un robot couleur de miel, qui tient encore un plateau parfaitement à plat.',
        'Il tient encore son plateau à plat. Après tout ce temps dehors.',
      ],
      [
        'Pip astique la visière poussiéreuse du robot avec son torchon pendant que Niko charge la brouette.',
        'D’accord. D’accord ! Mais c’est moi qui lui apprends. Le nom de tout le monde.',
      ],
      [
        'Porter se réveille, plateau levé. Les trois stations de recharge sont occupées.',
        '*ding ding !* Bonjour ! Bonjour ! C’est laquelle, la table quatre ?',
        'Leçon numéro un : Mr. Albert s’assoit près de la fenêtre.',
        'Trois stations, trois robots. Pour la première fois depuis le printemps, toutes les lumières de l’arrière-boutique sont allumées.',
      ],
    ],
  },
  'back-to-school': {
    title: 'La rentrée',
    logline: 'Le premier jour d’école de Pip, et le premier jour de Niko en simple patron.',
    panels: [
      [
        'La veille au soir. Pip montre les habitués à Porter, qui tient un carnet sur son plateau.',
        'Ça, c’est Juno. Du thé, jamais de sucre. Jamais de la vie.',
        '*ding* Juno. Thé. Sucre jamais de la vie.',
      ],
      [
        'Le matin. Pip attend à la porte avec son cartable ; les trois robots s’alignent pour lui dire au revoir.',
        'Premier jour d’école. Porter connaît le nom de tout le monde. J’ai vérifié. Deux fois.',
        '*bip triste* Qui apprend à Porter, maintenant ?',
        'La personne qui écrit ton code, gros bêta !',
      ],
      [
        'Pip part en courant dans la rue en faisant signe. Porter lui répond avec son plateau.',
        'Je passe samedi ! Un chocolat chaud, comme Lou le faisait !',
      ],
      [
        'Un service du matin sans accroc : Query à la caisse, Brew à la machine, Porter entre les tables.',
        'Query prend les commandes. Brew les prépare. Porter les apporte.',
      ],
      [
        'Niko, seul devant l’étagère, pousse les tasses vers la droite.',
        'Et les tasses vont à droite. Ça m’a toujours embêté.',
      ],
      [
        'Niko accroche son tablier au crochet, à côté de celui de Moka.',
        'À partir d’aujourd’hui, je suis juste le patron.',
      ],
    ],
    options: {
      ours: [
        'Comme on le fait, nous !',
        'Comme on le fait, nous !',
        'Avec plein de guimauves, alors. C’est ça, le « nous » !',
      ],
      lous: [
        'Exactement comme Lou.',
        'Exactement comme Lou. Je vais retrouver sa recette.',
        'Elle est écrite au crayon au dos de l’ardoise du menu. J’ai vérifié !',
      ],
    },
  },
  'closing-time': {
    title: 'L’heure de la fermeture',
    logline: 'Le café tourne tout seul, et la carte de Lou trouve sa place au mur.',
    panels: [
      [
        'Coucher de soleil. Un café plein : les habitués à leurs tables, les trois robots au travail.',
        'L’heure de la fermeture. La dernière tasse part vers l’évier.',
      ],
      [
        'Les habitués s’en vont pour la nuit. Porter tient la porte ; Mr. Albert soulève son chapeau.',
        'À demain, même heure, Niko.',
        '*ding ding !* Bonne nuit, table de la fenêtre !',
      ],
      [
        'Niko au comptoir, avec un café qu’il s’est fait lui-même. Query l’observe.',
        '*bip* Niko boit café. Aucun ticket écrit.',
        'Je me le suis fait moi-même. Les vieilles habitudes.',
      ],
      [
        'Query imprime un tout petit ticket et le pose à côté de la tasse de Niko.',
        'Pas dans le jeu d’instructions.',
        'Maintenant, si.',
      ],
      [
        'Moka traverse depuis son perron, et Pip rentre de l’école.',
        'Quatre-vingt-douze degrés. Bien.',
        'Les tables sont propres ! Porter a fait les coins.',
        'Et le chocolat chaud de samedi avait plein de guimauves. À notre façon.',
        'Et le chocolat chaud de samedi avait le goût de celui de Lou. Crayon compris.',
      ],
      [
        'Moka s’arrête devant l’étagère, où les tasses sont maintenant à droite. Niko attend, nerveux.',
        'Les tasses à droite, à ce que je vois.',
        'C’est… d’accord ?',
        'C’est votre café.',
        '*bip* Café : Chez Niko. Enregistré depuis l’établi.',
        '*bip* Mise à jour. Niko plus gardien. Café : Chez Niko. Enregistré.',
      ],
      [
        'Niko épingle la carte postale de Lou au mur, à côté de la photo de groupe. Moka se tient à son épaule.',
        '« Sois gentil avec la vieille machine. »',
        'Elle ne parlait pas de la machine à espresso, hein ?',
        'Pendant quarante ans, elle m’a appelée comme ça.',
      ],
      [
        'Une photo de groupe au mur, et la carte postale de Lou épinglée à côté.',
        'Six heures pile, demain ?',
        'Sept. Je suis à la retraite.',
      ],
    ],
  },
};
