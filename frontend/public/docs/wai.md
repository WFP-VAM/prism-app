# Water Anomaly Index

---

## Overview

The objective is to derive an index that conveys the performance of the growing season in an easy to understand numerical scale, where **performance** means the quality of crop and pasture development.

The index is built around commonly available gridded variables used for early warning activities: it integrates the key variables of the water cycle: **rainfall** as well as **reference (potential) evapotranspiration** and **soil moisture**.

Rainfall is the key driver for crop growth representing availability, evapotranspiration representing the water demand, and soil moisture the stored water. The index accounts for the variable importance of different phases of the season by giving more weight to anomalous behaviour in the wetter stages of the season.

![Slide 2](public/docs/images/wai/Picture1.png)

---

## Formulation

The index is derived with a monthly time step and brings together the key variables of the water cycle:

- **Availability:** Monthly Rainfall (R1H)
- **Demand:** Monthly Reference Evapotranspiration (ET0)
- **Storage:** Monthly Soil Moisture (S1M)

**WAI = f(θ_rainfall, θ_ref.evapotranspiration, θ_soil moisture)** *(Eq. 1)*

Where **θ is some form of anomaly**, i.e. a measure of how far from the "usual" a given value is — or where this value sits in the historical distribution.

![Slide 3](public/docs/images/wai/Picture2.png)

---

## Calculating Anomalies

The anomaly θ is constructed as the logit of an observation's percentile value given the historical distribution for that time of year.

**θ_it = logit( percentile( x_it | x_t for t ∈ 1...N ) )**

where logit(p) = ln(p/(1−p))

The logit transform preserves proper distance between percentiles at the extremes of the scale. For each variable:
1. Derive the percentile of the monthly indicator for each time step (empirical percentiles).
2. Convert percentiles to logits.

---

## Simple WAI Formulation

The combined anomaly is a weighted average of indicator anomalies using importance weights (w_i):

**𝜃𝑚𝑢𝑙𝑡𝑖 = Σ w_i × θ_i**

For reporting, results are conveyed on an intuitive **0–100** scale using an inverse logit transformation:

**WAI = 100 × exp(𝜃𝑚𝑢𝑙𝑡𝑖) / (1 + exp(𝜃𝑚𝑢𝑙𝑡𝑖))**

---

## Seasonal Anomalies

For seasonal monitoring, anomalies are aggregated across the **whole season to date** using time-varying weights:

**θ_season = Σ_{t∈season} weight_t × θ_t**

This delivers seasonally-integrated (cumulative) anomalies rather than a snapshot at a single point in time.

---

## Weights for Seasonal Anomalies

Weights reflect the contribution of each month to the growing season, derived from **long-term mean rainfall** as the proportion of total rainfall falling in each month. Weights always sum to 1.

**weight_month = rainfall_month / rainfall_total**

Pixel-level season start and end dates can be used instead of a static regional window, with weights calculated per pixel.

---

## Seasonal Quantiles

In Southern Africa, October contributes a much smaller amount to the index compared to February, since February is a much rainier month. All calculations are **pixel-based**, accounting for variability in rainfall seasonality across the region.

These weights apply to **ALL variables** in the index.

*Southern Africa Monthly Weights: October – February*

![Slide 8](public/docs/images/wai/Picture3.png)

---

## Seasonal WAI

Seasonally aggregated indicator anomalies are combined using importance weights:

**WAI_multi_season = Σ w_i × θ_i_season**

**Initial variable importance weights:**
- Rainfall: **0.4**
- Ref. Evapotranspiration: **0.3**
- Soil Moisture: **0.3**

An inverse logit transformation is applied to report results on the **0–100** range.

---

## End-to-End Calculation

![Slide 10](public/docs/images/wai/Slide10.png)

---

## Example: WAI 2023–2024 — Monthly Rainfall

![Slide 11](public/docs/images/wai/Slide11.png)

---

## Example: WAI 2023–2024 — Monthly Ref. Evapotranspiration

![Slide 12](public/docs/images/wai/Slide12.png)

---

## Example: WAI 2023–2024 — Monthly Soil Moisture

![Slide 13](public/docs/images/wai/Slide13.png)

---

## Example: WAI 2023–2024 — Monthly WAI

![Slide 14](public/docs/images/wai/Slide14.png)

---

## Example: WAI 2023–2024 — Seasonal Summary

![Slide 15](public/docs/images/wai/Slide15.png)

---

## Variables to Percentiles to WAI

![Slide 16](public/docs/images/wai/Slide16.png)

---

## Previous Seasonal WAI (Qmulti)

Historical seasonal WAI (Qmulti) output over Southern Africa:
![Slide 17](public/docs/images/wai/Picture4.png)

---

## Summary by Administrative Divisions — Regional

![Slide 18](public/docs/images/wai/Slide18.png)

---

## Summary by Administrative Divisions — MOZ Tete

![Slide 19](public/docs/images/wai/Slide19.png)

---

For more information, contact wfp.vaminfo@wfp.org

#### WFP VAM — Food Security Analysis

---

