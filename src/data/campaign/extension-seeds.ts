/** Extension shift seeds keyed by shift id. Adding L33 means one entry here plus a narrative row. */
export interface LevelSeed {
  id: string;
  title: string;
  note: string;
  omission: string;
  blocks: number;
  instructions: number;
}
export const extensionSeeds: LevelSeed[] = [
  { id: 'L15', title: "A second pair of hands", note: "Brew claims tickets from Query at the shared order counter. Read the supplied recipe and complete the missing drink deposit at pickup. Niko still serves the room.", omission: "DEPOSIT", blocks: 55, instructions: 241 },
  { id: 'L16', title: "Count the tiles", note: "MOVE uses screen directions and whole tile counts. A blocked move stops early and the next instruction runs. Fix the route to the ingredients.", omission: "MOVE UP", blocks: 55, instructions: 241 },
  { id: 'L17', title: "From bean to cup", note: "Coffee needs beans, grinding, water, then brewing. Every action happens beside its labeled station.", omission: "GRIND", blocks: 55, instructions: 241 },
  { id: 'L18', title: "Time for tea", note: "Tea uses leaves, water, and steeping. Branch on the current ticket to choose the recipe.", omission: "STEEP", blocks: 55, instructions: 235 },
  { id: 'L19', title: "A spoonful of precision", note: "After brewing, visit sugar and apply the ticket’s requested amount, including zero.", omission: "ADD SUGAR", blocks: 55, instructions: 235 },
  { id: 'L20', title: "A recipe worth keeping", note: "Move a repeated recipe into FUNCTION recipe. CALL recipe handles the oldest unfinished ticket.", omission: "CALL recipe", blocks: 59, instructions: 248 },
  { id: 'L21', title: "Two cups in hand", note: "Brew now holds two cups. Claim two tickets before preparing them. Finished drinks leave in pickup order.", omission: "WAIT TICKET", blocks: 61, instructions: 486 },
  { id: 'L22', title: "The kitchen is yours", note: "Keep Query and Brew working through mixed tickets and sugar requests. Niko owns delivery until Porter arrives.", omission: "DEPOSIT", blocks: 61, instructions: 486 },
  { id: 'L23', title: "Meet Porter", note: "Porter owns floor work now. WAIT DRINK claims a delivery; TAKE down collects it from the outside of the kitchen counter.", omission: "TAKE", blocks: 95, instructions: 868 },
  { id: 'L24', title: "A path to the table", note: "Read the assigned TABLE, count the route, and SERVE beside that table. Furniture blocks movement; customers do not.", omission: "SERVE", blocks: 117, instructions: 895 },
  { id: 'L25', title: "There and back", note: "Return to pickup before the next delivery. The same floor plan and tile coordinates remain across every shift.", omission: "MOVE UP", blocks: 117, instructions: 895 },
  { id: 'L26', title: "A clean table", note: "WAIT DIRTY selects a used cup. COLLECT at its table, then RETURN CUPS at the return station.", omission: "COLLECT", blocks: 117, instructions: 895 },
  { id: 'L27', title: "Keep the room moving", note: "Keep Porter moving between pickup and the tables. Finish each delivery and return for the next drink.", omission: "SERVE", blocks: 119, instructions: 940 },
  { id: 'L28', title: "A clear route", note: "Plan the complete delivery and clearing route. Return used cups before starting the next round.", omission: "RETURN CUPS", blocks: 119, instructions: 940 },
  { id: 'L29', title: "A tray for two", note: "Porter now holds two items. Take two drinks before serving, then clear both tables. FIFO keeps the tray predictable.", omission: "TAKE", blocks: 177, instructions: 1940 },
  { id: 'L30', title: "The floor is yours", note: "Combine routes, clearing, and batching. Each robot works in its own area.", omission: "RETURN CUPS", blocks: 177, instructions: 1940 },
  { id: 'L31', title: "Three routines, one café", note: "All three programs run together. Repair order interpretation, recipes, and floor service across mixed requests.", omission: "ADD SUGAR", blocks: 402, instructions: 3779 },
  { id: 'L32', title: "The whole café is yours", note: "The final service combines groups, clarification, both recipes, sugar, two-item trays, and clearing.", omission: "SERVE", blocks: 402, instructions: 5007 },
];
