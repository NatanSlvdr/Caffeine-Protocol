# Orders And Tickets

## Act I Menu

Act I uses drinks only:

- Coffee.
- Tea.

Modifiers:

- Sugar as binary `with_sugar` in Level 7.
- Sugar as numeric `sugar_count` starting in Level 10.

Food is not part of Act I.

## Customer Speech And Intent Chips

Customer requests appear as text bubbles for flavor, story, and debugging. Query
does not ask the player to parse raw text. Instead, each customer speech event
produces a small set of intent chips that the player's program can inspect.

Intent chips are Query's imperfect hearing/understanding layer. They preserve
the fantasy that Query is interpreting customers while keeping the puzzle about
robot decision logic, not fragile string parsing.

Example:

```text
Customer says: "one coffee with sugar, please"

Query hears:
- drink: coffee
- sugar: with sugar
- count: one item
- confidence: clear
```

Player programs should read these chips through blocks such as:

- `Heard drink is coffee`
- `Heard drink is tea`
- `Heard sugar is requested`
- `Heard sugar count`
- `Speech confidence is ambiguous`
- `Use clarification`

The original text still appears in speech bubbles and failure reports so the
player understands why the chips were produced.

Act I language ramp:

- Levels 1-3: customers only produce a clear `drink: coffee` chip.
- Level 4: clear `drink: coffee` and `drink: tea` chips.
- Level 6: multiple order chips can appear in one speech event.
- Level 7: binary sugar chips appear.
- Level 8: phrase variants produce the same intent chips, teaching shared ticket
  logic instead of text normalization.
- Level 9: ambiguous confidence appears.
- Level 10: numeric sugar count chips appear.
- Levels 12-14: larger batches combine clear, ambiguous, binary sugar, and
  numeric sugar chips.

Phrase text and intent chips are level data and must be deterministic per
validation seed.

## Intent Chip Examples

Clear drink only:

- source phrase: `coffee`
- chips: `drink: coffee`, `confidence: clear`

Multiple orders:

- source phrase: `coffee and tea`
- chips: `orders: [{drink: coffee}, {drink: tea}]`, `confidence: clear`

Binary sugar:

- source phrase: `tea without sugar`
- chips: `drink: tea`, `with_sugar: false`, `confidence: clear`

Phrase variants:

- source phrase: `one coffee`
- chips: `drink: coffee`, `with_sugar: false`, `confidence: clear`
- source phrase: `coffee please`
- chips: `drink: coffee`, `with_sugar: false`, `confidence: clear`

Ambiguous speech:

- source phrase: `regular`
- chips: `confidence: ambiguous`
- clarification chips: `drink: coffee`, `with_sugar: false`, `confidence:
  clear`

Numeric sugar:

- source phrase: `coffee with 2 sugar`
- chips: `drink: coffee`, `sugar_count: 2`, `confidence: clear`

## Ticket Data

Every order ticket should have concrete fields:

- `ticket_id`: unique id.
- `customer_id`: source customer.
- `table_id`: assigned after the customer sits; nullable before seating.
- `source_phrase`: exact text Query heard.
- `source_intent`: debug copy of the intent chips Query used.
- `item`: `coffee` or `tea`.
- `with_sugar`: boolean for binary sugar levels; nullable when unused.
- `sugar_count`: integer for numeric sugar levels; nullable when unused.
- `status`: `created`, `preparing`, `ready`, `served`, `failed`.
- `created_at`: simulation time.
- `due_at`: target service time for satisfaction calculations.
- `debug_notes`: optional runtime notes for the debug toggle.

Simple ticket view shows item, modifier, status, and customer/table label.
Debug ticket view shows all fields.

## Ambiguity Rules

Ambiguous speech must not be guessed as concrete orders. Query must use the
level's help/error behavior when the `confidence: ambiguous` chip is present.

Act I ambiguity behavior:

- Query reports the ambiguous speech.
- Query asks Niko for help through the provided block/action.
- The validation seed provides deterministic clarification chips when the level
  allows help to resolve the order.
- Treating ambiguous speech as coffee or tea without asking for help fails the
  run.

## Godot Implementation Notes

Recommended data:

- `OrderTicket.gd`: ticket fields and validation helpers.
- `SpeechIntent.gd`: source phrase, intent chips, confidence, optional
  clarification chips.
- `MenuItemDefinition.gd`: item id, display name, icon id, prep duration.

Validation should compare structured ticket fields, not rendered ticket text.
