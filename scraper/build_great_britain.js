// Builds for Great Britain (Bolt Action v3):
// 1. factions/great_britain.json         (structured JSON dataset)
// 2. factions/great_britain.md           (organized Markdown reference in 100% official EasyArmy nomenclature)
// 3. factions/great_britain_app_data.js  (multi-faction browser bundle for index.html)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlatoon, parseUnit } from './parse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TPL_DIR = path.join(__dirname, 'out', '4', 'templates');
const HTML_DIR = path.join(__dirname, 'out', '4', 'html');

// Re-parse cached HTML files with latest parser rules when --reparse is passed
if (process.argv.includes('--reparse') && fs.existsSync(HTML_DIR) && fs.existsSync(TPL_DIR)) {
  const tplFiles = fs.readdirSync(TPL_DIR).filter((f) => f.endsWith('.json'));
  for (const file of tplFiles) {
    const tplPath = path.join(TPL_DIR, file);
    const existing = JSON.parse(fs.readFileSync(tplPath, 'utf8'));
    const tplId = existing.template?.id || path.basename(file, '.json');
    const platoonHtmlPath = path.join(HTML_DIR, `platoon_${tplId}.html`);
    if (!fs.existsSync(platoonHtmlPath)) continue;

    const platoon = parsePlatoon(fs.readFileSync(platoonHtmlPath, 'utf8'));
    const seen = new Map();
    for (const col of platoon.columns) {
      for (const box of col) {
        for (const u of box.units) {
          const key = `${box.section}||${u.name}`;
          if (!seen.has(key)) seen.set(key, { section: box.section, name: u.name, cbID: u.cbID });
        }
      }
    }
    const units = [];
    for (const s of seen.values()) {
      const unitHtmlPath = path.join(HTML_DIR, `unit_${tplId}_${s.cbID}.html`);
      const fallbackUnitHtmlPath = path.join(HTML_DIR, `unit_${s.cbID}.html`);
      const finalUnitPath = fs.existsSync(unitHtmlPath) ? unitHtmlPath : fallbackUnitHtmlPath;
      if (!fs.existsSync(finalUnitPath)) continue;
      const unit = parseUnit(fs.readFileSync(finalUnitPath, 'utf8'));
      units.push({ section: s.section, listName: s.name, ...unit });
    }
    if (units.length > 0) {
      existing.units = units;
      fs.writeFileSync(tplPath, JSON.stringify(existing, null, 1));
    }
  }
}

const MAIN_TEMPLATES = [
  { id: 638, key: 'infantry', code: 'RIFLE PLATOON', shortName: 'Rifle Platoon', icon: '🎖️', periodIds: { All: 638, EW: 639, MW: 640, LW: 641 }, rbId: 497 },
  { id: 642, key: 'engineer', code: 'ENGINEER PLATOON', shortName: 'Engineer Platoon', icon: '💣', periodIds: { All: 642, EW: 643, MW: 644, LW: 645 }, rbId: 499 },
  { id: 650, key: 'recce', code: 'RECCE PLATOON', shortName: 'Recce Platoon', icon: '🔭', periodIds: { All: 650, EW: 651, MW: 652, LW: 653 }, rbId: 502 },
  { id: 646, key: 'heavy_weapon', code: 'HEAVY WEAPONS PLATOON', shortName: 'Heavy Weapons Platoon', icon: '🎯', periodIds: { All: 646, EW: 647, MW: 648, LW: 649 }, rbId: 498 },
  { id: 654, key: 'artillery', code: 'ARTILLERY PLATOON', shortName: 'Artillery Platoon', icon: '💥', periodIds: { All: 654, EW: 655, MW: 656, LW: 657 }, rbId: 500 },
  { id: 658, key: 'armoured', code: 'ARMOURED PLATOON', shortName: 'Armoured Platoon', icon: '🛡️', periodIds: { All: 658, EW: 659, MW: 660, LW: 661 }, rbId: 501 },
];

function loadTemplate(id) {
  return JSON.parse(fs.readFileSync(path.join(TPL_DIR, `${id}.json`), 'utf8'));
}

function localImgPath(rawUrl) {
  if (!rawUrl) return null;
  try {
    const u = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, 'https://wg.easyarmy.com');
    return `images/units/great_britain/${path.basename(u.pathname)}`;
  } catch {
    return null;
  }
}

// Collect all unique units across the 6 (All) templates of Armies of Great Britain (v3)
const unitsByListName = new Map();
const sectionsOrder = [];
const sectionUnits = new Map();
const rulesCatalog = new Map();
const armyRulesCatalog = new Map();

