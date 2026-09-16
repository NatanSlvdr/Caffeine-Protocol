# Level 10: Numbers

IF number IN CUSTOMER SPEECH detects numeric metadata. READ number, then SUGAR number writes the exact amount, including zero. Keep modifier logic for orders without numbers.

## Heard orders

- “coffee with 0 sugar” → `[{"tokens": ["coffee", "sugar", "number"], "number": 0}]`
- “coffee with 1 sugar” → `[{"tokens": ["coffee", "sugar", "number"], "number": 1}]`
- “tea with 2 sugars” → `[{"tokens": ["tea", "sugar", "number"], "number": 2}]`
- “coffee with sugar” → `[{"tokens": ["coffee", "sugar"]}]`
- “tea without sugar” → `[{"tokens": ["tea", "sugar", "negation"]}]`

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
