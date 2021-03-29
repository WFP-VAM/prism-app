import logging
from datetime import date

from app.alerting.config import Config

logger = logging.getLogger(__name__)


class AlertsPreprocessJob:

    def run(self):
        logger.info("running...")
        config = Config()
        timestamp = date.today()
        for nation in config.NATIONS:
            for hazard_layer in config.HAZARD_LAYERS:
                logger.info("Downloading data for %s, %s", nation, hazard_layer)
                # TODO: get flask's client on localhost
                content = ""
                with open(config.FEATURE_DATA_PATH.format(nation=nation, hazard_layer=hazard_layer, timestamp=timestamp)) as f:
                    f.write(content)
                    f.close()
                # TODO: handle file check in case of rerun

        logger.info("Precessing job is complected.")
