# Level 9: Multiple Orders

FOR item IN heard orders selects each order group. Take a fresh sheet, interpret that item, deposit it, and return to the register inside every iteration.

## Heard orders

- “coffee and tea” → `[{"tokens": ["coffee"]}, {"tokens": ["tea"]}]`
- “two coffees” → `[{"tokens": ["coffee"]}, {"tokens": ["coffee"]}]`
- “two teas” → `[{"tokens": ["tea"]}, {"tokens": ["tea"]}]`
- “coffee” → `[{"tokens": ["coffee"]}]`

## Reference program

```text
POSITION listen
LISTEN
FOR item IN heard orders
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
END
JUMP listen
```

## Validation

Every seed must produce the expected tickets in order. Query can write only on held paper, takes sheets from the register stack for its orders, moves to the handoff to deposit it, and returns to the register before listening again.
