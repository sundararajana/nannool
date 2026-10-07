// This program is run offline with node.js to produce
// embeddings json for Nannool.

import fs from 'fs/promises';
import { pipeline } from '@huggingface/transformers';
import { forEachNurpa } from './nurpa-walk-embedding.mjs';

const output_json = './nannool_with_embeddings.json';

async function generateEmbeddings() {
  console.log("Loading multilingual-e5-small model...");

  const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');

  const enrichedData = [];
  let nurpaCounter = 0;

  await forEachNurpa(async (nurpaText, textContent) => {
    // Skip index 0 (சிறப்புப் பாயிரம்)
    if (nurpaCounter == 0) {
      console.log(`Processing raw entries (skipping index 0 / சிறப்புக் பாயிரம்)...`);
      nurpaCounter++;
      return;
    }

    // E5 Model Requirement: Prefix passages with "passage: "
    const textToEmbed = `passage: ${textContent}`;

    // Generate vector
    const output = await extractor(textToEmbed, {
      normalize: true,
      pooling: 'mean'
    });
    const vector = Array.from(output.data); // 384-dimensional float array

    // Reduce precision to 4 decimal places to shrink file size
    const roundedVector = vector.map(val => +val.toFixed(4));

    enrichedData.push({
      id: nurpaCounter,
      text: nurpaText,
      embedding: roundedVector
    });

    console.log(`Processed nurpa ID: ${nurpaCounter}`);
    nurpaCounter++;
  });

  // Save the structured, embedded JSON
  await fs.writeFile(output_json, JSON.stringify(enrichedData));
  console.log(`Success! Saved ${enrichedData.length} nurpas to ${output_json}.`);
}

generateEmbeddings().catch(console.error);

