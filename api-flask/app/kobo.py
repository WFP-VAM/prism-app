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
        raise BadRequest('Missing parameter geomField')

    measure_field = request.args.get('measureField')
    if measure_field is None:
        raise BadRequest('Missing parameter measureField')

    form_fields = dict(name=form_name,
                       datetime=datetime_field,
                       geom=geom_field,
                       measure=measure_field)
    auth = (kobo_username, kobo_pw)

    return auth, form_fields


def parse_form_response(form_dict: Dict[str, str], form_fields: Dict[str, str], labels: List[str]):
    """Transform a Kobo form dictionary into a format that is used by the frontend."""
    measure_field = form_fields.get('measure')

    form_data = {k: form_dict.get(k) if k != measure_field else int(form_dict.get(k))
                 for k in labels if k != form_fields.get('geom')}

    datetime_field = form_fields.get('datetime')

    datetime_value = dtparser(form_dict.get(datetime_field)).astimezone(timezone.utc)

    lat, lon, _, _ = form_dict.get(form_fields.get('geom')).split(' ')

    status = form_dict.get('_validation_status').get('label', None)

    form_data = {**form_data, 'date': datetime_value, 'lat': lat, 'lon': lon, 'status': status}

    return form_data


def parse_datetime_params():
    """Transform into datetime objects used for filtering form responses."""
    begin_datetime_str = request.args.get('beginDateTime', '2000-01-01')
    begin_datetime = dtparser(begin_datetime_str).astimezone(timezone.utc)

    end_datetime_str = request.args.get('endDateTime')
    if end_datetime_str is not None:
        end_datetime = dtparser(end_datetime_str)
    else:
        # 10 years.
        end_datetime = datetime.now() + timedelta(days=365 * 10)

    end_datetime = end_datetime.astimezone(timezone.utc)

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

    # Get form labels.
    # Replace string is needed since form dictionariy keys use '_' as space.
    form_labels = [f.replace(' ', '_') for f in form_metadata.get('summary').get('labels')]

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

        # Check form submission date is between request dates.
        if begin_datetime <= date_value <= end_datetime:
            new_form = {**form, 'date': date_value.isoformat()}
            filtered_forms.append(new_form)

    return filtered_forms