for (const meta of MAIN_TEMPLATES) {
  const tpl = loadTemplate(meta.id);
  meta.data = tpl;
  for (const col of tpl.layout) {
    for (const box of col) {
      let secName = box.section;
      if (secName === 'Anti-tank' && box.units.length === 1) {
        secName = 'Anti-tank (Secondary)';
      }
      if (!sectionUnits.has(secName)) {
        sectionsOrder.push(secName);
        sectionUnits.set(secName, box.units);
      }
    }
  }

  for (const u of tpl.units) {
    const localImage = localImgPath(u.image);
    if (!unitsByListName.has(u.listName)) {
      unitsByListName.set(u.listName, {
        listName: u.listName,
        name: u.name,
        source: u.source,
        period: u.period,
        image: localImage,
        remoteImage: u.image,
        sections: [u.section],
        experience: u.experience.map((e) => ({ level: e.level, points: e.points })),
        profile: u.profile,
        options: u.options.map((o) => ({
          id: o.id,
          input: o.input,
          group: o.group,
          text: o.text,
          points: o.points,
          per: o.per,
          min: o.min,
          max: o.max,
        })),
        weapons: u.weapons,
        weaponNotes: u.weaponNotes,
        rules: u.rules.map((r) => r.name),
        notes: u.notes,
      });
    } else {
      const existing = unitsByListName.get(u.listName);
      if (!existing.sections.includes(u.section)) existing.sections.push(u.section);
    }
    for (const r of u.rules || []) {
      if (!rulesCatalog.has(r.name)) rulesCatalog.set(r.name, r);
    }
    for (const r of u.armyRules || []) {
      if (!armyRulesCatalog.has(r.name)) armyRulesCatalog.set(r.name, r);
    }
  }
}

// Ensure official British Army Special Rules are fully present and unified
if (armyRulesCatalog.has('ALL')) armyRulesCatalog.delete('ALL');
armyRulesCatalog.set('Bombardment', {
  name: 'Bombardment',
  text: 'When rolling to determine the effects of a Preparatory Bombardment, roll two dice per unit and choose the highest result.',
});
armyRulesCatalog.set('Artillery Support', {
  name: 'Artillery Support',
  text: 'Each British Rifle or Heavy Weapons Platoon may include one Forward Observer (Artillery) for free.',
});

const GLOSSARY_OVERRIDES = {
  recce: {
    name: 'Recce',
    ref: 'v3 page 150',
    text: 'Can reverse at full Advance speed (instead of half speed). In addition, if shot at by an enemy unit (and has not yet taken an action that turn), it may react by immediately making an Escape move at full Run speed away from the enemy or into cover.',
  },
  stubborn: {
    name: 'Stubborn',
    ref: 'v3 page 116',
    text: 'When taking an Order test, they ignore pin markers for their Morale value (always test on full Morale).',
  },
  tank_hunters: {
    name: 'Tank Hunters',
    ref: 'v3 page 116',
    text: 'If this unit attacks an enclosed vehicle in close combat, its hits can cause damage using their Anti-Tank weapon profile (e.g. anti-tank grenades or PIAT).',
  },
};

const dedupedRules = new Map();
for (const r of rulesCatalog.values()) {
  const key = (r.name || '').trim().toLowerCase();
  if (!key || key === 'must') continue;
  if (GLOSSARY_OVERRIDES[key]) {
    dedupedRules.set(key, GLOSSARY_OVERRIDES[key]);
    continue;
  }
  const existing = dedupedRules.get(key);
  if (!existing || (r.text && r.text.length > (existing.text || '').length)) {
    dedupedRules.set(key, r);
  }
}

// Period availability per template (All / EW / MW / LW)
const periodAvailability = {};
for (const meta of MAIN_TEMPLATES) {
  periodAvailability[meta.key] = {};
  for (const [periodKey, tplId] of Object.entries(meta.periodIds)) {
    try {
      const t = loadTemplate(tplId);
      const bySlot = {};
      for (const col of t.layout) {
        for (const box of col) {
          const k = box.section === 'Anti-tank' && box.units.length === 1 ? 'Anti-tank (Secondary)' : box.section;
          if (!bySlot[k]) bySlot[k] = box.units;
        }
      }
      periodAvailability[meta.key][periodKey] = { templateId: tplId, title: t.title, slots: bySlot };
    } catch {
      periodAvailability[meta.key][periodKey] = { templateId: tplId, title: meta.code, slots: {} };
    }
  }
}

