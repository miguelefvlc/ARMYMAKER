// =========================================================================
// ARMY ROSTER PRINT & PDF VIEW (Official Tournament A4 Roster)
// =========================================================================

const { useMemo } = React;

function formatCardWeaponName(name) {
  if (!name) return '';
  return name
    .replace(/^Infantry with\s+/i, '')
    .replace(/^men have\s+/i, '')
    .replace(/\s+in addition to other weapons/i, '')
    .replace(/\s*\([^)]*requires loader[^)]*\)/i, '')
    .replace(/\s*\(\d+\s*men\)/i, '')
    .replace(/Turret-mounted\s+/i, '')
    .replace(/Forward facing hull-mounted\s+/i, 'Hull ')
    .replace(/Hull-mounted\s+/i, 'Hull ')
    .replace(/Pintle-mounted\s+/i, 'Pintle ')
    .replace(/Co-axial\s+/i, 'Coax ')
    .replace(/anti-tank rifle team/i, 'Anti-tank rifle')
    .replace(/anti-tank gun/i, 'AT Gun')
    .replace(/light machine gun/i, 'LMG')
    .replace(/medium machine gun/i, 'MMG')
    .replace(/heavy machine gun/i, 'HMG')
    .replace(/submachine gun/i, 'SMG')
    .replace(/sniper team/i, 'Sniper rifle')
    .trim();
}

function getOrderedActiveUnits(platoon, platoonType) {
  const ordered = [];
  const visited = new Set();
  if (platoonType && platoonType.columns) {
    for (const col of platoonType.columns) {
      for (const slot of col.slots || []) {
        const unitItem = platoon.slots ? platoon.slots[slot.id] : null;
        if (unitItem && unitItem.name) {
          ordered.push({
            slotId: slot.id,
            slotName: slot.label || slot.id,
            matchedSlot: slot,
            unitItem
          });
          visited.add(slot.id);
        }
      }
    }
  }
  if (platoon.slots) {
    Object.entries(platoon.slots).forEach(([slotId, unitItem]) => {
      if (unitItem && unitItem.name && !visited.has(slotId)) {
        ordered.push({
          slotId,
          slotName: slotId,
          matchedSlot: { id: slotId, label: slotId, slotKey: slotId },
          unitItem
        });
      }
    });
  }
  return ordered;
}

