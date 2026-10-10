#!/usr/bin/env python3

import base64
import gzip
import json
import re
import urllib.request
from pathlib import Path

# This script scrapes nannnool nurpa info from CICT website

URL = (
    "https://raw.githubusercontent.com/"
    "cictdl/Nannul-of-Pavananti-Munivar/main/index.html"
)


# Compiled regex pattern:
# Matches 'ஒ' (\u0b92) or 'ஓ' (\u0b93) immediately followed by 'ள' (\u0bb3)
# but not followed by vowel matra sign
pattern = re.compile(r'[\u0b92\u0b93]\u0bb3(?![\u0bbe-\u0bcc])')

# CICT nanool nurpa texts has the above transcription issue
def normalize_au_letter(text):
    if not isinstance(text, str):
        return text
    # Replace any matched variation with the correct ஔ (\u0b94)
    return pattern.sub('\u0b94', text)

def main():
    print(f"Fetching {URL} ...")

    with urllib.request.urlopen(URL) as response:
        html = response.read().decode("utf-8")

    # CICT embeds the compressed JSON in:
    #
    #   <script id="payload">BASE64...</script>
    #
    match = re.search(
        r'<script[^>]*\bid=["\']payload["\'][^>]*>(.*?)</script>',
        html,
        re.DOTALL | re.IGNORECASE,
    )

    if not match:
        raise RuntimeError("Could not find CICT payload")

    b64 = match.group(1).strip()

    # Base64 -> gzip bytes -> JSON text
    compressed = base64.b64decode(b64)
    json_text = gzip.decompress(compressed).decode("utf-8")

    data = json.loads(json_text)
    records = data["nurpa"]

    print(f"Records found: {len(records)}")

    # Correct the known CICT transcription issue in selected fields.
    fields_to_normalize = ("mulam", "mulam_f1")
    corrections = 0

    for record in records:
        for field in fields_to_normalize:
            value = record.get(field)
            if isinstance(value, str):
                corrected = normalize_au_letter(value)
                corrections += value.count("ஒள") - corrected.count("ஒள")
                corrections += value.count("ஓள") - corrected.count("ஓள")
                record[field] = corrected

    print(f"Corrections applied: {corrections}")

    # ------------------------------------------------------------------
    # Complete CICT records
    #
    # | CICT field     | Meaning                                |
    # | -------------- | -------------------------------------- |
    # | `mulam`        | **F3** — CICT's clean/word-split mūlam |
    # | `mulam_f1`     | **F1** — மயிலைநாதர் source              |
    # | `mulam_f2`     | **F2** — விருத்தி source                  |
    # | `f1_num`       | F1/source numbering                    |
    # | `f2_num`       | F2/source numbering                    |
    # | `canonical_id` | CICT's internal record ID              |
    # ------------------------------------------------------------------

    with open("nannool-cict.json", "w", encoding="utf-8") as f:
        json.dump(
            records,
            f,
            ensure_ascii=False,
            indent=2,
        )
        f.write("\n")

    print("Written: nannool-cict.json")

    # a json with only nurpas in word split form.
    with open("nannool-cict-mulam.json", "w", encoding="utf-8") as f:
        json.dump(
            [ item["mulam"] for item in records ],
            f,
            ensure_ascii=False,
            indent=2,
        )
        f.write("\n")

    print("Written: nannool-cict-mulam.json")

if __name__ == "__main__":
    main()
