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