// Save structured JSON
const jsonData = {
  id: 'great_britain',
  faction: 'Great Britain',
  book: 'Armies of Great Britain (v3)',
  scrapedAt: new Date().toISOString(),
  totalTemplatesCrawled: 30,
  totalUniqueUnits: unitsByListName.size,
  totalUniqueImages: new Set([...unitsByListName.values()].map((u) => u.image).filter(Boolean)).size,
  platoons: MAIN_TEMPLATES.map((m) => ({
    id: m.key,
    templateId: m.id,
    code: m.code,
    title: m.data.title,
    shortName: m.shortName,
    source: m.data.source,
    layout: m.data.layout,
    periods: periodAvailability[m.key],
  })),
  slotCatalog: Object.fromEntries(sectionUnits),
  units: Object.fromEntries(unitsByListName),
  unitSpecialRules: [...dedupedRules.values()],
  armySpecialRules: [...armyRulesCatalog.values()],
};
fs.writeFileSync(path.join(ROOT, 'factions', 'great_britain.json'), JSON.stringify(jsonData, null, 2));
console.log('Saved factions/great_britain.json');

// Build Markdown reference
const md = [];
md.push('# 🇬🇧 Armies of Great Britain — Bolt Action v3 (Official Faction Reference)');
md.push('');
md.push('> **Official EasyArmy (`wg.easyarmy.com`) Database Reference**');
md.push('> - **Source Book**: *Armies of Great Britain: Third Edition* (+ *Bolt Action v3 Rulebook*)');
md.push(`> - **Total Unique Units**: ${unitsByListName.size}`);
md.push(`> - **Generated**: ${new Date().toISOString()}`);
md.push('');
md.push('## 1. National Army Special Rules');
md.push('');
for (const ar of armyRulesCatalog.values()) {
  md.push(`### 🎖️ ${ar.name}`);
  md.push('');
  md.push(ar.text || '');
  md.push('');
}

md.push('## 2. Platoon Selectors Overview');
md.push('');
for (const m of MAIN_TEMPLATES) {
  md.push(`### ${m.icon} ${m.code} (${m.shortName})`);
  md.push(`- **Official Title**: \`${m.data.title}\``);
  md.push(`- **Source**: ${m.data.source}`);
  md.push('');
}

md.push('## 3. Unit Catalog by Category');
md.push('');
for (const [sec, uList] of sectionUnits.entries()) {
  md.push(`### 📦 ${sec} (${uList.length} Units)`);
  md.push('');
  for (const un of uList) {
    const uObj = unitsByListName.get(un);
    const expStr = uObj ? uObj.experience.map((e) => `${e.level}: ${e.points}pts`).join(' · ') : '';
    md.push(`- **${un}** ${expStr ? `*(${expStr})*` : ''}`);
  }
  md.push('');
}

fs.writeFileSync(path.join(ROOT, 'factions', 'great_britain.md'), md.join('\n'));
console.log(`Saved factions/great_britain.md (${md.length} lines)`);

// Build browser bundle: factions/great_britain_app_data.js
function inferOptionId(o, usedIds) {
  const t = `${o.group || ''} ${o.text || ''}`.toLowerCase();
  let base = `opt_${o.id}`;

  if (/bren gun|light machine gun|\blmg\b/.test(t)) base = /pintle/.test(t) ? 'pintle_lmg' : (o.max > 1 ? 'bren_men' : 'bren');
  else if (/piat/.test(t)) base = 'piat';
  else if (/boys|anti-tank rifle/.test(t)) base = 'at_rifle';
  else if (/nco.*submachine|nco.*smg|nco.*sten|nco.*thompson/.test(t)) base = 'nco_smg';
  else if (/officer.*submachine|officer.*smg|officer.*sten|officer.*thompson/.test(t)) base = 'officer_smg';
  else if (/officer.*pistol/.test(t)) base = 'officer_pistol';
  else if (/replace.*submachine|have.*submachine|with.*submachine|\bsmg\b|sten|thompson/.test(t)) base = o.max > 1 ? 'smg_men' : 'smg';
  else if (/replace.*pistol|with.*pistol/.test(t)) base = o.max > 1 ? 'pistol_men' : 'pistol';
  else if (/heavy machine gun|\bhmg\b|\.50 cal/.test(t)) base = /pintle/.test(t) ? 'pintle_hmg' : 'hmg';
  else if (/medium machine gun|\bmmg\b|vickers/.test(t)) base = /pintle/.test(t) ? 'pintle_mmg' : 'mmg';
  else if (/anti-tank grenades/.test(t)) base = 'at_grenades';
  else if (/tough fighters/.test(t)) base = 'tough_fighters';
  else if (/stubborn/.test(t)) base = 'stubborn';
  else if (/fanatics/.test(t)) base = 'fanatics';
  else if (/flamethrower/.test(t)) base = 'flamethrower';
  else if (/spotter/.test(t)) base = 'spotter';
  else if (/gun shield/.test(t)) base = 'gun_shield';
  else if (/crewman|additional crew/.test(t)) base = 'extra_crew';
  else if (/amphibious|wading/.test(t)) base = 'amphibious';
  else if (/motorcycle/.test(t)) base = 'motorcycles';
  else if (/horse|cavalry/.test(t)) base = 'horses';
  else if (/bicycle/.test(t)) base = 'bicycles';
  else if (/demolition charge/.test(t)) base = 'demolition_charge';
  else if (/light mortar|2-inch mortar/.test(t)) base = 'light_mortar';
  else if (/medium mortar|3-inch mortar/.test(t)) base = 'medium_mortar';
  else if (/heavy mortar|4.2-inch mortar/.test(t)) base = 'heavy_mortar';
  else if (/light howitzer/.test(t)) base = 'light_howitzer';
  else if (/medium howitzer|25-pdr|25 pdr/.test(t)) base = 'medium_howitzer';
  else if (/heavy howitzer/.test(t)) base = 'heavy_howitzer';
  else if (/anti-tank gun|2-pdr|6-pdr|17-pdr/.test(t)) base = 'anti_tank_gun';
  else if (/recce/.test(t)) base = 'recce';

  let finalId = base;
  let n = 2;
  while (usedIds.has(finalId)) {
    finalId = `${base}_${n++}`;
  }
  usedIds.add(finalId);
  return finalId;
}

