from datetime import datetime, timedelta, timezone

from dateutil.parser import parse as dtparser

from flask import request

import requests

from werkzeug.exceptions import BadRequest


def parse_datetime_params():
    """Transform into datetime objects used for filtering form responses."""
    begin_datetime_str = request.args.get('beginDateTime', '2000-01-01')
    begin_datetime = dtparser(begin_datetime_str).replace(tzinfo=timezone.utc)

    end_datetime_str = request.args.get('endDateTime')
    if end_datetime_str is not None:
        end_datetime = dtparser(end_datetime_str)
    else:
        # 10 years.
        end_datetime = datetime.now() + timedelta(days=365 * 10)

    end_datetime = end_datetime.replace(tzinfo=timezone.utc)

    # strptime function includes hours, minutes, and seconds as 00 by default.
    # This check is done in case the begin and end datetime values are the same.
    if end_datetime == begin_datetime:
        end_datetime = end_datetime + timedelta(days=1)

    if begin_datetime > end_datetime:
        raise BadRequest('beginDateTime value must be lower than endDateTime')

    return begin_datetime, end_datetime


def get_ews_responses(begin_datetime, end_datetime):
    """Get all data using ews_1294 api endpoints"""
    start = begin_datetime.date()
    end = end_datetime.date()
    base_api = 'http://sms.ews1294.info/api/v1/'

    def parse_location_details(data: dict):
        """Parse location details and format them"""
        properties = data['properties']
        levels = properties['trigger_levels']
        coordinates = data['geometry']['coordinates']

        if properties['status1'] == 'Operational' and properties['status'] == 'active':
            details = dict()
            details['id'] = properties['external_id']
            details['lat'] = coordinates[0]
            details['lon'] = coordinates[1]
            details['normal_level'] = levels['watch_level']
            details['warning_level'] = levels['warning']
            details['danger_level'] = levels['severe_warning']
            return details
        return None

    def parse_data_by_location(location_data: dict):
        """Parse all data by this location"""
        location_id = location_data['id']
        data_url = '{0}sensors/sensor_event?external_id={1}&start={2}&end={3}'.format(
            base_api, location_id, start, end
        )

        resp = requests.get(data_url)
        resp.raise_for_status()
        data_per_location = resp.json()

        days = [start + timedelta(days=d) for d in range((end - start).days + 1)]

        for day in days:
            location_data['date'] = day
            daily_levels = [_['value'][1] for _ in data_per_location]
            # location_data['daily_levels'] = daily_levels
            if len(daily_levels) > 0:
                location_data['average_level'] = round(sum(daily_levels) / len(daily_levels))
            else:
                location_data['average_level'] = 0

        return location_data

    location_url = '{0}location.geojson?type=river'.format(base_api)

    resp = requests.get(location_url)
    resp.raise_for_status()
    ews_data = resp.json().get('features')
    location_details = list(
        filter(lambda item: item is not None, map(parse_location_details, ews_data))
    )

    return list(map(parse_data_by_location, location_details))
