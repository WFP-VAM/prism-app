# Changes Report: Redundant Config Removal from Country `layers.json` Files

This document details every change made to country-specific `layers.json` files to remove
properties that were redundant with `shared/layers.json`.

> **Note:** All removed properties had values **identical** to the shared config.
> Country-specific overrides (custom styles, custom legends, chart data, boundary paths) were preserved.

## Summary

| Country | Layers Modified | Layers Removed Entirely | Properties Removed |
|---------|----------------|------------------------|-------------------|
| cambodia | 31 | 0 | 235 |
| cameroon | 30 | 0 | 226 |
| cuba | 31 | 0 | 232 |
| ecuador | 31 | 0 | 232 |
| haiti | 32 | 6 | 242 |
| indonesia | 31 | 0 | 235 |
| kyrgyzstan | 1 | 0 | 9 |
| myanmar | 31 | 0 | 233 |
| namibia | 32 | 0 | 251 |
| nepal | 30 | 0 | 226 |
| nigeria | 30 | 0 | 226 |
| rbd | 33 | 0 | 254 |
| sierraleone | 31 | 0 | 238 |
| southsudan | 31 | 0 | 239 |
| srilanka | 30 | 0 | 226 |
| tajikistan | 31 | 0 | 236 |
| tanzania | 33 | 6 | 253 |
| ukraine | 28 | 0 | 209 |
| zimbabwe | 33 | 6 | 254 |
| **TOTAL** | **560** | **18** | **4256** |

## Properties Removed (by frequency)

| Property | Times Removed | Shared Value |
|----------|--------------|--------------|
| `type` | 560 | `boundary` |
| `base_url` | 560 | `https://api.earthobservation.vam.wfp.org/ows/` |
| `opacity` | 560 | `0.8` |
| `date_interval` | 558 | `days` |
| `server_layer_name` | 556 | `rfh_daily_forecast` |
| `title` | 489 | `Rolling daily rainfall forecast` |
| `additional_query_params` | 425 | `{"styles": "rfh_16_0_300"}` |
| `legend_text` | 385 | `CHIRPS-GEFS daily forecasts (16-day rolling)` |
| `wcsConfig` | 153 | `{"scale": 0.1, "offset": 0, "pixelResolution": 64}` |
| `start_date` | 7 | `today` |
| `legend` | 3 | `rfh_16_0_300` |

---

## Detailed Changes by Country

> **Legend:**
> - 🗑️ **REMOVED ENTIRELY** — Layer entry deleted from country file (all properties were identical to shared)
> - ✂️ **MODIFIED** — Only listed properties removed; remaining country-specific properties preserved
> - ⚠️ **Style-affecting** — `additional_query_params` (styles) removed, meaning shared WMS style now applies

### Cambodia

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `base_url`, `wcsConfig`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rainfall_agg_1month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `wp_pop_icunadj` | `title`, `type`, `server_layer_name`, `base_url`, `opacity`, `legend_text`, `legend` | No |

### Cameroon

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `wcsConfig`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Cuba

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `lst_nighttime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tna_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Ecuador

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `lst_nighttime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tna_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Haiti

**Layers removed entirely** (100% identical to shared):