function isExtraMenOption(o) {
  const g = (o.group || '').toLowerCase();
  const t = (o.text || '').toLowerCase();
  const full = `${g} ${t}`;
  if (/may add up to \d+ crewmen/i.test(full)) return false;
  if (/add up to \d+ (additional men|men|unarmed men|handlers)|accompanied by up to \d+ men/i.test(g)) {
    return /^\+\d+\s*pts?\s*(each|per man)/i.test(o.text);
  }
  if (/^(add up to \d+ (additional men|men|unarmed men|handlers)|the (officer|commander|medic|observer) may be accompanied by up to \d+ men)/i.test(t)) {
    return true;
  }
  if (/add up to \d+ additional men with rifles for/i.test(t)) {
    return true;
  }
  return false;
}

const appUnits = {};
for (const u of unitsByListName.values()) {
  const costs = {};
  const extraChoices = [];
  for (const e of u.experience) {
    const l = e.level.toLowerCase();
    if (l.includes('inexperienced')) costs.inexperienced = { points: e.points };
    else if (l.includes('regular')) costs.regular = { points: e.points };
    else if (l.includes('veteran')) costs.veteran = { points: e.points };
    else extraChoices.push(e);
  }
  if (Object.keys(costs).length === 0) {
    costs.regular = { points: extraChoices[0]?.points ?? 0 };
  }
  const defaultExp = costs.regular ? 'regular' : Object.keys(costs)[0];
  let maxExtraMen = 0;
  let extraMenGroupText = null;
  const optionsList = [];
  const usedIds = new Set();

  for (const [idx, ch] of extraChoices.entries()) {
    if (ch.points > 0 || extraChoices.length > 1) {
      optionsList.push({
        id: `choice_${idx + 1}`,
        type: 'checkbox',
        label: ch.level,
        rawText: ch.level,
        group: 'Rule / Selector Options',
        cost: ch.points || 0,
      });
    }
  }

  for (const o of u.options) {
    if (isExtraMenOption(o)) {
      if (o.max && o.max > maxExtraMen) maxExtraMen = o.max;
      if (!extraMenGroupText) {
        extraMenGroupText = o.group || o.text.replace(/\s+at\s+\+?\d+pts.*$/i, '');
      }
      const tl = o.text.toLowerCase();
      if (tl.includes('inexperienced') && costs.inexperienced) costs.inexperienced.extraCost = o.points;
      else if (tl.includes('regular') && costs.regular) costs.regular.extraCost = o.points;
      else if (tl.includes('veteran') && costs.veteran) costs.veteran.extraCost = o.points;
      else {
        for (const k of Object.keys(costs)) {
          if (!costs[k].extraCost) costs[k].extraCost = o.points;
        }
      }
      continue;
    }
    const id = inferOptionId(o, usedIds);
    const label = o.group && !/^(options:?)$/i.test(o.group)
      ? `${o.group} ${o.text}`
      : o.text;

    if (o.per === 'model') {
      optionsList.push({ id, type: 'per_man', label, rawText: o.text, group: o.group || null, costPerMan: o.points ?? 0, per: o.per });
    } else if (o.max && o.max > 1) {
      optionsList.push({ id, type: 'counter', label, rawText: o.text, group: o.group || null, min: o.min || 1, max: o.max, cost: o.points ?? 0, per: o.per });
    } else {
      optionsList.push({ id, type: 'checkbox', label, rawText: o.text, group: o.group || null, cost: o.points ?? 0, per: o.per });
    }
  }

  if (maxExtraMen > 0) {
    const firstExtraCost = Object.values(costs).find((c) => c.extraCost)?.extraCost ?? 10;
    for (const c of Object.values(costs)) {
      if (!c.extraCost) c.extraCost = firstExtraCost;
    }
    optionsList.unshift({
      id: 'extra_men',
      type: 'extra_men',
      label: extraMenGroupText || `Add up to ${maxExtraMen} men`,
      rawText: extraMenGroupText || `Add up to ${maxExtraMen} men`,
      group: extraMenGroupText || null,
      max: maxExtraMen,
    });
  }

  const seenW = new Set();
  const weaponsTable = [];
  for (const w of u.weapons || []) {
    const k = `${w.rowType || 'weapon'}|${w.variant || ''}|${w.Weapons}|${w.Range}|${w.Shots}|${w.Pen}|${w.Special}`;
    if (seenW.has(k)) continue;
    seenW.add(k);
    weaponsTable.push({
      rowType: w.rowType || 'weapon',
      variant: w.variant || undefined,
      name: w.Weapons || '-',
      range: w.Range || '-',
      shots: w.Shots || '-',
      pen: w.Pen || '-',
      special: w.Special || '-',
    });
  }

  const unitRules = (u.rules || [])
    .map((rName) => dedupedRules.get((rName || '').trim().toLowerCase()))
    .filter(Boolean);

  appUnits[u.listName] = {
    name: u.listName,
    cardTitle: u.name || u.listName,
    page: u.source || 'Armies of Great Britain (v3)',
    period: u.period || 'E/M/L',
    image: u.image || null,
    sections: u.sections,
    profile: u.profile || {},
    composition: u.profile?.Composition || u.profile?.Team || (u.profile?.['Damage Value'] ? '1 Vehicle' : '1 Unit'),
    weapons: u.profile?.Weapons || 'None',
    damageValue: u.profile?.['Damage Value'] || null,
    transport: u.profile?.Transport || null,
    tow: u.profile?.Tow || null,
    specialRulesText: u.profile?.['Special Rules'] || (u.rules?.join(', ') || '-'),
    costs,
    defaultExp,
    maxExtraMen,
    extraMenGroupText,
    optionsList,
    weaponsTable,
    weaponNotes: [...new Set(u.weaponNotes || [])],
    unitRules,
    notes: u.notes || null,
  };
}