function getUnitCardStats(def, config, rosterTable, summary) {
  const exp = config?.experience || def.defaultExp || 'regular';
  let morale = 9;
  if (exp === 'inexperienced') morale = 8;
  else if (exp === 'veteran') morale = 10;

  const nameLow = (def.name || '').toLowerCase();
  let officerBonus = '';
  if (nameLow.includes('2nd lieutenant') || nameLow.includes('platoon commander')) officerBonus = '+1';
  else if (nameLow.includes('1st lieutenant')) officerBonus = '+2';
  else if (nameLow.includes('captain') || nameLow.includes('company commander')) officerBonus = '+3';
  else if (nameLow.includes('major')) officerBonus = '+4';

  let toHit = '4+ base';
  if (nameLow.includes('sniper')) toHit = '3+ base';

  const hasVehicleRows = (def.weaponsTable || []).some(w => w.rowType === 'vehicle_stat');
  const isVehicle = !!def.damageValue || hasVehicleRows;
  const compRaw = def.composition || '';
  const isTeamOrArtillery =
    !isVehicle &&
    (!!def.profile?.Team ||
     /artillery|gun|howitzer|mortar|machine gun|sniper|flamethrower|anti-tank rifle|ampulomet|dog|piat|boys|solothurn|brixia/i.test(
       `${def.name} ${compRaw}`
     )) && !/squad|section|platoon|commander|commissar|medic|observer/i.test(def.name);

  // 1. Filter out chassis row and rows with no range & no shots
  const originalRows = (rosterTable.rows || []).filter(r => !r.isChassis && (r.range || r.shots));
  const rows = originalRows.map(r => ({ ...r }));

  // 2. Count LMGs
  let lmgCount = 0;
  rows.forEach(r => {
    if (/light machine gun|\blmg\b/i.test(r.weapons)) {
      lmgCount += parseInt(r.qty, 10) || 1;
    }
  });

  // 3. Subtract 1 rifle per LMG from active firing rifles (the loader feeds the LMG and does not shoot while LMG is alive)
  let loadersAssigned = 0;
  let loaderRange = '24"';
  if (lmgCount > 0) {
    let loadersToSubtract = lmgCount;
    for (const r of rows) {
      if (loadersToSubtract <= 0) break;
      if (/rifle/i.test(r.weapons) && !/nco|officer|sniper|anti-tank/i.test(r.weapons)) {
        if (r.range) loaderRange = r.range;
        const q = parseInt(r.qty, 10) || 1;
        if (q > loadersToSubtract) {
          r.qty = String(q - loadersToSubtract);
          loadersAssigned += loadersToSubtract;
          loadersToSubtract = 0;
        } else {
          loadersAssigned += q;
          loadersToSubtract -= q;
          r.qty = '0';
        }
      }
    }
    // Fallback: if not enough generic rifles, subtract from other infantry non-NCO weapon rows
    if (loadersToSubtract > 0) {
      for (const r of rows) {
        if (loadersToSubtract <= 0) break;
        if (!/light machine gun|\blmg\b|nco|officer/i.test(r.weapons)) {
          if (r.range) loaderRange = r.range;
          const q = parseInt(r.qty, 10) || 1;
          if (q > loadersToSubtract) {
            r.qty = String(q - loadersToSubtract);
            loadersAssigned += loadersToSubtract;
            loadersToSubtract = 0;
          } else {
            loadersAssigned += q;
            loadersToSubtract -= q;
            r.qty = '0';
          }
        }
      }
    }
  }

  // 4. Filter out assistant/loader/spotter persons, backup pistols, and zero-qty rows
  let cardRows = rows.filter(r => {
    if (r.qty === '0') return false;
    const w = (r.weapons || '').trim().toLowerCase();
    if (/^(spotter|loader|assistant|crew|extra crew|crewman)\b/i.test(w)) return false;
    if (isTeamOrArtillery && (/in addition to other weapons/i.test(w) || /^pistol\b/i.test(w))) return false;
    return true;
  });

  // 4b. Add the loader(s) row to the squad: the man is present, but does not shoot while LMG is alive
  if (loadersAssigned > 0) {
    cardRows.push({
      qty: String(loadersAssigned),
      weapons: 'Cargador LMG',
      range: loaderRange,
      shots: '0',
      pen: 'n/a',
      special: 'Loader (no dispara)'
    });
  }

  // For weapons teams/artillery, deduplicate identical weapon rows (e.g. scrape variants)
  if (isTeamOrArtillery && cardRows.length > 1) {
    const deduped = [];
    const seenBase = new Set();
    cardRows.forEach(r => {
      const base = (r.weapons || '').toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
      if (!seenBase.has(base)) {
        seenBase.add(base);
        deduped.push(r);
      }
    });
    cardRows = deduped;
  }

  // 5. Calculate total active shots
  let fixedShots = 0;
  let diceShots = [];
  let oneShotShots = 0;

  cardRows.forEach(r => {
    if (!r.shots || r.shots === '-' || r.shots === '' || r.shots === '0') return;
    const qty = parseInt(r.qty, 10) || 1;
    const isOneShot = /one[- ]shot/i.test(r.special || '');

    const num = parseInt(r.shots, 10);
    if (!isNaN(num) && String(num) === r.shots.trim()) {
      if (isOneShot) oneShotShots += qty * num;
      else fixedShots += qty * num;
    } else {
      diceShots.push(qty > 1 ? `${qty}x${r.shots.trim()}` : r.shots.trim());
    }
  });

  const shotParts = [];
  if (fixedShots > 0) shotParts.push(String(fixedShots));
  if (diceShots.length > 0) shotParts.push(diceShots.join('+'));
  if (oneShotShots > 0) shotParts.push(`+${oneShotShots}*`);
  const totalShots = shotParts.length > 0 ? shotParts.join(' ') : (isVehicle ? '0' : '—');

  // 6. Max Range
  let maxRangeVal = 0;
  let maxRangeStr = '—';
  cardRows.forEach(r => {
    if (!r.range || r.range === '-' || r.range === '—') return;
    const numbers = r.range.match(/\d+/g);
    if (numbers) {
      numbers.forEach(n => {
        const val = parseInt(n, 10);
        if (val > maxRangeVal) {
          maxRangeVal = val;
          maxRangeStr = val + '"';
        }
      });
    }
  });

  let troopCount = summary?.headCountText || '1 unit';
  if (isVehicle) {
    const chassisRow = rosterTable.rows.find(r => r.isChassis);
    troopCount = chassisRow?.range ? '1 veh. (' + chassisRow.range + ')' : '1 veh.';
  }

  // Rules
  const ruleSet = new Set();
  (rosterTable.rows || []).forEach(r => {
    if (r.special) {
      r.special.split(/[,|\/]/).forEach(s => {
        let clean = s.trim();
        clean = clean.replace(/\s*\([^)]*taken[^)]*\)/i, '').replace(/\s*\([^)]*if[^)]*\)/i, '').trim();
        if (clean && clean !== '-' && clean !== 'n/a' && !clean.toLowerCase().includes('requires loader')) {
          ruleSet.add(clean);
        }
      });
    }
  });
  if (def.specialRulesText && def.specialRulesText !== '-') {
    def.specialRulesText.split(/[\n,;]/).forEach(s => {
      let clean = s.trim();
      clean = clean.replace(/\s*\([^)]*taken[^)]*\)/i, '').replace(/\s*\([^)]*if[^)]*\)/i, '').trim();
      if (clean && !clean.toLowerCase().includes('hammer and sickle')) {
        ruleSet.add(clean);
      }
    });
  }

  return {
    morale: officerBonus ? morale + ' (' + officerBonus + ')' : String(morale),
    toHit,
    totalShots,
    maxRange: maxRangeStr,
    troopCount,
    cardRows,
    rules: Array.from(ruleSet)
  };
}

