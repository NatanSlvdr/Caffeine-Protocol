# Level 7: Negation

Without sugar still contains sugar, plus negation. Inside IF sugar IN CUSTOMER SPEECH, test IF negation IN CUSTOMER SPEECH and write SUGAR false or SUGAR true.

## Heard orders

- “coffee with sugar” → `[{"tokens": ["coffee", "sugar"]}]`
- “coffee without sugar” → `[{"tokens": ["coffee", "sugar", "negation"]}]`
- “tea with sugar” → `[{"tokens": ["tea", "sugar"]}]`
- “tea without sugar” → `[{"tokens": ["tea", "sugar", "negation"]}]`
- “coffee no sugar” → `[{"tokens": ["coffee", "sugar", "negation"]}]`
- “coffee, but no sugar please” → `[{"tokens": ["coffee", "sugar", "negation"]}]`

## Reference program

```text
POSITION listen
LISTEN
TAKE UP
IF tea IN CUSTOMER SPEECH
  ITEM tea
ELSE
  ITEM coffee
END
IF sugar IN CUSTOMER SPEECH
  IF negation IN CUSTOMER SPEECH
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

Every seed must produce the expected tickets in order. Query can write only on held paper, takes sheets from the register stack for its orders, moves to the handoff to deposit it, and returns to the register before listening again.
