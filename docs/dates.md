# Overview of dates in PRISM

## Types of dates

For each layer, the following dates are used:

- `Observation date`: marks the beginning of a validity period. Currently, our WMS layers have a single date, which is the observation date. We need to make inferences about the validity period and reference window based on the observation date and knowledge of the data product.

- `Available dates`: For a given layer, "available dates" is the list of observation dates that can be requested from the data source. Most layers have an observation date every "dekad" (10 or 11 days), but it could be every month or any other periodicity. This list is obtained from the data source itself.

- `Validity period`: used to describe the days on which an observation is valid. This is used to calculate date
  intersections across layers and addresses the lack of a beginning / end date concept in our observation date. In most
  cases, this period is equal to the interval between two observation dates, forward or backward. The `validity period`
  for a layer is defined in the corresponding `layers.json` file.
  `Validity periods` (for a given layer) do not overlap, so that for a given date, there should be at most one `validity period` that includes it.

- `Reference window` is the time period that is represented by a given observation.
  For example, it could be the period of time over which rainfall was averaged.
  It is used to visualize the beginning and end of a data product's reference period. This differs from the `validity period` in that there can be more than one `validity period` within a `reference window`. For example, a 1-month `reference window` has 3 `validity periods` of 1-dekad each. If a `reference window` isn't defined, the `validity period` is used as the `reference window`.
  `Reference windows` for two distinct `observation dates` can overlap.
  It is defined in the `layers.json` file (see example below). It is never used to select the `query date`.

- `Selected date`: The date the user picked, either in the calendar popup, or by clicking on the timeline, or by loading a
  url with a `date=YYYY-MM-DD` parameter. By default, the app considers today as the selected date if none is explicitly
  provided.

- `query date` or `request date` means the `observation date` that will be
  requested from the data source, picked from the list of `available dates`. If the user picked an actual `observation
date` (a dark blue tick on the timeline, for instance), then `query date` and `selected date` are the same.

## Example

### rainfall_agg_3month

The 3-month rainfall aggregate layer is updated every 10-days (dekad). The validity period is 10-days. I.e. an observation made on 1-Oct is valid until 10-Oct. An observation made on 11-Oct is valid until 20-Oct. This allows us to determine which observation date to display / intersect with after a user selects a layer. The reference window is 3-months long.

The observation on 11-Oct, is valid until 20-Oct, and has a reference window of 21-July until 20-Oct.
The next observation (on 21-Oct), is valid until 31-Oct, and has a reference window of 01-August until 31-Oct.

Its config in `layers.json` would look like:

```json
  "rainfall_agg_3month": {
    "title": "3-month rainfall aggregate (mm)",
    "date_interval": "days",
    "validity": {
      "forward": 1,
      "mode": "dekad"
    },
    "reference_window": {
      "backward": 8,
      "forward": 1,
      "mode": "dekad",
    },
  },
```

## Date flow in the app

The user picks a `selected date` (or it defaults to today). Using the list of `available
dates` from the server and the `validity period`, the correct `observation
date` is selected from them (that date is also called `query date`). Actual data can then be obtained from the server.

For example, if the `selected date` is `2025-07-25` and the layer's validity is defined as in the example above the `observation date` will be set to `2025-07-21`.

Finally, the `reference window` is determined.

## Edge cases

If the `selected date` is outside of any `validity period`, then the closest date in `available dates` is used as `query date`.
