import { AutoTokenizer } from '@huggingface/transformers';

import { forEachNurpa } from './nurpa-walk-embedding.mjs';

async function auditCorpus(documents) {
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/multilingual-e5-small');

    const lengths = [];

    await forEachNurpa((pmNurpa, cictNurpa, fullText) => {
        const encoded = tokenizer(fullText, { return_tensor: false });
        lengths.push(encoded.input_ids.length);
    });

    lengths.sort((a, b) => a - b);

    const sum = lengths.reduce((acc, val) => acc + val, 0);
    const mean = sum / lengths.length;
    const median = lengths[Math.floor(lengths.length / 2)];
    const p90 = lengths[Math.floor(lengths.length * 0.90)];
    const p99 = lengths[Math.floor(lengths.length * 0.99)];

    console.log({
        min: lengths[0],
        max: lengths[lengths.length - 1],
        mean: Math.round(mean),
        median: median,
        p90: p90,
        p99: p99
    });
}

auditCorpus().catch(console.error);

