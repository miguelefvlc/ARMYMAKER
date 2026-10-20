import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const factions = [
  { id: 'soviet_union', outId: '18', mainTpls: [662, 666, 670, 674, 678, 682] },
  { id: 'germany', outId: '1', mainTpls: [590, 592, 591, 593, 594, 595] },
  { id: 'japan', outId: '10', mainTpls: [686, 690, 694, 698, 702, 706] },
  { id: 'usa', outId: '2', mainTpls: [614, 618, 626, 622, 630, 634] },
  { id: 'great_britain', outId: '4', mainTpls: [638, 642, 650, 646, 654, 658] },
  { id: 'italy', outId: '5', mainTpls: [711, 715, 719, 723, 727, 731] }
];

let totalWarnings = 0;

for (const f of factions) {
  console.log(`\n========================================`);
  console.log(`Checking Faction: ${f.id.toUpperCase()}`);
  console.log(`========================================`);
  const appDataFile = path.join('factions', `${f.id}_app_data.js`);
  const code = fs.readFileSync(appDataFile, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const appData = sandbox.window.EASYARMY_FACTIONS?.[f.id];
  if (!appData) {
    console.error(`Could not extract app data for ${f.id}`);
    process.exit(1);
  }

  console.log(`- Platoons count: ${appData.platoons.length}`);
  console.log(`- Units in appData: ${Object.keys(appData.units).length}`);
  console.log(`- Slot catalog categories: ${Object.keys(appData.slotCatalog || {}).length}`);

  // 1. Verify Platoons structure vs EasyArmy raw templates
  for (const p of appData.platoons) {
    const rawTplFile = path.join('scraper', 'out', f.outId, 'templates', `${p.templateId}.json`);
    if (!fs.existsSync(rawTplFile)) {
      console.error(`  [ERROR] Missing raw template file: ${rawTplFile}`);
      totalWarnings++;
      continue;
    }
    const rawTpl = JSON.parse(fs.readFileSync(rawTplFile, 'utf8'));

    let appSlots = 0;
    let rawSlots = 0;
    p.columns.forEach((col, cIdx) => {
      appSlots += col.slots.length;
      const rawCol = rawTpl.layout[cIdx];
      if (!rawCol) {
        console.warn(`  [WARN] Missing raw column ${cIdx} in template ${p.title}`);
        totalWarnings++;
        return;
      }
      rawSlots += rawCol.length;

      col.slots.forEach((s, sIdx) => {
        const rawBox = rawCol[sIdx];
        if (!rawBox) {
          console.warn(`  [WARN] Missing raw box ${sIdx} in column ${cIdx} for ${p.title}`);
          totalWarnings++;
          return;
        }
        if (!!s.mandatory !== !!rawBox.required) {
          console.warn(`  [WARN] Mandatory mismatch in ${p.title} Col ${cIdx+1} Slot ${sIdx+1} (${s.label}): app=${s.mandatory}, raw=${rawBox.required}`);
          totalWarnings++;
        }
        // Verify available units in box exist in appData
        for (const uName of rawBox.units) {
          if (!appData.units[uName]) {
            console.warn(`  [WARN] Unit "${uName}" from raw EasyArmy slot [${rawBox.section}] is missing in appData.units!`);
            totalWarnings++;
          }
        }
      });
    });

    if (appSlots !== rawSlots) {
      console.warn(`  [WARN] Total slots mismatch in ${p.title}: app=${appSlots}, raw=${rawSlots}`);
      totalWarnings++;
    }
  }

  // 2. Verify all units and options
  let unitsVerified = 0;
  let optionsVerified = 0;
  for (const [name, u] of Object.entries(appData.units)) {
    unitsVerified++;
    if (!u.costs || Object.keys(u.costs).length === 0) {
      console.warn(`  [WARN] Unit "${name}" has no cost profiles!`);
      totalWarnings++;
    }
    for (const [exp, c] of Object.entries(u.costs)) {
      if (typeof c.points !== 'number' || c.points < 0) {
        console.warn(`  [WARN] Unit "${name}" has invalid points for ${exp}: ${c.points}`);
        totalWarnings++;
      }
    }
    if (u.optionsList) {
      optionsVerified += u.optionsList.length;
      const ids = new Set();
      for (const opt of u.optionsList) {
        if (ids.has(opt.id)) {
          console.warn(`  [WARN] Unit "${name}" has duplicate option id: ${opt.id}`);
          totalWarnings++;
        }
        ids.add(opt.id);
      }
    }
  }

  // 3. Verify period availability
  if (appData.platoonPeriods) {
    for (const [platoonKey, periods] of Object.entries(appData.platoonPeriods)) {
      for (const [periodKey, periodData] of Object.entries(periods)) {
        if (!periodData.templateId) {
          console.warn(`  [WARN] Missing templateId for ${f.id} platoon ${platoonKey} period ${periodKey}`);
          totalWarnings++;
        }
      }
    }
  }

  console.log(`  -> Checked ${unitsVerified} units, ${optionsVerified} options, all periods and platoon slots.`);
}

console.log(`\n========================================`);
console.log(`Audit finished. Total warnings: ${totalWarnings}`);
console.log(`========================================\n`);
