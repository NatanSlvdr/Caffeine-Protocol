# Test fixtures

`reference-results.json` (671K) is a golden replay snapshot (`average_satisfaction`
plus per-event customer/passed/satisfaction/timing records). It is kept here for
manual result archaeology; no automated test reads it. Do not add new
unreferenced fixtures — prefer small, intention-revealing helpers in
`tests/helpers/` instead.
