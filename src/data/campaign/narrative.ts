/** One narrative row per shift: title, story beat, goal, short hint, concept, and lesson note. Scenes live in dialogue.ts. */
export interface ShiftNarrative {
  level: number;
  title: string;
  story: string;
  objective: string;
  /** A few words for the Chef's note on the shift picker: a nudge, not the full goal. */
  hint: string;
  /** The idea behind the shift, in general terms: Help's first hint, before any clue about the routine itself. */
  concept: string;
  lessonNote: string;
}
export const campaignNarrative: ShiftNarrative[] = [
  {
    level: 1,
    title: 'Brew Beginnings',
    story:
      'The doors are open again! Niko greets the very first customer, Moka runs the kitchen and Pip carries the drinks. Everyone is very busy. Mostly Niko.',
    objective:
      'Watch how one customer’s order goes from the register to a finished drink and a cleared table. Niko writes every ticket by hand: spot the job Query could take over.',
    hint: 'Watch one order go round.',
    concept:
      'Every order makes the same trip: register, kitchen, table. Each robot you build takes over one leg of it.',
    lessonNote:
      'Niko: The café is ours now. Watch a customer order, receive a drink and leave a clean table. Follow each order from the register, through the kitchen, to the table.',
  },
  {
    level: 2,
    title: 'Hello, World Roast',
    story: 'Query is awake and ready to say hello to the world. The very first guest would like a coffee. No pressure.',
    objective:
      'A customer wants a coffee, but the kitchen can only make drinks from a written ticket handed over from the counter. Get a coffee ticket to the kitchen.',
    hint: 'Take paper, write it, hand it over.',
    concept:
      'A robot does exactly what its routine says, one block at a time, top to bottom. The kitchen never hears the guest: all it knows is what reaches it on paper.',
    lessonNote:
      'Wait for Orders, Take up a sheet from the paper stack, and Write Coffee on it. Move right 1, Deposit right at the kitchen handoff, then Move left 1 back to the register. Checkout is automatic.',
  },
  {
    level: 3,
    title: 'Groundhog Latte',
    story: 'One happy customer is a good start. But another guest is already at the door. And another. And another…',
    objective:
      'Several customers are waiting for a coffee, but Query stops after the first order. Every customer in the queue needs to be served.',
    hint: 'Jump back and listen again.',
    concept:
      'A routine runs to its last block and stops. A Jump back to a destination above it runs the same blocks again, for the next guest and the one after.',
    lessonNote:
      'Put a Jump destination above Wait for Orders, and a Jump back to it after returning to the register. Keep serving every customer.',
  },
  {
    level: 4,
    title: 'Coffee or Tea?',
    story:
      'Tea has joined the menu and the great debate begins. Some guests in the queue still want coffee, others would like tea. Query has to listen closely.',
    objective:
      'Customers now order either coffee or tea. Each ticket must name the drink that customer actually asked for.',
    hint: 'Listen for the word tea.',
    concept:
      'A choice: If runs its blocks only when its condition holds, and Else runs them when it doesn’t. For every guest, exactly one of the two happens.',
    lessonNote:
      'Conditions check what the customer said. Inside the loop, use If Tea IN Orders to test it, then Write Tea or Write Coffee.',
  },
  {
    level: 5,
    title: 'Sugar, No Sugar',
    story:
      'With sugar, please! Without sugar, thanks! Query hears “sugar” loud and clear… and also that sneaky “without”.',
    objective:
      'Some customers ask for sugar, and some say “without sugar”: they mention sugar but don’t want any. Every ticket must match what the customer meant.',
    hint: 'Sugar, unless they say “without”.',
    concept:
      'Conditions only look for words. “Without sugar” has the word sugar in it too, so one If inside another tells the two apart.',
    lessonNote:
      'If Sugar IN Orders catches a request for sugar, and Write 1 Sugar puts it on the held paper. “Without sugar” still contains Sugar, plus Negation: inside that If, test If Negation IN Orders, then Write 0 Sugar or Write 1 Sugar.',
  },
  {
    level: 6,
    title: 'For Each Their Own',
    story:
      'Two friends arrive together and order at once. The kitchen needs one ticket per drink. Sharing is caring, just not on paper.',
    objective: 'Some customers order several drinks at once. The kitchen needs a separate ticket for every drink.',
    hint: 'One sheet per drink.',
    concept:
      'A loop over a list: For item in order runs its blocks once for each drink, and item stands for the drink in hand on that pass.',
    lessonNote:
      'For item in order visits each drink in the order. Take a fresh sheet, write that item, deposit it, and return to the register on every pass.',
  },
  {
    level: 7,
    title: 'One Lump or Two?',
    story:
      'One sugar? Two? None at all, thank you very much? Our guests are getting specific, and “some sugar” won’t cut it anymore.',
    objective:
      'Customers now ask for an exact number of sugars, including zero. A simple yes or no is no longer enough: every ticket must carry the exact count.',
    hint: 'Count the sugars exactly.',
    concept:
      'A variable is a named box. Store puts what the guest said into it, and any block that reads it gets that value back, whatever it was.',
    lessonNote:
      'If Number IN item checks for a count. Store Var A = Number in item, then Write Var A Sugar writes the exact amount, including zero. Keep the sugar and negation checks for orders without numbers.',
  },
  {
    level: 8,
    title: 'The Usual Suspect',
    story:
      'A guest asks for “the usual”. Query has never met them before. Better to ask Niko than to guess. Get this right and there’s a badge in it.',
    objective:
      'Some customers order “the usual”, which Query can’t interpret. Guessing would send the wrong drink to the kitchen, so an unclear order must be cleared up before anything is written.',
    hint: 'When unsure, ask Niko.',
    concept:
      'Never act on what you can’t read. Ask first: Help swaps the unclear words for what the guest meant, and everything after works from the answer.',
    lessonNote:
      'An unclear request contains Ambiguous. Before taking paper or starting For item in order, use If Ambiguous IN Orders and Help. Niko replaces the heard orders with a clarification.',
  },
  {
    level: 9,
    title: 'A Brew-tiful Friendship',
    story:
      'Brew rolls into the kitchen, eager and a little squeaky. Moka watches from the doorway, arms crossed, while Pip keeps the drinks moving.',
    objective:
      'Brew’s coffee recipe is almost complete, but it never runs the coffee machine, so the beans are never ground. Every coffee must be ground, brewed and left at pickup.',
    hint: 'Beans, grind, water, brew.',
    concept:
      'A recipe is a sequence. Every step depends on the one before it, so one missing step means the drink is never made.',
    lessonNote:
      'Brew waits for Query’s tickets at the order handoff and makes each drink: Take up the beans at storage, Use up the coffee machine to grind them, Take up water at the sink, Use up the machine again to brew, then Deposit up at pickup. Pip still serves the room.',
  },
  {
    level: 10,
    title: 'Steep Thoughts',
    story: 'A tea order reaches the kitchen. Brew must pick a different recipe without forgetting how to make coffee.',
    objective:
      'Tickets now ask for coffee or tea, and the two drinks use different ingredients. Brew must make whichever drink each ticket asks for.',
    hint: 'Read the ticket: coffee or tea?',
    concept:
      'The same choice Query makes, now in the kitchen: Brew can’t hear the guest, so it decides by what the ticket says.',
    lessonNote:
      'Tea uses leaves, water, and steeping. Leaves skip the grinder: branch on the ticket and walk tea straight to the sink.',
  },
  {
    level: 11,
    title: 'A Spoonful of Sugar',
    story: 'The right drink is only half the order. Brew must remember the little extras that make it just right.',
    objective:
      'Tickets can request sugar, but Brew sends every drink out unsweetened. Each drink must match the sugar amount on its ticket.',
    hint: 'Stop by the sugar before pickup.',
    concept:
      'A loop that counts: For Var A times repeats its blocks exactly as many times as the variable holds, and zero times means not at all.',
    lessonNote:
      'Orders now ask for sugar. Store the order’s sugar in Var A, then For Var A times, Take up at the sugar station drops in one cube.',
  },
  {
    level: 12,
    title: 'Call Me Maybe',
    story: 'Brew has made the same recipes all morning. Let’s give those familiar steps a name, and just call them.',
    objective:
      'Brew’s routine repeats the same recipe steps for every ticket, which makes it long and hard to change. Serve every ticket as before, with the recipe written in one place.',
    hint: 'Name the recipe, then call it.',
    concept:
      'A function is a recipe with a name. Write the steps once, Call them wherever they’re needed, and a change to the recipe changes every drink.',
    lessonNote:
      'Move the recipe into Function recipe. Call recipe makes the drink on the oldest ticket Brew is holding.',
  },
  {
    level: 13,
    title: 'Double Trouble',
    story:
      'Moka has hung up her apron, and Brew runs the kitchen alone. Its hands fit two cups now, and a little planning saves a lot of walking.',
    objective:
      'Brew can now carry two cups, but still makes one drink per trip. Brew must make two at a time, and drinks must leave in order and match their tickets.',
    hint: 'Two cups, one trip.',
    concept:
      'Batching: two drinks in one trip save a walk each time. Gather the work first, then do it together, in the order it came.',
    lessonNote: 'Brew now holds two cups. Claim two tickets before making them. Finished drinks leave in pickup order.',
  },
  {
    level: 14,
    title: 'Special Delivery',
    story:
      'Meet Porter, the brand-new floor robot. Pip points at a finished drink and the guest waiting for it, and keeps clearing the tables, just for today.',
    objective:
      'Finished drinks wait at pickup, and each ticket names the table that ordered it. Porter walks off without reading it. Every drink must reach the table on its ticket.',
    hint: 'The ticket names the table.',
    concept:
      'The ticket carries the table. Keep it in a variable, and Move to finds the way there, wherever the table is.',
    lessonNote:
      'Porter takes over the room. Wait for Orders claims a ready drink and Take down picks it up from pickup. Store the order’s table in Var A: Move to Var A walks Porter there by itself, and Deposit up serves it.',
  },
  {
    level: 15,
    title: 'Cups and Robbers',
    story:
      'Pip is out buying his school books, so the empty cups are Porter’s job now. A clean table is the next guest’s first impression.',
    objective:
      'Guests leave their empty cups behind, and Porter only knows how to deliver. Every used cup has to go back to the sink before the next guest can sit down.',
    hint: 'Empty cups go to the sink.',
    concept:
      'A second kind of job. Wait for Dirty cups hands Porter a cup to clear, just as Wait for Orders hands it a drink to serve.',
    lessonNote:
      'Wait for Dirty cups picks a used cup. Walk to its table, Take it up, then carry it to the sink and Deposit down.',
  },
  {
    level: 16,
    title: 'Tea for Two',
    story:
      'Pip’s last shift before school starts. Porter’s new tray carries two items: two guests, one trip, zero spills. Hopefully.',
    objective:
      'Porter’s tray now holds two items, but Porter still carries one at a time. Porter must fill the tray before setting off, and anything beyond two won’t fit.',
    hint: 'Fill the tray before you go.',
    concept: 'Fill, then go: two items per trip halve the walking. The tray gives them back in the order they went on.',
    lessonNote:
      'Porter now holds two items. Take two drinks before serving, then clear both tables. The tray empties in the order it was filled.',
  },
  {
    level: 17,
    title: 'To Go',
    story:
      'Pip is back at school, and the robots run the café on their own. The morning commuters want their coffee to go.',
    objective:
      'Some customers order their drink to go. They don’t sit down: they wait by the door. Every to-go drink must reach the to-go shelf with a lid on.',
    hint: 'To-go drinks never reach a table.',
    concept:
      'One mark on a ticket changes every robot’s job: Query writes it, Brew adds a lid, and Porter heads for the shelf instead of a table.',
    lessonNote:
      'Some customers order to go. Query writes To go on their ticket: If To go IN item, then Write To go. Brew puts a lid on those drinks: Take up at the lids, between the sugar and pickup. Porter leaves them on the to-go shelf by the door: walk there and Deposit down. They go in paper cups, so there’s nothing to clear.',
  },
  {
    level: 18,
    title: 'Four Cups',
    story:
      'The cup delivery is late, and there are only four cups in the whole café. Every cup has to come back and be washed before it can be used again.',
    objective:
      'Only four cups go round. When they run out, the next drink has to wait until a used cup is cleared and washed. Keep the cups coming back so every guest is served.',
    hint: 'A cup has to come back before it can go out again.',
    concept:
      'A shared, limited supply. Cups go round in a loop of their own: out with a drink, back to the sink, washed, and out again.',
    lessonNote:
      'There are only four café cups. Taking beans or leaves at storage uses a clean cup, and Porter drops the used ones in the sink. Use up at the sink washes them. When no clean cup is left, Brew waits at the sink until a used one comes back.',
  },
  {
    level: 19,
    title: 'In a Hurry',
    story: 'The lunch rush brings people with a train to catch. They can’t wait behind the whole queue.',
    objective:
      'Some customers are in a rush, but their tickets look like everyone else’s, so their drinks wait in line. Every rush order needs Rush on its ticket, and a robot holding one must finish it before waiting for anything else.',
    hint: 'Mark it Rush, then don’t keep it waiting.',
    concept:
      'Priority: some work can’t wait. A rush order goes first, and nothing new gets picked up while one is in hand.',
    lessonNote:
      'Customers in a rush say so: Query writes Rush on their ticket. Rush orders jump the queue, and whoever holds one handles it first. Brew can’t wait for another ticket while it holds a rush order, and Porter can’t wait or pick up another drink while it carries one.',
  },
  {
    level: 20,
    title: 'Last Orders',
    story:
      'Closing time. The last guests are finishing up, and the robots should be in their docks before Niko locks the door.',
    objective: 'When the last customer has been served and every table is cleared, all three robots must stop.',
    hint: 'Finish up, then stop.',
    concept:
      'Every routine needs an ending. When the café closes, Wait hears Closed: finish what’s in hand, then Stop.',
    lessonNote:
      'After the last customer, Wait for Orders reports Closed instead of waiting. Check If Closed IN Orders, and Stop. Every robot has to stop, after finishing whatever it’s holding. A robot that keeps waiting keeps the café open.',
  },
  {
    level: 21,
    title: 'Espresso Yourself',
    story: 'The busiest day yet. Niko sits down with a coffee and trusts the whole team with the room.',
    objective:
      'The final service combines everything: group orders, coffee and tea, sugar, unclear requests, drinks to go, only four cups, customers in a rush, and closing time. Every guest must be served, every table cleared, and every robot stopped.',
    hint: 'Everything, all at once.',
    concept:
      'Nothing new: every idea so far, working together. Fix one robot at a time, and let the last run tell you which.',
    lessonNote:
      'Everything at once: groups, “the usual”, drinks to go, four cups, customers in a rush, and closing time.',
  },
];

/** Narrative row for a zero-based shift index. */
export function narrativeFor(index: number): ShiftNarrative {
  const found = campaignNarrative[index];
  if (!found) throw new Error(`Unknown shift index: ${index}`);
  return found;
}
