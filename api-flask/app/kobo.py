"""Collect and parse kobo forms."""
from datetime import datetime, timedelta, timezone
from os import getenv
from typing import Dict, List

from dateutil.parser import parse as dtparser

from flask import request

import requests

from werkzeug.exceptions import BadRequest, InternalServerError, NotFound


def get_kobo_params():
    """Collect and validate request parameters and environment variables."""
    kobo_username = getenv('KOBO_USERNAME')
    if kobo_username is None:
        raise InternalServerError('Missing backend parameter: KOBO_USERNAME')
    kobo_pw = getenv('KOBO_PW')
    if kobo_pw is None:
        raise InternalServerError('Missing backend parameter: KOBO_PW')

    form_name = request.args.get('formName')
    if form_name is None:
        raise BadRequest('Missing query parameter: formName')

    datetime_field = request.args.get('datetimeField')

    if datetime_field is None:
        raise BadRequest('Missing parameter datetimeField')

    geom_field = request.args.get('geomField')
    if geom_field is None:
        raise BadRequest('Missing parameter: geomField')

    filters = {}
    filters_params = request.args.get('filters', None)
    if filters_params is not None:
        filters = dict([f.split('=') for f in filters_params.split(',')])

    form_fields = dict(name=form_name,
                       datetime=datetime_field,
                       geom=geom_field,
                       filters=filters)

    auth = (kobo_username, kobo_pw)

    return auth, form_fields


def parse_form_field(value: str, field_type: str):
    """Parse strings into type according to field_type provided."""
    if field_type == 'decimal':
        return float(value)
    elif field_type == 'integer':
        return int(value)
    elif field_type in ('datetime', 'date'):
        return dtparser(value).astimezone(timezone.utc)
    elif field_type == 'geopoint':
        lat, lon, _, _ = value.split(' ')
        return {'lat': float(lat), 'lon': float(lon)}
    else:
        return value


def parse_form_response(form_dict: Dict[str, str], form_fields: Dict[str, str], labels: List[str]):
    """Transform a Kobo form dictionary into a format that is used by the frontend."""
    form_data = {k: parse_form_field(form_dict.get(k), v) for k, v in labels.items()
                 if k not in (form_fields.get('geom'), form_fields.get('datetime'))}

    datetime_field = form_fields.get('datetime')
    datetime_value = parse_form_field(form_dict.get(datetime_field), labels.get(datetime_field))

    geom_field = form_fields.get('geom')
    latlon_dict = parse_form_field(form_dict.get(geom_field), labels.get(geom_field))

    status = form_dict.get('_validation_status').get('label', None)

    form_data = {**form_data, **latlon_dict, 'date': datetime_value, 'status': status}

    return form_data


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


def get_responses_from_kobo(auth, form_name):
    """
    Request kobo api to collect all the information related to a form.

    Also, retrieve the form responses for parsing and filtering.
    """
    form_url = request.args.get('koboUrl')
    if form_url is None:
        raise BadRequest('Missing parameter koboUrl')

    resp = requests.get(form_url, auth=auth)

    resp.raise_for_status()
    kobo_user_metadata = resp.json()

    # Find form and get results.
    forms_iterator = (d for d in kobo_user_metadata.get('results') if d.get('name') == form_name)
    form_metadata = next(forms_iterator, None)
    if form_metadata is None:
        raise NotFound('Form not found')

    # Additional request to get label mappings.
    resp = requests.get(form_metadata.get('url'), auth=auth)
    resp.raise_for_status()
    form_metadata = resp.json()

    # Get form fields and field type used for parsing.
    form_labels = {f.get('$autoname'): f.get('type') for f
                   in form_metadata.get('content').get('survey')}

    # Get all form responses using metadata 'data' key
    resp = requests.get(form_metadata.get('data'), auth=auth)
    resp.raise_for_status()

    form_responses = resp.json().get('results')

    return form_responses, form_labels


def get_form_responses(begin_datetime, end_datetime):
    """Get all form responses using Kobo api."""
    auth, form_fields = get_kobo_params()

    form_responses, form_labels = get_responses_from_kobo(auth, form_fields.get('name'))

    forms = [parse_form_response(f, form_fields, form_labels) for f in form_responses]

    filtered_forms = []
    for form in forms:
        date_value = form.get('date')

        conditions = [form.get(k) == v for k, v in form_fields.get('filters').items()]
        conditions.append(begin_datetime <= date_value)
        conditions.append(date_value < end_datetime)

        if all(conditions) is False:
            continue

        filtered_forms.append(form)

    sorted_forms = sorted(filtered_forms, key=lambda x: x.get('date'))

    # Transform date into string.
    sorted_forms = [{**f, 'date': f.get('date').date().isoformat()} for f in sorted_forms]

    return sorted_forms
