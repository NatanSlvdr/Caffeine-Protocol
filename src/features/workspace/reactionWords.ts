import { count, type FailureCode, type RobotRole } from '@/domain';
import { countFr, words } from '@/shared/language';
import { OPTIONS_WORDS } from './modals/optionsWords';

type Reaction = (phrase: string) => string;

const LID: Reaction = () => '*beep* Lid? No lid? Lid!';
const CLOSING: Reaction = () => '*yawn beep* Bedtime?';
const JUMP: Reaction = () => '*whirr?* Where was I?';
const SUGAR: Reaction = (p) => `I said “${p}”. The sugar’s all wrong.`;

const LID_FR: Reaction = () => '*bip* Couvercle ? Pas couvercle ? Couvercle !';
const CLOSING_FR: Reaction = () => '*bâillement bip* Dodo ?';
const JUMP_FR: Reaction = () => '*vrrr ?* J’en étais où ?';
/** What a guest said is quoted as they said it, in English, between ⟪ and ⟫ so the line can mark it so. */
const SUGAR_FR: Reaction = (p) => `J’ai dit « ⟪${p}⟫ ». Le sucre, ce n’est pas du tout ça.`;

/**
 * The first word on a failure, by its code rather than its wording, as its nudge is, so rephrasing a message never
 * changes what follows it. None leaves a robot to say it's stuck in its own words; a guest's is given what they said.
 */
const FAILED: Record<FailureCode, Reaction | undefined> = {
  compile: undefined,
  unsupported: undefined,
  'loop-limit': () => '*whirrrrrr* Round and round. Very dizzy.',
  'end-of-routine': () => '*whirr… click* All done? Not all done.',
  'jump-across-block': JUMP,
  'return-outside-call': () => '*whirr?* Return… to where?',
  'recursive-call': () => '*ring ring* …Line busy. I’m already in a call.',
  'unset-variable': () => '*bip?* Memory slot… empty.',
  'wrong-variable-kind': () => '*bip?* That’s not what I stored.',
  'no-number': () => '*bip?* No number on this one.',
  'no-job': () => '*beep?* Job? What job?',
  'one-job-at-a-time': () => '*whirr* One job at a time!',
  'unfinished-work': () => '*whirr* Still holding this. Forgot?',
  starved: () => '*tap tap* Still waiting…',
  'wrong-wait': () => '*tap tap* Any cups yet? …No?',
  'out-of-reach': () => '*bonk* Too far. Arms not that long.',
  'wrong-direction': () => '*whirr* Wrong way round.',
  'wrong-spot': () => '*bonk* Wrong spot. Recalculating.',
  'nothing-there': () => '*grab grab* …Nothing there yet.',
  'empty-hands': () => '*whirr* Hands empty. Nothing to put down.',
  'hands-full': () => '*bzzt* Hands full. Cannot hold more.',
  'rush-first': () => '*alarm beep* Hurry! Hurry!',
  'no-paper': () => '*bip?* Write on… the counter?',
  'paper-in-hand': () => '*rustle rustle* One sheet at a time!',
  'ticket-not-handed-over': (p) => `I said “${p}”… did that ever reach the kitchen?`,
  'blank-ticket': (p) => `I said “${p}”. That’s not quite my order.`,
  'no-ticket': (p) => `Hello? I said “${p}”. Is anyone writing this down?`,
  'ticket-count': (p) => `I asked for “${p}”. That’s not the right number of drinks.`,
  'ticket-item': (p) => `I said “${p}”. This isn’t what I ordered.`,
  'ticket-sugar': SUGAR,
  'ticket-to-go-missing': (p) => `I said “${p}”. I’m taking it with me!`,
  'ticket-to-go-extra': (p) => `I said “${p}”. I’m staying for this one.`,
  'ticket-rush-missing': (p) => `“${p}”… and I really am in a hurry.`,
  'ticket-rush-extra': (p) => `“${p}”. No hurry, really. I’ve got all afternoon.`,
  'ticket-together-missing': (p) => `“${p}”… we did want them together.`,
  'ticket-together-extra': (p) => `“${p}”. It’s just me today.`,
  checkout: () => 'Um… can I pay now? Anyone?',
  'unclear-order': (p) => `I said “${p}”… I’m not sure that came out right.`,
  'help-needed': (p) => `I said “${p}”… and that’s not what I meant at all.`,
  'help-unneeded': (p) => `“${p}.” I thought that was clear enough?`,
  'guessed-drink': () => 'Wait, what did you write down? I haven’t even decided yet.',
  'sold-out': (p) => `“${p}”… oh. You’ve run out, haven’t you?`,
  'stopped-listening': () => 'Hello? Is the counter closed already?',
  'recipe-order': () => '*grrr-click* Machine not ready for that.',
  'already-brewed': () => '*hiss* Machine says: done already!',
  'grinder-serviced': () => '*clunk* Grinder: in pieces. Coffee: ground already!',
  'fuse-tripped': () => '*pop* Lights: out. Dishwasher: also out. Brew: sorry!',
  'not-brewed': () => '*beep beep* Wait! Drink not ready!',
  'too-much-sugar': () => '*plop plop plop* …One too many?',
  'sugar-count': SUGAR,
  'sugar-before-lid': LID,
  'lid-missing': LID,
  'lid-extra': LID,
  'no-clean-cups': () => '*clink clink* No cups! No cups!',
  'recipe-not-function': () => '*bip* Beans grind water brew. Beans grind water b— *bzzt*',
  'carry-more': () => '*huff puff* So… much… walking.',
  'to-go-to-shelf': () => 'That one’s mine. I’m waiting by the door!',
  'stay-in-to-table': () => 'Hey, I’m sitting right here!',
  'wrong-table': () => 'Sorry, I don’t think that one’s mine.',
  'wrong-dirty-table': () => '*beep?* No cup here.',
  'table-not-cleared': () => 'Um… is someone going to clear this table?',
  'table-apart': () => 'We said together… one of us is still waiting.',
  'drink-cold': () => 'It’s gone cold… it must have been sitting there a while.',
  'open-after-closing': CLOSING,
  'stopped-early': CLOSING,
  'closing-ticket': CLOSING,
};

