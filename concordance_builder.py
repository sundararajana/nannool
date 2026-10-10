import json
import re
import unicodedata
from collections import defaultdict


INPUT_FILE = "nannool-cict.json"
OUTPUT_FILE = "concordance.json"


def tokenize(text):
    text = unicodedata.normalize("NFC", text)
    return re.findall(r"[\u0B80-\u0BFF]+", text)


with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)


nurpas = []
concordance = defaultdict(list)


for nurpa in data:
    global_nurpa = nurpa["canonical_id"]
    # ignore sirappu payiram
    if global_nurpa == 0:
        continue

    text = unicodedata.normalize("NFC", nurpa["mulam"])

    # Store each sūtra exactly once, using 0-based array indexing.
    nurpas.append(text)

    nurpa_position = 0

    for line_number, line in enumerate(text.splitlines(), start=1):
        words = tokenize(line)

        for position, word in enumerate(words):
            concordance[word].append({
                "adhikaaram": nurpa["atikaram"],
                "iyal_name": nurpa["iyal"],
                "title": nurpa["heading"],
                "global_nurpa": global_nurpa,
                "line": line_number,
                "position": position,
                "nurpa_position": nurpa_position
            })

            nurpa_position += 1

output = {
    "nurpas": nurpas,
    "concordance": dict(concordance)
}

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(
        output,
        f,
        ensure_ascii=False,
        indent=2
    )
