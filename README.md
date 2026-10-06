# nanool

A simple interface to navigate, search, read explanations of Nannool nūrpas.

## UI

* index.html - main page to navigate nurpas by adhikaram, iyal and number, also
text search in nurpas.

* concordance.html (linked from index.html) is concordance index navigator for Nannool.

* search.html (linked from index.html) is semantic search for Nannool.

## data

* nannool.json. This was scraped Project Madurai Nannool webpage by an LLM.

* concordance.json. This is corcordnce reverse index produced from nannool.json.
This was created by running the Python program concordance_builder.py.

* nannool-cict-mulam.json. This is word (sandhi) split nurpas produced by
running nannool-dict.py. This script uses data scraped from CICT web page.

* node js program generate-embeddings.mjs is run to produce nannool_with_embeddings.json
for semantic search.
