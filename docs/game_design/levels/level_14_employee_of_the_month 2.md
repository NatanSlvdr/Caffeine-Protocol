# Level 14: Query Certification

Certification covers all recognized concepts, clarification, numbers, and multiple orders. Take, write, move, deposit, and return for every sheet.

## Heard orders

- “coffee” → `[{"tokens": ["coffee"]}]`
- “tea” → `[{"tokens": ["tea"]}]`
- “a coffee please” → `[{"tokens": ["coffee"]}]`
- “can I get a tea” → `[{"tokens": ["tea"]}]`
- “coffee with sugar please” → `[{"tokens": ["coffee", "sugar"]}]`
- “tea without sugar thanks” → `[{"tokens": ["tea", "sugar", "negation"]}]`
- “coffee with 0 sugar” → `[{"tokens": ["coffee", "sugar", "number"], "number": 0}]`
- “coffee with 1 sugar” → `[{"tokens": ["coffee", "sugar", "number"], "number": 1}]`
- “tea with 2 sugars” → `[{"tokens": ["tea", "sugar", "number"], "number": 2}]`
- “coffee and tea” → `[{"tokens": ["coffee"]}, {"tokens": ["tea"]}]`
- “two coffees” → `[{"tokens": ["coffee"]}, {"tokens": ["coffee"]}]`
- “two teas” → `[{"tokens": ["tea"]}, {"tokens": ["tea"]}]`
- “the usual” → `[{"tokens": ["ambiguous"]}]`
- “something warm” → `[{"tokens": ["ambiguous"]}]`
- “regular” → `[{"tokens": ["ambiguous"]}]`
- “tea with 2 sugars and coffee without sugar” → `[{"tokens": ["tea", "sugar", "number"], "number": 2}, {"tokens": ["coffee", "sugar", "negation"]}]`

## Reference program

```text
POSITION listen
LISTEN
IF ambiguous IN CUSTOMER SPEECH
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

Every seed must produce the expected tickets in order. Query can write only on held paper, takes sheets from the register stack for its orders, moves to the handoff to deposit it, and returns to the register before listening again.

Functions are reserved for the kitchen act, where a future controller memory limit will motivate reuse. General natural-language parsing and difficult modifier scoping are deferred to advanced challenges.
