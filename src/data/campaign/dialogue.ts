import { line } from '../../domain/dialogue';
import type { DialogueLine, Speaker } from '../../domain/dialogue';
import { narrativeFor } from './narrative';

/** Script shorthand: `['niko:happy', 'text']`, `['query', 'text']`, or `['', 'narration']`. `*whirr*` marks a sound effect. */
type ScriptLine = readonly [Speaker, string];

const script = (lines: readonly ScriptLine[]): DialogueLine[] => lines.map(([speaker, text]) => line(speaker, text));

/** Shift intros, keyed by 1-based level. They play every time a shift opens. */
const intros: Record<number, readonly ScriptLine[]> = {
  1: [
    ['', 'The shutters of the old café roll up for the first time in years.'],
    ['niko:happy', 'We’re open! Well, mostly. The sign still says CLOSED on the other side.'],
    ['niko', 'No code today. Let’s just watch how an order goes round, from the counter to a clean table.'],
  ],
  2: [
    ['', 'Second morning. The queue is already out the door.'],
    ['albert', 'Morning, young man. The usual, if you please.'],
    ['niko:worried', 'Of course! Er… what is the usual?'],
    ['albert:happy', 'Coffee. It has always been coffee.'],
    ['niko:worried', 'Eight orders, one pair of hands, and I’m writing every ticket myself.'],
    ['niko', 'Watch the rush with me. There’s a job in there a robot could take off my hands.'],
  ],
  3: [
    ['', 'Late last night, Niko tightened the last screw on the robot from the scrapyard.'],
    ['query', '*bip… bip… BOOP* Hearing online. What is coffee?'],
    ['niko:happy', 'A reason to get out of bed. Also, a drink.'],
    ['niko', 'Query only does what its code says, one line at a time. Writing that code is your job now.'],
    ['niko', 'A guest wants a coffee, and the kitchen only works from a written ticket. Have a look at the commands.'],
  ],
  4: [
    ['niko:happy', 'Big news: tea is on the menu!'],
    ['juno:happy', 'Finally. I’ve been drinking hot water with a sad face for a week.'],
    ['query', '*bip boop* Menu doubled. Only know write coffee.'],
    ['niko:worried', 'Right. It can’t choose yet. Hang on…'],
    ['', 'Niko props the manual open on the counter and starts turning screws.'],
    ['query', '*bzzt* Ticklish.'],
    [
      'niko:happy',
      'There! New command: If. It checks something, like what the customer said. The blocks inside only run when it’s true, and Else covers everything else.',
    ],
  ],
  5: [
    ['query', 'One customer served. Task complete. *whirrr… click*'],
    ['niko:surprised', 'Wait! There’s another one at the door. And another. And… is that a bus?'],
    ['query', '*bzzt* No more lines. Nothing to do. Sleep now.'],
    ['niko:worried', 'That’s not going to work. It needs something new. Hold on…'],
    ['', 'Niko pops Query’s back panel open and rummages around with a screwdriver.'],
    ['query', '*bip… bop… BOING*'],
    [
      'niko:happy',
      'Got it! You now have Jump. When it’s read, the code goes straight back to a Position marker, wherever you put it. Everything after the marker runs again.',
    ],
  ],
  6: [
    ['dot:happy', 'Hello, dears! A coffee with sugar, please. Life’s too short for bitter.'],
    ['query', '*bip* Sugar not on menu. Sugar not drink.'],
    ['dot:worried', 'It’s not a drink, dear. It’s a lifestyle.'],
    [
      'niko:worried',
      'The kitchen needs to know about the sugar, and the ticket has nowhere to say it. Let me fix that.',
    ],
    ['', 'Niko sharpens a pencil with great concentration and tapes it to Query’s arm.'],
    ['query', '*whirr* Arm heavier. Arm smarter.'],
    [
      'niko:happy',
      'Done! Write can add a note to the ticket now, like Write 1 Sugar. A fresh sheet always starts with no sugar.',
    ],
  ],
  7: [
    ['juno', 'Tea. Without sugar. Please. Last time it was basically syrup.'],
    ['query', '*bip* Heard “sugar”. Adding sugar.'],
    ['juno:worried', '…Did you hear the word before it?'],
    ['query', '*bip* Heard. Did not care.'],
    ['niko:worried', 'No new command today. Query hears everything, it just doesn’t listen to all of it. Your turn.'],
  ],
  8: [
    ['albert', 'A tea, please. My doctor insists.'],
    ['rosa:happy', 'Tea for me!'],
    ['juno', 'I’ll take a tea.'],
    ['niko', 'Three ways to say the same order. Query should only care about the words that matter.'],
  ],
  9: [
    ['rosa:happy', 'Hi! Two coffees: one for me, one for my brother. He’s parking the bike.'],
    ['query', '*bip* One customer. One ticket.'],
    ['niko:worried', 'One ticket for two drinks… The kitchen only makes what’s on the paper. That won’t do.'],
    ['niko', 'Give me a minute. Where did I put that manual…'],
    ['', 'Clanking from under the counter. Something rolls away.'],
    [
      'niko:happy',
      'There! New command: For item in order. It goes through an order one drink at a time, and runs the blocks inside it once for every drink.',
    ],
  ],
  10: [
    ['dot:happy', 'Two sugars, please. Not one. Not three. Two.'],
    ['query', '*bip* Sugar: yes.'],
    ['dot:worried', 'Yes… and how many, dear?'],
    ['query', '*bip… bip…* Yes.'],
    ['niko:worried', 'It hears the number and forgets it straight away. It needs somewhere to keep it.'],
    ['', 'Niko solders a tiny memory chip into Query’s head. A small puff of smoke. Nobody mentions it.'],
    [
      'niko:happy',
      'New command: Store. It keeps a value, like the number in an order, in a variable such as Var A. Write can use it after that.',
    ],
  ],
  11: [
    ['guest', 'The usual, please.'],
    ['query', '*bip* Unknown order. Guessing… coffee?'],
    ['albert:happy', 'Hah. Nobody knows anybody’s usual but Niko.'],
    ['niko:worried', 'Don’t guess! Query needs a way to ask me when it can’t tell.'],
    ['', 'Niko wires a small brass bell to the counter.'],
    ['query', '*ding!* *ding!* *ding!* *ding!*'],
    [
      'niko:happy',
      'Once is enough, thanks. New command: Help. Unclear orders contain Ambiguous, and Help calls me over to ask the guest what they meant.',
    ],
  ],
  12: [
    ['rosa', 'Right: a coffee with two sugars, a tea without, and a coffee with sugar for my brother.'],
    ['query', '*bip* Parsing. Parsing. *whirrrr* Still parsing.'],
    ['niko', 'No new command today. You already know every trick; now they all come at once.'],
  ],
  13: [
    ['', 'Word has spread. The lunchtime queue stretches past the lamp post.'],
    ['query', '*bip* Many humans. Panicking: no. *bip* Panicking: slightly.'],
    ['niko', 'Nothing new today. Same moves, longer queue. Keep every ticket right.'],
  ],
  14: [
    ['', 'Niko pins a shiny new badge beside the till.'],
    ['niko:happy', 'Last service before Query earns its badge. Every kind of order, all at once.'],
    ['albert:happy', 'A medal for the robot? Good. It remembered my usual yesterday.'],
    ['query', '*bip boop* Badge. Want badge.'],
  ],
  15: [
    ['', 'Niko rolls a second robot out of the back room. It squeaks.'],
    ['brew', '*BEEP BEEP!* Hello! Am Brew! Is espresso machine? So shiny. Touch?'],
    ['moka', 'Careful. She bites.'],
    ['niko', 'Brew takes over the kitchen from Moka. Query passes the tickets along, and Pip still serves the room.'],
    ['moka', 'That one’s yours to program now. Its recipe is nearly there, but the drink never reaches pickup.'],
  ],
  16: [
    ['brew', '*whirr* Know every recipe! Not know where anything is.'],
    [
      'niko',
      'The kitchen is a grid, and Brew moves one whole tile at a time. If it walks into something, it just stops.',
    ],
    ['brew', '*bonk*'],
    ['niko', 'No new command. Just a route to fix.'],
  ],
  17: [
    ['brew', 'First coffee ticket! Beans, grind, water, brew. Beans, grind, water, brew!'],
    ['niko:worried', 'Just one thing, Brew… you don’t know how to work the coffee machine.'],
    ['brew', '*sad beep*'],
    ['', 'Niko unscrews Brew’s elbow and fits a small adapter. It clicks.'],
    [
      'niko:happy',
      'New command: Use. Next to a machine, Use runs it. The coffee machine grinds the beans and brews them, once the water is in.',
    ],
  ],
  18: [
    ['juno', 'Tea, please. And tell the new robot: no grinding the leaves.'],
    ['brew', '*gasp beep* No grinder? But love grinder!'],
    ['niko', 'No new command. Coffee and tea just don’t take the same path through the kitchen.'],
  ],
  19: [
    ['dot:worried', 'Brew, sweetheart, my coffee was plain yesterday.'],
    ['brew', '*bip* Ticket said two sugars. Thought: suggestion.'],
    ['dot:worried', 'It was not a suggestion.'],
    ['niko:worried', 'Brew needs to do the same thing a set number of times. Let me look inside…'],
    ['', 'Niko taps something inside Brew. A sugar cube falls out of its ear.'],
    [
      'niko:happy',
      'Found it! For can repeat a number of times now, like For Var A times. The blocks inside run once per count.',
    ],
  ],
  20: [
    ['brew', 'Beans grind water brew. Beans grind water brew. Beans grind w— *bzzt*'],
    ['query', '*bip* Brew said that forty-one times. Please help.'],
    ['niko:worried', 'Yeah, that’s a lot of repeating. Let me see what I can do.'],
    ['brew', '*whirr* Tickles!'],
    [
      'niko:happy',
      'Done. New commands: Function and Call. Give a group of steps a name once, then Call that name wherever you need them.',
    ],
  ],
  21: [
    ['niko:worried', 'Brew keeps walking back and forth for one cup at a time.'],
    ['brew', '*pant… beep* So. Many. Tiles.'],
    ['', 'Niko clips a second cup holder onto Brew’s arm.'],
    ['brew', '*BEEP!* Two hands! Two cups! Twice the coffee!'],
    [
      'niko',
      'No new command, but Brew can hold two cups now. Finished drinks still leave in the order they were claimed.',
    ],
  ],
  22: [
    ['moka', 'Well. That’s my cue.'],
    ['niko:worried', 'Moka, you don’t have to…'],
    ['moka', 'Forty years of espresso. I’ve earned a porch chair.'],
    ['brew', '*sad beep*'],
    ['moka', 'Ninety-two degrees, Brew. Always.'],
    ['moka', 'And you, the one writing its instructions: it only knows what you tell it. Look after my kitchen.'],
  ],
  23: [
    ['', 'A third robot rolls up to the pickup counter, balancing a tray.'],
    ['porter', '*ding ding!* Hi! Am Porter! Drinks? Everyone? Great!'],
    ['pip', 'Hi, Porter! I’ve done this job all month. It’s the best job. You’ll love it!'],
    [
      'pip',
      'Your turn to program the floor! Porter just needs to get the drink off the counter first. Easy! Probably!',
    ],
  ],
  24: [
    ['porter', '*bip* Gave drink to nicest-looking person. Wrong?'],
    ['rosa', 'Very sweet of you. But I ordered it, at the other table.'],
    ['niko:worried', 'Porter doesn’t know where anyone sits, and counting tiles to every table would take all day.'],
    ['', 'Niko slides a folded floor plan into Porter’s chest panel.'],
    ['porter', '*beep boop* Map! Love map!'],
    [
      'niko:happy',
      'New command: Move to. Give it a place, like a table stored in Var A, and Porter finds the way there by itself.',
    ],
  ],
  25: [
    ['porter', 'Delivered! Stay. Chat. *happy chirp*'],
    ['query', '*bip* Pickup: three drinks waiting. Temperature: dropping.'],
    ['niko:worried', 'Porter never finds its way back. It needs to remember where it came from.'],
    ['', 'Niko draws a little X on Porter’s memory chip with a marker. It seems to help.'],
    [
      'niko:happy',
      'New: Store here. It saves the spot Porter is standing on in a variable, so Move to can bring it back later.',
    ],
  ],
  26: [
    ['albert', 'Lovely coffee. I’ll leave the cup for your young robot friend.'],
    ['porter', '*bip?* Empty cup. Where go?'],
    ['brew', '*bip* Sink. Gently. Please.'],
    ['niko', 'Porter only ever waits for drinks, never for dirty cups. Let me teach it to notice.'],
    ['', 'Niko bends Porter’s antenna until it points, very slightly, at the dirty mugs.'],
    [
      'niko:happy',
      'There. Wait for can watch for Dirty cups now: Porter picks a used cup and knows which table it’s on.',
    ],
  ],
  27: [
    ['', 'Mid-morning. The drinks keep coming.'],
    ['porter', 'Serve. Return. Serve. Return. *happy beeps* Dancing!'],
    ['niko:happy', 'No new command. Just keep that rhythm going until every drink is out.'],
  ],
  28: [
    ['brew', '*alarm beep* Cups all on tables! No cups left!'],
    ['porter', 'Drinks! Cups! Drinks! *bzzt*'],
    ['niko', 'Nothing new, just a busier floor. The kitchen can’t make drinks without clean cups.'],
  ],
  29: [
    ['niko:worried', 'One drink per trip. At this rate the coffee will be cold by table three.'],
    ['', 'Niko hands Porter a new tray with room for two.'],
    ['porter', '*BEEP!* Two guests! One trip! Zero spills!'],
    ['pip', 'Probably zero spills.'],
    ['niko', 'No new command, but Porter can carry two things now. The tray empties in the order you filled it.'],
  ],
  30: [
    ['pip', 'Porter’s doing great. I think… I think I can retire too.'],
    ['porter', '*sad beep* Retire? Who teach Porter?'],
    ['pip', 'Whoever writes your code, silly!'],
    ['pip', 'Deliveries, dirty cups and full trays, all at once. You’ve got this!'],
  ],
  31: [
    ['', 'The three robots line up by the counter. Niko hangs up the apron.'],
    ['niko', 'Query takes the orders. Brew makes them. Porter brings them out. From today, I’m just the owner.'],
    ['query', '*bip* Acknowledged.'],
    ['brew', '*BEEP!* Ninety-two degrees!'],
    ['porter', '*ding ding!* All for one!'],
    ['niko', 'All three programs run together now, and each one has something to fix. No new commands, just teamwork.'],
  ],
  32: [
    ['', 'The busiest day yet. Every regular came.'],
    ['albert', 'The usual.'],
    ['juno', 'Tea, no sugar.'],
    ['dot:happy', 'Two sugars, dear.'],
    ['rosa:happy', 'And the same again for everyone at my table!'],
    ['niko:happy', 'I’m going to sit right here with a coffee and let the café run itself. It’s all yours.'],
    ['query', '*bip*'],
    ['brew', '*BEEP!*'],
    ['porter', '*ding!*'],
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
  ['query', '*bip* Niko drinking coffee. No ticket written.'],
  ['niko:happy', 'I made it myself. Old habits.'],
  ['query', 'Not in instruction set.'],
  ['niko:happy', 'It is now.'],
  ['moka', 'Ninety-two degrees. Good.'],
  ['pip', 'Tables are clean!'],
  ['moka', 'Not bad, for someone who started with one ticket. Same time tomorrow.'],
]);