function UnitTacticalCard({ unitItem, platoon, platoonType, matchedSlot, factionData }) {
  const def = getUnitDefinition(factionData, unitItem.name);
  const summary = getUnitSummary(def, unitItem.config);
  const rosterTable = buildUnitRosterTable(def, unitItem.config);

  const exp = unitItem.config?.experience || def.defaultExp || "regular";
  const expLabel = EXP_LABELS[exp] || exp;

  const stats = useMemo(() => {
    return getUnitCardStats(def, unitItem.config, rosterTable, summary);
  }, [def, unitItem.config, rosterTable, summary]);

  const hasImage = !!def.image;
  const imageSrc = hasImage ? (def.image.startsWith('http') || def.image.startsWith('/') ? def.image : './' + def.image) : null;

  const platoonBadgeName = platoonType?.title ? `P#${platoon.id} ${platoonType.title}` : `Pelotón #${platoon.id}`;

  return (
    <div className="unit-card-cromo w-[90mm] h-[40mm] min-w-[90mm] max-w-[90mm] min-h-[40mm] max-h-[40mm] bg-white text-zinc-900 border-2 border-zinc-900 rounded-md p-1.5 flex flex-col justify-between shadow-2xs select-none break-inside-avoid relative overflow-hidden font-sans box-border">
      {/* CARD HEADER */}
      <div className="flex items-center justify-between gap-1.5 border-b border-zinc-900 pb-0.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <UnitTacticalIcon
            slot={matchedSlot}
            unitName={unitItem.name}
            platoonTypeId={platoonType?.id || platoon.typeId}
            width={16}
            height={13}
            color="#18181b"
            className="w-4 h-3.5 text-zinc-950 shrink-0"
          />
          <h4 className="font-tactical font-black text-[10px] sm:text-[10.5px] leading-tight uppercase text-zinc-950 truncate max-w-[44mm]" title={def.cardTitle || unitItem.name}>
            {def.cardTitle || unitItem.name}
          </h4>
          <span className="text-[7px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-300 text-zinc-700 shrink-0 truncate max-w-[30mm]" title={platoonBadgeName}>
            {platoonBadgeName}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="px-1.5 py-0.2 border border-zinc-700 rounded text-[7.5px] font-mono font-bold text-zinc-900 bg-white">
            {expLabel}
          </span>
          <span className="font-mono font-black text-[10.5px] text-zinc-950 bg-zinc-100 border border-zinc-400 px-1.5 py-0.2 rounded">
            {unitItem.points} PTS
          </span>
        </div>
      </div>

      {/* QUICK BATTLE STATS BAR (MONOCHROMATIC NUMBERS, NO DAÑO) */}
      <div className="grid grid-cols-5 gap-0.5 my-0.5 py-0.5 px-1 bg-zinc-100/90 border border-zinc-300 rounded font-mono text-center">
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-tighter">IMPACTO</span>
          <span className="text-[9.5px] font-black text-zinc-950 mt-0.5">{stats.toHit}</span>
        </div>
        <div className="flex flex-col items-center justify-center leading-none border-l border-zinc-300">
          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-tighter">DISPAROS</span>
          <span className="text-[9.5px] font-black text-zinc-950 mt-0.5">{stats.totalShots}</span>
        </div>
        <div className="flex flex-col items-center justify-center leading-none border-l border-zinc-300">
          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-tighter">ALCANCE</span>
          <span className="text-[9.5px] font-black text-zinc-950 mt-0.5">{stats.maxRange}</span>
        </div>
        <div className="flex flex-col items-center justify-center leading-none border-l border-zinc-300">
          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-tighter">MORAL</span>
          <span className="text-[9.5px] font-black text-zinc-950 mt-0.5">{stats.morale}</span>
        </div>
        <div className="flex flex-col items-center justify-center leading-none border-l border-zinc-300">
          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-tighter">EFECTIVOS</span>
          <span className="text-[9.5px] font-black text-zinc-950 mt-0.5 truncate max-w-full">{stats.troopCount}</span>
        </div>
      </div>

      {/* WEAPONS & MINIATURE MIDDLE SECTION (FIXED IMAGE SPACE & PURE WHITE BACKGROUND) */}
      <div className="flex-1 flex gap-1.5 items-stretch min-h-0 my-0.5 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden pr-0.5">
          {stats.cardRows.length > 0 ? (
            <table className="w-full text-left border-collapse text-[7.5px] font-mono leading-tight">
              <thead>
                <tr className="border-b border-zinc-300 text-zinc-500 font-bold text-[6.5px]">
                  <th className="py-0.2 pr-0.5 w-4">Ct</th>
                  <th className="py-0.2 pr-1">Arma</th>
                  <th className="py-0.2 px-0.5 text-center w-7">Alc.</th>
                  <th className="py-0.2 px-0.5 text-center w-5">Disp</th>
                  <th className="py-0.2 px-0.5 text-center w-5">Pen</th>
                  <th className="py-0.2 pl-0.5 w-14 truncate">Reglas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60">
                {stats.cardRows.map((r, rIdx) => (
                  <tr key={rIdx} className="text-zinc-900">
                    <td className="py-0.2 pr-0.5 font-bold text-zinc-950">{r.qty || '1'}</td>
                    <td className="py-0.2 pr-1 font-sans font-semibold truncate max-w-[70px]" title={r.weapons}>
                      {formatCardWeaponName(r.weapons)}
                    </td>
                    <td className="py-0.2 px-0.5 text-center text-zinc-700">{r.range || '—'}</td>
                    <td className="py-0.2 px-0.5 text-center font-bold text-zinc-950">{r.shots || '—'}</td>
                    <td className="py-0.2 px-0.5 text-center font-bold text-zinc-950">{r.pen || '—'}</td>
                    <td className="py-0.2 pl-0.5 font-sans text-zinc-600 truncate max-w-[65px]" title={r.special}>
                      {r.special || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center p-1 text-center text-[8px] font-mono text-zinc-500 italic bg-white rounded">
              {def.weapons || 'Unarmed / Command Personnel'}
            </div>
          )}
        </div>

        {/* FIXED IMAGE BOX: 25mm x 22mm, PURE WHITE BACKGROUND */}
        <div className="w-[25mm] h-[22mm] min-w-[25mm] max-w-[25mm] min-h-[22mm] max-h-[22mm] shrink-0 bg-white border border-zinc-200 rounded flex items-center justify-center p-0.5 overflow-hidden relative">
          {imageSrc && (
            <img
              src={imageSrc}
              alt={def.name}
              className="max-h-full max-w-full object-contain object-center drop-shadow-2xs"
              crossOrigin="anonymous"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fb = e.currentTarget.parentElement ? e.currentTarget.parentElement.querySelector('.tactical-icon-fallback') : null;
                if (fb) fb.style.display = 'block';
              }}
            />
          )}
          <div className={`tactical-icon-fallback ${imageSrc ? 'hidden' : 'block'}`}>
            <UnitTacticalIcon
              slot={matchedSlot}
              unitName={unitItem.name}
              platoonTypeId={platoonType?.id || platoon.typeId}
              width={22}
              height={16}
              color="#71717a"
              className="w-5 h-4 text-zinc-400"
            />
          </div>
        </div>
      </div>

      {/* FOOTER: SPECIAL RULES */}
      <div className="pt-0.5 mt-0.5 border-t border-zinc-200 flex items-center justify-between gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1 overflow-hidden">
          {stats.rules.length > 0 ? (
            stats.rules.map((ruleName, idx) => (
              <span
                key={idx}
                className="px-1 py-0.2 rounded text-[6.5px] font-sans font-bold bg-zinc-100 border border-zinc-300 text-zinc-800 shrink-0 leading-tight"
              >
                {ruleName}
              </span>
            ))
          ) : (
            <span className="text-[6.5px] font-mono text-zinc-400 italic">Standard rules</span>
          )}
        </div>
        <span className="text-[6.5px] font-mono text-zinc-400 font-semibold shrink-0 uppercase">
          P#{platoon.id} • {factionData?.book ? factionData.book.replace('Bolt Action ', '') : 'v3'}
        </span>
      </div>
    </div>
  );
}

function ArmyRosterPrintView({ factionData, armyListName, armyNotes, totalPoints, totalOrderDice, platoons, isPreview = false, exportOptions }) {
        const { includeUnitRules = true, includeArmyRules = true, includeUnitCards = true } = exportOptions || {};
        const platoonTypes = factionData?.platoons || [];
        const totalUnits = useMemo(() => platoons.reduce((acc, p) => acc + Object.keys(p.slots).length, 0), [platoons]);

        // Flatten all active units for unit battle cards (ordered by platoon and left-to-right columns)
        const allActiveUnits = useMemo(() => {
          const list = [];
          platoons.forEach((p) => {
            const pType = platoonTypes.find(t => t.id === p.typeId) || platoonTypes[0];
            const ordered = getOrderedActiveUnits(p, pType);
            ordered.forEach((item) => {
              list.push({
                platoon: p,
                platoonType: pType,
                ...item
              });
            });
          });
          return list;
        }, [platoons, platoonTypes]);

        // Collect only the Special Rules that apply to the units & active options in the roster
        const armyActiveRules = useMemo(() => {
          const rules = [];
          const seen = new Set();
          platoons.forEach((p) => {
            Object.values(p.slots).forEach((u) => {
              if (!u || !u.name) return;
              const def = getUnitDefinition(factionData, u.name);
              const rosterTable = buildUnitRosterTable(def, u.config);

              const activeKeywords = new Set();
              if (def.specialRulesText && def.specialRulesText !== '-') {
                activeKeywords.add(def.specialRulesText.toLowerCase());
              }
              rosterTable.rows.forEach((r) => {
                if (r.special) activeKeywords.add(r.special.toLowerCase());
                if (r.weapons) activeKeywords.add(r.weapons.toLowerCase());
              });
              const joinedActive = [...activeKeywords].join(' | ');

              (def.unitRules || []).forEach((r) => {
                if (!r || !r.name || seen.has(r.name)) return;
                const rn = r.name.toLowerCase();
                if (
                  joinedActive.includes(rn) ||
                  (rn.includes('shaped charge') && joinedActive.includes('shaped charge')) ||
                  (rn.includes('one-shot') && joinedActive.includes('one-shot')) ||
                  (rn.includes('tank hunters') && joinedActive.includes('tank hunters')) ||
                  (rn.includes('team') && (joinedActive.includes('loader') || joinedActive.includes('assistant') || joinedActive.includes('team')))
                ) {
                  rules.push(r);
                  seen.add(r.name);
                }
              });
            });
          });
          return rules;
        }, [platoons, factionData]);

        const currentDateStr = new Date().toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

        if (totalUnits === 0) {
          return (
            <div className="p-8 text-center text-zinc-500 font-mono text-xs">
              <p className="text-sm font-bold text-zinc-700 mb-1">Your army roster is currently empty.</p>
              <p>Select units in your platoon slots to preview or print the official roster.</p>
            </div>
          );
        }

        return (
          <div className={`w-full max-w-4xl mx-auto ${isPreview ? '' : 'bg-white text-zinc-900 font-sans'}`}>
            {/* ROSTER HEADER */}
            <div className="border-b-2 border-zinc-900 pb-3 mb-3 space-y-2">
              {/* Top Centered Logo + ARMY MAKER */}
              <div className="flex items-center justify-center gap-2 pb-1">
                <span className="font-tactical font-black text-sm sm:text-base tracking-widest uppercase text-zinc-950 leading-none">
                  ARMY
                </span>
                <HelmetLogo width={32} height={32} className="w-8 h-8 rounded-lg shadow-xs shrink-0" />
                <span className="font-tactical font-black text-sm sm:text-base tracking-widest uppercase text-[#9A7B1C] leading-none">
                  MAKER
                </span>
              </div>

              {/* Bottom Header Row: Faction & List Name (Left) + Totals (Right) */}
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-600 truncate">
                    {factionData?.faction || 'Soviet Union'} • {factionData?.book || 'Bolt Action v3'}
                  </div>
                  <h1 className="text-base sm:text-xl font-black font-tactical tracking-wider text-zinc-950 uppercase truncate">
                    {armyListName || 'Untitled Force'}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] sm:text-xs font-mono font-bold">
                  <div className="bg-zinc-950 text-white px-2 py-1 rounded shadow-sm">
                    TOTAL: <span className="text-amber-400 font-black">{totalPoints} PTS</span>
                  </div>
                  <div className="bg-zinc-100 border border-zinc-300 text-zinc-800 px-2 py-1 rounded">
                    Dice: <span className="text-zinc-950 font-black">{totalOrderDice}</span>
                  </div>
                  <div className="bg-zinc-100 border border-zinc-300 text-zinc-800 px-2 py-1 rounded">
                    Platoons: <span className="text-zinc-950 font-black">{platoons.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {armyNotes && armyNotes.trim() && (
              <div className="mb-3 p-2.5 bg-zinc-50 border border-zinc-200 rounded text-xs font-mono text-zinc-700">
                <span className="font-bold text-zinc-900 uppercase text-[10px] block mb-0.5">Force Notes:</span>
                <p className="whitespace-pre-line leading-relaxed text-justify" style={{ textAlign: 'justify' }}>{armyNotes}</p>
              </div>
            )}

            {/* PLATOONS */}
            <div className="space-y-4">
              {platoons.map((p) => {
                const pType = platoonTypes.find(t => t.id === p.typeId) || platoonTypes[0];
                const orderedUnits = getOrderedActiveUnits(p, pType);
                if (orderedUnits.length === 0) return null;

                const platoonPts = orderedUnits.reduce((sum, u) => sum + (u.unitItem.points || 0), 0);
                const platoonDice = orderedUnits.length;
                return (
                  <div key={p.id} className="platoon-print-block">
                    <div className="bg-zinc-900 text-white px-2.5 py-1.5 rounded-t flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs font-mono font-bold tracking-wider uppercase mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <PlatoonTacticalIcon typeId={p.typeId} width={28} height={20} color="#DFBF52" className="w-6 h-4 sm:w-7 sm:h-5 text-amber-400 shrink-0" />
                        <span className="text-amber-400 shrink-0">PLATOON #{p.id}</span>
                        <span className="text-zinc-200 font-tactical font-black text-xs sm:text-sm tracking-wider truncate">{pType?.title}</span>
                        {p.period && p.period !== 'All' && (
                          <span className="text-[9.5px] px-1.5 py-0.2 bg-zinc-800 rounded text-amber-300 shrink-0">
                            {p.period}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10.5px] sm:text-[11px] font-normal text-zinc-300 shrink-0">
                        <span>Points: <strong className="text-white font-bold">{platoonPts} pts</strong></span>
                        <span>•</span>
                        <span>Dice: <strong className="text-amber-400 font-bold">{platoonDice}</strong></span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {orderedUnits.map(({ slotId, slotName, matchedSlot, unitItem }) => {
                        const def = getUnitDefinition(factionData, unitItem.name);
                        const summary = getUnitSummary(def, unitItem.config);
                        const rosterTable = buildUnitRosterTable(def, unitItem.config);

                        const exp = unitItem.config?.experience || def.defaultExp || "regular";
                        const expLabel = EXP_LABELS[exp] || exp;

                        return (
                          <div
                            key={slotId}
                            className="unit-card border border-zinc-300 rounded-lg overflow-hidden bg-white shadow-xs break-inside-avoid text-xs text-zinc-800"
                          >
                            {/* UNIT HEADER ROW (EasyArmy Structure + Clean Modern Aesthetic) */}
                            <div className="px-3 py-2 bg-zinc-50/90 border-b border-zinc-200 flex items-center justify-between gap-3">
                              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                <UnitTacticalIcon
                                  slot={matchedSlot}
                                  unitName={unitItem.name}
                                  platoonTypeId={pType?.id || p.typeId}
                                  width={24}
                                  height={20}
                                  color="#18181b"
                                  className="w-6 h-5 text-zinc-900 shrink-0"
                                />
                                <h3 className="font-bold font-sans text-sm text-zinc-950 tracking-tight">
                                  {def.cardTitle || unitItem.name}
                                </h3>
                                {summary?.headCountText && (
                                  <span className="text-[11px] font-mono font-semibold text-zinc-600">
                                    ({summary.headCountText})
                                  </span>
                                )}
                                <span className="text-[9.5px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-200/70 text-zinc-700 font-semibold">
                                  {slotName}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="px-3 py-0.5 border border-zinc-800 rounded text-[11px] font-mono font-bold text-zinc-900 bg-white min-w-[82px] text-center shadow-2xs">
                                  {expLabel}
                                </span>
                                <span className="font-black text-sm font-mono text-zinc-950 min-w-[42px] text-right">
                                  {unitItem.points}
                                </span>
                              </div>
                            </div>

                            {/* UNIT INTEGRATED BREAKDOWN TABLE (Qty | Weapons | Range | Shots | Pen | Special) */}
                            <div className="px-3 py-1.5">
                              <table className="w-full text-[11px] text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-zinc-200 text-zinc-600 font-bold text-[10.5px]">
                                    <th className="py-1 pr-2 w-10">Qty</th>
                                    <th className="py-1 pr-3">{rosterTable.isVehicle ? 'Vehicle / Weapons' : 'Weapons'}</th>
                                    <th className="py-1 px-2 text-center w-20">{rosterTable.isVehicle ? 'Type / Range' : 'Range'}</th>
                                    <th className="py-1 px-2 text-center w-16">{rosterTable.isVehicle ? 'Trans / Shots' : 'Shots'}</th>
                                    <th className="py-1 px-2 text-center w-14">{rosterTable.isVehicle ? 'DV / Pen' : 'Pen'}</th>
                                    <th className="py-1 pl-2 w-44">Special</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200/70 font-mono text-[10.5px]">
                                  {rosterTable.rows.map((r, rIdx) => (
                                    <tr key={rIdx} className={r.isChassis ? 'bg-zinc-100/80 font-bold text-zinc-950' : 'text-zinc-800'}>
                                      <td className="py-1 pr-2 font-semibold text-zinc-900">{r.qty}</td>
                                      <td className={`py-1 pr-3 font-sans ${r.isChassis ? 'font-bold text-zinc-950' : 'text-zinc-900'}`}>
                                        {r.weapons}
                                      </td>
                                      <td className="py-1 px-2 text-center text-zinc-800">{r.range}</td>
                                      <td className="py-1 px-2 text-center text-zinc-900 font-semibold">{r.shots}</td>
                                      <td className="py-1 px-2 text-center text-zinc-900 font-semibold">{r.pen}</td>
                                      <td className="py-1 pl-2 font-sans text-zinc-700">{r.special}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* UNIT SPECIAL RULES (COMPACT SINGLE-COLUMN LIST) */}
            {includeUnitRules && armyActiveRules.length > 0 && (
              <div className="rules-print-block mt-4 pt-2.5 border-t-2 border-zinc-800 break-inside-avoid">
                <h2 className="text-[11px] font-black font-tactical uppercase tracking-wider text-zinc-900 mb-1.5">
                  Unit Special Rules
                </h2>
                <div className="space-y-1 text-[9.5px] font-sans text-justify" style={{ textAlign: 'justify' }}>
                  {armyActiveRules.map((r, idx) => (
                    <div key={idx} className="leading-snug text-zinc-800 text-justify" style={{ textAlign: 'justify' }}>
                      <strong className="font-bold text-zinc-950">{r.name}:</strong> {r.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FACTION ARMY SPECIAL RULES (COMPACT SINGLE-COLUMN LIST) */}
            {includeArmyRules && factionData?.armyRules && factionData.armyRules.length > 0 && (
              <div className="rules-print-block mt-3.5 pt-2.5 border-t border-zinc-300 break-inside-avoid">
                <h2 className="text-[11px] font-black font-tactical uppercase tracking-wider text-zinc-900 mb-1.5">
                  {factionData.faction} Army Special Rules
                </h2>
                <div className="space-y-1 text-[9.5px] font-sans text-justify" style={{ textAlign: 'justify' }}>
                  {factionData.armyRules.map((rule, idx) => (
                    <div key={idx} className="leading-snug text-zinc-800 text-justify" style={{ textAlign: 'justify' }}>
                      <strong className="font-bold text-zinc-950">{rule.name}:</strong> {rule.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* UNIT QUICKPLAY BATTLE CARDS */}
            {includeUnitCards && allActiveUnits.length > 0 && (
              <div className="unit-cards-section mt-8 pt-4 border-t-2 border-zinc-900 page-break-before break-before-page">
                <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-zinc-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <h2 className="text-xs sm:text-sm font-tactical font-black tracking-wider uppercase text-zinc-900">
                      Unit Battle Cards • Resumen de Unidades
                    </h2>
                  </div>
                </div>

                <div className="unit-cards-grid grid grid-cols-1 sm:grid-cols-2 gap-3 justify-items-center">
                  {allActiveUnits.map((item, idx) => (
                    <UnitTacticalCard
                      key={`${item.platoon.id}-${item.slotId}-${idx}`}
                      unitItem={item.unitItem}
                      platoon={item.platoon}
                      platoonType={item.platoonType}
                      matchedSlot={item.matchedSlot}
                      slotName={item.slotName}
                      factionData={factionData}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 pt-2 border-t border-zinc-300 flex items-center justify-between text-[9px] font-mono text-zinc-500">
              <span>ARMY MAKER — Bolt Action v3 Army Builder • {factionData?.book}</span>
              <span>Generated on {currentDateStr}</span>
            </div>
          </div>
        );
      }

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.ArmyRosterPrintView = ArmyRosterPrintView;
}
