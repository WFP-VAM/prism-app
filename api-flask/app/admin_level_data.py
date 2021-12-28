from flask import request
from dateutil.parser import parse as dateparser
from datetime import datetime, timedelta
from werkzeug.exceptions import BadRequest
import requests
from requests.compat import urlparse, urljoin


def is_date(val):
    """Check weither value is a valid date"""
    try:
        dateparser(val, fuzzy=False)
        return True
    except ValueError:
        return False


def get_base_and_path(url):
    scheme, netloc, path, _, _, _ = urlparse(url)
    base = '{0}://{1}'.format(scheme, netloc)
    return (base, path)


def get_or_create_end_date(start, end, range_in_days):
    """Based on start date, calculate end date based on range in days"""
    today = datetime.today()
    if end is None:
        end_date = start + timedelta(range_in_days)
        return end_date if end_date > today else today
    return end


def parse_admin_params():
    """Collect and validate request parameters"""
    data_url = request.args.get('dataUrl')

    if data_url is None:
        raise BadRequest('Missing query parameter: dataUrl')
        
    start_date = request.args.get('startDate')
    if start_date is None:
        raise BadRequest('Missing query parameter: startDate')
    if is_date(start_date):
        start_date = dateparser(start_date, fuzzy=False)
    else:
        raise BadRequest('Wrong startDate query parameter format')

    end_date = request.args.get('endDate')
    return dict(data_url=data_url, start_date=start_date, end_date=end_date)


def parse_mvam_response(url, start, end):
    """Parse response from Hunger Map Monitoring"""

    MVAM_DAYS_RANGE = 100
    end_date = get_or_create_end_date(start, end, MVAM_DAYS_RANGE)

    base, path = get_base_and_path(url)
    full_url = urljoin(base, path)
    start_formatted = datetime.strftime(start, "%Y-%m-%d")
    end_formatted = datetime.strftime(end_date, "%Y-%m-%d")
    
    resp = requests.get(
        full_url,
        params={'date_start': start_formatted, 'date_end': end_formatted}
    )
    raw_data = resp.json()
    return raw_data


def unsupported_source():
    """Raises the bad request for unsupported sources"""
    raise BadRequest('Unsupported admin level data source')


def get_admin_response(url, start, end):
    """Process admin level data from different sources"""
    supported_data_sources = {
        'https://api.hungermapdata.org': parse_mvam_response
    }

    base, path = get_base_and_path(url)
    full_url = urljoin(base, path)
    return supported_data_sources.get(base)(
        full_url, start, end
    )
