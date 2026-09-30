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
    ['niko', 'Soon you’ll be writing the code for the robots that help out here. But not today.'],
    [
      'niko',
      'Today we just watch. Press Watch service and follow one order: the counter, the kitchen, then a clean table.',
    ],
    ['niko:worried', 'I’m writing every ticket by hand, too. Watch how long that takes.'],
  ],
  2: [
    ['query', '*bip* Hearing online. What is coffee?'],
    ['niko:happy', 'A reason to get out of bed. Also, a drink.'],
    [
      'niko',
      'Right, this part is for you. Query does exactly what its code says, one command at a time, from top to bottom. Writing that code is your job.',
    ],
    [
      'niko',
      'Here’s how a ticket gets made. [LISTEN|Wait for Orders] makes Query listen until a guest orders something.',
    ],
    [
      'niko',
      '[TAKE UP|Take up] grabs a blank sheet from the paper stack, and [ITEM coffee|Write Coffee] puts the drink on it.',
    ],
    [
      'niko',
      'Then [MOVE RIGHT 1|Move] walks Query to the kitchen handoff, one tile at a time. [DEPOSIT RIGHT|Deposit] hands the ticket over, and Query walks back to the register.',
    ],
    ['query', '*bip* Listen. Paper. Write. Walk. Give. Walk back. Simple.'],
    [
      'niko:happy',
      'Today’s guest just wants a coffee. Press Run service when you’re ready. If it goes wrong, nothing breaks. Except maybe my pride.',
    ],
  ],
  3: [
    ['niko:happy', 'Big news: tea is on the menu!'],
    ['juno:happy', 'Finally. I’ve been drinking hot water with a sad face for a week.'],
    ['query', '*bip boop* Menu doubled. Only know write coffee.'],
    ['niko:worried', 'Right. It can’t choose yet. Hang on…'],
    ['', 'Niko props the manual open on the counter and starts turning screws.'],
    ['query', '*bzzt* Ticklish.'],
    [
      'niko:happy',
      'There! New command: [IF tea IN CUSTOMER SPEECH|If]. It checks something, like what the customer said. The blocks inside only run when it’s true, and [ELSE|Else] covers everything else.',
    ],
  ],
  4: [
    ['query', 'One customer served. Task complete. *whirrr… click*'],
    ['niko:surprised', 'Wait! There’s another one at the door. And another. And… is that a bus?'],
    ['query', '*bzzt* No more lines. Nothing to do. Sleep now.'],
    ['niko:worried', 'That’s not going to work. It needs something new. Hold on…'],
    ['', 'Niko pops Query’s back panel open and rummages around with a screwdriver.'],
    ['query', '*bip… bop… BOING*'],
    [
      'niko:happy',
      'Got it! You now have [JUMP listen|Jump]. When it’s read, the code goes straight back to a [POSITION listen|Position] marker, wherever you put it. Everything after the marker runs again.',
    ],
  ],
  5: [
    ['dot:happy', 'Hello, dears! A coffee with sugar, please. Life’s too short for bitter.'],
    ['juno', 'And a tea for me. Without sugar. Last time it was basically syrup.'],
    ['query', '*bip* Sugar not on menu. Sugar not drink.'],
    [
      'niko:worried',
      'The kitchen needs to know about the sugar, and the ticket has nowhere to say it. Let me fix that.',
    ],
    ['', 'Niko sharpens a pencil with great concentration and tapes it to Query’s arm.'],
    ['query', '*whirr* Arm heavier. Arm smarter.'],
    [
      'niko:happy',
      'Done! Write can add a note to the ticket now, like [WRITE 1 sugar|Write 1 Sugar]. A fresh sheet always starts with no sugar.',
    ],
    [
      'niko',
      'And mind Juno’s order: “without sugar” still has the word sugar in it. Query hears everything. Make sure it listens to all of it.',
    ],
  ],
  6: [
    ['rosa:happy', 'Hi! Two coffees: one for me, one for my brother. He’s parking the bike.'],
    ['query', '*bip* One customer. One ticket.'],
    ['niko:worried', 'One ticket for two drinks… The kitchen only makes what’s on the paper. That won’t do.'],
    ['niko', 'Give me a minute. Where did I put that manual…'],
    ['', 'Clanking from under the counter. Something rolls away.'],
    [
      'niko:happy',
      'There! New command: [FOR item IN heard orders|For item in order]. It goes through an order one drink at a time, and runs the blocks inside it once for every drink.',
    ],
  ],
  7: [
    ['dot:happy', 'Two sugars, please. Not one. Not three. Two.'],
    ['query', '*bip* Sugar: yes.'],
    ['dot:worried', 'Yes… and how many, dear?'],
    ['query', '*bip… bip…* Yes.'],
    ['niko:worried', 'It hears the number and forgets it straight away. It needs somewhere to keep it.'],
    ['', 'Niko solders a tiny memory chip into Query’s head. A small puff of smoke. Nobody mentions it.'],
    [
      'niko:happy',
      'New command: [STORE var1 FROM number|Store]. It keeps a value, like the number in an order, in a variable such as Var A. Write can use it after that.',
    ],
  ],
  8: [
    ['', 'Niko pins a shiny new badge beside the till. It says EMPLOYEE OF THE MONTH.'],
    ['guest', 'The usual, please.'],
    ['query', '*bip* Unknown order. Guessing… coffee?'],
    ['albert:happy', 'Hah. Nobody knows anybody’s usual but Niko.'],
    ['niko:worried', 'Don’t guess! Query needs a way to ask me when it can’t tell.'],
    ['', 'Niko wires a small brass bell to the counter.'],
    ['query', '*ding!* *ding!* *ding!* *ding!*'],
    [
      'niko:happy',
      'Once is enough, thanks. New command: [HELP|Help]. Unclear orders contain Ambiguous, and Help calls me over to ask the guest what they meant.',
    ],
  ],
  9: [
    ['', 'Brew’s first morning in the kitchen. It squeaks.'],
    ['brew', '*BEEP BEEP!* Hello! Am Brew! Is espresso machine? So shiny. Touch?'],
    ['moka', 'Careful. She bites.'],
    ['niko', 'Brew takes over the kitchen. Query passes the tickets along, and Pip still serves the room.'],
    [
      'niko:happy',
      'New command: [USE UP|Use]. Next to a machine, Use runs it. The coffee machine grinds the beans, then brews them once the water is in.',
    ],
    ['moka', 'That one’s yours to program now. Its recipe is nearly there, but it never grinds the beans.'],
  ],
  10: [
    ['juno', 'Tea, please. And tell the new robot: no grinding the leaves.'],
    ['brew', '*gasp beep* No grinder? But love grinder!'],
    ['niko', 'No new command. Coffee and tea just don’t take the same path through the kitchen.'],
  ],
  11: [
    ['dot:worried', 'Brew, sweetheart, my coffee was plain yesterday.'],
    ['brew', '*bip* Ticket said two sugars. Thought: suggestion.'],
    ['dot:worried', 'It was not a suggestion.'],
    ['niko:worried', 'Brew needs to do the same thing a set number of times. Let me look inside…'],
    ['', 'Niko taps something inside Brew. A sugar cube falls out of its ear.'],
    [
      'niko:happy',
      'Found it! For can repeat a number of times now, like [FOR var1 TIMES|For Var A times]. The blocks inside run once per count.',
    ],
  ],
  12: [
    ['brew', 'Beans grind water brew. Beans grind water brew. Beans grind w— *bzzt*'],
    ['query', '*bip* Brew said that forty-one times. Please help.'],
    ['niko:worried', 'Yeah, that’s a lot of repeating. Let me see what I can do.'],
    ['brew', '*whirr* Tickles!'],
    [
      'niko:happy',
      'Done. New commands: [FUNCTION recipe|Function] and [CALL recipe|Call]. Give a group of steps a name once, then Call that name wherever you need them.',
    ],
  ],
  13: [
    ['', 'The first morning without Moka. Her apron hangs on the hook by the kitchen door.'],
    ['brew', '*beep* Kitchen: mine. Temperature: ninety-two.'],
    ['niko:worried', 'Brew keeps walking back and forth for one cup at a time.'],
    ['brew', '*pant… beep* So. Many. Tiles.'],
    ['', 'Niko clips a second cup holder onto Brew’s arm.'],
    ['brew', '*BEEP!* Two hands! Two cups! Twice the coffee!'],
    [
      'niko',
      'No new command, but Brew can hold two cups now. Finished drinks still leave in the order they were claimed.',
    ],
  ],
  14: [
    ['', 'Porter’s first service. It rolls up to the pickup counter, balancing a tray.'],
    ['porter', '*ding ding!* Hi! Am Porter! Drinks? Everyone? Great!'],
    ['pip', 'Hi, Porter! I’ve done this job all month. It’s the best job. You’ll love it!'],
    ['niko:worried', 'Porter doesn’t know where anyone sits, and counting tiles to every table would take all day.'],
    ['', 'Niko slides a folded floor plan into Porter’s chest panel.'],
    ['porter', '*beep boop* Map! Love map!'],
    [
      'niko:happy',
      'New command: [MOVE var1|Move to]. Give it a place, like the table stored in Var A, and Porter finds the way there by itself. [STORE var1 FROM here|Store here] saves the spot it’s standing on, so it can come back.',
    ],
    ['pip', 'Your turn to program the floor! Porter just has to read which table the drink is for. Easy! Probably!'],
  ],
  15: [
    ['albert', 'Lovely coffee. I’ll leave the cup for your young robot friend.'],
    ['porter', '*bip?* Empty cup. Where go?'],
    ['brew', '*bip* Sink. Gently. Please.'],
    ['niko', 'Porter only ever waits for drinks, never for dirty cups. Let me teach it to notice.'],
    ['', 'Niko bends Porter’s antenna until it points, very slightly, at the dirty mugs.'],
    [
      'niko:happy',
      'There. [WAIT DIRTY|Wait for Dirty cups] is new: Porter picks a used cup and knows which table it’s on.',
    ],
  ],
  16: [
    ['niko:worried', 'One drink per trip. At this rate the coffee will be cold by table three.'],
    ['', 'Niko hands Porter a new tray with room for two.'],
    ['porter', '*BEEP!* Two guests! One trip! Zero spills!'],
    ['pip', 'Probably zero spills.'],
    ['niko', 'No new command, but Porter can carry two things now. The tray empties in the order you filled it.'],
    ['pip', 'Porter’s doing great. Good thing, too: school starts on Monday.'],
    ['porter', '*sad beep* School? Pip leaving?'],
  ],
  17: [
    ['', 'The first service with nobody behind the counter but the robots.'],
    ['query', '*bip* Counter: ready.'],
    ['brew', '*BEEP!* Ninety-two degrees!'],
    ['porter', '*ding ding!* All for one!'],
    ['niko', 'All three programs run together now, and each one has something to fix. No new commands, just teamwork.'],
  ],
  21: [
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
