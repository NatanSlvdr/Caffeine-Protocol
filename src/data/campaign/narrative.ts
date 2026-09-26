/** One narrative row per shift: title, story beat, goal, short hint, lesson note, and optional interlude. */
export interface ShiftNarrative {
  level: number;
  title: string;
  story: string;
  objective: string;
  /** A few words for the Chef's note on the shift picker: a nudge, not the full goal. */
  hint: string;
  lessonNote: string;
  interlude?: { title: string; text: string };
}
export const campaignNarrative: ShiftNarrative[] = [
  {
    level: 1,
    title: 'Brew Beginnings',
    story:
      'The doors are open again! Niko greets the very first customers while Query watches from the counter, taking notes. Mostly about coffee.',
    objective: 'Watch how one customer’s order goes from the register to a finished drink and a cleared table.',
    hint: 'Just watch one order go round.',
    lessonNote:
      'Niko: The café is ours now. Watch customers order, receive a drink and leave a clean table. Open the paper details to inspect the lifecycle.',
  },
  {
    level: 2,
    title: 'The Morning Grind',
    story:
      'The morning queue is growing faster than the foam. Moka brews, Pip delivers, and Niko juggles every order. Someone should really help.',
    objective:
      'Orders pile up at the register while Niko is busy brewing. Watch the rush and find the job Query could take over.',
    hint: 'Spot the job Query could take.',
    lessonNote:
      'Niko: Eight orders, one pair of hands. The counter queue keeps growing while I brew. Query could help, once we repair the controller.',
  },
  {
    level: 3,
    title: 'Hello, World Roast',
    story: 'Query is awake and ready to say hello to the world. The very first guest would like a coffee. No pressure.',
    objective:
      'A customer wants a coffee, but the kitchen can only make drinks from a written ticket handed over from the counter.',
    hint: 'Take paper, write it, hand it over.',
    lessonNote:
      'Listen, TAKE UP from the paper stack, and write coffee on the held paper. MOVE RIGHT 1, DEPOSIT RIGHT at the kitchen handoff, then MOVE LEFT 1 to the register. Checkout is automatic.',
    interlude: {
      title: 'A voice at the counter',
      text: "Niko tightens the last screw. The scrapyard robot's display blinks.\n\nQUERY: Hearing module online. What is a coffee?\nNIKO: Let's begin with one customer, one ticket. Moka will handle the brewing, and Pip will serve the drinks.",
    },
  },
  {
    level: 4,
    title: 'Coffee or Tea?',
    story:
      'Tea has joined the menu and the great debate begins. Some guests still want coffee, others would like tea. Query has to listen closely.',
    objective:
      'Customers now order either coffee or tea. Each ticket must name the drink the customer actually asked for.',
    hint: 'Listen for the word tea.',
    lessonNote:
      'Conditions inspect the recognized customer speech. Use IF tea IN CUSTOMER SPEECH to test its tokens, then write tea or coffee. No loop is needed yet.',
  },
  {
    level: 5,
    title: 'Groundhog Latte',
    story: 'One happy customer is a good start. But another guest is already at the door. And another. And another…',
    objective:
      'Several customers are waiting, but Query stops after the first order. Every customer in the queue needs to be served.',
    hint: 'Jump back and listen again.',
    lessonNote:
      'Put POSITION listen before LISTEN and JUMP listen after returning to the register. Keep serving every customer.',
  },
  {
    level: 6,
    title: 'Sugar, Sugar',
    story: 'With sugar, please! A little extra sweetness can turn a familiar drink into a small celebration.',
    objective: 'Some customers ask for sugar. If their ticket doesn’t say so, their drink arrives unsweetened.',
    hint: 'Sweet requests need a sugar note.',
    lessonNote:
      'IF sugar IN CUSTOMER SPEECH detects a positive modifier. Use WRITE 1 sugar on the held paper. New paper starts without sugar.',
  },
  {
    level: 7,
    title: 'No Sugar, No Cry',
    story: 'A guest asks for coffee without sugar. Query hears “sugar” loud and clear… and also that sneaky “without”.',
    objective:
      'Some customers say “without sugar”. They mention sugar but don’t want any, and their tickets must reflect that.',
    hint: 'Watch out for “without”.',
    lessonNote:
      'Without sugar still contains sugar, plus negation. Inside IF sugar IN CUSTOMER SPEECH, test IF negation IN CUSTOMER SPEECH and write WRITE 0 sugar or WRITE 1 sugar.',
  },
  {
    level: 8,
    title: 'Latte Lingo',
    story:
      '“A tea, please.” “Tea for me!” “I’ll take a tea.” The regulars all ask their own way, but they all mean the same thing.',
    objective:
      'Regulars phrase the same orders in different ways. Each ticket must still match what the customer meant.',
    hint: 'Different words, same order.',
    lessonNote:
      'Different wording exposes the same recognized concepts. Reuse the same token tests; no new commands are needed.',
    interlude: {
      title: 'The regulars',
      text: "QUERY: 'One tea' and 'tea please' have different lengths.\nNIKO: But the same recognized tokens. Test the concepts you hear.\n\nQuery opens a fresh page in the service manual.",
    },
  },
  {
    level: 9,
    title: 'For Each Their Own',
    story:
      'Two friends arrive together and order at once. The kitchen needs one ticket per drink. Sharing is caring, just not on paper.',
    objective: 'Some customers order several drinks at once. The kitchen needs a separate ticket for every drink.',
    hint: 'One sheet per drink.',
    lessonNote:
      'FOR item IN heard orders selects each order group. Take a fresh sheet, interpret that item, deposit it, and return to the register inside every iteration.',
  },
  {
    level: 10,
    title: 'One Lump or Two?',
    story:
      'One sugar? Two? None at all, thank you very much? Our guests are getting specific, and “some sugar” won’t cut it anymore.',
    objective:
      'Customers now ask for an exact number of sugars, including zero. A simple yes or no is no longer enough.',
    hint: 'Count the sugars exactly.',
    lessonNote:
      'IF number IN item detects numeric metadata. STORE var1 FROM number, then WRITE var1 sugar writes the exact amount, including zero. Keep modifier logic for orders without numbers.',
    interlude: {
      title: 'Two is not yes',
      text: "CUSTOMER: Two sugars, please.\nQUERY: Sugar: yes.\nNIKO: You're not wrong. You're just not precise enough.\n\nA number variable should help.",
    },
  },
  {
    level: 11,
    title: 'The Usual Suspect',
    story: 'A guest asks for “the usual”. Query has never met them before. Better to ask Niko than to guess.',
    objective:
      'Some customers order “the usual”, which Query can’t interpret. Guessing would send the wrong drink to the kitchen.',
    hint: 'When unsure, ask Niko.',
    lessonNote:
      'An unclear request contains the ambiguous token. Before taking paper or starting FOR, use IF ambiguous IN CUSTOMER SPEECH and HELP. Niko replaces the heard orders with a clarification.',
  },
  {
    level: 12,
    title: 'Mix and Matcha',
    story: 'Friends share an order, but every drink comes with its own sugar opinion. Each cup gets its own paper.',
    objective:
      'Groups order several drinks, each with its own sugar preference: some sweet, some without, some with an exact count. Every drink needs a correct ticket.',
    hint: 'Mix every trick you know.',
    lessonNote:
      'Combine separate order groups, positive sugar, negation, numbers, and filler words. Each group needs its own physical paper.',
  },
  {
    level: 13,
    title: 'The Lunch Crunch',
    story: 'Word about the café has spread. The lunchtime queue stretches out the door, and nobody wants to wait.',
    objective: 'The queue is longer and customers order more drinks at once. Every ticket must still be correct.',
    hint: 'Same moves, longer queue.',
    lessonNote:
      'The queue is denser and requests contain more orders. Keep every ticket correct and return to listen; there is no new syntax.',
  },
  {
    level: 14,
    title: 'Employee of the Month',
    story: 'Niko has a shiny new badge ready for Query. One last shift will prove the counter is in good hands.',
    objective:
      'The final counter shift mixes every kind of order so far: both drinks, sugar requests, group orders, and unclear requests. All of them must reach the kitchen correctly.',
    hint: 'One last shift for the badge.',
    lessonNote:
      'Certification covers all recognized concepts, clarification, numbers, and multiple orders. Take, write, move, deposit, and return for every sheet.',
    interlude: {
      title: 'The counter is yours',
      text: "Niko pins a new badge beside the till.\n\nNIKO: One last service. Every order we've learned, all together.\nQUERY: I have retained my instructions.\n\nBehind them, the espresso machine is already busy.",
    },
  },
  {
    level: 15,
    title: 'A Brew-tiful Friendship',
    story:
      'Brew rolls into the kitchen, eager and a little squeaky. Query passes over the tickets, and Pip keeps the drinks moving.',
    objective: 'Brew’s recipe is almost complete, but the finished drink never reaches pickup, so nobody can serve it.',
    hint: 'Finish the recipe at pickup.',
    lessonNote:
      'Brew claims tickets from Query at the shared order counter. Read the supplied recipe and complete the missing drink deposit at pickup. Niko still serves the room.',
    interlude: {
      title: 'A place at the workbench',
      text: 'Niko sets Brew beside the kitchen counter.\nQuery knows the orders. Now teach Brew the recipes, one tile and one ingredient at a time.\nPip will keep serving until you program Porter for the floor.',
    },
  },
  {
    level: 16,
    title: 'Tile Be Right There',
    story:
      'Brew knows the recipe, but ingredients don’t walk over on their own. First it has to learn its way around, one tile at a time.',
    objective: 'Brew’s route doesn’t line up with the kitchen stations, so it tries to use them from the wrong place.',
    hint: 'Count the tiles to each station.',
    lessonNote:
      'MOVE uses screen directions and whole tile counts. A blocked move stops early and the next instruction runs. Fix the route to the ingredients.',
  },
  {
    level: 17,
    title: 'Bean There, Done That',
    story: 'The first coffee order is in. The big espresso machine hums, ready to turn humble beans into a fresh cup.',
    objective:
      'A coffee order has arrived and Brew has never made one. The drink has to be made at the coffee machine before it can go to pickup.',
    hint: 'Beans, grind, water, brew.',
    lessonNote: 'Coffee needs beans, grinding, water, then brewing. Every action happens beside its labeled station.',
  },
  {
    level: 18,
    title: 'Steep Thoughts',
    story: 'A tea order reaches the kitchen. Brew must pick a different recipe without forgetting how to make coffee.',
    objective:
      'Tickets now ask for coffee or tea, and the two drinks use different ingredients. Brew must make whichever drink each ticket asks for.',
    hint: 'Read the ticket: coffee or tea?',
    lessonNote: 'Tea uses leaves, water, and steeping. Branch on the current ticket to choose the recipe.',
  },
  {
    level: 19,
    title: 'A Spoonful of Sugar',
    story: 'The right drink is only half the order. Brew must remember the little extras that make it just right.',
    objective:
      'Tickets can request sugar, but Brew sends every drink out unsweetened. Each drink must match the sugar amount on its ticket.',
    hint: 'Stop by the sugar before pickup.',
    lessonNote: 'After brewing, visit sugar and apply the ticket’s requested amount, including zero.',
  },
  {
    level: 20,
    title: 'Call Me Maybe',
    story: 'Brew has made the same recipes all morning. Let’s give those familiar steps a name, and just call them.',
    objective: 'Brew’s program repeats the same recipe steps for every ticket, which makes it long and hard to change.',
    hint: 'Name the recipe, then call it.',
    lessonNote: 'Move a repeated recipe into FUNCTION recipe. CALL recipe handles the oldest unfinished ticket.',
  },
  {
    level: 21,
    title: 'Double Trouble',
    story: 'Brew’s hands now fit two cups. A little planning saves a lot of back-and-forth across the kitchen.',
    objective:
      'Brew can now carry two cups, but still makes one drink per trip. Drinks must leave in order and match their tickets.',
    hint: 'Two cups, one trip.',
    lessonNote:
      'Brew now holds two cups. Claim two tickets before preparing them. Finished drinks leave in pickup order.',
  },
  {
    level: 22,
    title: 'Kitchen Confidential',
    story:
      'Moka hangs up the apron and hands the kitchen to Brew. Query and Brew now run the counter and the kitchen together.',
    objective:
      'Moka is gone and Brew runs the kitchen alone. A full service of mixed coffee, tea, and sugar requests must reach pickup.',
    hint: 'Keep the kitchen moving.',
    lessonNote:
      'Keep Query and Brew working through mixed tickets and sugar requests. Niko owns delivery until Porter arrives.',
  },
  {
    level: 23,
    title: 'Special Delivery',
    story: 'Meet Porter, our brand-new floor robot. Niko points at a finished drink and the guest waiting for it.',
    objective:
      'Finished drinks are waiting at pickup, and each ticket names the table that ordered it. Porter has never delivered one.',
    hint: 'The ticket names the table.',
    lessonNote:
      'Porter owns floor work now. WAIT DRINK claims a delivery; TAKE down collects it from the outside of the kitchen counter.',
    interlude: {
      title: 'A tray and a little courage',
      text: 'Porter rolls up to the pickup counter.\nBrew has the kitchen. Query has the orders. The room is yours to program.\nEvery delivery begins with one tile.',
    },
  },
  {
    level: 24,
    title: 'Latte, Where Art Thou?',
    story: 'More tables are filling up. Porter has to follow the ticket, not just charm the nearest guest.',
    objective:
      'Guests sit at several tables and furniture blocks the direct path. Each drink must reach the table on its ticket.',
    hint: 'Mind the furniture.',
    lessonNote:
      'Read the assigned TABLE, count the route, and SERVE beside that table. Furniture blocks movement; customers do not.',
  },
  {
    level: 25,
    title: 'There and Back Again',
    story: 'The first delivery went beautifully. But the next cup is already waiting back at the counter.',
    objective: 'After serving one drink, Porter stays at the table while more drinks wait at pickup.',
    hint: 'Head back after every serve.',
    lessonNote:
      'Return to pickup before the next delivery. The same floor plan and tile coordinates remain across every shift.',
  },
  {
    level: 26,
    title: 'Cups and Robbers',
    story:
      'Happy guests leave their empty cups behind. A clean table is the next guest’s first impression, so round them up.',
    objective: 'Guests leave empty cups on their tables. They need to go back to the sink before new guests arrive.',
    hint: 'Empty cups go to the sink.',
    lessonNote: 'WAIT DIRTY selects a used cup. COLLECT at its table, then RETURN CUPS at the return station.',
  },
  {
    level: 27,
    title: 'Keep Calm and Carry On',
    story: 'Porter has been busy all morning. A steady routine keeps the room moving and the drinks warm.',
    objective: 'Drinks keep arriving at pickup all service. Porter has to keep delivering until every one is served.',
    hint: 'Serve, return, repeat.',
    lessonNote: 'Keep Porter moving between pickup and the tables. Finish each delivery and return for the next drink.',
  },
  {
    level: 28,
    title: 'Highway to the Sink',
    story: 'The route is getting longer, and the used cups need a clear road back to the kitchen.',
    objective:
      'Deliveries and used cups compete for Porter’s time. Tables must be cleared before the next round of guests.',
    hint: 'Clear cups before the next round.',
    lessonNote: 'Plan the complete delivery and clearing route. Return used cups before starting the next round.',
  },
  {
    level: 29,
    title: 'Tea for Two',
    story: 'Porter’s new tray carries two items. Two guests, one trip, zero spills. Hopefully.',
    objective:
      'Porter’s tray now holds two items, and one-at-a-time trips are too slow for this service. Anything beyond two won’t fit.',
    hint: 'Fill the tray before you go.',
    lessonNote:
      'Porter now holds two items. Take two drinks before serving, then clear both tables. FIFO keeps the tray predictable.',
  },
  {
    level: 30,
    title: 'Floor Routine',
    story: 'Niko looks around: drinks are arriving and tables are being cleared. The floor is almost running itself.',
    objective:
      'Deliveries, cup clearing, and two-item trays all happen in the same service. No drink or cup can be left behind.',
    hint: 'Deliver, clear, and batch.',
    lessonNote: 'Combine routes, clearing, and batching. Each robot works in its own area.',
  },
  {
    level: 31,
    title: 'The Three Mugsketeers',
    story:
      'Three robots, one café. Every ticket must become a drink, and every drink must find its guest. All for one!',
    objective:
      'All three robots run their programs at once. An order is only complete when the ticket is right, the drink is made, and it reaches the right table.',
    hint: 'All three robots, one service.',
    lessonNote:
      'All three programs run together. Repair order interpretation, recipes, and floor service across mixed requests.',
    interlude: {
      title: 'Three routines, one café',
      text: 'The three robots are ready. Niko hangs up the service apron.\nOrders, recipes, and deliveries now depend on your programs working together.',
    },
  },
  {
    level: 32,
    title: 'Espresso Yourself',
    story: 'The busiest day yet. Niko sits down with a coffee and trusts the whole team with the room.',
    objective:
      'The final service combines everything: group orders, coffee and tea, sugar, unclear requests, deliveries, and clearing. Every guest must be served and every table cleared.',
    hint: 'Everything, all at once.',
    lessonNote: 'The final service combines groups, clarification, both recipes, sugar, two-item trays, and clearing.',
  },
];

/** Narrative row for a zero-based shift index. */
export function narrativeFor(index: number): ShiftNarrative {
  const found = campaignNarrative[index];
  if (!found) throw new Error(`Unknown shift index: ${index}`);
  return found;
}

/** Interludes keyed by zero-based shift index (story beats shown between shifts). */
export const stories: Record<number, { title: string; text: string }> = Object.fromEntries(
  campaignNarrative
    .filter((n): n is ShiftNarrative & { interlude: { title: string; text: string } } => n.interlude !== undefined)
    .map((n) => [n.level - 1, n.interlude]),
);
