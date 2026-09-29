import { line } from '../../domain/dialogue';
import type { DialogueLine, Speaker } from '../../domain/dialogue';
import { narrativeFor } from './narrative';

/** Script shorthand: `['niko:happy', 'text']`, `['query', 'text']`, or `['', 'narration']`. */
type ScriptLine = readonly [Speaker, string];

const script = (lines: readonly ScriptLine[]): DialogueLine[] => lines.map(([speaker, text]) => line(speaker, text));

/** Shift intros, keyed by 1-based level. They play every time a shift opens. */
const intros: Record<number, readonly ScriptLine[]> = {
  1: [
    ['', 'Morning. The shutters of the old café roll up for the first time in years.'],
    ['niko:happy', 'We’re open! Well, mostly. The sign still says CLOSED on the other side.'],
    ['moka', 'Machine is warm. Beans are warm. I am… adequately warm.'],
    ['pip', 'Tables wiped! Twice! Can I wipe them a third time?'],
    ['niko', 'Today we just watch. Follow one order from the register, through the kitchen, to a clean table.'],
  ],
  2: [
    ['', 'Second morning. The queue is already out the door.'],
    ['albert', 'Morning, young one. The usual, if you please.'],
    ['niko:worried', 'Of course! Er… what is the usual?'],
    ['albert:happy', 'Coffee. It has always been coffee.'],
    ['niko:worried', 'Eight orders, one pair of hands, and I’m writing every ticket myself.'],
    ['niko', 'Watch the rush. Somewhere in there is a job a robot could take off my hands.'],
  ],
  3: [
    ['', 'Late last night, Niko tightened the last screw on the robot from the scrapyard.'],
    ['query', 'Hearing module online. …What is a coffee?'],
    ['niko:happy', 'A coffee is a reason to get out of bed. Also, a drink.'],
    ['niko', 'Let’s start with one customer and one ticket. Take a sheet, write the order, hand it to the kitchen.'],
    ['moka', 'Tickets go on the pass. Legibly. I have seen Niko’s handwriting.'],
    ['query', 'I do not have handwriting. I have Write.'],
  ],
  4: [
    ['niko:happy', 'Big news: tea is on the menu!'],
    ['juno:happy', 'Finally. I’ve been drinking hot water with a sad face for a week.'],
    ['query', 'The menu has doubled. My error rate may also double.'],
    ['niko', 'Not if you listen. If they say tea, write tea. Otherwise, it’s coffee.'],
  ],
  5: [
    ['query', 'One customer served. Task complete. Powering down.'],
    ['niko:surprised', 'Wait, wait! There’s another one at the door. And another.'],
    ['pip', 'Queue count: lots!'],
    ['niko', 'When an order is done, go back to listening. Jump back up and wait for the next one.'],
  ],
  6: [
    ['dot:happy', 'Hello, dears! A coffee with sugar, please. Life’s too short for bitter.'],
    ['query', 'Sugar is not on the menu. Sugar is not a drink.'],
    ['niko', 'It’s a note on the ticket. If they ask for sugar, write it down, or Moka sends it out plain.'],
    ['moka', 'I do not guess sweetness.'],
  ],
  7: [
    ['juno', 'Tea. Without sugar. Please. Last time it was basically syrup.'],
    ['query', 'I heard “sugar”. Adding sugar.'],
    ['juno:worried', '…Did you hear the word before it?'],
    ['niko', '“Without” flips the meaning. Check for sugar, then check whether they said no to it.'],
  ],
  8: [
    ['albert', 'A tea, please. My doctor insists.'],
    ['rosa:happy', 'Tea for me!'],
    ['juno', 'I’ll take a tea.'],
    ['query', 'Three sentences of three lengths. Are these three different drinks?'],
    ['niko', 'Same drink. Different words, same recognized tokens. Test the ideas you hear, not the exact phrase.'],
    ['', 'Query opens a fresh page in the service manual.'],
  ],
  9: [
    ['rosa:happy', 'Hi! Two coffees: one for me, one for my brother. He’s parking the bike.'],
    ['query', 'One customer. One ticket.'],
    ['moka', 'One ticket for two drinks? I brew what’s on the paper. Nothing more.'],
    ['niko', 'One sheet per drink. Go through each item in the order and write a ticket for every one.'],
  ],
  10: [
    ['dot:happy', 'Two sugars, please. Not one. Not three. Two.'],
    ['query', 'Sugar: yes.'],
    ['niko', 'You’re not wrong. You’re just not precise enough.'],
    ['niko:happy', 'Catch the number she says and keep it. A variable will remember it for you.'],
  ],
  11: [
    ['guest', 'The usual, please.'],
    ['query', 'Unknown order: “the usual”. Guessing… coffee?'],
    ['niko:worried', 'Don’t guess! When you can’t tell, ask me. I’ll find out what they mean.'],
    ['albert:happy', 'Hah. Nobody knows anybody’s usual but Niko.'],
  ],
  12: [
    ['rosa', 'Right: a coffee with two sugars, a tea without, and a coffee with sugar for my brother.'],
    ['query', 'Parsing. Parsing. Still parsing.'],
    ['niko', 'Each drink gets its own paper and its own sugar. You know every trick already; now mix them.'],
  ],
  13: [
    ['', 'Word has spread. The lunchtime queue stretches past the lamp post.'],
    ['pip', 'So many people! I love people!'],
    ['niko:worried', 'No new tricks today. Same moves, longer queue. Keep every ticket right.'],
    ['query', 'Acknowledged. Serving everyone. Panicking: no.'],
  ],
  14: [
    ['', 'Niko pins a shiny new badge beside the till.'],
    ['niko:happy', 'One last service, Query. Every kind of order we’ve learned, all together.'],
    ['query', 'I have retained my instructions.'],
    ['albert:happy', 'Is that robot getting a medal? Good. It remembered my usual yesterday.'],
    ['', 'Behind them, the espresso machine is already busy.'],
  ],
  15: [
    ['', 'Niko rolls a second robot out of the back room. It squeaks.'],
    ['brew', 'Hello! I’m Brew! Is that the espresso machine? It’s beautiful. Can I touch it?'],
    ['moka', 'Careful. She bites.'],
    [
      'niko',
      'Brew, you’re taking over the kitchen from Moka. Query passes you the tickets, and Pip still serves the room.',
    ],
    ['niko', 'Your recipe is nearly there, but the drink never reaches pickup. Finish the job.'],
  ],
  16: [
    ['brew', 'I know every recipe by heart! I just don’t know where anything is.'],
    ['moka', 'You’re standing in the kitchen. It’s all around you.'],
    ['niko', 'Count the tiles to each station. Moves go one whole tile at a time.'],
  ],
  17: [
    ['brew', 'Our first coffee ticket! Beans, grind, water, brew. Beans, grind, water, brew.'],
    ['moka', 'You’ll wear the words out.'],
    ['niko', 'Once the water is in, use the coffee machine. It grinds and brews for you.'],
  ],
  18: [
    ['juno', 'Tea, please. And tell the new robot: no grinding the leaves.'],
    ['brew', 'We don’t grind them? But I love the grinder.'],
    ['niko', 'Read the ticket first. Coffee goes to the grinder; tea skips it.'],
  ],
  19: [
    ['dot:worried', 'Brew, sweetheart, my coffee was plain yesterday.'],
    ['brew', 'The ticket said two sugars. I thought it was a suggestion.'],
    ['niko', 'It’s an order. Keep the sugar count and drop in one cube per count.'],
  ],
  20: [
    ['brew', 'Beans, grind, water, brew. Beans, grind, water, brew. Beans, grind—'],
    ['query', 'Brew has repeated this sequence forty-one times today.'],
    ['niko:happy', 'Give those steps a name, Brew. Then you can just call it.'],
  ],
  21: [
    ['', 'Niko clips a second cup holder onto Brew’s arm.'],
    ['brew', 'Two hands! Two cups! Twice the coffee!'],
    ['niko', 'And half the walking, if you plan it. Claim two tickets, make both, and send them out in order.'],
  ],
  22: [
    ['moka', 'Well. That’s my cue.'],
    ['niko:worried', 'Moka, you don’t have to…'],
    ['moka', 'Forty years of espresso, Niko. I’ve earned a porch chair and a pot of my own.'],
    ['moka', 'Brew. Ninety-two degrees. Always.'],
    ['brew', 'Ninety-two. Always. I promise.'],
    ['niko', 'A full service, Brew. The kitchen is yours.'],
  ],
  23: [
    ['', 'A third robot rolls up to the pickup counter, balancing a tray.'],
    ['porter', 'Hi, everyone! I’m Porter! Who wants a drink? Everyone? Great!'],
    ['pip', 'I’ve done this job all month. The trick is: the ticket says the table.'],
    [
      'niko',
      'Query has the orders. Brew has the kitchen. The room is yours, Porter. Every delivery starts with one tile.',
    ],
  ],
  24: [
    ['porter', 'I gave the drink to the nicest-looking person. Was that wrong?'],
    ['rosa', 'It was very sweet of you. But I ordered it, at the other table.'],
    ['niko', 'Follow the ticket, not the charm. Keep its table, and Move to it: you’ll find the way round the chairs.'],
  ],
  25: [
    ['porter', 'Delivered! I’ll just stay here and chat for a bit.'],
    ['query', 'Pickup counter: three drinks waiting. Temperature: dropping.'],
    ['niko', 'Remember where pickup is before you leave, and head back after every serve.'],
  ],
  26: [
    ['albert', 'Lovely coffee. I’ll leave the cup for your young robot friend.'],
    ['porter', 'Empty cups! Where do they go?'],
    ['brew', 'To my sink, please. Gently.'],
    ['niko', 'Collect the dirty cups and bring them to the sink before the next guests sit down.'],
  ],
  27: [
    ['', 'Mid-morning. The drinks keep coming.'],
    ['porter', 'Serve, return, serve, return. It’s like dancing, but with coffee.'],
    ['niko:happy', 'Keep that rhythm going until every drink is served.'],
  ],
  28: [
    ['brew', 'All our cups are out on the tables! I’m running out of cups!'],
    ['porter', 'But the drinks! And the cups! And the drinks!'],
    ['niko', 'Both matter. Clear the used cups before the next round of guests arrives.'],
  ],
  29: [
    ['', 'Niko hands Porter a new tray with room for two.'],
    ['porter', 'Two guests, one trip, zero spills!'],
    ['pip', 'Probably zero spills.'],
    ['niko', 'Fill the tray before you go. It empties in the order you filled it.'],
  ],
  30: [
    ['pip', 'Porter’s doing great. I think… I think I can retire too.'],
    ['porter', 'Retire? But who will I learn from?'],
    ['pip', 'The ticket. It always says the table.'],
    ['niko', 'Deliveries, dirty cups, and full trays, all in one service. Show Pip the floor is in good hands.'],
  ],
  31: [
    ['', 'The three robots line up by the counter. Niko hangs up the apron.'],
    ['niko', 'Query takes the orders. Brew makes them. Porter brings them out. From today, I’m just the owner.'],
    ['query', 'Acknowledged.'],
    ['brew', 'Ninety-two degrees!'],
    ['porter', 'All for one!'],
    ['niko', 'Every order now depends on all three of your programs working together.'],
  ],
  32: [
    ['', 'The busiest day yet. Every regular came.'],
    ['albert', 'The usual.'],
    ['juno', 'Tea, no sugar.'],
    ['dot:happy', 'Two sugars, dear.'],
    ['rosa:happy', 'And the same again for everyone at my table!'],
    ['niko:happy', 'I’m going to sit right here with a coffee and let the café run itself.'],
    ['query', 'Listening.'],
    ['brew', 'Brewing.'],
    ['porter', 'Delivering!'],
  ],
};

/** The scene that opens a shift. Shifts without a written scene get Niko reading the story beat. */
export function shiftIntro(index: number): DialogueLine[] {
  const written = intros[index + 1];
  return written ? script(written) : [line('niko', narrativeFor(index).story)];
}

/** Closing-time scene before the final receipt. */
export const endingScene: DialogueLine[] = script([
  ['', 'Closing time. The last cup is on its way to the sink.'],
  ['query', 'Niko. You are drinking a coffee I did not write a ticket for.'],
  ['niko:happy', 'I made it myself. Old habits.'],
  ['query', 'That is not in my instruction set.'],
  ['niko:happy', 'It is now.'],
  ['moka', 'Ninety-two degrees. Good.'],
  ['pip', 'Tables are clean!'],
  ['', 'The counter, the kitchen and the floor work together. Every cup follows your instructions.'],
]);
