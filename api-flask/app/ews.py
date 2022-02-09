"""Collect and parse Cambodia EWS-1294."""
import itertools
from datetime import datetime, timedelta, timezone

from dateutil.parser import parse as dtparser

from flask import request

import numpy

import requests

from werkzeug.exceptions import BadRequest


BASE_API = 'https://api.ews1294.com/v1/'


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


def get_ews_response(only_dates, begin_datetime, end_datetime):
    """Get datapoints for sensor locations."""
    # NOTE: PRISM will get todays' worth of data and parse them.
    # only_dates is a shortcut to provide one day to the PRISM timeline
    # without incurring computational cost
    if only_dates:
        today = datetime.now().replace(tzinfo=timezone.utc)
        return [today.strftime('%Y-%m-%d')]

    start = begin_datetime.date()
    end = end_datetime.date()

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
        data_url = '{0}datapoints?external_id={1}&start={2}&end={3}'.format(
            BASE_API, location_id, start, end
        )

        resp = requests.get(data_url)
        resp.raise_for_status()
        data_per_location = resp.json()

        days = [start + timedelta(days=d) for d in range((end - start).days)]

        location_data_by_day = []
        for n in range(len(days)):
            levels_and_dates = [
                _['value'] for _ in data_per_location
                if dtparser(_['value'][0]).date() == days[n]
            ]

            rows = list()

            dates_row = dict()
            for count, level in enumerate(levels_and_dates):
                dates_row[count] = level[0]
            rows.append(dates_row)

            levels_row = dict()
            for count, level in enumerate(levels_and_dates):
                levels_row[count] = level[1]
            rows.append(levels_row)

            daily_levels = numpy.array([_[1] for _ in levels_and_dates])

            if len(daily_levels) > 0:
                minimum = int(numpy.min(daily_levels))
                maximum = int(numpy.max(daily_levels))
                mean = round(numpy.mean(daily_levels), 2)
                median = round(numpy.median(daily_levels), 2)
                status = get_level_status(mean, location['trigger_levels'])

                location_data_by_day.append({
                    'date': days[n].strftime('%Y-%m-%d'),
                    'level_min': minimum,
                    'level_max': maximum,
                    'level_mean': mean,
                    'level_median': median,
                    'level_status': status,
                    'daily_levels': levels_and_dates,
                    'daily_rows': {'rows': rows, 'columns': list(rows[0].keys())},
                    **location
                })

        return location_data_by_day

    location_url = '{0}locations?type=river'.format(BASE_API)

    resp = requests.get(location_url)
    resp.raise_for_status()
    sensors_data = resp.json().get('features')
    location_details = list(
        filter(lambda item: item is not None, map(parse_location_details, sensors_data))
    )

    return list(itertools.chain(*list(map(parse_data_by_location, location_details))))
