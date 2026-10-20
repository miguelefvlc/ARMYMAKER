// Builds for Soviet Union (Bolt Action v3):
// 1. factions/soviet_union.json         (structured JSON dataset)
// 2. factions/soviet_union.md           (organized Markdown reference in 100% official EasyArmy nomenclature)
// 3. factions/soviet_union_app_data.js  (multi-faction browser bundle for index.html)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlatoon, parseUnit } from './parse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TPL_DIR = path.join(__dirname, 'out', '18', 'templates');
const HTML_DIR = path.join(__dirname, 'out', '18', 'html');

// Re-parse cached HTML files with the latest parser rules when --reparse is passed
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
      if (!fs.existsSync(unitHtmlPath)) continue;
      const unit = parseUnit(fs.readFileSync(unitHtmlPath, 'utf8'));
      units.push({ section: s.section, listName: s.name, ...unit });
    }
    if (units.length > 0) {
      existing.units = units;
      fs.writeFileSync(tplPath, JSON.stringify(existing, null, 1));
    }
  }
}

const MAIN_TEMPLATES = [
  { id: 662, key: 'infantry', code: 'RIFLE PLATOON', shortName: 'Rifle Platoon', icon: '🎖️', periodIds: { All: 662, EW: 663, MW: 664, LW: 665 }, rbId: 508 },
  { id: 666, key: 'engineer', code: 'ENGINEER PLATOON', shortName: 'Engineer Platoon', icon: '💣', periodIds: { All: 666, EW: 667, MW: 668, LW: 669 }, rbId: 509 },
  { id: 670, key: 'recce', code: 'RECCE PLATOON', shortName: 'Recce Platoon', icon: '🔭', periodIds: { All: 670, EW: 671, MW: 672, LW: 673 }, rbId: 510 },
  { id: 674, key: 'heavy_weapon', code: 'HEAVY WEAPONS PLATOON', shortName: 'Heavy Weapons Platoon', icon: '🎯', periodIds: { All: 674, EW: 675, MW: 676, LW: 677 }, rbId: 511 },
  { id: 678, key: 'artillery', code: 'ARTILLERY PLATOON', shortName: 'Artillery Platoon', icon: '💥', periodIds: { All: 678, EW: 679, MW: 680, LW: 681 }, rbId: 512 },
  { id: 682, key: 'armoured', code: 'ARMOURED PLATOON', shortName: 'Armoured Platoon', icon: '🛡️', periodIds: { All: 682, EW: 683, MW: 684, LW: 685 }, rbId: 513 },
];

function loadTemplate(id) {
  return JSON.parse(fs.readFileSync(path.join(TPL_DIR, `${id}.json`), 'utf8'));
}

function localImgPath(rawUrl) {
  if (!rawUrl) return null;
  try {
    const u = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, 'https://wg.easyarmy.com');
    return `images/units/${path.basename(u.pathname)}`;
  } catch {
    return null;
  }
}

// Collect all unique units across the 6 (All) templates of Armies of the Soviet Union (v3)
const unitsByListName = new Map();
const sectionsOrder = [];
const sectionUnits = new Map(); // sectionKey -> string[]
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

const GLOSSARY_OVERRIDES = {
  'recce': {
    name: 'Recce',
    ref: 'v3 page 150',
    text: 'Can reverse at full Advance speed (instead of half speed). In addition, if shot at by an enemy unit (and has not yet taken an action that turn), it may react by immediately making an Escape move at full Run speed away from the enemy or into cover.',
  },
  'recce infantry platoon': {
    name: 'Recce Infantry Platoon',
    ref: 'v3 AoSU',
    text: 'The platoon must include enough transport vehicles (either soft-skin or armoured) to transport all models in the infantry units in the platoon. All these transport vehicles may be given the Recce rule at +10pts per vehicle.',
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
    const t = loadTemplate(tplId);
    const bySlot = {};
    for (const col of t.layout) {
      for (const box of col) {
        const k = box.section === 'Anti-tank' && box.units.length === 1 ? 'Anti-tank (Secondary)' : box.section;
        if (!bySlot[k]) bySlot[k] = box.units;
      }
    }
    periodAvailability[meta.key][periodKey] = { templateId: tplId, title: t.title, slots: bySlot };
  }
}

