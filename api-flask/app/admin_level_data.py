"""Collect and parse Admin Level Data URLs."""
from datetime import datetime

from flask import request

import requests
from requests.compat import urlparse

from werkzeug.exceptions import BadRequest


def get_base(url):
    """Parse url to get the its base."""
    scheme, netloc, _, _, _, _ = urlparse(url)
    base = '{0}://{1}'.format(scheme, netloc)
    return base


def parse_admin_params():
    """Collect and validate request parameters."""
    data_url = request.args.get('dataUrl')
    if data_url is None:
        raise BadRequest('Missing query parameter: dataUrl')

    only_dates = True if request.args.get('onlyDates') else False

    return {'data_url': data_url, 'only_dates': only_dates}


def parse_mvam_response(data_url, only_dates):
    """Parse response from Hunger Map Monitoring."""
    resp = requests.get(data_url)

    # instead of `resp.raise_for_status`. display the error response from mvam
    data = resp.json()
    if not resp.ok:
        return data

    if only_dates:
        response = []
        for item in data:
            date = datetime.strptime(item['date'], '%Y-%m-%d')
            response.append(date.timestamp())
        return list(set(response))
    else:
        response = {'DataList': []}
        for item in data:
            item_details = {
                'mvam_Code': item['region']['id'],
                'mvam_Name': item['region']['name'],
                'population': item['region']['population'],
                'date': item['date']
            }
            for metric in item['metrics']:
                item_details['{}_people'.format(metric)] = item['metrics'][metric]['people']
                item_details['{}_prevalence'.format(metric)] = item['metrics'][metric]['prevalence']
            response['DataList'].append(item_details)
        return response


def get_admin_response(data_url, only_dates=False):
    """Process admin level data from different sources."""
    def unsupported_source(url, only_dates):
        """Raise the bad request for unsupported sources."""
        raise BadRequest('Unsupported admin level data source')

    # Will hold all supported data sources and define handler functions
    # specific for every source
    supported_data_sources = {
        'https://api.hungermapdata.org': parse_mvam_response
        # 'https://api.mongoliadata.org': parse_mongolia_response
    }

    base = get_base(data_url)
    return supported_data_sources.get(base, unsupported_source)(data_url, only_dates)
