"""Collect and parse Cambodia EWS-1294."""
import itertools
from datetime import datetime, timedelta, timezone

from dateutil.parser import parse as dtparser

from flask import request

import numpy

import requests

from werkzeug.exceptions import BadRequest


def parse_ews_params():
    """Transform params used for ews request."""
    only_dates = True if request.args.get('onlyDates') else False

    today = datetime.now().replace(tzinfo=timezone.utc)
    begin_datetime_str = request.args.get('beginDateTime')
    if begin_datetime_str is not None:
        begin_datetime = dtparser(begin_datetime_str)
    else:
        # yesterday
        begin_datetime = today
    begin_datetime = begin_datetime.replace(tzinfo=timezone.utc)

    end_datetime_str = request.args.get('endDateTime')
    if end_datetime_str is not None:
        end_datetime = dtparser(end_datetime_str)
    else:
        # today
        end_datetime = today
    end_datetime = end_datetime.replace(tzinfo=timezone.utc)

    # strptime function includes hours, minutes, and seconds as 00 by default.
    # This check is done in case the begin and end datetime values are the same.
    if end_datetime == begin_datetime:
        end_datetime = end_datetime + timedelta(days=1)

    if begin_datetime > end_datetime:
        raise BadRequest('beginDateTime value must be lower than endDateTime')

    if begin_datetime > today:
        raise BadRequest('beginDateTime value must be less or equal to today')

    return only_dates, begin_datetime, end_datetime


def get_ews_responses(only_dates, begin_datetime, end_datetime):
    """Get all data using ews_1294 api endpoints."""
    # NOTE: Since ews-1294 api have performance issues, we decided to take shortcut
    # on parsing and delivering dates to PRISM frontend by limiting it to only today
    # this can be removed once we are sure the ews-1294 have solved the
    # preformance issue
    if only_dates:
        today = datetime.now().replace(tzinfo=timezone.utc)
        return [today.strftime('%Y-%m-%d')]

    start = begin_datetime.date()
    end = end_datetime.date()
    base_api = 'http://sms.ews1294.info/api/v1/'

    def parse_location_details(data: dict):
        """Parse location details and format them."""
        properties = data['properties']
        coordinates = data['geometry']['coordinates']

        if properties['status1'] == 'Operational' and properties['status'] == 'active':
            details = dict()
            details['id'] = properties['id']
            details['external_id'] = properties['external_id']
            details['lon'] = coordinates[0]
            details['lat'] = coordinates[1]
            details['name'] = properties['name']
            details['namekh'] = properties['namekh']
            details['water_height'] = properties['water_height']
            details['trigger_levels'] = properties['trigger_levels']
            return details
        return None

    def get_level_status(current_level: float, trigger_levels: dict) -> str:
        """Calculate water level status based on sensor details."""
        warning = trigger_levels['warning']
        severe_warning = trigger_levels['severe_warning']

        if current_level < warning:
            return 0
        elif current_level < severe_warning:
            return 1
        else:
            return 2

    def parse_data_by_location(location: dict):
        """Parse all data by this location."""
        location_id = location['external_id']
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
                minimum = int(numpy.min(dl_array))
                maximum = int(numpy.max(dl_array))
                mean = round(numpy.mean(dl_array), 2)
                median = round(numpy.median(dl_array), 2)
                status = get_level_status(mean, location['trigger_levels'])

                location_data_by_day.append({
                    'date': days[n].strftime('%Y-%m-%d'),
                    'level_min': minimum,
                    'level_max': maximum,
                    'level_mean': mean,
                    'level_median': median,
                    'level_status': status,
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
