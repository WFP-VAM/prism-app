"""Collect and parse idpoor cambodia data."""
import requests

BASE_API = 'https://mop.idpoor.gov.kh/api/analytics/public/units'
ROUND_YEARS = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019]


def get_idpoor_response():
    """Get IDPoor location data."""
    datalist = dict()
    default_params = 'region=ALL&isOnDemand=ALL&round=ALL'

    # loop over reversed round years
    for year in reversed(ROUND_YEARS):
        provinces_uri = '{0}/KH/children?year={1}&{2}'.format(BASE_API, year, default_params)
        resp = requests.get(provinces_uri)
        resp.raise_for_status()

        provinces_data = resp.json()
        # one each year get provinces and get all communes per province
        for province in provinces_data:
            province_id = province['uuid']
            districts_uri = '{0}/{1}/children?year={2}&{3}'.format(
                BASE_API, province_id, year, default_params
            )
            resp = requests.get(districts_uri)
            resp.raise_for_status()

            districts_data = resp.json()

            for district in districts_data:
                district_id = district['uuid']
                communes_uri = '{0}/{1}/children?year={2}&{3}'.format(
                    BASE_API, district_id, year, default_params
                )
                resp = requests.get(communes_uri)
                resp.raise_for_status()

                communes_data = resp.json()

                for commune in communes_data:
                    key = commune['code']
                    del commune['code']
                    if key not in datalist.keys():
                        datalist[key] = {'Adm3_NCDD': key, **commune}

    return {'DataList': list(datalist.values())}
