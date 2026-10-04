# nanool

A simple interface for navigating Nannool nūrpas.

## UI

* index.html - main page to navigate nurpas by adhikaram, iyal and number, also
text search in nurpas.

* concordance.html (linked from index.html) is concordance index navigator.

## data

* nannool.json. This was scrapped Project Madurai Nannool webpage by an LLM.

* concordance.json. This is corcordnce reverse index produced from nannool.json.
This was created by running the Python program concordance_builder.py.

* nannool-cict-mulam.json. This is word (sandhi) split nurpas produced by
running nannool-dict.py. This script uses data scrapped from CICT web page.
