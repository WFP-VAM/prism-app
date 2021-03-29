from app.alerting.jobs.alerts_calculation_job import AlertsCalculationJob
from app.alerting.jobs.alerts_delivery_job import AlertsDeliveryJob
from app.alerting.jobs.alerts_preprocess_job import AlertsPreprocessJob

if __name__ == '__main__':
    AlertsPreprocessJob().run()
    AlertsCalculationJob().run()
    AlertsDeliveryJob().run()
