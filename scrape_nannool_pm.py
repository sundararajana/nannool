#!/usr/bin/env python3
"""
Scrape Project Madurai's Unicode Nannool etext (pmuni0152.html).

The Project Madurai HTML is old HTML 3.2 and is not well-formed HTML.
In particular, the nūṟpā-number <td> is sometimes nested inside the
text <td>.  This scraper deliberately uses BeautifulSoup's parsed DOM
rather than assuming well-formed table markup.

Output format:

{
  "source": {
    "title": "நன்னூல்",
    "author": "பவணந்தி முனிவர்",
    "edition": "Project Madurai pmuni0152",
    "source_file": "pmuni0152.html",
    "nurpa_count": 462
  },
  "nurpas": [
    {
      "number": 1,
      "adhikaram": "பொதுப்பாயிரம்",
      "iyal": "பொதுப்பாயிரம்",
      "title": "பாயிரத்தின் பெயர்கள்",
      "text": "..."
    }
  ]
}

The preliminary சிறப்புப்பாயிரம் is deliberately excluded.

Requirements:
    pip install requests beautifulsoup4

Examples:
    python scrape_nannool_pm.py
    python scrape_nannool_pm.py --input pmuni0152.html
    python scrape_nannool_pm.py --output nannool.json
"""

import argparse
import json
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup


DEFAULT_URL = "https://www.projectmadurai.org/pm_etexts/utf8/pmuni0152.html"
DEFAULT_OUTPUT = "nannool.json"


def download_html(url):
    response = requests.get(
        url,
        timeout=30,
        headers={
            "User-Agent": "Mozilla/5.0 (Nannool Project Madurai scraper)"
        },
    )
    response.raise_for_status()
    response.encoding = "utf-8"
    return response.text


