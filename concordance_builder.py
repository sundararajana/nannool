import json
import re
import unicodedata
from collections import defaultdict


INPUT_FILE = "nannool.json"
OUTPUT_FILE = "concordance.json"


def tokenize(text):
    text = unicodedata.normalize("NFC", text)
    return re.findall(r"[\u0B80-\u0BFF]+", text)


with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)


nurpas = []
concordance = defaultdict(list)


for sutra in data["sutras"]:
    global_noorpa = sutra["number"]

    text = unicodedata.normalize("NFC", sutra["text"])

    # Store each sūtra exactly once, using 0-based array indexing.
    nurpas.append(text)

    paadal_position = 0

    for line_number, line in enumerate(text.splitlines(), start=1):
        words = tokenize(line)

        for position, word in enumerate(words):
            concordance[word].append({
                "adhikaaram": sutra["adhikaram"],
                "iyal_name": sutra["iyal"],
                "title": sutra["title"],
                "global_noorpa": global_noorpa,
                "line": line_number,
                "position": position,
                "paadal_position": paadal_position
            })

            paadal_position += 1

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
