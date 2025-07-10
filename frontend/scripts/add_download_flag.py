#!/usr/bin/env python3
import json
from pathlib import Path
import argparse

def process_layers_json(path: Path, default_download: bool = False):
    """
    Load the JSON at `path`, then for each top-level layer:
    - if 'download' is missing, add it
    - if 'download' exists but != default_download, overwrite it
    Overwrite the file only if any changes were made.
    """
    with path.open('r', encoding='utf-8') as f:
        data = json.load(f)

    modified = False
    for layer_name, layer_data in data.items():
        if isinstance(layer_data, dict):
            current = layer_data.get('download', None)
            # add if missing, or update if mismatched
            if current is None or current != default_download:
                layer_data['download'] = default_download
                modified = True

    if modified:
        with path.open('w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        print(f"Updated {path}")
    else:
        print(f"No changes needed for {path}")

def main(base_dir: str, default_download: bool):
    base_path = Path(base_dir)
    if not base_path.is_dir():
        print(f"Error: '{base_dir}' is not a directory.")
        return

    for layers_file in base_path.rglob('layers.json'):
        process_layers_json(layers_file, default_download)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="Recursively ensure every layer in layers.json has 'download' set to your default."
    )
    parser.add_argument(
        'base_dir',
        help="Root folder to search for layers.json files"
    )
    parser.add_argument(
        '--default-true',
        action='store_true',
        help="Set new (or mismatched) download flags to true; omit for false"
    )
    args = parser.parse_args()

    main(args.base_dir, default_download=args.default_true)