/**
 * What the crew says once a service ends. Served, the robot cheers or delights at a new best, and Niko gives the
 * verdict on the stars, after the shift's own payoff. Gone wrong, the guest or the robot reacts, by the failure's code,
 * and Niko nudges toward a fix.
 */
export const REACTION_WORDS = words(
  {
    /** Niko, after a watched service with no payoff of its own. */
    watched: 'And that’s a whole service, start to finish. Easy when you watch it, right?',
    /** Stand-in cheers for shifts without a written payoff. */
    cheers: {
      query: ['*bip boop* Every order understood. Feeling: pleased?', '*bip* Zero errors. Is this… satisfaction?'],
      prep: ['*BEEP!* Every cup perfect! Ninety-two degrees!', '*sniff sniff* Smell that? Perfect service!'],
      floor: ['*ding ding!* Every guest served!', 'Zero spills! *bip* …Zero big spills.'],
    } satisfies Record<RobotRole, string[]>,
    /** A robot's delight at beating the shift's best, in stars, said even on a repeat: it's news every time. */
    newBest: {
      query: (stars: number, best: number) =>
        `*bip boop* ${count(stars, 'star')}, up from ${count(best, 'star')}. Recording: new best.`,
      prep: (stars: number, best: number) =>
        `*BEEP BEEP!* New best! ${count(stars, 'star')}, up from ${count(best, 'star')}!`,
      floor: (stars: number, best: number) =>
        `*ding ding ding!* Up from ${count(best, 'star')} to ${count(stars, 'star')}. New best!`,
    } satisfies Record<RobotRole, (stars: number, best: number) => string>,
    /** Niko names the star target that was missed, by how much, and why it matters in the café. */
    verdict: {
      one: (blocks: number, target: number) =>
        `Every guest served! The routine uses ${blocks} blocks, though, and ${target} would do: fewer blocks means less to fix when the menu changes.`,
      two: (steps: number, target: number) =>
        `Every guest served, with a tidy routine too! The robots still took ${steps} steps where ${target} would do: fewer steps and nobody waits as long.`,
      three: 'Three stars. That’s the tidiest routine I’ve ever seen.',
    },
    /** The first word on a failure, by its code. */
    failed: FAILED,
    /** A robot that stopped with nothing of its own to say. */
    stuck: {
      query: 'Instruction unclear. *bzzt* Stopped.',
      prep: '*sad beep* Not know what next!',
      floor: '*bonk* Stuck!',
    } satisfies Record<RobotRole, string>,
    /** Niko names the problem, in the run's own words, and nudges toward the fix. */
    nudge: (reason: string, hint: string) => `${reason} ${hint}`,
    /** On a shift the robot got right before, Niko points at the routine that was served. */
    served: (robot: string) =>
      `${robot} got this shift right before, though. If you’d rather go back, Options → ${OPTIONS_WORDS.en.restore(robot)} has the one you last served.`,
  },
  {
    watched: 'Et voilà un service entier, du début à la fin. Facile quand on regarde, non ?',
    cheers: {
      query: [
        '*bip boop* Toutes les commandes comprises. Sentiment : content ?',
        '*bip* Zéro erreur. C’est ça… la satisfaction ?',
      ],
      prep: [
        '*BIP !* Chaque tasse parfaite ! Quatre-vingt-douze degrés !',
        '*snif snif* Vous sentez ? Service parfait !',
      ],
      floor: ['*ding ding !* Tous les clients servis !', 'Zéro goutte ! *bip* …Zéro grosse goutte.'],
    },
    newBest: {
      query: (stars, best) =>
        `*bip boop* ${countFr(stars, 'étoile')}, contre ${countFr(best, 'étoile')} avant. Enregistrement : nouveau record.`,
      prep: (stars, best) =>
        `*BIP BIP !* Nouveau record ! ${countFr(stars, 'étoile')}, contre ${countFr(best, 'étoile')} !`,
      floor: (stars, best) =>
        `*ding ding ding !* De ${countFr(best, 'étoile')} à ${countFr(stars, 'étoile')}. Nouveau record !`,
    },
    verdict: {
      one: (blocks, target) =>
        `Tous les clients servis ! Mais la routine utilise ${blocks} blocs, et ${target} suffiraient : moins de blocs, c’est moins à corriger quand la carte change.`,
      two: (steps, target) =>
        `Tous les clients servis, et avec une routine soignée ! Les robots ont quand même fait ${steps} pas là où ${target} suffiraient : moins de pas, et personne n’attend aussi longtemps.`,
      three: 'Trois étoiles. C’est la routine la plus soignée que j’aie jamais vue.',
    },
    failed: {
      compile: undefined,
      unsupported: undefined,
      'loop-limit': () => '*vrrrrrrr* On tourne, on tourne. Très étourdi.',
      'end-of-routine': () => '*vrrr… clic* Tout fini ? Pas tout fini.',
      'jump-across-block': JUMP_FR,
      'return-outside-call': () => '*vrrr ?* Revenir… mais où ?',
      'recursive-call': () => '*dring dring* …Ligne occupée. Je suis déjà en ligne.',
      'unset-variable': () => '*bip ?* Case mémoire… vide.',
      'wrong-variable-kind': () => '*bip ?* Ce n’est pas ce que j’ai rangé.',
      'no-number': () => '*bip ?* Pas de nombre sur celle-ci.',
      'no-job': () => '*bip ?* Tâche ? Quelle tâche ?',
      'one-job-at-a-time': () => '*vrrr* Une tâche à la fois !',
      'unfinished-work': () => '*vrrr* Tiens encore ça. Oublié ?',
      starved: () => '*tap tap* J’attends toujours…',
      'wrong-wait': () => '*tap tap* Des tasses ? …Non ?',
      'out-of-reach': () => '*bonk* Trop loin. Bras pas si longs.',
      'wrong-direction': () => '*vrrr* Pas dans le bon sens.',
      'wrong-spot': () => '*bonk* Mauvais endroit. Recalcul.',
      'nothing-there': () => '*grip grip* …Rien là pour l’instant.',
      'empty-hands': () => '*vrrr* Mains vides. Rien à poser.',
      'hands-full': () => '*bzzt* Mains pleines. Peux pas porter plus.',
      'rush-first': () => '*bip d’alarme* Vite ! Vite !',
      'no-paper': () => '*bip ?* Écrire… sur le comptoir ?',
      'paper-in-hand': () => '*froissement* Une feuille à la fois !',
      'ticket-not-handed-over': (p) => `J’ai dit « ⟪${p}⟫ »… est-ce que c’est arrivé jusqu’en cuisine ?`,
      'blank-ticket': (p) => `J’ai dit « ⟪${p}⟫ ». Ce n’est pas tout à fait ma commande.`,
      'no-ticket': (p) => `Il y a quelqu’un ? J’ai dit « ⟪${p}⟫ ». Quelqu’un note, ou pas ?`,
      'ticket-count': (p) => `J’ai demandé « ⟪${p}⟫ ». Ce n’est pas le bon nombre de boissons.`,
      'ticket-item': (p) => `J’ai dit « ⟪${p}⟫ ». Ce n’est pas ce que j’ai commandé.`,
      'ticket-sugar': SUGAR_FR,
      'ticket-to-go-missing': (p) => `J’ai dit « ⟪${p}⟫ ». Je l’emporte avec moi !`,
      'ticket-to-go-extra': (p) => `J’ai dit « ⟪${p}⟫ ». Celui-là, je le prends sur place.`,
      'ticket-rush-missing': (p) => `« ⟪${p}⟫ »… et je n’ai vraiment pas le temps.`,
      'ticket-rush-extra': (p) => `« ⟪${p}⟫ ». Rien ne presse, vraiment. J’ai tout l’après-midi.`,
      'ticket-together-missing': (p) => `« ⟪${p}⟫ »… on les voulait ensemble, pourtant.`,
      'ticket-together-extra': (p) => `« ⟪${p}⟫ ». Il n’y a que moi, aujourd’hui.`,
      checkout: () => 'Euh… je peux payer, maintenant ? Quelqu’un ?',
      'unclear-order': (p) => `J’ai dit « ⟪${p}⟫ »… Je crains que ça ne soit pas bien passé.`,
      'help-needed': (p) => `J’ai dit « ⟪${p}⟫ »… et ce n’est pas du tout ce que je voulais dire.`,
      'help-unneeded': (p) => `« ⟪${p}⟫ ». Je pensais que c’était assez clair ?`,
      'guessed-drink': () => 'Attendez, vous avez noté quoi ? Je n’ai même pas encore choisi.',
      'sold-out': (p) => `« ⟪${p}⟫ »… ah. Il n’y en a plus, c’est ça ?`,
      'stopped-listening': () => 'Il y a quelqu’un ? Le comptoir est déjà fermé ?',
      'recipe-order': () => '*grrr-clic* Machine pas prête pour ça.',
      'already-brewed': () => '*pschhh* La machine dit : déjà fait !',
      'grinder-serviced': () => '*clonk* Moulin : en pièces. Café : déjà moulu !',
      'fuse-tripped': () => '*pop* Lumières : éteintes. Lave-vaisselle : éteint aussi. Brew : pardon !',
      'not-brewed': () => '*bip bip* Attends ! Boisson pas prête !',
      'too-much-sugar': () => '*plouf plouf plouf* …Un de trop ?',
      'sugar-count': SUGAR_FR,
      'sugar-before-lid': LID_FR,
      'lid-missing': LID_FR,
      'lid-extra': LID_FR,
      'no-clean-cups': () => '*cling cling* Pas de tasses ! Pas de tasses !',
      'recipe-not-function': () => '*bip* Grains mouture eau café. Grains mouture eau c— *bzzt*',
      'carry-more': () => '*ouf pff* Tant… de… marche.',
      'to-go-to-shelf': () => 'Celui-là, c’est le mien. J’attends près de la porte !',
      'stay-in-to-table': () => 'Hé, je suis juste là, à cette table !',
      'wrong-table': () => 'Pardon, je ne crois pas que ce soit le mien.',
      'wrong-dirty-table': () => '*bip ?* Pas de tasse ici.',
      'table-not-cleared': () => 'Euh… quelqu’un va débarrasser cette table ?',
      'table-apart': () => 'On avait dit ensemble… l’un de nous attend encore.',
      'drink-cold': () => 'C’est froid… ça a dû attendre un bon moment.',
      'open-after-closing': CLOSING_FR,
      'stopped-early': CLOSING_FR,
      'closing-ticket': CLOSING_FR,
    },
    stuck: {
      query: 'Instruction pas claire. *bzzt* Arrêt.',
      prep: '*bip triste* Sais pas quoi faire après !',
      floor: '*bonk* Coincé !',
    },
    // Why the run stopped is the simulation's English, which the card under the routine shows, marked so: Niko only
    // nudges.
    nudge: (_reason, hint) => hint,
    served: (robot) =>
      `${robot} avait déjà réussi ce service, pourtant. Pour revenir en arrière, Options → ${OPTIONS_WORDS.fr.restore(robot)} garde la routine que vous avez servie en dernier.`,
  },
);

export type ReactionWords = (typeof REACTION_WORDS)['en'];
