import fs from 'fs/promises';

const input_json = './nannool-cict.json';

// nannool CICT data. Callback receives nurpaText
// and extended text content (atikaram, iyal, nurpa text
// nurpa variants, urai explanations from two authors).
async function forEachNurpa(jsonData, callback) {
  for (const item of jsonData) {
    const fields = [];

    // Not adding atikaram and iyal to avoid accidental
    // similarity match just because these two match!
    // Extract 'atikaram' (top-level)
    // fields.push(String(item.atikaram));

    // Extract 'iyal' (top-level)
    // fields.push(String(item.iyal));

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
    if (viruttiyurai?.gloss_ils != null && viruttiyurai.gloss_ils !== "") {
      fields.push(String(viruttiyurai.gloss_ils));
    }
    if (viruttiyurai?.expansion != null && viruttiyurai.expansion !== "") {
      fields.push(String(viruttiyurai.expansion));
    }

    // Join collected fields with '\n'
    const fullText = fields.join("\n");
    await callback(item.mulam, fullText);
  }
}

export async function forEachNurpaCICT(callback) {
    const rawData = JSON.parse(await fs.readFile(input_json, 'utf-8'));
    await forEachNurpa(rawData, callback);
}
