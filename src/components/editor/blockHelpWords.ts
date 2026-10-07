import type { RobotRole, UNLOCKS } from '@/domain';
import { words } from '@/shared/language';

/** Whether the open shift has unlocked a part of a block, so its help says only what the block does so far. */
type Has = (unlock: keyof typeof UNLOCKS) => boolean;
type Help = Record<string, string | Record<RobotRole, string>>;

/**
 * What each library block does, by its family and for the robot whose routine is open. Block names and the words a
 * robot hears, like Closed and To go, are programming words and stay English in either language.
 */
export const BLOCK_HELP_WORDS = words(
  {
    help: (role: RobotRole, has: Has): Help => {
      const closed = has('closing') ? ' After the last guest it hears Closed instead.' : '';
      return {
        WAIT: {
          query: `Waits for the next customer and hears their order. The blocks after it work from what was said.${closed}`,
          prep: `Waits at the handoff for Query’s next ticket and claims it.${closed}`,
          floor: `Wait for Orders claims the next ready drink${has('clearing') ? '; Wait for Dirty cups picks a used cup to clear' : ''}.${closed}`,
        },
        TAKE: {
          query: 'Takes a fresh sheet of paper from the stack in that direction.',
          prep: `Takes from the station in that direction: beans or leaves at storage, water at the sink${has('prepSugar') ? ', a cube at the sugar' : ''}${has('toGo') ? ', a lid at the lids' : ''}.`,
          floor: `Picks up from the tile in that direction: a ready drink at pickup${has('clearing') ? ', a used cup at its table' : ''}.`,
        },
        ITEM: `Writes on the paper Query holds: how many of which drink${has('sugar') ? ', the sugar' : ''}${has('toGo') ? ', or a mark like To go' : ''}.`,
        MOVE: 'Walks that many tiles in a screen direction. A blocked move stops early; customers never block the way.',
        'MOVE TO': 'Walks Porter to the table or place stored in a variable, finding the way by itself.',
        DEPOSIT: {
          query: 'Puts the paper down in that direction, on the order handoff for the kitchen.',
          prep: 'Puts the finished drink down in that direction, at pickup.',
          floor: `Puts down what Porter carries in that direction: a drink on its table${has('clearing') ? ', a used cup in the sink' : ''}.`,
        },
        USE: `Works the station in that direction: the coffee machine grinds beans, then brews${has('cups') ? '; the sink washes used cups' : ''}.`,
        IF: `Runs the blocks inside only when its condition holds, and the Else blocks otherwise.${role === 'query' ? ' Conditions test what the customer said.' : ''}`,
        JUMP: 'Carries on from a Jump destination instead of the next block. A Jump back to Wait for Orders serves the next one.',
        FOR: {
          query: 'Runs the blocks inside once for each item in the order, with item standing for the one in hand.',
          prep: 'Runs the blocks inside a number of times, set by a variable or a number.',
          floor: 'Runs the blocks inside a number of times, set by a variable or a number.',
        },
        STORE: {
          query: 'Keeps a number in a variable: one heard in the item, a fixed number, or another variable’s.',
          prep: 'Keeps a number in a variable, like how much sugar the order asks for.',
          floor: 'Keeps a place in a variable, like the order’s table, for Move to.',
        },
        HELP: 'Asks Niko what an unclear customer meant; the answer replaces what Query heard. Use it before taking paper.',
        ERROR: 'Stops the service, reporting an order Query can’t serve.',
        FUNCTION: 'Names a group of blocks that Call runs from anywhere in the routine.',
        CALL: 'Runs the named function, then carries on from the block after the Call.',
        RETURN: 'Leaves the function early and goes back to the block after its Call.',
        STOP: 'Ends this robot’s day. Stop once Wait for Orders hears Closed and nothing is in hand.',
      };
    },
    forExample: 'For example:',
    /** The help as one sentence, read with the library button. */
    spoken: (text: string, example: string) => (example ? `${text} For example: ${example}.` : text),
  },
  {
    help: (role, has) => {
      const closed = has('closing') ? ' Après le dernier client, il entend Closed à la place.' : '';
      const times = 'Exécute les blocs à l’intérieur un certain nombre de fois, fixé par une variable ou un nombre.';
      return {
        WAIT: {
          query: `Attend le client suivant et écoute sa commande. Les blocs qui suivent partent de ce qui a été dit.${closed}`,
          prep: `Attend au passe le prochain ticket de Query et le prend.${closed}`,
          floor: `Wait for Orders prend la prochaine boisson prête${has('clearing') ? ' ; Wait for Dirty cups prend une tasse utilisée à débarrasser' : ''}.${closed}`,
        },
        TAKE: {
          query: 'Prend une feuille vierge sur la pile dans cette direction.',
          prep: `Prend au poste dans cette direction : des grains ou des feuilles à la réserve, de l’eau à l’évier${has('prepSugar') ? ', un morceau de sucre au sucrier' : ''}${has('toGo') ? ', un couvercle à la pile de couvercles' : ''}.`,
          floor: `Prend sur la case dans cette direction : une boisson prête au comptoir de retrait${has('clearing') ? ', une tasse utilisée à sa table' : ''}.`,
        },
        ITEM: `Écrit sur la feuille que tient Query : combien de quelle boisson${has('sugar') ? ', le sucre' : ''}${has('toGo') ? ', ou une mention comme To go' : ''}.`,
        MOVE: 'Avance d’autant de cases dans une direction de l’écran. Un déplacement bloqué s’arrête plus tôt ; les clients ne barrent jamais le passage.',
        'MOVE TO': 'Mène Porter à la table ou à l’endroit gardé dans une variable, en trouvant le chemin tout seul.',
        DEPOSIT: {
          query: 'Pose la feuille dans cette direction, sur le passe des commandes pour la cuisine.',
          prep: 'Pose la boisson terminée dans cette direction, au comptoir de retrait.',
          floor: `Pose ce que porte Porter dans cette direction : une boisson sur sa table${has('clearing') ? ', une tasse utilisée dans l’évier' : ''}.`,
        },
        USE: `Fait marcher le poste dans cette direction : la machine à café moud les grains, puis prépare la boisson${has('cups') ? ' ; l’évier lave les tasses utilisées' : ''}.`,
        IF: `Exécute les blocs à l’intérieur seulement si sa condition est vraie, et les blocs Else sinon.${role === 'query' ? ' Les conditions portent sur ce qu’a dit le client.' : ''}`,
        JUMP: 'Reprend à une destination de Jump au lieu du bloc suivant. Un Jump qui revient à Wait for Orders sert le client suivant.',
        FOR: {
          query:
            'Exécute les blocs à l’intérieur une fois pour chaque élément de la commande, item désignant celui en cours.',
          prep: times,
          floor: times,
        },
        STORE: {
          query:
            'Garde un nombre dans une variable : un nombre entendu dans item, un nombre fixe, ou celui d’une autre variable.',
          prep: 'Garde un nombre dans une variable, comme la quantité de sucre que demande la commande.',
          floor: 'Garde un endroit dans une variable, comme la table de la commande, pour Move to.',
        },
        HELP: 'Demande à Niko ce que voulait dire un client peu clair ; la réponse remplace ce qu’a entendu Query. À utiliser avant de prendre une feuille.',
        ERROR: 'Arrête le service en signalant une commande que Query ne peut pas servir.',
        FUNCTION: 'Nomme un groupe de blocs que Call exécute depuis n’importe où dans la routine.',
        CALL: 'Exécute la fonction nommée, puis reprend au bloc qui suit le Call.',
        RETURN: 'Quitte la fonction plus tôt et revient au bloc qui suit son Call.',
        STOP: 'Termine la journée de ce robot. Stop dès que Wait for Orders entend Closed et que ses mains sont vides.',
      };
    },
    forExample: 'Par exemple :',
    spoken: (text, example) => (example ? `${text} Par exemple : ${example}.` : text),
  },
);

export type BlockHelpWords = (typeof BLOCK_HELP_WORDS)['en'];
