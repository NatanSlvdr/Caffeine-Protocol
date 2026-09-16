# Level 13: Lunch Rush

The queue is denser and requests contain more orders. Keep every ticket correct and return to listen; there is no new syntax.

## Heard orders

- “coffee with sugar and tea” → `[{"tokens": ["coffee", "sugar"]}, {"tokens": ["tea"]}]`
- “coffee and tea without sugar” → `[{"tokens": ["coffee"]}, {"tokens": ["tea", "sugar", "negation"]}]`
- “two coffees” → `[{"tokens": ["coffee"]}, {"tokens": ["coffee"]}]`
- “tea with 2 sugars” → `[{"tokens": ["tea", "sugar", "number"], "number": 2}]`
- “a coffee please” → `[{"tokens": ["coffee"]}]`
- “can I get a tea” → `[{"tokens": ["tea"]}]`
- “coffee with sugar please” → `[{"tokens": ["coffee", "sugar"]}]`
- “tea without sugar thanks” → `[{"tokens": ["tea", "sugar", "negation"]}]`
- “coffee with 0 sugar” → `[{"tokens": ["coffee", "sugar", "number"], "number": 0}]`
- “the usual” → `[{"tokens": ["ambiguous"]}]`
- “something warm” → `[{"tokens": ["ambiguous"]}]`
- “regular” → `[{"tokens": ["ambiguous"]}]`
- “coffee and tea” → `[{"tokens": ["coffee"]}, {"tokens": ["tea"]}]`

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
