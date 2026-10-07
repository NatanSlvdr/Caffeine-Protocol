import type { ShiftNarrative } from './narrative';

/**
 * The shifts' titles and briefs in French, row for row with campaignNarrative. Block names, conditions and the words a
 * customer says, like Wait for Orders, Tea and “the usual”, are the game's own and stay English. Written with plain
 * spaces: the French catalog sets them with French typography.
 */
export const campaignNarrativeFr: readonly Omit<ShiftNarrative, 'level'>[] = [
  {
    title: 'Premier jus',
    story:
      'Les portes rouvrent ! Niko accueille le tout premier client, Moka tient la cuisine et Pip porte les boissons. Tout le monde est très occupé. Surtout Niko.',
    objective:
      'Regardez la commande d’un client passer de la caisse à une boisson prête et à une table débarrassée. Niko écrit chaque ticket à la main : repérez la tâche que Query pourrait reprendre.',
    hint: 'Suivez une commande de bout en bout.',
    concept:
      'Chaque commande fait le même trajet : caisse, cuisine, table. Chaque robot que vous construisez en reprend une étape.',
    lessonNote:
      'Niko : Le café est à nous, maintenant. Regardez un client commander, recevoir sa boisson et laisser une table propre. Suivez chaque commande de la caisse à la table, en passant par la cuisine.',
  },
  {
    title: 'Hello, World, un café',
    story:
      'Query est réveillé et prêt à dire bonjour au monde. Le tout premier client voudrait un café. Pas de pression.',
    objective:
      'Un client veut un café, mais la cuisine ne prépare une boisson que sur un ticket écrit, passé depuis le comptoir. Faites arriver un ticket de café en cuisine.',
    hint: 'Une feuille, on écrit, on la passe.',
    concept:
      'Un robot fait exactement ce que dit sa routine, un bloc à la fois, de haut en bas. La cuisine n’entend jamais le client : elle ne sait que ce qui lui arrive sur papier.',
    lessonNote:
      'Wait for Orders, puis Take up pour prendre une feuille sur la pile de papier, et Write Coffee dessus. Move right 1, Deposit right au passe de la cuisine, puis Move left 1 pour revenir à la caisse. L’encaissement se fait tout seul.',
  },
  {
    title: 'Un latte sans fin',
    story:
      'Un client heureux, c’est un bon début. Mais un autre attend déjà à la porte. Et un autre. Et encore un autre…',
    objective:
      'Plusieurs clients attendent un café, mais Query s’arrête après la première commande. Chaque client de la file doit être servi.',
    hint: 'Un Jump en arrière, et on réécoute.',
    concept:
      'Une routine s’exécute jusqu’à son dernier bloc, puis s’arrête. Un Jump vers une destination placée plus haut relance les mêmes blocs, pour le client suivant et celui d’après.',
    lessonNote:
      'Placez une destination de Jump au-dessus de Wait for Orders, et un Jump qui y revient une fois de retour à la caisse. Continuez à servir chaque client.',
  },
  {
    title: 'Café ou thé ?',
    story:
      'Le thé arrive à la carte, et le grand débat commence. Dans la file, certains veulent encore du café, d’autres aimeraient du thé. Query va devoir bien écouter.',
    objective:
      'Les clients commandent maintenant du café ou du thé. Chaque ticket doit nommer la boisson que le client a vraiment demandée.',
    hint: 'Guettez le mot Tea.',
    concept:
      'Un choix : If exécute ses blocs seulement si sa condition est vraie, et Else les siens sinon. Pour chaque client, exactement l’un des deux se produit.',
    lessonNote:
      'Les conditions portent sur ce qu’a dit le client. Dans la boucle, testez-le avec If Tea IN Orders, puis Write Tea ou Write Coffee.',
  },
  {
    title: 'Avec ou sans sucre',
    story:
      'Avec du sucre, s’il vous plaît ! Sans sucre, merci ! Query entend « sugar » haut et fort… et aussi ce petit « without » sournois.',
    objective:
      'Certains clients demandent du sucre, d’autres disent « without sugar » : ils parlent de sucre mais n’en veulent pas. Chaque ticket doit correspondre à ce que le client voulait dire.',
    hint: 'Du sucre, sauf s’ils disent « without ».',
    concept:
      'Les conditions ne cherchent que des mots. « Without sugar » contient aussi le mot sugar, alors un If dans un autre If distingue les deux.',
    lessonNote:
      'If Sugar IN Orders repère une demande de sucre, et Write 1 Sugar l’inscrit sur la feuille tenue. « Without sugar » contient toujours Sugar, plus Negation : dans ce If, testez If Negation IN Orders, puis Write 0 Sugar ou Write 1 Sugar.',
  },
  {
    title: 'Pour chacun ses goûts',
    story:
      'Deux amis arrivent ensemble et commandent d’un coup. La cuisine veut un ticket par boisson. Partager, c’est bien, mais pas sur papier.',
    objective:
      'Certains clients commandent plusieurs boissons à la fois. La cuisine a besoin d’un ticket séparé pour chaque boisson.',
    hint: 'Une feuille par boisson.',
    concept:
      'Une boucle sur une liste : For item in order exécute ses blocs une fois pour chaque boisson, et item désigne la boisson en cours à ce passage.',
    lessonNote:
      'For item in order passe sur chaque boisson de la commande. À chaque passage, prenez une feuille vierge, écrivez cet item, déposez-la et revenez à la caisse.',
  },
  {
    title: 'Un sucre ou deux ?',
    story:
      'Un sucre ? Deux ? Aucun, merci bien ? Nos clients deviennent exigeants, et « un peu de sucre » ne suffit plus.',
    objective:
      'Les clients demandent maintenant un nombre exact de sucres, zéro compris. Un simple oui ou non ne suffit plus : chaque ticket doit porter le compte exact.',
    hint: 'Comptez les sucres, exactement.',
    concept:
      'Une variable est une boîte qui porte un nom. Store y range ce qu’a dit le client, et tout bloc qui la lit retrouve cette valeur, quelle qu’elle soit.',
    lessonNote:
      'If Number IN item vérifie la présence d’un nombre. Store Var A = Number in item, puis Write Var A Sugar écrit la quantité exacte, zéro compris. Gardez les tests de sucre et de négation pour les commandes sans nombre.',
  },
  {
    title: 'Comme d’habitude ?',
    story:
      'Un client demande « the usual », comme d’habitude. Query ne l’a jamais vu. Mieux vaut demander à Niko que deviner. Réussissez, et il y a un badge à la clé.',
    objective:
      'Certains clients commandent « the usual », que Query ne sait pas interpréter. Deviner enverrait la mauvaise boisson en cuisine : une commande floue doit être éclaircie avant d’écrire quoi que ce soit.',
    hint: 'Dans le doute, demandez à Niko.',
    concept:
      'N’agissez jamais sur ce que vous ne savez pas lire. Demandez d’abord : Help remplace les mots flous par ce que voulait dire le client, et tout ce qui suit part de la réponse.',
    lessonNote:
      'Une demande floue contient Ambiguous. Avant de prendre une feuille ou de lancer For item in order, utilisez If Ambiguous IN Orders et Help. Niko remplace les commandes entendues par une précision.',
  },
  {
    title: 'Une amitié bien corsée',
    story:
      'Brew entre en cuisine, plein d’entrain et un peu grinçant. Moka l’observe depuis la porte, bras croisés, pendant que Pip fait circuler les boissons.',
    objective:
      'La recette de café de Brew est presque complète, mais il ne fait jamais marcher la machine à café : les grains ne sont jamais moulus. Chaque café doit être moulu, passé et déposé au comptoir de retrait.',
    hint: 'Grains, mouture, eau, café.',
    concept:
      'Une recette est une séquence. Chaque étape dépend de la précédente : qu’il en manque une, et la boisson n’est jamais faite.',
    lessonNote:
      'Brew attend les tickets de Query au passe des commandes et prépare chaque boisson : Take up pour les grains à la réserve, Use up à la machine à café pour les moudre, Take up pour l’eau à l’évier, Use up à nouveau à la machine pour passer le café, puis Deposit up au comptoir de retrait. Pip sert toujours la salle.',
  },
  {
    title: 'Laisser infuser',
    story:
      'Une commande de thé arrive en cuisine. Brew doit suivre une autre recette sans oublier comment faire le café.',
    objective:
      'Les tickets demandent maintenant du café ou du thé, et les deux boissons n’ont pas les mêmes ingrédients. Brew doit préparer la boisson que demande chaque ticket.',
    hint: 'Lisez le ticket : café ou thé ?',
    concept:
      'Le même choix que fait Query, en cuisine cette fois : Brew n’entend pas le client, alors il décide d’après ce que dit le ticket.',
    lessonNote:
      'Le thé se fait avec des feuilles, de l’eau et une infusion. Les feuilles sautent le moulin : décidez selon le ticket, et menez le thé tout droit à l’évier.',
  },
  {
    title: 'Un morceau de sucre',
    story:
      'La bonne boisson n’est que la moitié de la commande. Brew doit se souvenir des petits extras qui la rendent parfaite.',
    objective:
      'Les tickets peuvent demander du sucre, mais Brew sert chaque boisson sans sucre. Chaque boisson doit avoir la quantité de sucre de son ticket.',
    hint: 'Passez au sucrier avant le retrait.',
    concept:
      'Une boucle qui compte : For Var A times répète ses blocs exactement autant de fois que la variable l’indique, et zéro fois veut dire pas du tout.',
    lessonNote:
      'Les commandes demandent maintenant du sucre. Store range le sucre de la commande dans Var A, puis, dans For Var A times, Take up au sucrier ajoute un morceau.',
  },
  {
    title: 'Appelle-moi si tu peux',
    story:
      'Brew prépare les mêmes recettes depuis ce matin. Donnons un nom à ces gestes familiers, et appelons-les, tout simplement.',
    objective:
      'La recette de Brew est une longue suite d’étapes au milieu de sa routine, et Brew en aura bientôt besoin plus d’une fois par trajet. Servez chaque ticket comme avant, avec la recette écrite en un seul endroit.',
    hint: 'Nommez la recette, puis appelez-la.',
    concept:
      'Une fonction est une recette qui porte un nom. Écrivez les étapes une fois, appelez-les avec Call partout où il le faut, et un changement dans la recette change chaque boisson.',
    lessonNote:
      'Placez la recette dans Function recipe. Call recipe prépare la boisson du plus ancien ticket que tient Brew.',
  },
  {
    title: 'Double dose',
    story:
      'Moka a raccroché son tablier, et Brew tient la cuisine seul. Ses mains prennent maintenant deux tasses, et un peu d’organisation évite bien des allers-retours.',
    objective:
      'Brew peut maintenant porter deux tasses, mais il fait toujours une boisson par trajet. Brew doit en faire deux à la fois, et les boissons doivent partir dans l’ordre et correspondre à leurs tickets.',
    hint: 'Deux tasses, un trajet.',
    concept:
      'Le regroupement : deux boissons en un trajet, c’est un aller-retour d’économisé à chaque fois. Rassemblez le travail d’abord, puis faites-le d’un coup, dans l’ordre d’arrivée.',
    lessonNote:
      'Brew tient maintenant deux tasses. Prenez deux tickets avant de les préparer. Les boissons terminées partent au comptoir de retrait dans l’ordre.',
  },
  {
    title: 'Livraison spéciale',
    story:
      'Voici Porter, le tout nouveau robot de salle. Pip lui montre une boisson prête et le client qui l’attend, et continue de débarrasser les tables, juste pour aujourd’hui.',
    objective:
      'Les boissons prêtes attendent au comptoir de retrait, et chaque ticket indique la table qui a commandé. Porter part sans le lire. Chaque boisson doit arriver à la table de son ticket.',
    hint: 'Le ticket indique la table.',
    concept:
      'Le ticket porte la table. Gardez-la dans une variable, et Move to trouve le chemin, où que soit la table.',
    lessonNote:
      'Porter prend la salle en main. Wait for Orders lui réserve une boisson prête et Take down la récupère au comptoir de retrait. Store range la table de la commande dans Var A : Move to Var A y mène Porter tout seul, et Deposit up la sert.',
  },
  {
    title: 'Place nette',
    story:
      'Pip est parti acheter ses livres d’école, alors les tasses vides sont l’affaire de Porter, maintenant. Une table propre, c’est la première impression du client suivant.',
    objective:
      'Les clients laissent leurs tasses vides derrière eux, et Porter ne sait que livrer. Chaque tasse utilisée doit retourner à l’évier avant que le client suivant puisse s’asseoir.',
    hint: 'Les tasses vides vont à l’évier.',
    concept:
      'Un deuxième genre de tâche. Wait for Dirty cups confie à Porter une tasse à débarrasser, comme Wait for Orders lui confie une boisson à servir.',
    lessonNote:
      'Wait for Dirty cups choisit une tasse utilisée. Allez à sa table, prenez-la avec Take up, puis portez-la à l’évier et faites Deposit down.',
  },
  {
    title: 'Thé pour deux',
    story:
      'Le dernier service de Pip avant la rentrée. Le nouveau plateau de Porter porte deux objets : deux clients, un trajet, zéro dégât. En principe.',
    objective:
      'Le plateau de Porter tient maintenant deux objets, mais Porter les porte toujours un par un. Porter doit remplir le plateau avant de partir, et au-delà de deux, rien ne tient.',
    hint: 'Remplissez le plateau avant de partir.',
    concept:
      'Le regroupement de Brew, en salle : on remplit le plateau, puis on y va. Chaque boisson garde sa propre table, et le plateau les rend dans l’ordre où elles y sont montées.',
    lessonNote:
      'Porter tient maintenant deux objets. Prenez deux boissons avant de servir, puis débarrassez les deux tables. Le plateau se vide dans l’ordre où il a été rempli.',
  },
  {
    title: 'À emporter',
    story:
      'Pip a repris l’école, et les robots tiennent le café seuls. Ceux qui partent au travail le matin veulent leur café à emporter.',
    objective:
      'Certains clients commandent leur boisson à emporter. Ils ne s’assoient pas : ils attendent près de la porte. Chaque boisson à emporter doit arriver sur l’étagère à emporter, avec un couvercle.',
    hint: 'Une boisson à emporter ne va jamais à une table.',
    concept:
      'Une mention sur un ticket change la tâche de chaque robot : Query l’écrit, Brew ajoute un couvercle, et Porter file vers l’étagère au lieu d’une table.',
    lessonNote:
      'Certains clients commandent à emporter. Query écrit To go sur leur ticket : If To go IN item, puis Write To go. Brew met un couvercle sur ces boissons : Take up aux couvercles, entre le sucre et le retrait. Porter les laisse sur l’étagère à emporter près de la porte : il y va et fait Deposit down. Elles partent dans des gobelets en carton, il n’y a donc rien à débarrasser.',
  },
  {
    title: 'Quatre tasses',
    story:
      'La livraison de tasses a du retard, et il n’y a que quatre tasses dans tout le café. Chaque tasse doit revenir et être lavée avant de resservir.',
    objective:
      'Seules quatre tasses tournent. Quand il n’y en a plus, la boisson suivante doit attendre qu’une tasse utilisée soit débarrassée et lavée. Faites revenir les tasses pour que chaque client soit servi.',
    hint: 'Une tasse doit revenir avant de repartir.',
    concept:
      'Une réserve partagée et limitée. Les tasses tournent dans leur propre boucle : elles partent avec une boisson, reviennent à l’évier, sont lavées, et repartent.',
    lessonNote:
      'Il n’y a que quatre tasses au café. Prendre des grains ou des feuilles à la réserve utilise une tasse propre, et Porter dépose les tasses utilisées dans l’évier. Use up à l’évier les lave. Quand il ne reste aucune tasse propre, Brew attend à l’évier qu’une tasse utilisée revienne.',
  },
  {
    title: 'Les pressés',
    story:
      'Le coup de feu de midi amène des gens qui ont un train à prendre. Ils ne peuvent pas attendre derrière toute la file.',
    objective:
      'Certains clients sont pressés, mais leurs tickets ressemblent à ceux des autres, alors leurs boissons font la queue. Chaque commande pressée doit porter Rush sur son ticket, et un robot qui en tient une doit la terminer avant d’attendre quoi que ce soit d’autre.',
    hint: 'Marquez-la Rush, puis ne la faites pas attendre.',
    concept:
      'La priorité : certains travaux ne peuvent pas attendre. Une commande pressée passe en premier, et rien de nouveau n’est pris tant qu’on en tient une.',
    lessonNote:
      'Les clients pressés le disent : Query écrit Rush sur leur ticket. Les commandes Rush passent devant la file, et celui qui en tient une s’en occupe d’abord. Brew ne peut pas attendre un autre ticket tant qu’il tient une commande pressée, et Porter ne peut ni attendre ni prendre une autre boisson tant qu’il en porte une.',
  },
  {
    title: 'Dernières commandes',
    story:
      'C’est l’heure de fermer. Les derniers clients terminent, et les robots devraient être à leur base avant que Niko ferme la porte à clé.',
    objective:
      'Quand le dernier client a été servi et que chaque table est débarrassée, les trois robots doivent s’arrêter.',
    hint: 'Terminez, puis arrêtez-vous.',
    concept:
      'Toute routine a besoin d’une fin. Quand le café ferme, Wait entend Closed : terminez ce que vous tenez, puis Stop.',
    lessonNote:
      'Après le dernier client, Wait for Orders annonce Closed au lieu d’attendre. Testez If Closed IN Orders, puis Stop. Chaque robot doit s’arrêter, après avoir terminé ce qu’il tient. Un robot qui attend encore garde le café ouvert.',
  },
  {
    title: 'Libre expresso',
    story: 'La journée la plus chargée à ce jour. Niko s’assoit avec un café et confie toute la salle à l’équipe.',
    objective:
      'Le dernier service réunit tout : commandes de groupe, café et thé, sucre, demandes floues, boissons à emporter, quatre tasses seulement, clients pressés et heure de fermeture. Chaque client doit être servi, chaque table débarrassée, et chaque robot arrêté.',
    hint: 'Tout, en même temps.',
    concept:
      'Rien de nouveau : chaque idée vue jusqu’ici, qui travaille avec les autres. Réparez un robot à la fois, et laissez la dernière exécution vous dire lequel.',
    lessonNote:
      'Tout à la fois : groupes, « the usual », boissons à emporter, quatre tasses, clients pressés et heure de fermeture.',
  },
];
