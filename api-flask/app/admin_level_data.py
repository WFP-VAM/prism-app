from flask import request

import requests
from requests.compat import urlparse

from werkzeug.exceptions import BadRequest


def get_base(url):
    scheme, netloc, _, _, _, _ = urlparse(url)
    base = '{0}://{1}'.format(scheme, netloc)
    return base


def parse_admin_params():
    """Collect and validate request parameters"""
    data_url = request.args.get('dataUrl')
    if data_url is None:
        raise BadRequest('Missing query parameter: dataUrl')
    return data_url


def parse_mvam_response(url):
    """Parse response from Hunger Map Monitoring"""

    resp = requests.get(url)

    # instead of `resp.raise_for_status`. display the error response from mvam
    if not resp.ok:
        return resp.json()

    response = {'DataList': []}
    for item in resp.json():
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


def get_admin_response(url):
    """Process admin level data from different sources"""
    def unsupported_source(url):
        """Raises the bad request for unsupported sources"""
        raise BadRequest('Unsupported admin level data source', url)

    supported_data_sources = {
        'https://api.hungermapdata.org': parse_mvam_response,
        'unsupported': unsupported_source
    }

    base = get_base(url)
    return supported_data_sources.get(base, 'unsupported')(url)
