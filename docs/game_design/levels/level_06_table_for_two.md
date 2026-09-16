# Level 6: Sugar

IF sugar IN item detects a positive modifier. Use SUGAR true on the held paper. New paper starts without sugar.

## Heard orders

- “coffee” → `[{"tokens": ["coffee"]}]`
- “coffee with sugar” → `[{"tokens": ["coffee", "sugar"]}]`
- “tea” → `[{"tokens": ["tea"]}]`
- “tea with sugar” → `[{"tokens": ["tea", "sugar"]}]`

## Reference program

```text
POSITION listen
LISTEN
TAKE UP
IF tea IN item
  ITEM tea
ELSE
  ITEM coffee
END
IF sugar IN item
  SUGAR true
END
MOVE RIGHT 1
DEPOSIT RIGHT
MOVE LEFT 1
JUMP listen
```

## Validation

Every seed must produce the expected tickets in order. Query can write only on held paper, takes one sheet from the register stack per order, moves to the handoff to deposit it, and returns to the register before listening again.