// Save structured JSON
const jsonData = {
  id: 'soviet_union',
  faction: 'Soviet Union',
  book: 'Armies of the Soviet Union (v3)',
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
fs.writeFileSync(path.join(ROOT, 'factions', 'soviet_union.json'), JSON.stringify(jsonData, null, 2));
console.log('Saved factions/soviet_union.json');

// ============================================================================
// BUILD ORGANIZED MARKDOWN IN 100% OFFICIAL NOMENCLATURE: factions/soviet_union.md
// ============================================================================
function getExpPoints(u, levelKey) {
  const found = (u?.experience || []).find((e) => e.level.toLowerCase().includes(levelKey));
  return found ? `${found.points} pts` : '—';
}

function getBaseSummary(u) {
  if (!u || !u.profile) return '—';
  if (u.profile.Composition) return u.profile.Composition;
  if (u.profile.Team) return u.profile.Team;
  if (u.profile['Damage Value']) return `DV: ${u.profile['Damage Value']}`;
  return 'Special';
}

function getPageShort(u) {
  const s = u?.source || '';
  const m = s.match(/page\s*(\d+)/i);
  return m ? `p. ${m[1]}` : s || 'v3';
}

function summarizeColumnSlots(col) {
  const groups = [];
  for (const box of col) {
    const label = box.section === 'Anti-tank' && box.units.length === 1 ? 'Anti-tank (Secondary)' : box.section;
    const req = box.required;
    const last = groups[groups.length - 1];
    if (last && last.label === label && last.req === req) {
      last.count++;
    } else {
      groups.push({ label, req, count: 1, unitCount: box.units.length });
    }
  }
  return groups
    .map((g) => {
      const badge = g.req ? '**[REQUIRED]**' : '*(Optional)*';
      const mult = g.count > 1 ? ` **×${g.count}**` : '';
      return `• \`${g.label}\`${mult} ${badge} *(${g.unitCount})*`;
    })
    .join('<br>');
}
const LEND_LEASE_VEHICLES = new Set([
  'Infantry Tank Mk III Valentine I-VIIA',
  'M3 Stuart',
  'M5A1 Stuart',
  'Light Tank Mk VII Tetrarch',
  'M10 Wolverine',
  'M3 Lee',
  'M4 Sherman',
  'M4 Sherman 76mm',
  'Matilda Mk II',
  'Churchill III or IV',
  'SU-57 (T48 Gun Motor Carriage)',
  'M16/M17 Multiple Gun Motor Carriage',
]);

const RECCE_ARMOURED_CARS = new Set([
  'BA-64',
  'BA-20',
  'BA-10',
  'BA-3/6 Heavy Armoured Car',
  'D-8 Light Armoured Car',
  'FAI Light Armoured Car',
  'GAZ Jeep (no transport)',
  'M3 White Scout Car (no transport)',
  'Universal Carrier (no transport)',
]);

const SOVIET_TANKS = new Set([
  'T-26A Light Tank',
  'T-26B Light Tank',
  'OT-26/OT-133 Light Flamethrower Tank',
  'BT-5 and BT-7 Light Tank',
  'T-37 Light Tank',
  'T-40 Light Tank',
  'T-50 Light Tank',
  'T-60 Light Tank',
  'T-70 Light Tank',
  'T-28 Medium Tank',
  'T-34/76 Medium Tank',
  'T-34/85 Medium Tank',
  'Tractor Factory T-34',
  'T-35 Heavy Tank',
  'KV-1 Heavy Tank',
  'KV-2',
  'KV-85 and IS-1 Heavy Tank',
  'IS-2 Heavy Tank',
  'IS-3 Heavy Tank',
]);

const md = [];

md.push('# 🚩 Armies of the Soviet Union — Bolt Action v3 (Official Faction Reference)');
md.push('');
md.push('> **Official EasyArmy (`wg.easyarmy.com`) Database Reference**');
md.push('> - **Source Book**: *Armies of the Soviet Union: Third Edition* (+ *Bolt Action v3 Rulebook*)');
md.push('> - **Platoon Selectors Indexed**: **30 official templates** (*All*, *Early War*, *Mid War*, *Late War* & *Rulebook v3*)');
md.push(`> - **Unique Units Indexed**: **${unitsByListName.size} units** with complete costs, options, limits, weapon tables & special rules`);
md.push('> - **Local Unit Illustrations**: **73 PNG images** in [`images/units/`](./images/units)');
md.push('> - **Data Bundles**: [`factions/soviet_union.json`](./factions/soviet_union.json) · [`factions/soviet_union_app_data.js`](./factions/soviet_union_app_data.js)');
md.push('');
md.push('---');
md.push('');

// TABLE OF CONTENTS
md.push('## 📑 Table of Contents');
md.push('');
md.push('1. **[Soviet Union Army Special Rules](#1-soviet-union-army-special-rules)**');
md.push('2. **[Platoon Selectors & Slot Layouts (The 6 Official Platoons)](#2-platoon-selectors--slot-layouts-the-6-official-platoons)**');
md.push('   - [2.1. Rifle Platoon](#21-️-rifle-platoon)');
md.push('   - [2.2. Engineer Platoon](#22--engineer-platoon)');
md.push('   - [2.3. Recce Platoon](#23--recce-platoon)');
md.push('   - [2.4. Heavy Weapons Platoon](#24--heavy-weapons-platoon)');
md.push('   - [2.5. Artillery Platoon](#25--artillery-platoon)');
md.push('   - [2.6. Armoured Platoon](#26-️-armoured-platoon)');
md.push('3. **[Slot Catalog (Quick Summary Tables by Slot)](#3-slot-catalog-quick-summary-tables-by-slot)**');
md.push('   - [3.1. HQ & Specialists (`Platoon Commander`, `Company Commander`, `Commissar`, `Medic`, `Forward Observer`, `Sniper`)](#31-hq--specialists)');
md.push('   - [3.2. `Infantry` Slot (20 Squads)](#32-infantry-slot-20-squads)');
md.push('   - [3.3. `Engineers` & `Flamethrower` Slots](#33-engineers--flamethrower-slots)');
md.push('   - [3.4. Support Weapon Slots (`Mortar`, `Machine Gun`, `Heavy Weapons`, `Anti-tank`)](#34-support-weapon-slots-mortar-machine-gun-heavy-weapons-anti-tank)');
md.push('   - [3.5. `Artillery` Slot (14 Field, Anti-Aircraft & Anti-Tank Guns)](#35-artillery-slot-14-field-anti-aircraft--anti-tank-guns)');
md.push('   - [3.6. `Command Vehicle` & `Vehicle` Slots (52 Vehicles by Category)](#36-command-vehicle--vehicle-slots-52-vehicles-by-category)');
md.push('   - [3.7. `Transports` (12) & `Tows` (10) Slots](#37-transports-12--tows-10-slots)');
md.push('4. **[Complete Unit Datasheets (124 Units)](#4-complete-unit-datasheets-124-units)**');
md.push('   - [4.1. HQ & Command Units (7)](#41-hq--command-units-7)');
md.push('   - [4.2. Infantry & Cavalry Squads (20)](#42-infantry--cavalry-squads-20)');
md.push('   - [4.3. Engineers & Flamethrowers (3)](#43-engineers--flamethrowers-3)');
md.push('   - [4.4. Infantry Support Weapon Teams (12)](#44-infantry-support-weapon-teams-12)');
md.push('   - [4.5. Artillery, Anti-Aircraft & Anti-Tank Guns (14)](#45-artillery-anti-aircraft--anti-tank-guns-14)');
md.push('   - [4.6. Soviet Tanks: Light, Medium & Heavy (19)](#46-soviet-tanks-light-medium--heavy-19)');
md.push('   - [4.7. Self-Propelled Guns, Rocket Launchers, AA & Riverboats (11)](#47-self-propelled-guns-rocket-launchers-aa--riverboats-11)');
md.push('   - [4.8. Armoured Cars & Reconnaissance Vehicles (9)](#48-armoured-cars--reconnaissance-vehicles-9)');
md.push('   - [4.9. Lend-Lease Tanks & SPGs (12)](#49-lend-lease-tanks--spgs-12)');
md.push('   - [4.10. Transports, Artillery Tows & Platoon Rule Selectors (17)](#410-transports-artillery-tows--platoon-rule-selectors-17)');
md.push('5. **[Unit Special Rules Glossary (A–Z)](#5-unit-special-rules-glossary-az)**');
md.push('');
md.push('---');
md.push('');
// ============================================================================
// SECTION 1: SOVIET UNION ARMY SPECIAL RULES
// ============================================================================
md.push('## 1. Soviet Union Army Special Rules');
md.push('');
md.push('| Army Special Rule | Official Description (*Armies of the Soviet Union v3*) |');
md.push('| :--- | :--- |');
for (const r of armyRulesCatalog.values()) {
  md.push(`| **${r.name}** | ${r.text} |`);
}
md.push('| **Hammer and Sickle** | Selected HQ, Infantry and Support units may take one of the following sub-faction upgrades:<br>• **Airborne**: *Veteran*, gains `Stubborn` (+1pt per man).<br>• **NKVD**: Gains `Fanatics` (+2pts per man).<br>• **Naval Brigade**: Gains `Tough Fighters` (+1pt per man) and access to submachine guns at +3pts (Errata Feb 2026). |');
md.push('');
md.push('---');
md.push('');

// ============================================================================
// SECTION 2: PLATOON SELECTORS & SLOT LAYOUTS
// ============================================================================
md.push('## 2. Platoon Selectors & Slot Layouts (The 6 Official Platoons)');
md.push('');
md.push('| # | Platoon Type | `All` Selector | `Early War` (EW) | `Mid War` (MW) | `Late War` (LW) | `Rulebook v3` |');
md.push('| :-: | :--- | :---: | :---: | :---: | :---: | :---: |');
MAIN_TEMPLATES.forEach((m, idx) => {
  md.push(`| **2.${idx + 1}** | ${m.icon} **${m.shortName}** | ID \`${m.periodIds.All}\` | ID \`${m.periodIds.EW}\` | ID \`${m.periodIds.MW}\` | ID \`${m.periodIds.LW}\` | ID \`${m.rbId}\` |`);
});
md.push('');

MAIN_TEMPLATES.forEach((meta, idx) => {
  md.push(`### 2.${idx + 1}. ${meta.icon} ${meta.shortName}`);
  md.push('');
  md.push(`- **Official EasyArmy Selector**: \`${meta.data.title}\` (*${meta.data.source}*)`);
  md.push(`- **Template IDs**: All (\`${meta.periodIds.All}\`) · Early War (\`${meta.periodIds.EW}\`) · Mid War (\`${meta.periodIds.MW}\`) · Late War (\`${meta.periodIds.LW}\`)`);
  md.push('');
  md.push('#### 5-Column Slot Matrix');
  md.push('');
  md.push('| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |');
  md.push('| :--- | :--- | :--- | :--- | :--- |');
  const colsHtml = [0, 1, 2, 3, 4].map((ci) => summarizeColumnSlots(meta.data.layout[ci] || []));
  md.push(`| ${colsHtml.join(' | ')} |`);
  md.push('');

  const pData = periodAvailability[meta.key];
  const slotNames = Object.keys(pData.All.slots);
  md.push('#### Period Selector Breakdown (`All` vs `EW` / `MW` / `LW`)');
  md.push('');
  md.push('| Slot | `All` | `EW` | `MW` | `LW` | Period-Specific Units |');
  md.push('| :--- | :---: | :---: | :---: | :---: | :--- |');
  for (const sName of slotNames) {
    const allList = pData.All.slots[sName] || [];
    const ewList = pData.EW.slots[sName] || [];
    const mwList = pData.MW.slots[sName] || [];
    const lwList = pData.LW.slots[sName] || [];

    const notes = [];
    const onlyEW = ewList.filter((x) => !mwList.includes(x) && !lwList.includes(x));
    const onlyMW = mwList.filter((x) => !ewList.includes(x) && !lwList.includes(x));
    const onlyLW = lwList.filter((x) => !ewList.includes(x) && !mwList.includes(x));
    const noLW = ewList.filter((x) => mwList.includes(x) && !lwList.includes(x));
    const noEW = mwList.filter((x) => lwList.includes(x) && !ewList.includes(x));
    if (onlyEW.length) notes.push(`**EW Only**: ${onlyEW.join(', ')}`);
    if (noLW.length) notes.push(`**EW/MW**: ${noLW.join(', ')}`);
    if (onlyMW.length) notes.push(`**MW Only**: ${onlyMW.join(', ')}`);
    if (noEW.length) notes.push(`**MW/LW**: ${noEW.join(', ')}`);
    if (onlyLW.length) notes.push(`**LW Only**: ${onlyLW.join(', ')}`);
    md.push(`| \`${sName}\` | **${allList.length}** | ${ewList.length} | ${mwList.length} | ${lwList.length} | ${notes.length ? notes.join('<br>') : 'All `E/M/L`'} |`);
  }
  md.push('');
});

md.push('---');
md.push('');
// ============================================================================
// SECTION 3: SLOT CATALOG (QUICK SUMMARY TABLES BY SLOT)
// ============================================================================
md.push('## 3. Slot Catalog (Quick Summary Tables by Slot)');
md.push('');
function renderSlotTable(unitNames) {
  md.push('| Unit | Period | Inexperienced | Regular | Veteran | Composition / Damage Value | Ref. |');
  md.push('| :--- | :---: | :---: | :---: | :---: | :--- | :---: |');
  for (const name of unitNames) {
    const u = unitsByListName.get(name);
    if (!u) continue;
    md.push(`| **${u.listName}** | \`${u.period || 'E/M/L'}\` | ${getExpPoints(u, 'inexperienced')} | ${getExpPoints(u, 'regular')} | ${getExpPoints(u, 'veteran')} | ${getBaseSummary(u)} | ${getPageShort(u)} |`);
  }
  md.push('');
}

md.push('### 3.1. HQ & Specialists');
md.push('');
renderSlotTable([
  'Platoon Commander',
  'Company Commander',
  'Commissar',
  'Medic',
  'Field Ambulance',
  'Artillery Forward Observer',
  'Air Force Forward Observer',
  'Sniper Team',
]);
md.push('### 3.2. `Infantry` Slot (20 Squads)');
md.push('');
renderSlotTable(sectionUnits.get('Infantry') || []);
md.push('### 3.3. `Engineers` & `Flamethrower` Slots');
md.push('');
renderSlotTable([
  ...(sectionUnits.get('Engineers') || []),
  ...(sectionUnits.get('Flamethrower') || []),
]);

md.push('### 3.4. Support Weapon Slots (`Mortar`, `Machine Gun`, `Heavy Weapons`, `Anti-tank`)');
md.push('');
const hwSet = new Set([
  ...(sectionUnits.get('Mortar') || []),
  ...(sectionUnits.get('Machine Gun') || []),
  ...(sectionUnits.get('Heavy Weapons') || []),
  ...(sectionUnits.get('Anti-tank') || []),
]);
renderSlotTable([...hwSet]);

md.push('### 3.5. `Artillery` Slot (14 Field, Anti-Aircraft & Anti-Tank Guns)');
md.push('');
renderSlotTable(sectionUnits.get('Artillery') || []);

md.push('### 3.6. `Command Vehicle` & `Vehicle` Slots (52 Vehicles by Category)');
md.push('');
const allVehicles = sectionUnits.get('Vehicle') || [];
const vTanks = allVehicles.filter((v) => SOVIET_TANKS.has(v));
const vRecce = allVehicles.filter((v) => RECCE_ARMOURED_CARS.has(v));
const vLendLease = allVehicles.filter((v) => LEND_LEASE_VEHICLES.has(v));
const vSpgAndOther = allVehicles.filter((v) => !SOVIET_TANKS.has(v) && !RECCE_ARMOURED_CARS.has(v) && !LEND_LEASE_VEHICLES.has(v));

md.push('#### 3.6.1. Soviet Light, Medium & Heavy Tanks (19)');
md.push('');
renderSlotTable(vTanks);

md.push('#### 3.6.2. Self-Propelled Guns, Rocket Launchers, AA & Riverboats (12)');
md.push('');
renderSlotTable(vSpgAndOther);

md.push('#### 3.6.3. Armoured Cars & Reconnaissance Vehicles (9)');
md.push('');
renderSlotTable(vRecce);

md.push('#### 3.6.4. Lend-Lease Vehicles (12)');
md.push('');
renderSlotTable(vLendLease);

md.push('### 3.7. `Transports` (12) & `Tows` (10) Slots');
md.push('');
md.push('#### 3.7.1. `Transports` Slot');
md.push('');
renderSlotTable(sectionUnits.get('Transports') || []);

md.push('#### 3.7.2. `Tows` Slot');
md.push('');
renderSlotTable(sectionUnits.get('Tows') || []);

md.push('---');
md.push('');
// ============================================================================
// SECTION 4: COMPLETE UNIT DATASHEETS (124 UNITS)
// ============================================================================
md.push('## 4. Complete Unit Datasheets (124 Units)');
md.push('');
const DETAILED_GROUPS = [
  {
    title: '4.1. HQ & Command Units (7)',
    match: (u) => ['Platoon Commander', 'Company Commander', 'Commissar', 'Medic', 'Forward Observer'].some((s) => u.sections.includes(s)),
  },
  {
    title: '4.2. Infantry & Cavalry Squads (20)',
    match: (u) => u.sections.includes('Infantry'),
  },
  {
    title: '4.3. Engineers & Flamethrowers (3)',
    match: (u) => u.sections.includes('Engineers') || u.sections.includes('Flamethrower'),
  },
  {
    title: '4.4. Infantry Support Weapon Teams (12)',
    match: (u) => ['Sniper', 'Mortar', 'Machine Gun', 'Heavy Weapons', 'Anti-tank'].some((s) => u.sections.includes(s)),
  },
  {
    title: '4.5. Artillery, Anti-Aircraft & Anti-Tank Guns (14)',
    match: (u) => u.sections.includes('Artillery'),
  },
  {
    title: '4.6. Soviet Tanks: Light, Medium & Heavy (19)',
    match: (u) => SOVIET_TANKS.has(u.listName),
  },
  {
    title: '4.7. Self-Propelled Guns, Rocket Launchers, AA & Riverboats (11)',
    match: (u) => (u.sections.includes('Vehicle') || u.sections.includes('Command Vehicle')) && !SOVIET_TANKS.has(u.listName) && !RECCE_ARMOURED_CARS.has(u.listName) && !LEND_LEASE_VEHICLES.has(u.listName),
  },
  {
    title: '4.8. Armoured Cars & Reconnaissance Vehicles (9)',
    match: (u) => RECCE_ARMOURED_CARS.has(u.listName),
  },
  {
    title: '4.9. Lend-Lease Tanks & SPGs (12)',
    match: (u) => LEND_LEASE_VEHICLES.has(u.listName),
  },
  {
    title: '4.10. Transports, Artillery Tows & Platoon Rule Selectors (17)',
    match: () => true,
  },
];

const emitted = new Set();

for (const grp of DETAILED_GROUPS) {
  const grpUnits = [...unitsByListName.values()].filter((u) => !emitted.has(u.listName) && grp.match(u));
  if (!grpUnits.length) continue;

  md.push(`### ${grp.title}`);
  md.push('');
  for (const u of grpUnits) {
    emitted.add(u.listName);
    const titleDiff = u.name && u.name !== u.listName ? ` *(Card Title: ${u.name})*` : '';
    md.push(`#### 🛡️ ${u.listName}${titleDiff}`);
    md.push('');
    const expStr = u.experience.map((e) => `**${e.level}**: ${e.points} pts`).join(' · ') || '0 pts';
    const slotsStr = u.sections.map((s) => `\`${s}\``).join(', ');
    const imgLink = u.image ? `[\`${path.basename(u.image)}\`](./${u.image})` : '—';
    md.push('| Period | Base Cost (Experience) | Slots | Source | Illustration |');
    md.push('| :---: | :--- | :--- | :--- | :--- |');
    md.push(`| \`${u.period || 'E/M/L'}\` | ${expStr} | ${slotsStr} | ${u.source || 'Armies of the Soviet Union (v3)'} | ${imgLink} |`);
    md.push('');

    const profileEntries = Object.entries(u.profile || {});
    if (profileEntries.length > 0 || u.notes) {
      for (const [k, v] of profileEntries) {
        md.push(`- **${k}**: ${v.replace(/\n/g, ' · ')}`);
      }
      if (u.notes) {
        md.push(`- **Notes**: ${u.notes}`);
      }
      md.push('');
    }
    if (u.options && u.options.length > 0) {
      md.push('**Options:**');
      md.push('');
      md.push('| Option Group | Option Text | Cost | Per | Limit |');
      md.push('| :--- | :--- | :---: | :---: | :---: |');
      for (const o of u.options) {
        const grpLabel = o.group ? `*${o.group}*` : 'Options';
        const ptsCell = o.points !== null ? `**${o.points >= 0 ? '+' : ''}${o.points} pts**` : '—';
        const perCell = `\`${o.per || 'unit'}\``;
        const limCell = o.max ? `\`${o.min}–${o.max}\`` : '`0–1`';
        md.push(`| ${grpLabel} | ${o.text} | ${ptsCell} | ${perCell} | ${limCell} |`);
      }
      md.push('');
    } else {
      md.push('- **Options**: *None*');
      md.push('');
    }
    if ((u.weapons && u.weapons.length > 0) || (u.weaponNotes && u.weaponNotes.length > 0)) {
      md.push('**Weapons:**');
      md.push('');
      if (u.weapons && u.weapons.length > 0) {
        const hasVehicleStats = u.weapons.some((w) => w.rowType === 'vehicle_stat');
        if (hasVehicleStats) {
          md.push('| Vehicle / Weapons | Type / Range | Trans / Shots | DV / Pen | Special |');
        } else {
          md.push('| Weapons | Range | Shots | Pen | Special |');
        }
        md.push('| :--- | :---: | :---: | :---: | :--- |');
        const seenW = new Set();
        for (const w of u.weapons) {
          const wKey = `${w.rowType || 'weapon'}|${w.variant || ''}|${w.Weapons}|${w.Range}|${w.Shots}|${w.Pen}|${w.Special}`;
          if (seenW.has(wKey)) continue;
          seenW.add(wKey);
          const wName = w.rowType === 'vehicle_stat' ? `**${w.Weapons || '-'}** *(Chassis)*` : (w.Weapons || '-');
          md.push(`| ${wName} | ${w.Range || '-'} | ${w.Shots || '-'} | ${w.Pen || '-'} | ${w.Special || '-'} |`);
        }
        md.push('');
      }
      if (u.weaponNotes && u.weaponNotes.length > 0) {
        const uniqueNotes = [...new Set(u.weaponNotes)];
        md.push('- **Weapon Notes**: ' + uniqueNotes.map((wn) => `*${wn}*`).join(' · '));
        md.push('');
      }
    }
  }

  md.push('---');
  md.push('');
}

// ============================================================================
// SECTION 5: UNIT SPECIAL RULES GLOSSARY (A-Z)
// ============================================================================
md.push('## 5. Unit Special Rules Glossary (A–Z)');
md.push('');
md.push('| Special Rule | Reference | Official Description (EasyArmy v3) |');
md.push('| :--- | :---: | :--- |');
for (const r of [...dedupedRules.values()].sort((a, b) => a.name.localeCompare(b.name))) {
  const cleanText = (r.text || '').replace(/\r?\n/g, ' ').trim();
  md.push(`| **${r.name}** | ${r.ref || 'v3'} | ${cleanText} |`);
}
md.push('');
fs.writeFileSync(path.join(ROOT, 'factions', 'soviet_union.md'), md.join('\n'));
console.log(`Saved factions/soviet_union.md (${md.length} lines)`);

// ============================================================================
// BUILD BROWSER BUNDLE FOR INDEX.HTML: factions/soviet_union_app_data.js
// ============================================================================
function inferOptionId(o, usedIds) {
  const t = `${o.group || ''} ${o.text || ''}`.toLowerCase();
  let base = `opt_${o.id}`;
  if (/airborne.*stubborn/.test(t)) base = 'hs_airborne';
  else if (/nkvd.*fanatics/.test(t)) base = 'hs_nkvd';
  else if (/naval brigade.*tough fighters/.test(t)) base = 'hs_naval';
  else if (/if naval brigade.*(officer|commissar).*submachine/.test(t)) base = 'officer_naval_smg';
  else if (/if naval brigade.*submachine/.test(t)) base = 'smg_naval_men';
  else if (/guard dog.*smg|guard dog.*submachine/.test(t)) base = 'dog_smg_errata';
  else if (/guard dog/.test(t)) base = o.max > 1 ? 'guard_dogs' : 'guard_dog';
  else if (/nco.*submachine|nco.*smg/.test(t)) base = 'nco_smg';
  else if (/officer.*submachine|commissar.*submachine/.test(t)) base = 'officer_smg';
  else if (/officer.*pistol|commissar.*pistol/.test(t)) base = 'officer_pistol';
  else if (/replace.*submachine|have.*submachine|with.*submachine|\bsmg\b/.test(t)) base = o.max > 1 ? 'smg_men' : 'smg';
  else if (/replace.*pistol|with.*pistol/.test(t)) base = o.max > 1 ? 'pistol_men' : 'pistol';
  else if (/light machine gun|\blmg\b/.test(t)) base = /pintle/.test(t) ? 'pintle_lmg' : 'lmg';
  else if (/panzerfaust/.test(t)) base = 'panzerfaust';
  else if (/anti-tank grenades|molotov/.test(t)) base = 'at_grenades';
  else if (/body armour|sn-42/.test(t)) base = 'body_armour';
  else if (/tough fighters/.test(t)) base = 'tough_fighters';
  else if (/flamethrower/.test(t)) base = 'flamethrower';
  else if (/demolition/.test(t)) base = 'demolition';
  else if (/victory banner/.test(t)) base = 'victory_banner';
  else if (/motorcycle/.test(t)) base = 'motorcycles';
  else if (/horse/.test(t)) base = 'horses';
  else if (/skis/.test(t)) base = 'skis';
  else if (/spotter/.test(t)) base = 'spotter';
  else if (/gun shield/.test(t)) base = 'gun_shield';
  else if (/crewman/.test(t)) base = 'extra_crew';
  else if (/pintle.*hmg|dshk/.test(t)) base = 'pintle_hmg';
  else if (/pintle.*mmg/.test(t)) base = 'pintle_mmg';
  else if (/rear.*mmg/.test(t)) base = 'rear_mmg';
  else if (/armour piercing ammunition/.test(t)) base = 'ap_ammo';
  else if (/infiltrator/.test(t)) base = 'infiltrators';

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
  if (/add up to \d+ (men|unarmed men|handlers)|accompanied by up to \d+ men/.test(g)) {
    return /^\+\d+\s*pts?\s*each/i.test(o.text);
  }
  if (/^(add up to \d+ (men|unarmed men|handlers)|the (officer|commissar|medic|observer) may be accompanied by up to \d+ men)/i.test(t)) {
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
    const label = o.group && !/^(options:?|hammer and sickle)$/i.test(o.group)
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
    page: u.source || 'Armies of the Soviet Union (v3)',
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
  id: 'soviet_union',
  faction: 'Soviet Union',
  book: 'Armies of the Soviet Union (v3)',
  platoons: appPlatoons,
  slotCatalog: Object.fromEntries(sectionUnits),
  platoonPeriods: periodAvailability,
  units: appUnits,
  rulesGlossary: Object.fromEntries([...dedupedRules.values()].map((r) => [r.name, r.text])),
  armyRules: [...armyRulesCatalog.values()],
};
fs.writeFileSync(
  path.join(ROOT, 'factions', 'soviet_union_app_data.js'),
  `// Auto-generated from EasyArmy Soviet Union v3 scrape\nwindow.EASYARMY_FACTIONS = window.EASYARMY_FACTIONS || {};\nwindow.EASYARMY_FACTIONS['soviet_union'] = ${JSON.stringify(appBundle, null, 2)};\nwindow.EASYARMY_SOVIET_DATA = window.EASYARMY_FACTIONS['soviet_union'];\n`
);
console.log('Saved factions/soviet_union_app_data.js');