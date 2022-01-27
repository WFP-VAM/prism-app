"""Collect and parse Cambodia EWS-1294."""
import itertools
from datetime import datetime, timedelta, timezone

from dateutil.parser import parse as dtparser

from flask import request

import numpy

import requests

from werkzeug.exceptions import BadRequest


def parse_ews_datetime_params():
    """Transform into datetime objects used for filtering form responses."""
    today = datetime.now().replace(tzinfo=timezone.utc)
    begin_datetime_str = request.args.get('beginDateTime')
    if begin_datetime_str is not None:
        begin_datetime = dtparser(begin_datetime_str)
    else:
        # yesterday
        end_datetime = today - timedelta(days=1)

    end_datetime_str = request.args.get('endDateTime')
    if end_datetime_str is not None:
        end_datetime = dtparser(end_datetime_str)
    else:
        # today
        end_datetime = today

    begin_datetime = begin_datetime.replace(tzinfo=timezone.utc)
    end_datetime = end_datetime.replace(tzinfo=timezone.utc)

    # strptime function includes hours, minutes, and seconds as 00 by default.
    # This check is done in case the begin and end datetime values are the same.
    if end_datetime == begin_datetime:
        begin_datetime = end_datetime - timedelta(days=1)

    if begin_datetime > end_datetime:
        raise BadRequest('beginDateTime value must be lower than endDateTime')

    if end_datetime > today:
        raise BadRequest('endDateTime value must be lower or equal to today')

    return begin_datetime, end_datetime


def get_ews_responses(begin_datetime, end_datetime):
    """Get all data using ews_1294 api endpoints."""
    start = begin_datetime.date()
    end = end_datetime.date()
    base_api = 'http://sms.ews1294.info/api/v1/'

    def parse_location_details(data: dict):
        """Parse location details and format them."""
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

    def parse_data_by_location(location: dict):
        """Parse all data by this location."""
        location_id = location['id']
        data_url = '{0}sensors/sensor_event?external_id={1}&start={2}&end={3}'.format(
            base_api, location_id, start, end
        )

        resp = requests.get(data_url)
        resp.raise_for_status()
        data_per_location = resp.json()

        days = [start + timedelta(days=d) for d in range((end - start).days)]

        location_data_by_day = []
        for n in range(len(days)):
            daily_levels = numpy.array(
                [_['value'][1] for _ in data_per_location
                 if dtparser(_['value'][0]).date() == days[n]]
            )
            dl_array = numpy.array(daily_levels)

            if len(dl_array) > 0:
                location_data_by_day.append({
                    'date': days[n].strftime('%Y-%m-%d'),
                    'min': int(numpy.min(dl_array)),
                    'max': int(numpy.max(dl_array)),
                    'median': round(numpy.median(dl_array), 2),
                    'mean': round(numpy.mean(dl_array), 2),
                    **location
                })

        return location_data_by_day

    location_url = '{0}location.geojson?type=river'.format(base_api)

    resp = requests.get(location_url)
    resp.raise_for_status()
    ews_data = resp.json().get('features')
    location_details = list(
        filter(lambda item: item is not None, map(parse_location_details, ews_data))
    )

    return list(itertools.chain(*list(map(parse_data_by_location, location_details))))
