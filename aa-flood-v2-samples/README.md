# AA flood v2 output samples

Both folders use the same v2 output schema (`schema_version: 2`).

- `real/`: local test run on the GloFAS forecast issued 2026-11-04, Mozambique config
  (`station_config.csv`, 30 stations). All stations `not_exceeded` (dry season).
- `synthetic/`: fake forecast data for 3 stations, issue dates 2026-03-10 and 2026-03-11, built to
  show exceeded statuses (`activation_severe`, `activation_bankfull`, `readiness_moderate`).
  Thresholds are real, triggers, windows and discharge are illustrative. Not real forecasts.
