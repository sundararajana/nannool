import fs from 'fs/promises';

const pm_json = './nannool.json';
const cict_json = './nannool-cict.json';

// nannool CICT data. Callback receives nurpaText as from Project Madurai,
// nurpa text sandhi split per CICT, and extended text content
// (nurpa text, nurpa variants, urai explanations from two authors).
async function forEachNurpaImpl(pmData, cictData, callback) {
  let nurpaNumber = 0;
  for (const cictItem of cictData) {
    const fields = [];

    // Not adding atikaram and iyal to avoid accidental
    // similarity match just because these two match!
    // Extract 'atikaram' (top-level)
    // fields.push(String(cictItem.atikaram));

    // Extract 'iyal' (top-level)
    // fields.push(String(cictItem.iyal));

    // if Project Madurai data has title associated, use it.
    // gives much better context for a nurpa (when available).
    if (nurpaNumber > 0) {
      const title = pmData.nurpas[nurpaNumber - 1].title;
      if (title != null && title !== "") {
        fields.push(title);
      }
    }

    // Extract 'mulam' (top-level)
    fields.push(String(cictItem.mulam));

    // Extract mulam_f1 (top-level) if available
    if (cictItem?.mulam_f1 != null && cictItem.mulam_f1 !== "") {
        fields.push(String(cictItem.mulam_f1));
    }

    // Extract mulam_f2 (top-level) if available
    if (cictItem?.mulam_f2 != null && cictItem.mulam_f2 !== "") {
        fields.push(String(cictItem.mulam_f2));
    }

    // Extract 'mayilainathar' fields
    const mayilainathar = cictItem?.commentary?.mayilainathar;
    if (mayilainathar?.gloss_wfw != null && mayilainathar.gloss_wfw !== "") {
        fields.push(String(mayilainathar.gloss_wfw));
    }
    if (mayilainathar?.expansion_viri != null && mayilainathar.expansion_viri !== "") {
        fields.push(String(mayilainathar.expansion_viri));
    }

    // Extract 'viruttiyurai' fields
    const viruttiyurai = cictItem?.commentary?.viruttiyurai;
    if (viruttiyurai?.nutalitru_enin != null && viruttiyurai.nutalitru_enin !== "") {
      fields.push(String(viruttiyurai.nutalitru_enin));
    }
    if (viruttiyurai?.gloss_ils != null && viruttiyurai.gloss_ils !== "") {
      fields.push(String(viruttiyurai.gloss_ils));
    }
    if (viruttiyurai?.expansion != null && viruttiyurai.expansion !== "") {
      let expansion = String(viruttiyurai.expansion);
      // remove those page transition tags like {{END PAGE 04b}} {{BEGIN PAGE 05அ}}
      expansion = expansion.replace(/\{\{END PAGE [^}]+\}\}\s*\{\{BEGIN PAGE [^}]+\}\}/g, '');
      fields.push(expansion);
    }

    // Join collected fields with '\n'
    const extendedNurpaText = fields.join("\n");
    // PM text does have not the sirappu pariyam. Copy it from CICT version.
    const pmText = nurpaNumber > 0 ? pmData.nurpas[nurpaNumber - 1].text : cictItem.mulam;
    await callback(pmText, cictItem.mulam, extendedNurpaText);

    nurpaNumber++;
  }
}

export async function forEachNurpa(callback) {
    const pmData = JSON.parse(await fs.readFile(pm_json, 'utf-8'));
    const cictData = JSON.parse(await fs.readFile(cict_json, 'utf-8'));
    await forEachNurpaImpl(pmData, cictData, callback);
}
