import json
from pprint import pprint
from enum import Enum


class Stats(Enum):
    SUM = "sum"
    STD = "std"
    MEDIAN = "median"
    MIN = "min"
    MAX = "max"


class StatsData:
    ADM_EN_PREFIX = 'ADM%s_EN'
    ADM_LEVEL = 2

    def __init__(self, features: list):
        self.stats_data = {}
        self.update(features)

    def update(self, features: list):
        for feature in features:
            curr = self.stats_data
            # Fill in all the levels of admins
            for i in range(self.ADM_LEVEL + 1):
                curr_level_name = self.ADM_EN_PREFIX % i
                curr_admin_name = feature[curr_level_name]

                if curr_admin_name not in curr:
                    curr[curr_admin_name] = {}

                curr = curr[curr_admin_name]

            # fill in stats results
            for key in feature:
                if key.startswith('stat'):
                    curr[key] = feature[key]

    def get_stats(self, admins: list, stat_type: str):
        curr = self.stats_data
        for admin in admins:
            curr = curr[admin]
        return curr[stat_type]


class AlertsProcessor:
    """
    It's based on current PRIMS static UI setup, the resolution is
    controlled by `admin_boundaries.json`, there are different level of
    ADMs (ADM2, ADM3, etc.)
    """

    def __init__(self):
        self.stats_data = StatsData(self.load_features_stats())
        pprint(self.stats_data.stats_data)

    def load_features_stats(self, path: str):
        # '/tmp/features_data.json'
        with open(path) as json_file:
            features = json.load(json_file)
        return features

    def check_alerts_with_admins(self, alerts=[]):
        # TODO: the alerts data are queried from DB
        # TODO: can invoke multi-threading to do the job
        for alert in alerts:
            admins = [alert[StatsData.ADM_EN_PREFIX % i] for i in range(StatsData.ADM_LEVEL + 1)]

            for stat_type in Stats.__members__.keys():
                value = self.stats_data.get_stats(admins, 'stats_' + stat_type)
                if alert["%s_threshold" % type][0] < value < alert["%s_threshold" % stat_type][1]:
                    print('pass!')
                else:
                    # TODO: gather all the alerts that've failed threshold check and update DB
                    print('alert! Id: %s, Type: %s' % (alert['alertId'], stat_type))

    def check_alerts_with_geojson(self, alerts=[]):
        """The random geojson threshold check will need additional stats API query."""
        # TODO: the alerts data are queried from DB
        # TODO: can invoke multi-threading to do the job
        for alert in alerts:
            pass


if __name__ == '__main__':
    p = AlertsProcessor()
    p.check_alerts_with_admins()
