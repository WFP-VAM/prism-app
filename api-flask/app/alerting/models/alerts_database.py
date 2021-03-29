import psycopg2


class AlertsDataBase:
    """
    This object provides the methods that will be required to connect to
    database that stores the alerts threshold and layers, etc.
    """
    def __init__(self, db=""):
        self.conn = psycopg2.connect(database=db, user=self.USER)
        self.cur = self.conn.cursor()

    def query(self, query):
        self.cur.execute(query)

    def close(self):
        self.cur.close()
        self.conn.close()

    def get_alerts(self, nation: str, hazard_layer: str) -> list:
        """
        Connects to DB and get all the stored thresholds for current nation, hazard_layer.
        :return: a list of rows that contains alert data.
        """
        # TODO: update query when DB schema is defined

        alert_query = """SELECT * WHERE %s WHERE %s""".format(nation, hazard_layer)
        self.query(alert_query)
        return [{ "alertId": 1, "Alt_pcode": "1003", "ADM0_EN": "Mongolia",  "NSO_Region_EN": "Khangai region",
                    "ADM1_EN": "Uvurkhangai", "ADM2_EN": "Bat-Ulzii",
                    "min_threshold": [20, 30], "max_threshold": [20, 30], "sum_threshold": [20, 30] },
                  {"alertId": 2, "Alt_pcode": "1003", "ADM0_EN": "Mongolia", "NSO_Region_EN": "Khangai region",
                   "ADM1_EN": "Uvurkhangai", "ADM2_EN": "Uyanga",
                   "min_threshold": [20, 30], "max_threshold": [20, 30], "sum_threshold": [20, 30]},
                  ]

    def get_notification_details(self, alert_ids: list) -> list:
        """
        Given alert_ids, get their corresponding emails that will get alert.
        """
        # TODO: update query when DB schema is defined

        alert_query = """SELECT * WHERE %s""".format(alert_ids)
        self.query(alert_query)
        return [{ "alertId": 1, "email": "email0"},
                {"alertId": 2, "email": "email1"},
                {"alertId": 3, "email": "email2"}]
