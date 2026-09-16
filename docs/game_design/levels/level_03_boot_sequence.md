# Level 3: First Order

Listen, TAKE UP from the paper stack, and write coffee on the held paper. MOVE RIGHT 1, DEPOSIT RIGHT at the kitchen handoff, then MOVE LEFT 1 to the register. Checkout is automatic.

## Heard orders

- “coffee” → `[{"tokens": ["coffee"]}]`

## Reference program

```text
LISTEN
TAKE UP
ITEM coffee
MOVE RIGHT 1
DEPOSIT RIGHT
MOVE LEFT 1
```

## Validation

Every seed must produce the expected tickets in order. Query can write only on held paper, takes one sheet from the register stack per order, moves to the handoff to deposit it, and returns to the register before listening again.