def normalize_text(text):
    """Normalize whitespace while preserving intentional line breaks."""
    text = text.replace("\r", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n+", "\n", text)
    return text.strip()


def is_adhikaram_heading(text):
    """
    Project Madurai headings include:

        1 பொதுப்பாயிரம்
        2. எழுத்ததிகாரம்
        3 சொல்லதிகாரம்

    Note that எழுத்ததிகாரம் / சொல்லதிகாரம் end in 'திகாரம்',
    not the literal string 'அதிகாரம்'.
    """
    return bool(
        re.match(r"^\d+\.?\s+.+திகாரம்$", text)
        or text == "1 பொதுப்பாயிரம்"
    )


def remove_number_td(td):
    """
    The PM HTML is malformed. A row effectively looks like:

        <td>
            ... nūṟpā text ...
            <td>1</td>
        </td>

    BeautifulSoup therefore sees the number td nested inside the first td.
    Remove nested td elements before extracting the text body.
    """
    for nested_td in td.find_all("td"):
        nested_td.decompose()


def parse_nurpa_row(tr):
    """Return one nūṟpā record from a PM <tr>, or None."""
    tds = tr.find_all("td")

    if len(tds) < 2:
        return None

    number_text = tds[-1].get_text(" ", strip=True)

    if not number_text.isdigit():
        return None

    number = int(number_text)

    td = tds[0]

    # Save the title before modifying the cell.
    title_tag = td.find("i")
    title = (
        title_tag.get_text(" ", strip=True)
        if title_tag is not None
        else None
    )

    # Remove the nested number cell.
    remove_number_td(td)

    # Work on a small reparsed copy so the original BeautifulSoup tree
    # remains usable while iterating over the document.
    cell = BeautifulSoup(str(td), "html.parser").find("td")

    # Remove the italic title from the actual nūṟpā text.
    italic = cell.find("i")
    if italic is not None:
        italic.decompose()

    # Project Madurai uses <br> for verse line breaks.
    for br in cell.find_all("br"):
        br.replace_with("\n")

    # <p> here is being used as a separator before the nūṟpā body,
    # rather than as content that should appear in the extracted text.
    for p in cell.find_all("p"):
        p.unwrap()

    text = normalize_text(cell.get_text("", strip=False))

    return number, title, text

# Compiled regex pattern:
# Matches 'ஒ' (\u0b92) or 'ஓ' (\u0b93) immediately followed by 'ள' (\u0bb3)
pattern = re.compile(r'[\u0b92\u0b93]\u0bb3')

# backup titles for nurpas for which title may be missing
backup_titles = {
    64: "குறில் எழுத்துகள்",
    65: "நெடில் எழுத்துகள்",
    66: "சுட்டு எழுத்துக்கள்",
    67: "வினா எழுத்துகள்",
    68: "வல்லின எழுத்துகள்",
    69: "மெல்லின எழுத்துகள்",
    70: "இடையின எழுத்துகள்",
    76: "உயிர் எழுத்துப் பிறப்பு அ ஆ",
    77: "உயிர் எழுத்துப் பிறப்பு இ ஈ எ ஏ ஐ",
    78: "உயிர் எழுத்துப் பிறப்பு உ ஊ ஒ ஓ ஒள ",
    79: "மெய் எழுத்துப் பிறப்பு க ங ச ஞ ட ண",
    80: "மெய் எழுத்துப் பிறப்பு த ந",
    81: "மெய் எழுத்துப் பிறப்பு ப ம",
    82: "மெய் எழுத்துப் பிறப்பு ய",
    83: "மெய் எழுத்துப் பிறப்பு ர ழ",
    84: "மெய் எழுத்துப் பிறப்பு ல ள",
    85: "மெய் எழுத்துப் பிறப்பு வ",
    86: "மெய் எழுத்துப் பிறப்பு ற ன",
    87: "சார்பெழுத்துக்கு இடமுயற்சி",
    104: "யகர மொழி முதல் எழுத்துகள்",
    105: "ஞகர மொழி முதல் எழுத்துகள்",
    106: "ஙகர மொழி முதல் எழுத்துகள்",
    110: "இடைநிலை மெய்ம்மயக்கம்",
    112: "ஞ ந முன் மெய்ம்மயக்கம்",
    113: "ட ற முன் மெய்ம்மயக்கம்",
    114: "ண ன முன் மெய்ம்மயக்கம்",
    115: "ம முன் மெய்ம்மயக்கம்",
    116: "ய ர ழ முன் மெய்ம்மயக்கம்",
    117: "ல ள முன் மெய்ம்மயக்கம்",
    118: "உடனிலை மெய்ம்மயக்கம்",
    136: "பண்புப்பெயர்ப் புணர்ச்சி",
    140: "வினை பெயர் விகுதிகள்",
    148: "முதலெழுத்து ர ல ய அரங்கன் இராமன் இலாபம்",
    162: "உடம்படுமெய்",
    170: "பல சில புணர்ச்சி",
    175: "புளி சுவை புணர்ச்சி",
    186: "திசைப்பெயர் புணர்ச்சி",
    187: "தேங்காய் புணர்ச்சி",
    188: "எண்ணு நிறை புணர்ச்சி",
    214: "தேன்மொழி புணர்ச்சி",
    246: "எல்லாரும் எல்லீரும் உருபுப்புணர்ச்சி",
    247: "மூவிடப்பெயர் உருபுப்புணர்ச்சி",
    248: "ஆ, மா, கோ என்னும் ஓர் எழுத்துப் பெயர் உருபுப்புணர்ச்சி",
    249: "எண்ணுப்பெயர் உருபுப்புணர்ச்சி",
    250: "அவ, இவ, உவ உருபுப்புணர்ச்சி"
}

# project madurai nanool nurpa texts has this bug.
def normalize_au_letter(text):
    if not isinstance(text, str):
        return text
    # Replace any matched variation with the correct ஔ (\u0b94)
    return pattern.sub('\u0b94', text)

def scrape(html):
    soup = BeautifulSoup(html, "html.parser")

    # State while walking through the document.
    started = False
    adhikaram = None
    iyal = None
    section = None

    nurpas = []

    # Process headings and tables in document order.
    for element in soup.find_all(["h2", "h3", "b", "table"]):
        text = " ".join(element.stripped_strings)

        # --------------------------------------------------------------
        # Start at the numbered பொதுப்பாயிரம்.
        #
        # This deliberately skips the preceding சிறப்புப்பாயிரம்,
        # whose verse-line numbers are also numeric.
        # --------------------------------------------------------------
        if element.name in ("h2", "h3"):

            if text == "1 பொதுப்பாயிரம்":
                started = True
                adhikaram = "பொதுப்பாயிரம்"
                iyal = "பொதுப்பாயிரம்"
                section = None
                continue

            if not started:
                continue

            # Adhikaram headings.
            if is_adhikaram_heading(text):
                adhikaram = re.sub(r"^\d+\.?\s+", "", text)
                iyal = None
                section = None
                continue

            # Iyal headings, e.g.:
            #   1 எழுத்தியல்
            #   2. பதவியல்
            if (
                element.name == "h3"
                and re.match(r"^\d+\.?\s+", text)
            ):
                iyal = re.sub(r"^\d+\.?\s+", "", text)
                section = None
                continue

        # --------------------------------------------------------------
        # Numbered <b> headings are sections.
        #
        # Examples:
        #   1. நூலினது வரலாறு
        #   1 பதம்
        #   1. சொல்லின் பொது இலக்கணம்
        # --------------------------------------------------------------
        elif element.name == "b" and started:
            if re.match(r"^\d+\.?\s+", text):
                section = re.sub(r"^\d+\.?\s+", "", text)
                continue

        # --------------------------------------------------------------
        # Nūṟpā tables.
        # --------------------------------------------------------------
        elif element.name == "table" and started:

            for tr in element.find_all("tr"):
                parsed = parse_nurpa_row(tr)

                if parsed is None:
                    continue

                number, title, text = parsed

                # The original final JSON used by the project does not
                # expose the intermediate 'section' field.  The section
                # is nevertheless tracked above because it is needed
                # to understand the PM hierarchy.

                # HACK specific nurpas for which title may be missing or
                # we want to augment title by a prefix
                try:
                    if int(number) in backup_titles:
                        title = backup_titles[int(number)] + " " + (title or "")
                except:
                    pass

                nurpas.append(
                    {
                        "number": number,
                        "adhikaram": adhikaram,
                        "iyal": iyal,
                        "title": normalize_au_letter(title),
                        "text": normalize_au_letter(text),
                    }
                )

    return nurpas


def main():
    parser = argparse.ArgumentParser(
        description="Scrape Nannool from Project Madurai."
    )

    parser.add_argument(
        "--url",
        default=DEFAULT_URL,
        help="Project Madurai URL",
    )

    parser.add_argument(
        "--input",
        help="Use a local pmuni0152.html instead of downloading it",
    )

    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help="Output JSON filename",
    )

    args = parser.parse_args()

    if args.input:
        print("Reading:", args.input)
        html = Path(args.input).read_text(encoding="utf-8")
    else:
        print("Downloading:", args.url)
        html = download_html(args.url)

    nurpas = scrape(html)

    result = {
        "source": {
            "title": "நன்னூல்",
            "author": "பவணந்தி முனிவர்",
            "edition": "Project Madurai pmuni0152",
            "source_file": "pmuni0152.html",
            "nurpa_count": len(nurpas),
        },
        "nurpas": nurpas,
    }

    output = Path(args.output)

    output.write_text(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Wrote {len(nurpas)} nūṟpās to {output}")

    if len(nurpas) != 462:
        raise SystemExit(
            f"ERROR: expected 462 nūṟpās, got {len(nurpas)}"
        )


if __name__ == "__main__":
    main()
