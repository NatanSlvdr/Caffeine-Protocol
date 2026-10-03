# Level 4: Coffee or Tea?

Conditions inspect the recognized customer speech. Use IF tea IN CUSTOMER SPEECH to test its tokens, then write tea or coffee. No loop is needed yet.

## Heard orders

- “coffee” → `[{"tokens": ["coffee"]}]`

## Reference program

```text
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
```

## Validation

Every seed must produce the expected tickets in order. Query can write only on held paper, takes sheets from the register stack for its orders, moves to the handoff to deposit it, and returns to the register before listening again.
