import os
import re
import json

def find_translation_keys(directory):
    keys = set()
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".js") or file.endswith(".jsx") or file.endswith(".ts") or file.endswith(".tsx"):
                file_path = os.path.join(root, file)
                with open(file_path, "r") as f:
                    content = f.read()
                    matches = re.findall(r'\bt\(\s*[\'"`](.*?)[\'"`]\s*\)', content)
                    keys.update(matches)
    
    return list(keys)

def find_translation_files(directory):
    translation_files = []
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file == "translation.json":
                file_path = os.path.join(root, file)
                translation_files.append(file_path)
    
    return translation_files

def get_file_name(file_path):
    return file_path.split("/")[-2]

def format_list(keys):
    if not keys:
        return ""
    return "".join(f"<li>{key}</li>" for key in keys)

def print_results(results, as_table=False):
    if as_table:
        print("| Translation File | Missing Keys | Extra Keys |")
        print("| ---------------- | ------------ | ---------- |")
        for file_name, missing_keys, extra_keys in results:
            print(f"| {file_name} | <ul>{format_list(missing_keys)}</ul> | <ul>{format_list(extra_keys)}</ul> |")
    else:
        for file_name, missing_keys, extra_keys in results:
            print(f"Translation File: {file_name}")
            print("Missing Keys:")
            for key in missing_keys:
                print(f"- {key}")
            print("Extra Keys:")
            for key in extra_keys:
                print(f"- {key}")
            print()

# Usage
project_directory = "./src/"
translation_keys = find_translation_keys(project_directory)
translation_files = find_translation_files(project_directory)

# Flag to control the output format
print_as_table = True

results = []
for file_path in translation_files:
    file_name = get_file_name(file_path)
    
    with open(file_path, "r") as f:
        translation_data = json.load(f)
        json_keys = list(translation_data.keys())
        
        missing_keys = set(translation_keys) - set(json_keys)
        extra_keys = set(json_keys) - set(translation_keys)
        
        results.append((file_name, missing_keys, extra_keys))

print_results(results, as_table=print_as_table)