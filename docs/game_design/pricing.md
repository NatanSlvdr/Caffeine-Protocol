# Pricing

## Role

The pricing machine is a counter device that totals customer orders after Query
creates tickets.

During Act I, pricing is automatic and not part of puzzle validation. The player
can see the pricing machine as a cafe prop, but Query's Act I responsibility is
still order intake: create the right tickets, with the right item and modifier
data.

## Future Failure Hook

In a later act, the pricing machine stops working. From that point, the player
must program customer-facing total logic:

1. collect all tickets belonging to the current customer or table;
2. read each ticket's item and modifier data;
3. look up item prices and modifier prices;
4. add the total;
5. have Query give the total back to the customer.

This should become a programming puzzle about structured data, accumulation, and
clear customer communication, not mental arithmetic.

## First-Pass Price Model

Future tuning defaults:

| Item or Modifier | Price |
| --- | ---: |
| Coffee | 3 |
| Tea | 2 |
| Sugar, binary | 0 |
| Sugar count | 0 |

Prices are intentionally simple at first. Later levels can introduce paid
modifiers, discounts, bundles, or table totals only after the basic total loop is
clear.

## Blocks For Future Pricing Levels

Candidate blocks:

- `For each customer ticket`
- `Read ticket item`
- `Read item price`
- `Add to total`
- `Set customer total`
- `Say total to customer`
- `If total is missing`
- `Report pricing error`

## Validation Notes

When pricing becomes active, validation should compare structured totals rather
than rendered text. A run fails when Query gives the wrong total, gives no total,
or totals the wrong customer's tickets.
