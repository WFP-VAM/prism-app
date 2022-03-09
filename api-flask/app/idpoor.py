"""Collect and parse idpoor cambodia data."""
import requests

BASE_API = 'https://mop.idpoor.gov.kh/api/analytics/public/units'


def get_idpoor_response():
    """Get IDPoor location data."""
    datalist = dict()
    default_params = 'region=ALL&isOnDemand=ALL&year=ALL'

    rounds_uri = '{0}/KH?{1}&round=ALL'.format(BASE_API, default_params)
    resp = requests.get(rounds_uri)
    resp.raise_for_status()

    rounds_data = resp.json()['rounds']

    rounds = list(map(lambda data: int(data['name']), rounds_data))
    rounds.sort(reverse=True)

    # loop over reversed round years
    for round in rounds:
        provinces_uri = '{0}/KH/children?round={1}&{2}'.format(BASE_API, round, default_params)
        resp = requests.get(provinces_uri)
        resp.raise_for_status()

        provinces_data = resp.json()
        # one each year get provinces and get all communes per province
        for province in provinces_data:
            province_id = province['uuid']
            districts_uri = '{0}/{1}/children?round={2}&{3}'.format(
                BASE_API, province_id, round, default_params
            )
            resp = requests.get(districts_uri)
            resp.raise_for_status()

            districts_data = resp.json()

            for district in districts_data:
                district_id = district['uuid']
                communes_uri = '{0}/{1}/children?round={2}&{3}'.format(
                    BASE_API, district_id, round, default_params
                )
                resp = requests.get(communes_uri)
                resp.raise_for_status()

                communes_data = resp.json()

                for commune in communes_data:
                    key = int(commune['code'])
                    if key not in datalist.keys():
                        datalist[key] = {'Adm3_NCDD': str(key), **commune}

    return {'DataList': list(datalist.values())}
