import { count, type FailureCode } from '@/domain';
import { countFr, words } from '@/shared/language';

/** How the card says the evidence is old: what to run to check the change. */
type Recheck = 'bench' | 'round' | 'run';

/**
 * The words of the failure card: where a run stopped, what was wanted against what happened, Query's choices, what to
 * try next and the ways on. Why it stopped is the simulation's own sentence, still in English, and so is what a guest
 * said and the blocks Query tested. Block names in a hint are programming words, so the French quotes them as they
 * read in the routine (Wait for Orders, Store, Write To go).
 */
export const FAILURE_WORDS = words(
  {
    title: (robot: string, compile: boolean) => (compile ? `${robot}’s routine won’t run` : `${robot} stopped`),
    bench: 'Bench',
    practice: 'Practice',
    round: (n: number) => `Round ${n}`,
    guest: (n: number) => `Guest ${n}`,
    closing: 'Closing time',
    stale: 'From your last run. The routine has changed since:',
    recheck: (how: Recheck): string =>
      how === 'bench'
        ? 'run the bench again to check it.'
        : how === 'round'
          ? 'practise this round to check it, or run the whole service.'
          : 'run again to check.',
    /** The rules the bench eased, as `easedWords` says them. */
    eased: (eased: string) => `The bench ran with ${eased}.`,
    caption: (ticket?: number) => `What was wanted, against what happened${ticket ? `, on ticket ${ticket}` : ''}`,
    ticket: (n: number) => `Ticket ${n}`,
    decided: (robot: string) => `What ${robot} decided`,
    last: (n: number) => ` · last ${n}`,
    block: (n: number) => `Block ${n}`,
    /** After the IF as the block reads, which stays as it is: “if tea in orders? Yes”. */
    asked: '?',
    holds: (holds: boolean): string => (holds ? 'Yes' : 'No'),
    /** After one part of the IF: “tea in orders: yes”. */
    part: (holds: boolean): string => `: ${holds ? 'yes' : 'no'}`,
    heard: 'Heard in',
    try: 'Try',
    show: (robot: string) => `Show where ${robot} stopped`,
    follow: (guest: string) => `Follow ${guest}’s order`,
    again: 'Run the bench again',
    practise: (round: number) => `Practise round ${round}`,
    compareServed: 'Compare with last served',
    /** The comparison's columns, its rows and the values in them. */
    compare: {
      ordered: 'Ordered',
      handedOver: 'Handed over',
      ticket: 'Ticket',
      cup: 'Cup',
      wentTo: 'Went to',
      cupLeftOn: 'Cup left on',
      lookedAt: 'Looked at',
      needed: 'Needed',
      used: 'Used',
      drink: 'Drink',
      sugar: 'Sugar',
      toGo: 'To go',
      rush: 'Rush',
      together: 'Together',
      tickets: 'Tickets',
      lid: 'Lid',
      table: 'Table',
      destination: 'Destination',
      facing: 'Facing',
      drinks: { coffee: 'Coffee', tea: 'Tea' } as Record<string, string>,
      nothingWritten: 'Nothing written',
      withSugar: 'With sugar',
      noSugar: 'No sugar',
      sugars: (n: number) => count(n, 'sugar'),
      notMarked: 'Not marked',
      stayingIn: 'Staying in',
      inAHurry: 'In a hurry',
      noHurry: 'No hurry',
      allAtOnce: 'All at once',
      onTheirOwn: 'On their own',
      drinkCount: (n: number) => count(n, 'drink'),
      ticketCount: (n: number) => count(n, 'ticket'),
      noTickets: 'No tickets',
      lidOn: 'Lid on',
      toGoLidOn: 'To go, lid on',
      noLid: 'No lid',
      stayingNoLid: 'Staying in, no lid',
      shelf: 'To-go shelf',
      somewhereElse: 'Somewhere else',
      tableN: (n: string) => `Table ${n}`,
      anotherWay: 'Another way',
    },
    /** The nudge toward a fix for each kind of failure, chosen by its code, never its wording. */
    hints: {
      compile: 'Fix the highlighted block, and the shift can run.',
      unsupported: 'Look at the highlighted block.',
      'loop-limit': 'Something loops forever. Make sure every loop waits for, or reaches, its next job.',
      'end-of-routine':
        'A robot runs its routine from top to bottom once. A Jump back to a jump destination at the top sends it round again for the next job.',
      'jump-across-block': 'A Jump can’t cut into or out of a For loop or a function: let it reach its End, then jump.',
      'return-outside-call':
        'Return sends a robot back to the block after its Call, so it belongs inside a Function that a Call runs.',
      'recursive-call':
        'A function runs when a Call in the main routine asks: inside the function, finish its steps and let it reach End. Calls to other functions go in the main routine too.',
      'unset-variable': 'A variable stays empty until a Store fills it: put the Store above the block that reads it.',
      'wrong-variable-kind':
        'A variable holds whatever its Store put there: check that the Store reads the right thing.',
      'no-number': 'Not every item carries a number, so only Store from one inside an If that checks for it.',
      'no-job':
        'A robot only acts on a job it has been handed. Start with the right Wait block, so it knows what to do.',
      'one-job-at-a-time': 'Put down what it’s carrying where it belongs before Wait for Orders brings the next job.',
      'unfinished-work':
        'A robot that picks something up has to see it through. Make sure every path through its routine puts it down where it belongs.',
      starved:
        'The work it’s waiting for stopped somewhere before it: follow it back to the robot that should have passed it on.',
      'wrong-wait':
        'Each Wait brings one kind of work: Wait for Orders the next drink to serve, Wait for Dirty cups a cup a guest left behind. Serve first, then clear.',
      'out-of-reach': 'A robot only reaches what’s right beside it: walk over before using it.',
      'wrong-direction': 'Take and Deposit reach the one tile their arrow points at: turn it toward the station.',
      'wrong-spot':
        'Query listens and takes paper at the register, with the paper stack just above it. Tickets go one tile to the right, Deposit right at the kitchen handoff, and then it’s back to the register.',
      'nothing-there': 'A robot only knows what to take once it has a job: Wait for Orders first.',
      'empty-hands': 'Pick it up first: a robot can only put down what it’s holding.',
      'hands-full': 'Put something down before picking up more.',
      'rush-first': 'A rush order comes first: finish it before waiting for anything else.',
      'no-paper': 'Take up a sheet from the paper stack first: Query can only write on paper it’s holding.',
      'paper-in-hand':
        'Each sheet goes to the kitchen handoff before Query starts on anything else: Deposit right, then take a fresh one.',
      'ticket-not-handed-over':
        'Writing the ticket is only half of it: the kitchen only makes what is handed over at the handoff.',
      'blank-ticket':
        'The kitchen makes exactly what the ticket says, so write the drink on it before handing it over.',
      'no-ticket': 'Every order needs a written ticket handed to the kitchen.',
      'ticket-count':
        'One sheet per drink they named, no more and no less: the kitchen makes exactly what it’s handed.',
      'ticket-item': 'Check what the order says before you write the drink.',
      'ticket-sugar': 'Look closely at how much sugar they asked for, including none.',
      'ticket-to-go-missing': 'To-go orders say so: If To go IN item, then Write To go.',
      'ticket-to-go-extra': 'Only write To go when the order says so: check If To go IN item first.',
      'ticket-rush-missing': 'Write Rush on their ticket, so the kitchen and the floor know.',
      'ticket-rush-extra':
        'Rush jumps the queue, so it’s only for guests who say they’re in a hurry: check If Rush IN item first.',
      'ticket-together-missing':
        'A table that orders together says so: If Together IN Orders, then Write Together on each of its tickets.',
      'ticket-together-extra':
        'Together is only for a table ordering for more than one: check If Together IN Orders first.',
      checkout: 'Head back to the register after the last ticket so the guest can pay.',
      'unclear-order': 'Guessing sends the wrong drink. Ask me with Help first, and I’ll find out what they meant.',
      'help-needed': 'When an order is unclear, ask me with Help before writing anything.',
      'help-unneeded': 'Only ask for Help when the order really is unclear.',
      'guessed-drink': 'If nobody can clarify, don’t take a sheet at all.',
      'sold-out':
        'We’re out of what they asked for. Check If Sold out IN Orders, and ask me with Help: I’ll find out what they’d have instead.',
      'booked-for-later':
        'A drink booked for later is made when its guest is back. Check If For later IN Orders, and Jump back to Wait for Orders without writing it down.',
      'stopped-listening':
        'The café doesn’t close after one guest: loop back to Wait for Orders so Query hears the next one.',
      'recipe-order': 'The recipe goes one step at a time, in order: do the next step before moving on.',
      'already-brewed': 'A brewed drink is finished with the machine. Give it its sugar, or Deposit it up at pickup.',
      'grinder-serviced':
        'The grinder’s out for its service, so the coffee comes pre-ground. Check If Pre-ground IN Orders, and take it straight up to the sink.',
      'fuse-tripped':
        'The coffee machine and the dishwasher share one socket. Start the wash where Brew has a long way to go before it next uses the machine.',
      'not-brewed': 'Finish the recipe before adding sugar, putting a lid on, or sending the drink out.',
      'too-much-sugar': 'Brew adds exactly the sugar on the ticket: count it out, and stop there.',
      'sugar-count': 'Brew adds exactly the sugar on the ticket: count it out, and stop there.',
      'sugar-before-lid': 'To-go drinks leave with a lid on, after their sugar. Drinks that stay in don’t need one.',
      'lid-missing': 'To-go drinks leave with a lid on, after their sugar. Drinks that stay in don’t need one.',
      'lid-extra': 'To-go drinks leave with a lid on, after their sugar. Drinks that stay in don’t need one.',
      'no-clean-cups': 'Every cup has to come back and be washed before it can go out again.',
      'recipe-not-function':
        'Wrap the recipe steps in Function recipe, then put Call recipe right after Wait for Orders: one name, one place to change.',
      'carry-more':
        'That’s what the bigger hands are for. Fill both before setting off, then finish both on the same trip.',
      'to-go-to-shelf': 'To-go drinks go on the to-go shelf by the door: walk there and Deposit down.',
      'stay-in-to-table': 'Only to-go drinks go on the shelf by the door. This one goes to the table on its ticket.',
      'wrong-table': 'The ticket names the table. Keep it and go there.',
      'wrong-dirty-table':
        'Used cups don’t come with a ticket: Wait for Dirty cups names the table one was left on. Store its table and walk there before you Take it up.',
      'table-not-cleared': 'A clean table is the next guest’s first impression, and nobody sits at a messy one.',
      'table-apart':
        'A Together ticket means its table wants both drinks at once: wait for both, carry them on one tray, and serve them on one visit.',
      'drink-cold':
        'A drink keeps warm only so long once Brew sets it down: have Porter take each one out as it comes, and clear the used cups between deliveries, not before them.',
      'open-after-closing': 'After Wait for Orders, check If Closed IN Orders, finish what’s in hand, and Stop.',
      'stopped-early': 'After Wait for Orders, check If Closed IN Orders, finish what’s in hand, and Stop.',
      'closing-ticket': 'After Wait for Orders, check If Closed IN Orders, finish what’s in hand, and Stop.',
    } satisfies Record<FailureCode, string>,
  },
  {
    title: (robot, compile) => (compile ? `La routine de ${robot} ne peut pas tourner` : `${robot} s’est arrêté`),
    bench: 'Banc d’essai',
    practice: 'Entraînement',
    round: (n) => `Manche ${n}`,
    guest: (n) => `Client ${n}`,
    closing: 'Fermeture',
    stale: 'De votre dernier essai. La routine a changé depuis :',
    recheck: (how) =>
      how === 'bench'
        ? 'relancez le banc d’essai pour vérifier.'
        : how === 'round'
          ? 'entraînez-vous sur cette manche pour vérifier, ou lancez tout le service.'
          : 'relancez pour vérifier.',
    eased: (eased) => `Le banc d’essai a tourné ${eased}.`,
    caption: (ticket) => `Ce qui était demandé, face à ce qui s’est passé${ticket ? `, sur le ticket ${ticket}` : ''}`,
    ticket: (n) => `Ticket ${n}`,
    decided: (robot) => `Ce que ${robot} a décidé`,
    last: (n) => ` · les ${n} derniers`,
    block: (n) => `Bloc ${n}`,
    asked: ' ?',
    holds: (holds) => (holds ? 'Oui' : 'Non'),
    part: (holds) => ` : ${holds ? 'oui' : 'non'}`,
    heard: 'Entendu dans',
    try: 'À essayer',
    show: (robot) => `Montrer où ${robot} s’est arrêté`,
    follow: (guest) => `Suivre la commande de ${guest}`,
    again: 'Relancer le banc d’essai',
    practise: (round) => `S’entraîner sur la manche ${round}`,
    compareServed: 'Comparer avec la dernière servie',
    compare: {
      ordered: 'Commandé',
      handedOver: 'Remis',
      ticket: 'Sur le ticket',
      cup: 'Dans la tasse',
      wentTo: 'Livré à',
      cupLeftOn: 'Tasse laissée à',
      lookedAt: 'Cherchée à',
      needed: 'Il fallait',
      used: 'Utilisé',
      drink: 'Boisson',
      sugar: 'Sucre',
      toGo: 'À emporter',
      rush: 'Pressé',
      together: 'Ensemble',
      tickets: 'Nombre de tickets',
      lid: 'Couvercle',
      table: 'Table',
      destination: 'Destination',
      facing: 'Orientation',
      drinks: { coffee: 'Café', tea: 'Thé' },
      nothingWritten: 'Rien d’écrit',
      withSugar: 'Avec sucre',
      noSugar: 'Sans sucre',
      sugars: (n) => countFr(n, 'sucre'),
      notMarked: 'Pas indiqué',
      stayingIn: 'Sur place',
      inAHurry: 'Pressé',
      noHurry: 'Pas pressé',
      allAtOnce: 'Tout ensemble',
      onTheirOwn: 'Chacun à part',
      drinkCount: (n) => countFr(n, 'boisson'),
      ticketCount: (n) => countFr(n, 'ticket'),
      noTickets: 'Aucun ticket',
      lidOn: 'Couvercle mis',
      toGoLidOn: 'À emporter, couvercle mis',
      noLid: 'Pas de couvercle',
      stayingNoLid: 'Sur place, sans couvercle',
      shelf: 'Étagère à emporter',
      somewhereElse: 'Ailleurs',
      tableN: (n) => `Table ${n}`,
      anotherWay: 'Une autre direction',
    },
    hints: {
      compile: 'Corrigez le bloc surligné, et le service pourra tourner.',
      unsupported: 'Regardez le bloc surligné.',
      'loop-limit':
        'Quelque chose boucle sans fin. Vérifiez que chaque boucle attend son prochain travail, ou y arrive.',
      'end-of-routine':
        'Un robot déroule sa routine une seule fois, de haut en bas. Un Jump vers une destination en haut le renvoie au début pour le travail suivant.',
      'jump-across-block':
        'Un Jump ne peut pas entrer dans une boucle For ou une fonction, ni en sortir : laissez-la atteindre son End, puis sautez.',
      'return-outside-call':
        'Return renvoie un robot au bloc qui suit son Call : il a donc sa place dans une Function lancée par un Call.',
      'recursive-call':
        'Une fonction tourne quand un Call de la routine principale le demande : dans la fonction, terminez ses étapes et laissez-la atteindre End. Les Call vers d’autres fonctions vont aussi dans la routine principale.',
      'unset-variable':
        'Une variable reste vide tant qu’un Store ne la remplit pas : placez le Store au-dessus du bloc qui la lit.',
      'wrong-variable-kind':
        'Une variable contient ce que son Store y a mis : vérifiez que le Store lit la bonne chose.',
      'no-number':
        'Tous les articles ne portent pas de numéro : ne faites un Store qu’à l’intérieur d’un If qui le vérifie.',
      'no-job':
        'Un robot n’agit que sur un travail qu’on lui a confié. Commencez par le bon bloc Wait, pour qu’il sache quoi faire.',
      'one-job-at-a-time': 'Posez ce qu’il porte à sa place avant que Wait for Orders n’apporte le travail suivant.',
      'unfinished-work':
        'Un robot qui prend quelque chose doit aller jusqu’au bout. Vérifiez que chaque chemin de sa routine le repose à sa place.',
      starved:
        'Le travail qu’il attend s’est arrêté quelque part avant lui : remontez jusqu’au robot qui aurait dû le lui passer.',
      'wrong-wait':
        'Chaque Wait apporte un genre de travail : Wait for Orders la prochaine boisson à servir, Wait for Dirty cups une tasse laissée par un client. Servez d’abord, débarrassez ensuite.',
      'out-of-reach': 'Un robot n’atteint que ce qui est juste à côté de lui : approchez-vous avant de l’utiliser.',
      'wrong-direction': 'Take et Deposit atteignent la seule case que montre leur flèche : tournez-la vers le poste.',
      'wrong-spot':
        'Query écoute et prend le papier à la caisse, la pile de papier juste au-dessus. Les tickets vont une case à droite, Deposit right au passe de la cuisine, puis retour à la caisse.',
      'nothing-there': 'Un robot ne sait quoi prendre qu’une fois qu’il a un travail : Wait for Orders d’abord.',
      'empty-hands': 'Prenez-le d’abord : un robot ne peut poser que ce qu’il tient.',
      'hands-full': 'Posez quelque chose avant d’en reprendre.',
      'rush-first': 'Une commande pressée passe en premier : terminez-la avant d’attendre autre chose.',
      'no-paper':
        'Prenez d’abord une feuille sur la pile de papier : Query ne peut écrire que sur le papier qu’il tient.',
      'paper-in-hand':
        'Chaque feuille va au passe de la cuisine avant que Query ne commence autre chose : Deposit right, puis prenez-en une nouvelle.',
      'ticket-not-handed-over':
        'Écrire le ticket n’est que la moitié du travail : la cuisine ne prépare que ce qui lui est remis au passe.',
      'blank-ticket': 'La cuisine prépare exactement ce que dit le ticket : écrivez-y la boisson avant de le remettre.',
      'no-ticket': 'Chaque commande a besoin d’un ticket écrit, remis à la cuisine.',
      'ticket-count':
        'Une feuille par boisson demandée, ni plus ni moins : la cuisine prépare exactement ce qu’on lui remet.',
      'ticket-item': 'Vérifiez ce que dit la commande avant d’écrire la boisson.',
      'ticket-sugar': 'Regardez bien la quantité de sucre demandée, y compris aucune.',
      'ticket-to-go-missing': 'Une commande à emporter le dit : If To go IN item, puis Write To go.',
      'ticket-to-go-extra': 'N’écrivez To go que si la commande le dit : vérifiez d’abord If To go IN item.',
      'ticket-rush-missing': 'Écrivez Rush sur le ticket, pour que la cuisine et la salle le sachent.',
      'ticket-rush-extra':
        'Rush passe devant tout le monde : il est réservé aux clients qui se disent pressés. Vérifiez d’abord If Rush IN item.',
      'ticket-together-missing':
        'Une table qui commande ensemble le dit : If Together IN Orders, puis Write Together sur chacun de ses tickets.',
      'ticket-together-extra':
        'Together est réservé à une table qui commande pour plusieurs : vérifiez d’abord If Together IN Orders.',
      checkout: 'Revenez à la caisse après le dernier ticket, pour que le client puisse payer.',
      'unclear-order':
        'Deviner envoie la mauvaise boisson. Demandez-moi d’abord avec Help, et je trouverai ce que la commande voulait dire.',
      'help-needed': 'Quand une commande n’est pas claire, demandez-moi avec Help avant d’écrire quoi que ce soit.',
      'help-unneeded': 'Ne demandez Help que si la commande n’est vraiment pas claire.',
      'guessed-drink': 'Si personne ne peut éclaircir la commande, ne prenez pas de feuille du tout.',
      'sold-out':
        'Il n’en reste plus. Vérifiez If Sold out IN Orders, et demandez-moi avec Help : je saurai ce qu’ils prendront à la place.',
      'booked-for-later':
        'Une boisson gardée pour plus tard se prépare au retour du client. Vérifiez If For later IN Orders, et faites un Jump vers Wait for Orders sans rien écrire.',
      'stopped-listening':
        'Le café ne ferme pas après un seul client : revenez à Wait for Orders pour que Query entende le suivant.',
      'recipe-order':
        'La recette se suit une étape à la fois, dans l’ordre : faites l’étape suivante avant de passer à autre chose.',
      'already-brewed':
        'Une boisson infusée en a fini avec la machine. Donnez-lui son sucre, ou faites un Deposit au comptoir de retrait.',
      'grinder-serviced':
        'Le moulin est en révision, alors le café arrive déjà moulu. Vérifiez If Pre-ground IN Orders, et portez-le directement à l’évier.',
      'fuse-tripped':
        'La machine à café et le lave-vaisselle partagent une seule prise. Lancez le lavage là où Brew a du chemin à faire avant de se resservir de la machine.',
      'not-brewed': 'Terminez la recette avant d’ajouter du sucre, de mettre un couvercle ou d’envoyer la boisson.',
      'too-much-sugar': 'Brew ajoute exactement le sucre du ticket : comptez-le, et arrêtez-vous là.',
      'sugar-count': 'Brew ajoute exactement le sucre du ticket : comptez-le, et arrêtez-vous là.',
      'sugar-before-lid':
        'Les boissons à emporter partent avec un couvercle, mis après le sucre. Celles sur place n’en ont pas besoin.',
      'lid-missing':
        'Les boissons à emporter partent avec un couvercle, mis après le sucre. Celles sur place n’en ont pas besoin.',
      'lid-extra':
        'Les boissons à emporter partent avec un couvercle, mis après le sucre. Celles sur place n’en ont pas besoin.',
      'no-clean-cups': 'Chaque tasse doit revenir et être lavée avant de pouvoir repartir.',
      'recipe-not-function':
        'Mettez les étapes de la recette dans Function recipe, puis placez Call recipe juste après Wait for Orders : un nom, un seul endroit à changer.',
      'carry-more':
        'C’est à ça que servent les plus grandes mains. Remplissez les deux avant de partir, puis livrez les deux dans le même trajet.',
      'to-go-to-shelf':
        'Les boissons à emporter vont sur l’étagère près de la porte : allez-y et faites un Deposit down.',
      'stay-in-to-table':
        'Seules les boissons à emporter vont sur l’étagère près de la porte. Celle-ci va à la table de son ticket.',
      'wrong-table': 'Le ticket indique la table. Gardez-le et allez-y.',
      'wrong-dirty-table':
        'Une tasse sale n’a pas de ticket : Wait for Dirty cups indique la table où elle a été laissée. Faites un Store de sa table et allez-y avant de faire un Take up.',
      'table-not-cleared':
        'Une table propre, c’est la première impression du client suivant, et personne ne s’assoit à une table en désordre.',
      'table-apart':
        'Un ticket Together veut dire que sa table attend ses deux boissons à la fois : attendez les deux, portez-les sur un seul plateau et servez-les en une seule fois.',
      'drink-cold':
        'Une boisson ne reste chaude qu’un temps une fois que Brew l’a posée : faites porter chacune par Porter dès qu’elle arrive, et débarrassez les tasses sales entre deux livraisons, pas avant.',
      'open-after-closing':
        'Après Wait for Orders, vérifiez If Closed IN Orders, terminez ce que vous avez en main, puis Stop.',
      'stopped-early':
        'Après Wait for Orders, vérifiez If Closed IN Orders, terminez ce que vous avez en main, puis Stop.',
      'closing-ticket':
        'Après Wait for Orders, vérifiez If Closed IN Orders, terminez ce que vous avez en main, puis Stop.',
    },
  },
);
