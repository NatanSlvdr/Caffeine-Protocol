# Level 11: Ambiguity

An unclear request contains the ambiguous token. Before taking paper or starting FOR, use IF ambiguous IN item and HELP. Niko replaces the heard orders with a clarification.

## Heard orders

- “the usual” → `[{"tokens": ["ambiguous"]}]`
- “something warm” → `[{"tokens": ["ambiguous"]}]`
- “regular” → `[{"tokens": ["ambiguous"]}]`
- “coffee” → `[{"tokens": ["coffee"]}]`
- “coffee with 1 sugar” → `[{"tokens": ["coffee", "sugar", "number"], "number": 1}]`

## Reference program

```text
POSITION listen
LISTEN
IF ambiguous IN item
  HELP
END
FOR item IN heard orders
  TAKE UP
  IF tea IN item
    ITEM tea
  ELSE
    ITEM coffee
  END
  IF number IN item
    READ number
    SUGAR number
  ELSE
    IF sugar IN item
      IF negation IN item
        SUGAR false
      ELSE
        SUGAR true
      END
    END
  END
  MOVE RIGHT 1
  DEPOSIT RIGHT
  MOVE LEFT 1
END
JUMP listen
```

## Validation

Every seed must produce the expected tickets in order. Query can write only on held paper, takes one sheet from the register stack per order, moves to the handoff to deposit it, and returns to the register before listening again.
