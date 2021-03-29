The workflow is comprised of below steps:

#### Alerts Preprocess
1. Preprocess and call `stats API` to get a layer's `feature_data` for current admins (ADM0, ADM1, ADM2)
    1. based on today's date, layer.
    1. Repeat above step and get different layers' data
    
#### Alerts Calculation    
1. Start calculation for a date, layer, nation.
    1. Get all the `alerts` (`alertId`, `threshold`, `geojson`/`admins`) from DB for current nation (mongolia)
    1. Transform `alerts` to a `dict` as the source for threshold check
    1. Run `alerts` against `feature_data` from step 1
        1. it's predefined
            1. granular region
            1. *combination of multiple regions (it involves aggregation based on different stats)
        1. it's random boundary (`geojson`)
            1. need to call `stats API` to get realtime data.

        1. Generate alert results (exceed or not)

#### Alerts Delivery        
1. A separate job to read from alert results and send out emails
    1. Remove duplicate emails notification
    1. Maybe update the DB about notification
    1. Generate email content
    1. Use AWS Client to send out emails


