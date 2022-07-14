import json
from argparse import ArgumentParser

import jwt

from shapely.geometry import shape


def process_feature(feature, secret_key, optional_fields):
    item = {}
    if optional_fields is not None:
        item = {
            k: v for k, v in feature.get("properties").items() if k in optional_fields
        }

    bbox = [str(p) for p in shape(feature.get("geometry")).bounds]

    item_with_bbox = {**item, "bbox": ",".join(bbox)}

    encoded_jwt = jwt.encode(item_with_bbox, secret_key, algorithm="HS256")

    item_with_jwt = {**item_with_bbox, "jwt": encoded_jwt}

    return item_with_jwt


def main():
    parser = ArgumentParser()
    parser.add_argument("-g", "--geojson", dest="geojson", required=True)
    parser.add_argument("-s", "--secret", dest="secret", required=True)
    parser.add_argument("-f", "--fields", dest="fields")

    args = parser.parse_args()

    with open(args.geojson, "r") as f:
        data = json.load(f)

    optional_fields = None if args.fields is None else args.fields.split(",")

    processed_features = [
        process_feature(f, args.secret, optional_fields) for f in data["features"]
    ]

    print(json.dumps(processed_features, indent=2))


if __name__ == "__main__":
    main()
