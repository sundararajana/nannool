import fs from 'fs';
import zlib from 'zlib';
import { pipeline } from '@huggingface/transformers';

async function computeEmbeddings() {
    // 1. Load the raw words
    const words = Object.keys(JSON.parse(fs.readFileSync('concordance.json', 'utf-8')).concordance);
    console.log(`Loaded ${words.length} words. Generating embeddings...`);

    // 2. Load model
    const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');

    // 3. Loop through EACH word individually to generate its unique vector
    const precomputedData = [];

    // 3. Loop through EACH word individually to generate its unique vector
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // E5 model format: prefix database words with "passage: "
        const textToEmbed = `passage: ${word}`;
        
        // Generate embedding for this specific word
        const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
        
        // Convert Float32Array to standard JavaScript array for JSON storage
        const vector = Array.from(output.data);

        // Reduce precision to 4 decimal places to shrink file size
        const roundedVector = vector.map(val => +val.toFixed(4));

        precomputedData.push({ word, embedding: roundedVector });

        if ((i + 1) % 500 === 0) {
            console.log(`Processed ${i + 1} / ${words.length} words...`);
        }
    }

    // 4. Save out to a static JSON file for frontend
    fs.writeFileSync('word_embeddings.json', JSON.stringify(precomputedData));
    console.log("Success! Saved embeddings to word_embeddings.json");

    const jsonContent = fs.readFileSync('word_embeddings.json');
    const compressed = zlib.gzipSync(jsonContent);
    fs.writeFileSync('word_embeddings.json.gz', compressed);
    console.log(`Compressed size: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);
}

computeEmbeddings();