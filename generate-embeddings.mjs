// This program is run offline with node.js to produce
// embeddings json for Nannool.

import fs from 'fs/promises';
import { pipeline } from '@huggingface/transformers';

const input_json = './nannool-cict.json';
const output_json = './nannool_with_embeddings.json';

// This function calls callback for each Nurpa from
// nannool CICT data. Callback receives nurpaText
// and extended text content (atikaram, iyal, nurpa text
// nurpa variants, urai explanations from two authors).
async function forEachNurpa(jsonData, callback) {
  for (const item of jsonData) {
    const fields = [];
    // Extract 'atikaram' (top-level)
    fields.push(String(item.atikaram));

    // Extract 'iyal' (top-level)
    fields.push(String(item.iyal));

    // Extract 'mulam' (top-level)
    fields.push(String(item.mulam));

    // Extract mulam_f1 (top-level) if available
    if (item?.mulam_f1 != null && item.mulam_f1 !== "") {
      fields.push(String(item.mulam_f1));
    }

    // Extract mulam_f2 (top-level) if available
    if (item?.mulam_f2 != null && item.mulam_f2 !== "") {
      fields.push(String(item.mulam_f2));
    }

    // Extract 'mayilainathar' fields
    const mayilainathar = item?.commentary?.mayilainathar;
    if (mayilainathar?.gloss_wfw != null && mayilainathar.gloss_wfw !== "") {
        fields.push(String(mayilainathar.gloss_wfw));
    }
    if (mayilainathar?.expansion_viri != null && mayilainathar.expansion_viri !== "") {
        fields.push(String(mayilainathar.expansion_viri));
    }
    // Extract 'viruttiyurai' fields
    const viruttiyurai = item?.commentary?.viruttiyurai;
    if (viruttiyurai?.nutalitru_enin != null && viruttiyurai.nutalitru_enin !== "") {
      fields.push(String(viruttiyurai.nutalitru_enin));
    }
    if (viruttiyurai?.expansion != null && viruttiyurai.expansion !== "") {
      fields.push(String(viruttiyurai.expansion));
    }

    // Join collected fields with '\n'
    const fullText = fields.join("\n");
  
    await callback(item.mulam, fullText);
  }
}

async function generateEmbeddings() {
  console.log("Loading multilingual-e5-small model...");

  const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
    pooling: 'mean',
    normalize: true,
  });

  console.log("Reading raw Nannool JSON...");
  const rawData = JSON.parse(await fs.readFile(input_json, 'utf-8'));

  const enrichedData = [];
  let nurpaCounter = 0;

  await forEachNurpa(rawData, async (nurpaText, textContent) => {
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

