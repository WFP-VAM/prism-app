class Config:
    NATIONS = ["mongolia"]
    # TODO: gather all the supported layers
    HAZARD_LAYERS = [""]

    # TODO: create DB user and use DB
    # TODO: update the DB name
    DB_NAME = "mydb"
    USER = "username"

    # TODO: find a permanent location with write permission in FileSystem
    FEATURE_DATA_PATH = "/tmp/{timestamp}/{nation}/{hazard_layer}/features_data_{version}"
    ALERTS_DATA_PATH = "/tmp/{timestamp}/{nation}/{hazard_layer}/alerts_data_{version}"
    ADMIN_DATA_PATH = "/tmp/{timestamp}/{nation}/admin_data"

