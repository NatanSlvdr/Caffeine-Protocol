# Level 5: Keep Listening

Put POSITION listen before LISTEN and JUMP listen after returning to the register. Keep serving every customer.

## Heard orders

- “coffee” → `[{"tokens": ["coffee"]}]`
- “tea” → `[{"tokens": ["tea"]}]`
- “tea please” → `[{"tokens": ["tea"]}]`
- “coffee” → `[{"tokens": ["coffee"]}]`

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
MOVE RIGHT 1
DEPOSIT RIGHT
MOVE LEFT 1
JUMP listen
```

## Validation

Every seed must produce the expected tickets in order. Query can write only on held paper, takes sheets from the register stack for its orders, moves to the handoff to deposit it, and returns to the register before listening again.