const appPlatoons = MAIN_TEMPLATES.map((m) => {
  const slotCounters = {};
  const columns = m.data.layout.map((col, ci) => ({
    id: `col_${ci + 1}`,
    slots: col.map((box) => {
      const slotKey = box.section === 'Anti-tank' && box.units.length === 1 ? 'Anti-tank (Secondary)' : box.section;
      const slug = box.section.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      slotCounters[slug] = (slotCounters[slug] || 0) + 1;
      const slotId = `${slug}_${slotCounters[slug]}`;
      return {
        id: slotId,
        label: box.section,
        slotKey,
        mandatory: !!box.required,
      };
    }),
  }));
  return {
    id: m.key,
    templateId: m.id,
    title: m.code,
    name: m.shortName,
    officialTitle: m.data.title,
    source: m.data.source,
    columns,
    periods: periodAvailability[m.key],
  };
});

const appBundle = {
  id: 'great_britain',
  faction: 'Great Britain',
  book: 'Armies of Great Britain (v3)',
  platoons: appPlatoons,
  slotCatalog: Object.fromEntries(sectionUnits),
  platoonPeriods: periodAvailability,
  units: appUnits,
  rulesGlossary: Object.fromEntries([...dedupedRules.values()].map((r) => [r.name, r.text])),
  armyRules: [...armyRulesCatalog.values()],
};

fs.writeFileSync(
  path.join(ROOT, 'factions', 'great_britain_app_data.js'),
  `// Auto-generated from EasyArmy Great Britain v3 scrape\nwindow.EASYARMY_FACTIONS = window.EASYARMY_FACTIONS || {};\nwindow.EASYARMY_FACTIONS['great_britain'] = ${JSON.stringify(appBundle, null, 2)};\n`
);
console.log('Saved factions/great_britain_app_data.js successfully!');
