# Orders and tickets

## Player-facing speech

Act I uses coffee, tea, and sugar. Every customer in `src/data/campaign.json` has an authored `heard_orders` array, separate from the expected ticket data. The later acts provide the same representation in `src/data/extension.ts`. There is no natural-language parser at runtime.

```ts
interface HeardOrder {
  tokens: string[];
  number?: number;
}
```

| Phrase | Heard orders |
| --- | --- |
| coffee | `[{tokens: ["coffee"]}]` |
| tea please | `[{tokens: ["tea"]}]` |
| coffee with sugar | `[{tokens: ["coffee", "sugar"]}]` |
| coffee without sugar | `[{tokens: ["coffee", "sugar", "negation"]}]` |
| tea with 2 sugars | `[{tokens: ["tea", "sugar", "number"], number: 2}]` |
| coffee and tea | `[{tokens: ["coffee"]}, {tokens: ["tea"]}]` |
| two coffees | `[{tokens: ["coffee"]}, {tokens: ["coffee"]}]` |
| the usual | `[{tokens: ["ambiguous"]}]` |

Negation applies only to modifiers in Act I. “Without sugar”, “no sugar”, and “but no sugar please” all include both `sugar` and `negation`. Drink corrections such as “not tea, coffee” and difficult modifier scoping are reserved for advanced challenges.

Query conditions inspect membership in the currently selected group: `IF sugar IN item`, `IF negation IN item`, and so on. Number tokens signal metadata that must be explicitly read with `STORE var1 FROM number` before `WRITE var1 sugar` writes it to a ticket. Query cannot read `drink`, `with_sugar`, `sugar_count`, or expected ticket fields from speech.

## Progression

Query's part of the campaign, by shift (see [docs/campaign/](../campaign/README.md)):

- Shift 1: observation.
- Shift 2: one coffee and the physical paper workflow.
- Shift 3: continuous service using Position/Jump.
- Shift 4: coffee/tea membership; conditions use `CUSTOMER SPEECH`.
- Shift 5: sugar tokens, and negation for “without sugar”.
- Shift 6: multiple groups and `FOR item IN heard orders`.
- Shift 7: numeric sugar, including zero.
- Shift 8: ambiguous speech and HELP.
- Shifts 9–16: Query keeps the counter while Brew and Porter are programmed.
- Shifts 17–21: drinks to go, customers in a rush and closing time add the `togo`, `rush` and `closed` tokens.
- The Together special, after the campaign: a table that orders for itself adds the `together` token, written on each of its tickets.

## Ticket data and validation

Each sheet has a unique `ticket_id`, a `customer_id`, a table assignment, source phrase, lifecycle timestamps, status, and player-written item/modifier fields. `source_intent` remains a legacy metadata field; Query-generated tickets leave it empty. New paper starts with `with_sugar: false` and no numeric count. Writing numeric sugar also sets the corresponding boolean; an explicit boolean write clears any numeric count.

Expected output remains a separate object with `item`, optional `with_sugar` or `sugar_count`, and optional `tickets` for grouped orders. From the sugar lesson onward, plain orders also validate that no sugar was added. Validation checks actual tickets in order, requested cup counts across paper quantities, and completion of the return to the register. The speech bubble displays recognized groups rather than the expected answer.

Query takes paper from the stack beside the register, writes only while holding it, moves within reach of the handoff, deposits the paper, and returns to the register. Taking another sheet while holding one fails. Ending a loop iteration with an undeposited sheet also fails.

## Ambiguity

`IF ambiguous IN item` followed by `HELP` asks Niko for clarification before taking paper or entering the order loop. Campaign data supplies `clarification` and `clarification_heard_orders`; HELP replaces the entire heard collection and the implicit current item. The bubble reveals the clarification only after HELP completes. An unresolved request produces no tickets and allows the program to resume at the next customer. Taking paper for ambiguous speech fails.


## Current editor and quantity behavior

Early conditions use `CUSTOMER SPEECH`, which tests the recognized tokens across the heard groups. The `item` source becomes available only inside a `FOR item IN heard orders` body. Compilation enforces that scope, and saved implicit-item conditions outside loops migrate to customer speech.

Write displays an editable quantity before the drink, for example `Write 2 Coffee` (`ITEM 2 coffee` in text). Quantities range from 1 to 19. One paper can request several identical drinks with the same modifiers; the kitchen creates individual cup jobs while retaining the original paper and its quantity. Payment and validation count every cup. The original `ITEM coffee` syntax means one coffee.

Customer bubbles retain the original phrase and grouped 3D drink/sugar icons throughout the visit. Sugar uses three cubes. Clarification appears only after HELP. The handoff counter displays its pending order list, updating quantities as the cook claims cups. Service starts at the beginning of the full six-second street approach, before any order instructions execute.