- 🗑️ `rain_anomaly_2month`
- 🗑️ `rain_anomaly_4month`
- 🗑️ `rain_anomaly_5month`
- 🗑️ `rainfall_agg_2month`
- 🗑️ `rainfall_agg_4month`
- 🗑️ `rainfall_agg_5month`

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `daily_rainfall_forecast` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `dekad_rainfall_forecast` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `wcsConfig`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Indonesia

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `lst_nighttime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tna_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Kyrgyzstan

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `dekad_rainfall_anomaly_forecast` | `title`, `type`, `server_layer_name`, `additional_query_params`, `start_date`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |

### Myanmar

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `base_url`, `wcsConfig`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rainfall_agg_1month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `wp_pop_icunadj` | `title`, `type`, `server_layer_name`, `base_url`, `opacity`, `legend_text`, `legend` | No |

### Namibia

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_day_anomaly` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `lst_nighttime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tna_42_n24_70`) |
| `ndvi_dekad` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `wcsConfig`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_2month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend` | ⚠️ Yes (shared style: `rfh_16_0_600`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Nepal

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `base_url`, `wcsConfig`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rainfall_agg_1month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Nigeria

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `wcsConfig`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Rbd

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `daily_rainfall_forecast` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `dekad_rainfall_forecast` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text`, `additional_query_params` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `lst_nighttime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tna_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Sierraleone

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `lst_nighttime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tna_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Southsudan

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `lst_nighttime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tna_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Srilanka

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `base_url`, `wcsConfig`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rainfall_agg_1month` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Tajikistan

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `lst_nighttime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tna_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Tanzania

**Layers removed entirely** (100% identical to shared):

- 🗑️ `rain_anomaly_2month`
- 🗑️ `rain_anomaly_4month`
- 🗑️ `rain_anomaly_5month`
- 🗑️ `rainfall_agg_2month`
- 🗑️ `rainfall_agg_4month`
- 🗑️ `rainfall_agg_5month`

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `daily_rainfall_forecast` | `title`, `type`, `start_date`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `dekad_rainfall_anomaly_forecast` | `title`, `type`, `server_layer_name`, `additional_query_params`, `start_date`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `dekad_rainfall_forecast` | `title`, `type`, `server_layer_name`, `start_date`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `wcsConfig`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

### Ukraine

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `days_dry` | `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity` | No |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `additional_query_params` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `lst_nighttime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tna_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `ryq_14_50_200`) |
| `rain_anomaly_dekad` | `title`, `type`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `streak_heavy_rain` | `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |

### Zimbabwe

**Layers removed entirely** (100% identical to shared):

- 🗑️ `rain_anomaly_2month`
- 🗑️ `rain_anomaly_4month`
- 🗑️ `rain_anomaly_5month`
- 🗑️ `rainfall_agg_2month`
- 🗑️ `rainfall_agg_4month`
- 🗑️ `rainfall_agg_5month`

**Layers modified** (redundant properties removed):

| Layer | Removed Properties | Style-Affecting? |
|-------|-------------------|-----------------|
| `daily_rainfall_forecast` | `title`, `type`, `start_date`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `days_dry` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `days_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_heavy_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `days_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `dekad_rainfall_anomaly_forecast` | `title`, `type`, `server_layer_name`, `additional_query_params`, `start_date`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `dekad_rainfall_forecast` | `title`, `type`, `server_layer_name`, `start_date`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `lst_amplitude` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `wcsConfig`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `taa_21_1_48`) |
| `lst_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tdd_21_m12_12`) |
| `lst_daytime` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `tda_42_n24_70`) |
| `ndvi_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `wcsConfig`, `legend_text` | ⚠️ Yes (shared style: `vim_14_01_09`) |
| `ndvi_dekad_anomaly` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `additional_query_params`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `viq_13_50_150`) |
| `rain_anomaly_1month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rain_anomaly_1year` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_3month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_6month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_9month` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `opacity`, `legend_text` | No |
| `rain_anomaly_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfq_14_20_400`) |
| `rainfall_agg_1month` | `type`, `server_layer_name`, `base_url`, `additional_query_params`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_400`) |
| `rainfall_agg_1year` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_agg_3month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_800`) |
| `rainfall_agg_6month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_1600`) |
| `rainfall_agg_9month` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `rfh_16_0_2400`) |
| `rainfall_dekad` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `rfh_16_0_300`) |
| `spi_1m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_1y` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_3m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_6m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `spi_9m` | `title`, `type`, `server_layer_name`, `base_url`, `date_interval`, `wcsConfig`, `opacity`, `legend_text` | No |
| `streak_dry_days` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `dlx_13_0_26`) |
| `streak_extreme_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_heavy_rain` | `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |
| `streak_intense_rain` | `title`, `type`, `server_layer_name`, `additional_query_params`, `base_url`, `date_interval`, `opacity`, `legend_text` | ⚠️ Yes (shared style: `xnhie_12_0_14`) |

