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
    objective: 'Watch an order travel from the register to a drink, then a clean table.',
    hint: 'Just watch one order go round.',
    lessonNote:
      'Niko: The café is ours now. Watch customers order, receive a drink and leave a clean table. Open the paper details to inspect the lifecycle.',
  },
  {
    level: 2,
    title: 'The Morning Grind',
    story:
      'The morning queue is growing faster than the foam. Moka brews, Pip delivers, and Niko juggles every order. Someone should really help.',
    objective: 'Watch the rush and discover which part of the job Query can take over.',
    hint: 'Spot the job Query could take.',
    lessonNote:
      'Niko: Eight orders, one pair of hands. The counter queue keeps growing while I brew. Query could help, once we repair the controller.',
  },
  {
    level: 3,
    title: 'Hello, World Roast',
    story: 'Query is awake and ready to say hello to the world. The very first guest would like a coffee. No pressure.',
    objective:
      'Listen, TAKE UP from the paper stack, and write coffee on the held paper. MOVE RIGHT 1, DEPOSIT RIGHT at the kitchen handoff, then MOVE LEFT 1 to the register. Checkout is automatic.',
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
      'Each request supplies one current item. Use IF tea IN CUSTOMER SPEECH to test its tokens, then write tea or coffee. No loop is needed yet.',
    hint: 'Listen for the word tea.',
    lessonNote:
      'Conditions inspect the recognized customer speech. Use IF tea IN CUSTOMER SPEECH to test its tokens, then write tea or coffee. No loop is needed yet.',
  },
  {
    level: 5,
    title: 'Groundhog Latte',
    story: 'One happy customer is a good start. But another guest is already at the door. And another. And another…',
    objective:
      'Put POSITION listen before LISTEN and JUMP listen after returning to the register. Keep serving every customer.',
    hint: 'Jump back and listen again.',
    lessonNote:
      'Put POSITION listen before LISTEN and JUMP listen after returning to the register. Keep serving every customer.',
  },
  {
    level: 6,
    title: 'Sugar, Sugar',
    story: 'With sugar, please! A little extra sweetness can turn a familiar drink into a small celebration.',
    objective:
      'IF sugar IN CUSTOMER SPEECH detects a positive modifier. Use WRITE 1 sugar on the held paper. New paper starts without sugar.',
    hint: 'Sweet requests need a sugar note.',
    lessonNote:
      'IF sugar IN CUSTOMER SPEECH detects a positive modifier. Use WRITE 1 sugar on the held paper. New paper starts without sugar.',
  },
  {
    level: 7,
    title: 'No Sugar, No Cry',
    story: 'A guest asks for coffee without sugar. Query hears “sugar” loud and clear… and also that sneaky “without”.',
    objective:
      'Without sugar still contains sugar, plus negation. Inside IF sugar IN CUSTOMER SPEECH, test IF negation IN CUSTOMER SPEECH and write WRITE 0 sugar or WRITE 1 sugar.',
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
      'Different wording exposes the same recognized concepts. Reuse the same token tests; no new commands are needed.',
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
    objective:
      'FOR item IN heard orders selects each order group. Take a fresh sheet, interpret that item, deposit it, and return to the register inside every iteration.',
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
      'IF number IN item detects numeric metadata. Store Number in Var A, then Write Var A Sugar to write the exact amount, including zero. Keep modifier logic for orders without numbers.',
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
      'An unclear request contains the ambiguous token. Before taking paper or starting FOR, use IF ambiguous IN CUSTOMER SPEECH and HELP. Niko replaces the heard orders with a clarification.',
    hint: 'When unsure, ask Niko.',
    lessonNote:
      'An unclear request contains the ambiguous token. Before taking paper or starting FOR, use IF ambiguous IN CUSTOMER SPEECH and HELP. Niko replaces the heard orders with a clarification.',
  },
  {
    level: 12,
    title: 'Mix and Matcha',
    story: 'Friends share an order, but every drink comes with its own sugar opinion. Each cup gets its own paper.',
    objective:
      'Combine separate order groups, positive sugar, negation, numbers, and filler words. Each group needs its own physical paper.',
    hint: 'Mix every trick you know.',
    lessonNote:
      'Combine separate order groups, positive sugar, negation, numbers, and filler words. Each group needs its own physical paper.',
  },
  {
    level: 13,
    title: 'The Lunch Crunch',
    story: 'Word about the café has spread. The lunchtime queue stretches out the door, and nobody wants to wait.',
    objective:
      'The queue is denser and requests contain more orders. Keep every ticket correct and return to listen; there is no new syntax.',
    hint: 'Same moves, longer queue.',
    lessonNote:
      'The queue is denser and requests contain more orders. Keep every ticket correct and return to listen; there is no new syntax.',
  },
  {
    level: 14,
    title: 'Employee of the Month',
    story: 'Niko has a shiny new badge ready for Query. One last shift will prove the counter is in good hands.',
    objective:
      'Certification covers all recognized concepts, clarification, numbers, and multiple orders. Take, write, move, deposit, and return for every sheet.',
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
    objective: 'Complete Brew’s routine so it claims a ticket, prepares the drink, and leaves it at pickup.',
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
    objective: 'Fix the route using whole-tile moves. Reach each workstation before using it.',
    hint: 'Count the tiles to each station.',
    lessonNote:
      'MOVE uses screen directions and whole tile counts. A blocked move stops early and the next instruction runs. Fix the route to the ingredients.',
  },
  {
    level: 17,
    title: 'Bean There, Done That',
    story: 'The first coffee order is in. The big espresso machine hums, ready to turn humble beans into a fresh cup.',
    objective: 'Collect beans, use the coffee machine to grind and brew with water, then deposit the finished coffee.',
    hint: 'Beans, grind, water, brew.',
    lessonNote: 'Coffee needs beans, grinding, water, then brewing. Every action happens beside its labeled station.',
  },
  {
    level: 18,
    title: 'Steep Thoughts',
    story: 'A tea order reaches the kitchen. Brew must pick a different recipe without forgetting how to make coffee.',
    objective: 'Branch on the ticket: brew coffee from beans or steep tea from leaves, then send the drink to pickup.',
    hint: 'Read the ticket: coffee or tea?',
    lessonNote: 'Tea uses leaves, water, and steeping. Branch on the current ticket to choose the recipe.',
  },
  {
    level: 19,
    title: 'A Spoonful of Sugar',
    story: 'The right drink is only half the order. Brew must remember the little extras that make it just right.',
    objective: 'Visit the sugar station and add the amount requested on the ticket before depositing the drink.',
    hint: 'Stop by the sugar before pickup.',
    lessonNote: 'After brewing, visit sugar and apply the ticket’s requested amount, including zero.',
  },
  {
    level: 20,
    title: 'Call Me Maybe',
    story: 'Brew has made the same recipes all morning. Let’s give those familiar steps a name, and just call them.',
    objective: 'Put the recipe in a function and call it for each claimed ticket.',
    hint: 'Name the recipe, then call it.',
    lessonNote: 'Move a repeated recipe into FUNCTION recipe. CALL recipe handles the oldest unfinished ticket.',
  },
  {
    level: 21,
    title: 'Double Trouble',
    story: 'Brew’s hands now fit two cups. A little planning saves a lot of back-and-forth across the kitchen.',
    objective: 'Claim and prepare two drinks together, then deposit both without mixing up their orders.',
    hint: 'Two cups, one trip.',
    lessonNote:
      'Brew now holds two cups. Claim two tickets before preparing them. Finished drinks leave in pickup order.',
  },
  {
    level: 22,
    title: 'Kitchen Confidential',
    story:
      'Moka hangs up the apron and hands the kitchen to Brew. Query and Brew now run the counter and the kitchen together.',
    objective: 'Keep tickets and drinks moving through a full mixed service, including sugar requests.',
    hint: 'Keep the kitchen moving.',
    lessonNote:
      'Keep Query and Brew working through mixed tickets and sugar requests. Niko owns delivery until Porter arrives.',
  },
  {
    level: 23,
    title: 'Special Delivery',
    story: 'Meet Porter, our brand-new floor robot. Niko points at a finished drink and the guest waiting for it.',
    objective: 'Wait for a ready drink, pick it up, and serve it at the table named on its ticket.',
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
    objective: 'Check the assigned table and route each drink to the correct guest without crossing furniture.',
    hint: 'Mind the furniture.',
    lessonNote:
      'Read the assigned TABLE, count the route, and SERVE beside that table. Furniture blocks movement; customers do not.',
  },
  {
    level: 25,
    title: 'There and Back Again',
    story: 'The first delivery went beautifully. But the next cup is already waiting back at the counter.',
    objective: 'Return to pickup after serving so Porter can keep delivering the next drinks.',
    hint: 'Head back after every serve.',
    lessonNote:
      'Return to pickup before the next delivery. The same floor plan and tile coordinates remain across every shift.',
  },
  {
    level: 26,
    title: 'Cups and Robbers',
    story:
      'Happy guests leave their empty cups behind. A clean table is the next guest’s first impression, so round them up.',
    objective: 'Claim a dirty cup, collect it from its table, and bring it back to the sink.',
    hint: 'Empty cups go to the sink.',
    lessonNote: 'WAIT DIRTY selects a used cup. COLLECT at its table, then RETURN CUPS at the return station.',
  },
  {
    level: 27,
    title: 'Keep Calm and Carry On',
    story: 'Porter has been busy all morning. A steady routine keeps the room moving and the drinks warm.',
    objective: 'Finish each delivery and return to pickup for the next drink.',
    hint: 'Serve, return, repeat.',
    lessonNote: 'Keep Porter moving between pickup and the tables. Finish each delivery and return for the next drink.',
  },
  {
    level: 28,
    title: 'Highway to the Sink',
    story: 'The route is getting longer, and the used cups need a clear road back to the kitchen.',
    objective: 'Complete deliveries and bring used cups back before the next round.',
    hint: 'Clear cups before the next round.',
    lessonNote: 'Plan the complete delivery and clearing route. Return used cups before starting the next round.',
  },
  {
    level: 29,
    title: 'Tea for Two',
    story: 'Porter’s new tray carries two items. Two guests, one trip, zero spills. Hopefully.',
    objective: 'Plan paired deliveries and cup returns while respecting the tray’s carrying limit.',
    hint: 'Fill the tray before you go.',
    lessonNote:
      'Porter now holds two items. Take two drinks before serving, then clear both tables. FIFO keeps the tray predictable.',
  },
  {
    level: 30,
    title: 'Floor Routine',
    story: 'Niko looks around: drinks are arriving and tables are being cleared. The floor is almost running itself.',
    objective: 'Combine accurate deliveries, clearing, and batching in one reliable routine.',
    hint: 'Deliver, clear, and batch.',
    lessonNote: 'Combine routes, clearing, and batching. Each robot works in its own area.',
  },
  {
    level: 31,
    title: 'The Three Mugsketeers',
    story:
      'Three robots, one café. Every ticket must become a drink, and every drink must find its guest. All for one!',
    objective: 'Coordinate Query, Brew, and Porter through a complete service with no missed orders or cups.',
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
      'Complete the final service: grouped orders, both drinks, sugar, clarification, deliveries, and clearing.',
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
