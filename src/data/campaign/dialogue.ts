import { line } from '../../domain/dialogue';
import type { DialogueLine, Speaker } from '../../domain/dialogue';
import { narrativeFor } from './narrative';

/** Script shorthand: `['niko:happy', 'text']`, `['query', 'text']`, or `['', 'narration']`. `*whirr*` marks a sound effect. */
type ScriptLine = readonly [Speaker, string];

const script = (lines: readonly ScriptLine[]): DialogueLine[] => lines.map(([speaker, text]) => line(speaker, text));

/** Shift intros, keyed by 1-based level. They play every time a shift opens, unless shorter repeats skips one already worked on. */
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
      'Then [MOVE RIGHT 1|Move] walks Query to the kitchen handoff, one tile at a time, and [DEPOSIT RIGHT|Deposit] hands the ticket over. After that, Move Query back to the register: that’s where the guest pays.',
    ],
    ['query', '*bip* Listen. Paper. Write. Walk. Give. Walk back. Simple.'],
    [
      'niko:happy',
      'Today’s guest just wants a coffee. Press Run service when you’re ready. If it goes wrong, nothing breaks. Except maybe my pride.',
    ],
  ],
  3: [
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
  4: [
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
    ['brew', '*BEEP BEEP!* Espresso machine! So shiny. Touch?'],
    ['moka', 'Careful. She bites.'],
    ['niko', 'Brew takes over the kitchen. Query passes the tickets along, and Pip still serves the room.'],
    [
      'niko:happy',
      'New command: [USE UP|Use]. Next to a machine, Use runs it. The coffee machine grinds the beans, then brews them once the water is in.',
    ],
    ['moka', 'That one’s yours to program now. Its recipe is nearly there, but it never grinds the beans.'],
    ['moka', 'My steps are under Brew’s routine. Every one of them, in order.'],
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
      'Found it! [STORE var1 FROM sugar|Store] can keep the sugar on Brew’s ticket in Var A, and For can repeat that many times, like [FOR var1 TIMES|For Var A times]. The blocks inside run once per count.',
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
    ['', 'The first morning without Moka. The note on her apron by the door still says 92°.'],
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
    ['porter', '*ding ding!* Drinks? Everyone? Great!'],
    ['pip', 'Lesson two: Dot likes the corner, Juno likes it quiet, and Rosa always brings her brother.'],
    [
      'niko:worried',
      'Porter doesn’t know where anyone sits yet, and counting tiles to every table would take all day.',
    ],
    ['', 'Niko slides a folded floor plan into Porter’s chest panel.'],
    ['porter', '*beep boop* Map! Love map!'],
    [
      'niko:happy',
      'New command: [MOVE var1|Move to]. Give it a place, like the table stored in Var A, and Porter finds the way there by itself. [STORE var1 FROM here|Store here] saves the spot it’s standing on, so it can come back.',
    ],
    ['pip', 'Your turn to program the floor! Porter just has to read which table the drink is for. Easy! Probably!'],
    ['pip:happy', 'I wrote down how I do it, under Porter’s routine. Step by step!'],
  ],
  15: [
    ['albert', 'Lovely coffee. I’ll leave the cup for your young robot friend.'],
    ['porter', '*bip?* Empty cup. Where go?'],
    ['brew', '*bip* Sink. Gently. Please.'],
    ['niko', 'Porter only ever waits for drinks, never for dirty cups. Let me teach it to notice.'],
    ['', 'Niko bends Porter’s antenna until it points, very slightly, at the dirty mugs.'],
    [
      'niko:happy',
      'There. [WAIT DIRTY|Wait for Dirty cups] is new: Porter picks a used cup and knows which table it’s on. The clearing steps go in their own [FUNCTION clear|Function clear], next to deliver.',
    ],
  ],
  16: [
    ['niko:worried', 'One drink per trip. At this rate the coffee will be cold by table three.'],
    ['', 'Niko hands Porter a new tray with room for two.'],
    ['porter', '*BEEP!* Two guests! One trip! Zero spills!'],
    ['pip', 'Probably zero spills.'],
    ['niko', 'No new command, but Porter can carry two things now. The tray empties in the order you filled it.'],
    ['pip', 'Porter’s doing great. Good thing, too: it’s my last week before school.'],
    ['porter', '*sad beep* School? Pip leaving?'],
  ],
  17: [
    ['', 'The first morning with nobody behind the counter but the robots. The commuters are already queuing.'],
    ['guest', 'A coffee to go, please. My train leaves in ten minutes.'],
    ['query', '*bip* To go? Go where?'],
    ['niko', 'Away. They take it with them, so it needs a lid, and it doesn’t go to a table.'],
    [
      '',
      'Niko stacks paper cups and lids between the sugar and the pickup, and props a little TO GO sign on the counter by the door.',
    ],
    [
      'niko:happy',
      'New command: [WRITE togo|Write To go] marks the ticket. Brew puts a lid on at the lids, and Porter leaves the cup on the to-go shelf by the door.',
    ],
    ['porter', '*ding* No table? Shelf! Shelf is table now.'],
  ],
  18: [
    ['', 'A note on the door: the cup delivery is late. There are four cups in the whole café.'],
    ['brew', '*BEEP* Four? Four cups? For everyone?'],
    ['niko:worried', 'Every cup has to come back and get washed before it can go out again.'],
    [
      'niko',
      'No new command: [USE UP|Use] at the sink washes the used cups in it. With no clean cup left, Brew waits there until Porter brings one back.',
    ],
    ['porter', '*ding ding!* Bringing cups back! Fast!'],
  ],
  19: [
    ['rosa', 'A quick tea, please! I’m in a rush, my meeting starts in five minutes.'],
    ['query', '*bip* Rush detected. Rush not on menu.'],
    [
      'niko',
      'It’s not a drink, it’s a hurry. [WRITE rush|Write Rush] puts it on the ticket, and rush orders jump the queue.',
    ],
    [
      'niko:worried',
      'But a rush order can’t wait around. Brew makes it before waiting for another ticket, and Porter serves it before picking up anything else.',
    ],
    ['brew', '*BEEP* No waiting! Rush! Rush!'],
  ],
  20: [
    ['', 'Evening. The last guests are finishing their drinks.'],
    ['niko', 'Once the last guest has ordered, [LISTEN|Wait for Orders] stops waiting and reports Closed.'],
    [
      'niko:happy',
      'New command: [STOP|Stop]. Check If Closed IN Orders, finish whatever’s in hand, and Stop. Every robot, or the café stays open all night.',
    ],
    ['porter', '*ding* Cups first! Then sleep.'],
    ['query', '*bip* Stop. Stop. Understood. *bip*'],
  ],
  21: [
    ['', 'The busiest day yet. Every regular came, and half the street besides.'],
    ['albert', 'The usual.'],
    ['rosa:happy', 'A coffee and a tea for my table!'],
    ['guest', 'Coffee to go, please. And quickly!'],
    ['niko:worried', 'Four cups, drinks to go, people in a rush, and we still close on time tonight.'],
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

/** Shift payoffs, keyed by 1-based level: whoever the intro left waiting gets what they came for. */
const outros: Record<number, readonly ScriptLine[]> = {
  1: [
    ['niko:happy', 'And that’s a whole service, start to finish. Easy when you watch it, right?'],
    ['moka', 'Easy to watch. Now write it out by hand eighty times a day.'],
    ['niko:worried', 'My hand hurts already. Somebody else should be writing these tickets.'],
  ],
  2: [
    ['guest:happy', 'A coffee, just like I asked. Thank you!'],
    ['query', '*bip* First ticket. Filed under: proud.'],
    ['niko:happy', 'Your code just served a real customer. Lou would have framed that ticket.'],
  ],
  3: [
    ['query', '*bip* Customer. Customer. Customer. Customer. …Still listening.'],
    ['niko:happy', 'The whole bus, served. Now it keeps going for as long as anyone is at the counter.'],
  ],
  4: [
    ['juno:happy', 'Actual tea. In a cup. I could cry.'],
    ['query', '*bip* Coffee or tea. Asked and answered.'],
  ],
  5: [
    ['juno:happy', 'No sugar. It actually listened to the “without”.'],
    ['dot:happy', 'And mine’s sweet as anything. Lovely, dear.'],
  ],
  6: [
    ['rosa:happy', 'Two coffees, two tickets! My brother’s will still be hot when he’s done locking up the bike.'],
    ['query', '*bip* One customer. Two tickets. Sharing: not on paper.'],
  ],
  7: [
    ['dot:happy', 'Two sugars. Not one, not three. You remembered, dear.'],
    ['query', '*bip* Var A: two. Memory chip: still slightly smoky.'],
  ],
  8: [
    ['albert:happy', 'It rang the bell instead of guessing. Smart machine.'],
    ['query', '*ding!* …Once. Once is enough.'],
    ['niko:happy', 'Every guest got what they meant. That badge by the till is yours, Query.'],
  ],
  9: [
    ['brew', '*BEEP BEEP!* Ground! Brewed! Coffee real!'],
    ['moka', 'Hm. It didn’t burn it.'],
    ['niko:happy', 'From Moka, that’s a standing ovation.'],
  ],
  10: [
    ['juno:happy', 'Whole leaves, properly steeped. Your robot is forgiven.'],
    ['brew', '*sniff beep* Grinder rested today. Grinder: fine.'],
  ],
  11: [
    ['dot:happy', 'Two sugars, and not as a suggestion. Thank you, sweetheart.'],
    ['brew', '*BEEP* Ticket: instructions. Not suggestions. Learned.'],
  ],
  12: [
    ['brew', '*bip* Call recipe. Call recipe. …Much quieter.'],
    ['query', '*bip* Kitchen noise: down. Thank you.'],
    ['niko:happy', 'And the recipe lives in one place now. Change it once, and every call changes with it.'],
  ],
  13: [
    ['brew', '*BEEP!* Two cups. One trip. Kitchen: mine.'],
    ['', 'Across the street, Moka watches from her porch. She nods, once.'],
  ],
  14: [
    ['porter', '*ding ding!* Table read! Table found! Drink delivered!'],
    ['pip:happy', 'See? Best job. Wait till you know everybody’s name.'],
  ],
  15: [
    ['albert:happy', 'My cup’s gone and the table’s spotless. Now that’s service.'],
    ['porter', '*ding* Cup to sink. Gently. Brew said.'],
    ['brew', '*bip* Gently. Good.'],
  ],
  16: [
    ['porter', '*ding ding!* Two guests! One trip! Zero spills!'],
    ['pip:happy', 'Zero spills. Okay, Porter. I think you’re ready.'],
    ['porter', '*soft beep* Pip come back Saturday?'],
  ],
  17: [
    ['guest:happy', 'Lid on, and I’ll still make my train. Brilliant!'],
    ['porter', '*ding* Shelf is table now. Shelf: happy.'],
    ['niko:happy', 'Their first morning on their own, and nobody missed a train.'],
  ],
  18: [
    ['brew', '*clink clink* Washed. Washed. Washed. Four cups, every guest!'],
    ['niko:happy', 'Four cups for the whole café, and they kept up. Let’s not tell the supplier.'],
  ],
  19: [
    ['rosa:happy', 'Tea in hand, and four minutes to spare! I owe you a tip.'],
    ['brew', '*BEEP* Rush done. Breathing now.'],
  ],
  20: [
    ['', 'The last table is clear. Three little lights blink off in the back room.'],
    ['niko:happy', 'Everyone served, every cup washed, every robot docked. I can actually lock up on time.'],
  ],
  21: [
    ['niko:happy', 'Look at that. I finished a whole coffee, and nobody needed me once.'],
    ['query', '*bip*'],
    ['brew', '*BEEP!*'],
    ['porter', '*ding!*'],
  ],
};

/** The scene that closes a passed shift, before Niko's star verdict. Empty when none is written. */
export function shiftOutro(index: number): DialogueLine[] {
  const written = outros[index + 1];
  return written ? script(written) : [];
}
