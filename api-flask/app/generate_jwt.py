import json
from argparse import ArgumentParser

import jwt
from shapely.geometry import shape


def process_feature(admin_key, dict_key, group_field, filter_field, features):
    admin_codes = [i["properties"][dict_key] for i in features if i["properties"][group_field] == admin_key]
    item =  {
        "adm1_code": admin_key,
        "adm3_codes": admin_codes,
        "filter": filter_field,
    }

    return item


def encode_item(item, secret_key):
    encoded_jwt = jwt.encode(item, secret_key, algorithm="HS256")
    return {**item, "jwt": encoded_jwt}


def main():
    parser = ArgumentParser()
    parser.add_argument("-g", "--geojson", dest="geojson", required=True)
    parser.add_argument("-s", "--secret", dest="secret", required=True)
    parser.add_argument("-k", "--group_key", dest="group_key", required=True)
    parser.add_argument("-i", "--group_item", dest="group_item", required=True)
    parser.add_argument("-f", "--filter_field", dest="filter_field", required=True)

    args = parser.parse_args()

    with open(args.geojson, "r") as f:
        data = json.load(f)

    keys = set([d["properties"][args.group_key] for d in data["features"]])
    codes = [process_feature(k, args.group_item, args.group_key, args.filter_field, data["features"]) for k in keys]

    admin_codes_jwt = [encode_item(i, args.secret) for i in codes]

    print(json.dumps(admin_codes_jwt, indent=2))


if __name__ == "__main__":
    main()
