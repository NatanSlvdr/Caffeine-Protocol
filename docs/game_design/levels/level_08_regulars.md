# Level 8: Natural Wording

Different wording exposes the same recognized concepts. Reuse the same token tests; no new commands are needed.

## Heard orders

- “a coffee please” → `[{"tokens": ["coffee"]}]`
- “can I get a tea” → `[{"tokens": ["tea"]}]`
- “coffee with sugar please” → `[{"tokens": ["coffee", "sugar"]}]`
- “tea without sugar thanks” → `[{"tokens": ["tea", "sugar", "negation"]}]`

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
  IF negation IN item
    SUGAR false
  ELSE
    SUGAR true
  END
END
MOVE RIGHT 1
DEPOSIT RIGHT
MOVE LEFT 1
JUMP listen
```

## Validation

Every seed must produce the expected tickets in order. Query can write only on held paper, takes one sheet from the register stack per order, moves to the handoff to deposit it, and returns to the register before listening again.
