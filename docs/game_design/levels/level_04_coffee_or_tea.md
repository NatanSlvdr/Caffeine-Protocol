# Level 4: Coffee or Tea?

Each request supplies one current item. Use IF tea IN item to test its tokens, then write tea or coffee. No loop is needed yet.

## Heard orders

- “coffee” → `[{"tokens": ["coffee"]}]`

## Reference program

```text
LISTEN
TAKE UP
IF tea IN item
  ITEM tea
ELSE
  ITEM coffee
END
MOVE RIGHT 1
DEPOSIT RIGHT
MOVE LEFT 1
```

## Validation

Every seed must produce the expected tickets in order. Query can write only on held paper, takes one sheet from the register stack per order, moves to the handoff to deposit it, and returns to the register before listening again.
