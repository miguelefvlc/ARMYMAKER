// =========================================================================
// BOLT ACTION V3 RULES & CALCULATION ENGINE
// Pure JavaScript calculation and ballistic weapon roster logic
// =========================================================================

const LEGACY_UNIT_ALIASES = {
        "Tanque ligero T-26A": "T-26A Light Tank",
        "Tanque ligero T-26B": "T-26B Light Tank",
        "Tanque lanzallamas ligero OT-26/OT-133": "OT-26/OT-133 Light Flamethrower Tank",
        "Tanque ligero BT-5 y BT-7": "BT-5 and BT-7 Light Tank",
        "Tanque ligero T-37": "T-37 Light Tank",
        "Tanque ligero T-40": "T-40 Light Tank",
        "Tanque ligero T-50": "T-50 Light Tank",
        "Tanque ligero T-60": "T-60 Light Tank",
        "Tanque ligero T-70": "T-70 Light Tank",
        "Tanque mediano T-28": "T-28 Medium Tank",
        "Tanque mediano T-34/76": "T-34/76 Medium Tank",
        "Tanque mediano T-34/85": "T-34/85 Medium Tank",
        "Fábrica de tractores T-34": "Tractor Factory T-34",
        "Tanque pesado T-35": "T-35 Heavy Tank",
        "Tanque pesado KV-1": "KV-1 Heavy Tank",
        "Tanque pesado KV-85 e IS-1": "KV-85 and IS-1 Heavy Tank",
        "Tanque pesado IS-2": "IS-2 Heavy Tank",
        "Tanque pesado IS-3": "IS-3 Heavy Tank",
        "ZIS-30": "ZiS-30",
        "SU-152 e ISU-152": "SU-152 and ISU-152",
        "Tokarev 4M Quad Maxim en camión GAZ-AA": "Tokarev 4M Quad Maxim on GAZ-AA Truck",
        "Vehículo blindado pesado BA-3/6": "BA-3/6 Heavy Armoured Car",
        "Coche blindado ligero D-8": "D-8 Light Armoured Car",
        "Coche blindado ligero FAI": "FAI Light Armoured Car",
        "Jeep GAZ (sin transporte)": "GAZ Jeep (no transport)",
        "Vehículo M3 White Scout (sin transporte)": "M3 White Scout Car (no transport)",
        "Transportista universal (sin transporte)": "Universal Carrier (no transport)",
        "Tanque de Infantería Mk III Valentine I-VIIA": "Infantry Tank Mk III Valentine I-VIIA",
        "Tanque ligero Mk VII Tetrarch": "Light Tank Mk VII Tetrarch",
        "M4 Sherman 76 mm": "M4 Sherman 76mm",
        "Churchill III o IV": "Churchill III or IV",
        "SU-57 (T48 Vehículo de artillería autopropulsada)": "SU-57 (T48 Gun Motor Carriage)",
        "Vehículo motorizado con cañón múltiple M16/M17": "M16/M17 Multiple Gun Motor Carriage",
        "Regla del vehículo de mando (v3)": "Command Vehicle rule (v3)"
      };
      function getUnitDefinition(factionData, unitName) {
        const canonical = LEGACY_UNIT_ALIASES[unitName] || unitName;
        const units = factionData?.units || {};
        const entry = units[canonical] || units[unitName];
        if (entry) return entry;
        return {
          name: unitName,
          cardTitle: unitName,
          page: factionData?.book || "Bolt Action v3",
          period: "E/M/L",
          image: null,
          profile: {},
          composition: "1 Unit",
          weapons: "Standard",
          damageValue: null,
          specialRulesText: "-",
          costs: { regular: { points: 50 } },
          defaultExp: "regular",
          maxExtraMen: 0,
          optionsList: [],
          weaponsTable: [],
          weaponNotes: [],
          unitRules: [],
        };
      }

      function getUnitBaseMen(def) {
        if (!def) return 0;
        if (def.damageValue) return 0;
        const comp = (def.composition || "").toLowerCase();
        if (!comp || comp.includes("vehicle")) return 0;

        const ncoMatch = comp.match(/(\d+)\s*nco.*?(\d+)\s*men/i);
        if (ncoMatch) {
          return parseInt(ncoMatch[1], 10) + parseInt(ncoMatch[2], 10);
        }
        const menMatch = comp.match(/(\d+)\s*(men|handlers)/i);
        if (menMatch) {
          return parseInt(menMatch[1], 10);
        }

        if (comp.includes("officer") || comp.includes("commander") || comp.includes("commissar") || comp.includes("medic") || comp.includes("observer")) {
          let count = 1;
          const extraMatch = comp.match(/and\s*(\d+)\s*men/i);
          if (extraMatch) count += parseInt(extraMatch[1], 10);
          return count;
        }
        return 1;
      }

      function calculateUnitPoints(def, config) {
        if (!def || !config) return 0;
        const expData = def.costs[config.experience] || Object.values(def.costs)[0] || { points: 0 };
        let points = expData.points || 0;
        const extraMen = Number(config.extraMen || 0);
        if (extraMen > 0 && def.maxExtraMen > 0) {
          const costPerMan = expData.extraCost ?? 10;
          points += extraMen * costPerMan;
        }
        let extraPersonnel = 0;
        if (config.options?.extra_crew) extraPersonnel += 1;
        if (config.options?.spotter) extraPersonnel += 1;
        const totalMenCount = getUnitBaseMen(def) + extraMen + extraPersonnel;

        if (config.options && def.optionsList) {
          def.optionsList.forEach(opt => {
            if (opt.id === 'extra_men') return;
            const val = config.options[opt.id];
            if (!val) return;

            if (opt.type === "checkbox") {
              points += opt.cost || 0;
            } else if (opt.type === "counter") {
              points += Number(val) * (opt.cost || 0);
            } else if (opt.type === "per_man") {
              points += totalMenCount * (opt.costPerMan || 0);
            }
          });
        }

        return points;
      }
      function getUnitSummary(def, config) {
        if (!def) return null;
        const options = config?.options || {};
        const extraMen = Number(config?.extraMen || 0);
        const hasVehicleRows = (def.weaponsTable || []).some((w) => w.rowType === 'vehicle_stat');
        const isVehicle = !!def.damageValue || hasVehicleRows;
        const baseMen = getUnitBaseMen(def);

        let extraPersonnel = 0;
        if (options.extra_crew) extraPersonnel += 1;
        if (options.spotter) extraPersonnel += 1;
        const totalModels = isVehicle ? 1 : baseMen + extraMen + extraPersonnel;
        const menLabel = totalModels === 1 ? '1 man' : `${totalModels} men`;
        // Collect active option descriptions with their point costs
        const selectedOptions = [];
        const expKey = config?.experience || def.defaultExp || 'regular';
        const expData = def.costs[expKey] || Object.values(def.costs)[0] || { points: 0 };

        if (extraMen > 0 && def.maxExtraMen > 0) {
          const costPerMan = expData.extraCost ?? 10;
          selectedOptions.push({
            id: 'extra_men',
            text: `+${extraMen} additional ${extraMen === 1 ? 'man' : 'men'} (@ +${costPerMan}pts each)`,
            points: extraMen * costPerMan,
          });
        }
        for (const opt of def.optionsList || []) {
          if (opt.id === 'extra_men') continue;
          const val = options[opt.id];
          if (!val) continue;

          if (opt.type === 'counter') {
            const count = Number(val);
            const pts = count * (opt.cost || 0);
            selectedOptions.push({
              id: opt.id,
              text: `${count}× ${opt.rawText || opt.label}`,
              points: pts,
            });
          } else if (opt.type === 'per_man') {
            const pts = totalModels * (opt.costPerMan || 0);
            selectedOptions.push({
              id: opt.id,
              text: `${opt.rawText || opt.label} (${menLabel})`,
              points: pts,
            });
          } else {
            selectedOptions.push({
              id: opt.id,
              text: opt.rawText || opt.label,
              points: opt.cost || 0,
            });
          }
        }

        const headCountText = isVehicle
          ? '1 vehicle'
          : totalModels > 0
          ? menLabel
          : def.composition;

        const compositionSummary = isVehicle
          ? '1 vehicle'
          : extraMen > 0
          ? `${def.composition} + ${extraMen} (${menLabel})`
          : `${def.composition} (${menLabel})`;

        return {
          isVehicle,
          baseMen,
          totalModels,
          headCountText,
          compositionSummary,
          selectedOptions,
        };
      }

      function formatPtsDelta(pts) {
        if (pts > 0) return `+${pts} pts`;
        if (pts < 0) return `${pts} pts`;
        return `0 pts`;
      }

function cleanSpecialText(s) {
        if (!s || s === '-') return '';
        return s;
      }

      function findUnitWeaponRow(def, regex, fallback, excludeRegex = null) {
        const found = (def?.weaponsTable || []).find(
          (w) => w.rowType !== 'vehicle_stat' && regex.test(w.name || '') && (!excludeRegex || !excludeRegex.test(w.name || ''))
        );
        if (found) {
          return {
            range: found.range && found.range !== '-' ? found.range : fallback.range,
            shots: found.shots && found.shots !== '-' ? found.shots : fallback.shots,
            pen: found.pen && found.pen !== '-' ? found.pen : fallback.pen,
            special: cleanSpecialText(found.special) || fallback.special,
          };
        }
        return fallback;
      }

      function buildUnitRosterTable(def, config) {
        if (!def) return { isVehicle: false, rows: [] };
        const options = config?.options || {};
        const extraMen = Number(config?.extraMen || 0);
        const hasVehicleRows = (def.weaponsTable || []).some((w) => w.rowType === 'vehicle_stat');
        const isVehicle = !!def.damageValue || hasVehicleRows;

        // Collect selected option objects
        const activeOpts = [];
        for (const opt of def.optionsList || []) {
          if (opt.id === 'extra_men') continue;
          const val = options[opt.id];
          if (!val) continue;
          activeOpts.push({ opt, val, count: opt.type === 'counter' ? Number(val) : 1 });
        }

        // ---------------------------------------------------------------------
        // CASE 1: VEHICLES & TRANSPORTS
        // ---------------------------------------------------------------------
        if (isVehicle) {
          const variants = [];
          let current = null;
          for (const w of def.weaponsTable || []) {
            if (w.rowType === 'vehicle_stat') {
              current = { chassis: w, weapons: [] };
              variants.push(current);
            } else {
              if (!current) {
                current = {
                  chassis: {
                    name: def.cardTitle || def.name,
                    range: 'Tracked',
                    shots: def.transport ? String(def.transport) : '-',
                    pen: def.damageValue || '-',
                    special: def.specialRulesText || '',
                  },
                  weapons: [],
                };
                variants.push(current);
              }
              current.weapons.push(w);
            }
          }

          const allOptText = activeOpts.map((x) => `${x.opt.group || ''} ${x.opt.rawText || x.opt.label}`).join(' ').toLowerCase();
          const wantsFlamethrower = /flamethrower|\bot-/i.test(allOptText);

          let chosen = variants[0] || null;
          if (variants.length > 1) {
            if (wantsFlamethrower) {
              chosen = variants.find((v) => /flamethrower|\bot-/i.test(v.chassis.name)) || chosen;
            } else {
              // Match specific named option variant (e.g. Tractor Factory T-34 defects) or non-flamethrower default
              const byOpt = variants.find((v) => {
                const m = v.chassis.name.match(/\(([^)]+)\)/);
                return m && allOptText.includes(m[1].toLowerCase());
              });
              if (byOpt) {
                chosen = byOpt;
              } else {
                chosen =
                  variants.find((v) => !/flamethrower|\bot-/i.test(v.chassis.name)) || chosen;
              }
            }
          }

          const rows = [];
          if (chosen?.chassis) {
            rows.push({
              qty: '1',
              weapons: chosen.chassis.name,
              range: chosen.chassis.range || '-',
              shots: chosen.chassis.shots || '-',
              pen: chosen.chassis.pen || def.damageValue || '-',
              special: cleanSpecialText(chosen.chassis.special),
              isChassis: true,
            });
          }

          const baseWText = (def.weapons || '').toLowerCase();
          const hasPintleOpt = /pintle/i.test(allOptText);
          const removesHullMmg = /remove.*hull.*mmg/i.test(allOptText);

          for (const w of chosen?.weapons || []) {
            const wn = (w.name || '').toLowerCase();
            if (wn.includes('pintle') && !baseWText.includes('pintle') && !hasPintleOpt) continue;
            if (removesHullMmg && wn.includes('hull') && wn.includes('mmg')) continue;
            if (w.range === '-' && w.shots === '-' && w.pen === '-') continue;
            rows.push({
              qty: '1',
              weapons: w.name,
              range: w.range || '-',
              shots: w.shots || '-',
              pen: w.pen || 'n/a',
              special: cleanSpecialText(w.special),
            });
          }

          for (const { opt } of activeOpts) {
            const txt = opt.rawText || opt.label || '';
            if (/pintle|flamethrower|remove.*hull|no optics|hastily repaired|factory worker/i.test(txt)) continue;
            rows.push({
              qty: '',
              weapons: txt.replace(/\s+for\s+[+-]?\d+\s*pts.*$/i, ''),
              range: '',
              shots: '',
              pen: '',
              special: /recce/i.test(txt)
                ? 'Recce'
                : /reinforced front armour/i.test(txt)
                ? 'Reinforced Front Armour'
                : /improved ballistics/i.test(txt)
                ? 'Improved Ballistics'
                : /schürzen|schurzen|armour skirts/i.test(txt)
                ? 'Schürzen (Protects vs shaped charges)'
                : /gyro-stabiliser|gyrostabiliser/i.test(txt)
                ? 'Gyro-stabiliser'
                : /command vehicle/i.test(txt)
                ? 'Command Vehicle'
                : '',
            });
          }

          return { isVehicle: true, rows };
        }

        // ---------------------------------------------------------------------
        // CASE 2: ARTILLERY & WEAPONS TEAMS (Mortar, MMG, Sniper, AT Rifle, etc.)
        // ---------------------------------------------------------------------
        const compRaw = def.composition || '';
        const isTeamOrArtillery =
          !!def.profile?.Team ||
          /artillery|gun|howitzer|mortar|machine gun|sniper|flamethrower|anti-tank rifle|ampulomet|dog|piat|boys|solothurn|brixia/i.test(
            `${def.name} ${compRaw}`
          ) && !/squad|section|platoon|commander|commissar|medic|observer/i.test(def.name);

        if (isTeamOrArtillery) {
          const rows = [];
          const primaryWeapons = (def.weaponsTable || []).filter((w) => {
            if (w.rowType === 'vehicle_stat') return false;
            const wn = (w.name || '').toLowerCase();
            if (wn === 'rifles' || wn === 'rifle' || wn === 'submachine gun' || wn === 'pistol' || wn.includes('anti-tank grenades')) {
              return (def.weapons || '').toLowerCase().includes(wn);
            }
            return true;
          });

          if (primaryWeapons.length > 0) {
            primaryWeapons.forEach((w, idx) => {
              const isAltMode = /\(alt\.\s*mode\)/i.test(w.name);
              rows.push({
                qty: isAltMode ? '' : '1',
                weapons: idx === 0 && compRaw ? `${w.name} (${compRaw}${extraMen > 0 ? ` + ${extraMen} ${extraMen === 1 ? 'man' : 'men'}` : ''})` : w.name,
                range: w.range || '-',
                shots: w.shots || '-',
                pen: w.pen || 'n/a',
                special: cleanSpecialText(w.special),
              });
            });
          } else {
            rows.push({
              qty: '1',
              weapons: `${def.name} (${compRaw || 'Team'})`,
              range: '-',
              shots: '-',
              pen: 'n/a',
              special: cleanSpecialText(def.specialRulesText),
            });
          }

          for (const { opt, count } of activeOpts) {
            const txt = opt.rawText || opt.label || '';
            const cleanTxt = txt.replace(/\s+(for|at)\s+[+-]?\d+\s*pts.*$/i, '');
            if (/submachine gun|\bsmg\b/i.test(txt)) {
              const smgStats = findUnitWeaponRow(def, /submachine gun|\bsmg\b/i, {
                range: '12"',
                shots: '2',
                pen: 'n/a',
                special: 'Assault',
              });
              rows.push({
                qty: String(count),
                weapons: cleanTxt,
                ...smgStats,
              });
            } else if (/spotter/i.test(txt)) {
              rows.push({ qty: '1', weapons: 'Spotter', range: '', shots: '', pen: '', special: 'Infiltrator' });
            } else if (/gun shield/i.test(txt)) {
              rows.push({ qty: '', weapons: 'Gun shield', range: '', shots: '', pen: '', special: 'Gun Shield' });
            } else {
              rows.push({
                qty: count > 1 ? String(count) : '',
                weapons: cleanTxt,
                range: '',
                shots: '',
                pen: '',
                special: /stubborn/i.test(txt)
                  ? 'Stubborn'
                  : /fanatics/i.test(txt)
                  ? 'Fanatics'
                  : /tough fighters/i.test(txt)
                  ? 'Tough fighters'
                  : '',
              });
            }
          }

          return { isVehicle: false, rows };
        }

        // ---------------------------------------------------------------------
        // CASE 3: INFANTRY SQUADS & HQ UNITS (Exact EasyArmy Roster Breakdown)
        // ---------------------------------------------------------------------
        let leaderLabel = 'NCO';
        let hasLeader = true;
        let baseMen = 0;

        const ncoMatch = compRaw.match(/(\d+)\s*nco.*?(\d+)\s*men/i);
        if (ncoMatch) {
          leaderLabel = 'NCO';
          baseMen = parseInt(ncoMatch[2], 10);
        } else if (/officer|commander/i.test(compRaw)) {
          leaderLabel = 'Officer';
          const m = compRaw.match(/and\s*(\d+)\s*men/i);
          baseMen = m ? parseInt(m[1], 10) : 0;
        } else if (/commissar/i.test(compRaw)) {
          leaderLabel = 'Commissar';
          const m = compRaw.match(/and\s*(\d+)\s*men/i);
          baseMen = m ? parseInt(m[1], 10) : 0;
        } else if (/medic/i.test(compRaw)) {
          leaderLabel = 'Medic';
          const m = compRaw.match(/and\s*(\d+)\s*(unarmed\s*)?men/i);
          baseMen = m ? parseInt(m[1], 10) : 0;
        } else if (/observer/i.test(compRaw)) {
          leaderLabel = 'Forward Observer';
          const m = compRaw.match(/and\s*(\d+)\s*men/i);
          baseMen = m ? parseInt(m[1], 10) : 0;
        } else {
          const m = compRaw.match(/(\d+)\s*men/i);
          if (m) {
            hasLeader = false;
            baseMen = parseInt(m[1], 10);
          } else {
            leaderLabel = def.name;
            baseMen = 0;
          }
        }

        const totalMen = baseMen + extraMen;
        const baseWeaponsLower = (def.weapons || '').toLowerCase();

        let defaultWeapon = 'Rifle';
        if (baseWeaponsLower.includes('submachine gun') && !baseWeaponsLower.includes('rifle')) {
          defaultWeapon = 'Submachine gun';
        } else if (baseWeaponsLower.includes('pistol') && !baseWeaponsLower.includes('rifle') && !baseWeaponsLower.includes('submachine')) {
          defaultWeapon = 'Pistol';
        } else if (baseWeaponsLower.includes('none') || baseWeaponsLower.includes('unarmed')) {
          defaultWeapon = 'Unarmed';
        }

        let leaderWeapon = defaultWeapon;
        let leaderSpecial = '';
        let smgMen = 0;
        let assaultRifleMen = 0;
        let barMen = 0;
        let shotgunMen = 0;
        let pistolMen = 0;
        let lmgMen = /(\b1\b|one)\s+light machine gun|\b1\s+lmg\b/i.test(def.weapons || '') ? 1 : 0;
        let flamethrowerMen = 0;
        let lightMortarMen = 0;
        let atRifleMen = 0;
        const extraRows = [];

        for (const { opt, count } of activeOpts) {
          const fullText = `${opt.group || ''} ${opt.rawText || opt.label || ''}`;
          const lower = fullText.toLowerCase();
          const rawLabel = (opt.rawText || opt.label || '').replace(/\s+(for|at)\s+[+-]?\d+\s*pts.*$/i, '');

          // 1. Panzerfaust (in addition to other weapons)
          if (lower.includes('panzerfaust')) {
            const pfStats = findUnitWeaponRow(def, /panzerfaust/i, {
              range: '12"',
              shots: '1',
              pen: '+6',
              special: 'One-shot, Shaped Charge',
            });
            extraRows.push({
              qty: String(count),
              weapons: 'men have Panzerfaust in addition to other weapons',
              ...pfStats,
            });
            continue;
          }

          // 1b. PIAT (Britain)
          if (lower.includes('piat')) {
            const piatStats = findUnitWeaponRow(def, /piat/i, {
              range: '12"',
              shots: '1',
              pen: '+5',
              special: 'Team, Shaped Charge',
            });
            extraRows.push({
              qty: String(count),
              weapons: 'PIAT',
              ...piatStats,
            });
            continue;
          }

          // 1c. VB Launcher (France)
          if (lower.includes('vb launcher')) {
            const vbStats = findUnitWeaponRow(def, /vb launcher/i, {
              range: '6"-18"',
              shots: '1',
              pen: 'HE',
              special: 'Indirect fire, HE (1")',
            });
            extraRows.push({
              qty: String(count),
              weapons: 'man has VB launcher attachment (rifle or light mortar)',
              ...vbStats,
            });
            continue;
          }

          // 2. Anti-tank grenades
          if (lower.includes('anti-tank grenades') || lower.includes('molotov')) {
            extraRows.push({
              qty: '',
              weapons: 'Entire squad equipped with anti-tank grenades',
              range: '',
              shots: '',
              pen: '',
              special: 'Tank hunters',
            });
            continue;
          }

          // 3. Shin Gunto (Japan)
          if (lower.includes('shin gunto')) {
            if (lower.includes('pistol')) {
              leaderWeapon = 'Shin Gunto and Pistol';
              leaderSpecial = 'Tough fighters, Assault';
            } else {
              leaderSpecial = 'Tough fighters';
            }
            continue;
          }

          // 4. Demolition charge
          if (lower.includes('demolition charge')) {
            extraRows.push({
              qty: String(count),
              weapons: 'Demolition charge (carried in addition to other weapons)',
              range: 'Throw',
              shots: '1',
              pen: '+5',
              special: 'One-shot, Demolition',
            });
            continue;
          }

          // 5. Entire squad SMG replacement
          if ((lower.includes('entire squad') || lower.includes('all men')) && (lower.includes('submachine') || lower.includes('smg'))) {
            leaderWeapon = 'Submachine gun';
            defaultWeapon = 'Submachine gun';
            if (lower.includes('tough fighters')) {
              extraRows.push({
                qty: '',
                weapons: 'Submachine gun squad',
                range: '',
                shots: '',
                pen: '',
                special: 'Tough fighters',
              });
            }
            continue;
          }

          // 6. Leader-specific weapon replacement (NCO / Officer / Commissar)
          const mentionsLeader = /\b(nco|officer|commissar)\b/i.test(lower);
          const mentionsOtherMen = /\b(\d+|up to|additional)\s*men\b/i.test(lower);
          if (mentionsLeader && !mentionsOtherMen) {
            if (lower.includes('assault rifle') || lower.includes('sturmgewehr') || /\bstg\b/.test(lower)) {
              leaderWeapon = 'Assault rifle';
              continue;
            }
            if (lower.includes('carbine')) {
              leaderWeapon = 'Carbine';
              continue;
            }
            if (lower.includes('submachine') || lower.includes('smg')) {
              leaderWeapon = 'Submachine gun';
              continue;
            }
            if (lower.includes('pistol')) {
              leaderWeapon = 'Pistol';
              continue;
            }
            if (lower.includes('rifle')) {
              leaderWeapon = 'Rifle';
              continue;
            }
          }

          // 7. Men weapon replacements (Assault Rifle, BAR, Shotgun, SMG, LMG, Flamethrower, Light Mortar, AT Rifle, Pistol)
          if (lower.includes('assault rifle') || lower.includes('sturmgewehr') || /\bstg\b/.test(lower)) {
            if (mentionsLeader && mentionsOtherMen) {
              leaderWeapon = 'Assault rifle';
              assaultRifleMen += Math.min(totalMen, Math.max(0, count - 1));
            } else {
              assaultRifleMen += count;
            }
            continue;
          }

          if (lower.includes('automatic rifle') || lower.includes('browning automatic rifle') || /\bbar\b/i.test(lower)) {
            barMen += count;
            continue;
          }

          if (lower.includes('shotgun')) {
            shotgunMen += count;
            continue;
          }

          if ((lower.includes('submachine') || lower.includes('smg')) && !lower.includes('guard dog')) {
            if (mentionsLeader && mentionsOtherMen) {
              leaderWeapon = 'Submachine gun';
              smgMen += Math.min(totalMen, Math.max(0, count - 1));
            } else {
              smgMen += count;
            }
            continue;
          }

          if (lower.includes('light machine gun') || /\blmg\b/.test(lower) || lower.includes('breda') || lower.includes('vickers k')) {
            lmgMen += count;
            continue;
          }

          if (lower.includes('flamethrower')) {
            flamethrowerMen += count;
            continue;
          }

          if (lower.includes('light mortar') || lower.includes('knee mortar') || lower.includes('grenade discharger') || lower.includes('brixia')) {
            lightMortarMen += count;
            continue;
          }

          if (lower.includes('anti-tank rifle') || lower.includes('boys') || lower.includes('solothurn')) {
            atRifleMen += count;
            continue;
          }

          if (lower.includes('pistol') && !lower.includes('in addition')) {
            pistolMen += count;
            continue;
          }

          // 8. Other squad upgrades / special rules (Airborne, NKVD, Naval Brigade, Body Armour, Skis, Cavalry, Dogs, etc.)
          let specialRule = '';
          if (lower.includes('stubborn') || lower.includes('airborne')) specialRule = 'Stubborn';
          else if (lower.includes('fanatics') || lower.includes('nkvd')) specialRule = 'Fanatics';
          else if (lower.includes('tough fighters') || lower.includes('naval brigade')) specialRule = 'Tough fighters';
          else if (lower.includes('body armour') || lower.includes('sn-42')) specialRule = 'Body Armour';
          else if (lower.includes('skis')) specialRule = 'Winter-equipped';
          else if (lower.includes('cavalry') || lower.includes('horses')) specialRule = 'Cavalry';
          else if (lower.includes('infiltrator')) specialRule = 'Infiltrators';
          else if (lower.includes('guard dog')) specialRule = 'Guard Dog';

          extraRows.push({
            qty: opt.type === 'counter' ? String(count) : '',
            weapons: rawLabel,
            range: '',
            shots: '',
            pen: '',
            special: specialRule,
          });
        }

        const getWeaponProfile = (wName) => {
          const wl = wName.toLowerCase();
          if (wl.includes('assault rifle') || wl.includes('sturmgewehr')) {
            return findUnitWeaponRow(def, /assault rifle|sturmgewehr/i, {
              range: '18"',
              shots: '2',
              pen: 'n/a',
              special: 'Assault',
            });
          }
          if (wl.includes('carbine')) {
            return findUnitWeaponRow(def, /carbine/i, {
              range: '18"',
              shots: '1',
              pen: 'n/a',
              special: 'Assault',
            });
          }
          if (wl.includes('submachine')) {
            return findUnitWeaponRow(def, /submachine gun|\bsmg\b/i, {
              range: '12"',
              shots: '2',
              pen: 'n/a',
              special: 'Assault',
            });
          }
          if (wl.includes('shin gunto')) {
            return {
              range: '-',
              shots: '-',
              pen: 'n/a',
              special: 'Tough fighters',
            };
          }
          if (wl.includes('pistol')) {
            return findUnitWeaponRow(def, /pistol/i, {
              range: '6"',
              shots: '1',
              pen: 'n/a',
              special: 'Assault',
            });
          }
          if (wl.includes('unarmed')) {
            return { range: '-', shots: '-', pen: 'n/a', special: '' };
          }
          return findUnitWeaponRow(def, /\brifle\b/i, {
            range: '24"',
            shots: '1',
            pen: 'n/a',
            special: '',
          }, /assault|anti-tank|automatic/i);
        };

        const rows = [];

        // Leader row
        if (hasLeader) {
          const lStats = getWeaponProfile(leaderWeapon);
          const combinedSpecial = [cleanSpecialText(lStats.special), leaderSpecial].filter(Boolean).join(', ');
          rows.push({
            qty: '1',
            weapons: leaderWeapon === 'Unarmed' ? `${leaderLabel} (Unarmed)` : `${leaderLabel} with ${leaderWeapon}`,
            ...lStats,
            special: combinedSpecial,
          });
        }

        // Calculate remaining default-weapon men
        const replacedMen = assaultRifleMen + barMen + shotgunMen + smgMen + pistolMen + lmgMen + flamethrowerMen + lightMortarMen + atRifleMen;
        const remainingDefaultMen = Math.max(0, totalMen - replacedMen);

        if (remainingDefaultMen > 0) {
          const dStats = getWeaponProfile(defaultWeapon);
          rows.push({
            qty: String(remainingDefaultMen),
            weapons: defaultWeapon === 'Unarmed' ? (remainingDefaultMen === 1 ? 'Unarmed man' : 'Unarmed men') : `Infantry with ${defaultWeapon}`,
            ...dStats,
          });
        }

        if (assaultRifleMen > 0) {
          const arStats = getWeaponProfile('Assault rifle');
          rows.push({
            qty: String(Math.min(totalMen, assaultRifleMen)),
            weapons: 'Infantry with Assault rifle',
            ...arStats,
          });
        }

        if (barMen > 0) {
          const barStats = findUnitWeaponRow(def, /automatic rifle|browning automatic rifle|\bbar\b/i, {
            range: '30"',
            shots: '2',
            pen: 'n/a',
            special: '',
          });
          rows.push({
            qty: String(Math.min(totalMen, barMen)),
            weapons: 'Infantry with BAR (Browning Automatic Rifle)',
            ...barStats,
          });
        }

        if (shotgunMen > 0) {
          const sgStats = findUnitWeaponRow(def, /shotgun/i, {
            range: '12"',
            shots: '1',
            pen: 'n/a',
            special: 'Assault',
          });
          rows.push({
            qty: String(Math.min(totalMen, shotgunMen)),
            weapons: 'Infantry with Shotgun',
            ...sgStats,
          });
        }

        if (smgMen > 0) {
          const smgStats = getWeaponProfile('Submachine gun');
          rows.push({
            qty: String(Math.min(totalMen, smgMen)),
            weapons: 'Infantry with Submachine gun',
            ...smgStats,
          });
        }

        if (pistolMen > 0) {
          const pStats = getWeaponProfile('Pistol');
          rows.push({
            qty: String(Math.min(totalMen, pistolMen)),
            weapons: 'Infantry with Pistol',
            ...pStats,
          });
        }

        if (lmgMen > 0) {
          const lmgStats = findUnitWeaponRow(def, /light machine gun|\blmg\b/i, {
            range: '36"',
            shots: '4',
            pen: 'n/a',
            special: '',
          });
          rows.push({
            qty: String(lmgMen),
            weapons: 'Infantry with Light Machine gun (requires loader)',
            ...lmgStats,
          });
        }

        if (flamethrowerMen > 0) {
          const ftStats = findUnitWeaponRow(def, /flamethrower/i, {
            range: '6"',
            shots: 'D6',
            pen: '+3',
            special: 'Team, Flamethrower',
          });
          rows.push({
            qty: String(flamethrowerMen),
            weapons: 'Infantry with Flamethrower (requires assistant)',
            ...ftStats,
          });
        }

        if (lightMortarMen > 0) {
          const lmStats = findUnitWeaponRow(def, /light mortar|knee mortar/i, {
            range: '12"-24"',
            shots: '1',
            pen: 'HE',
            special: 'Team, Indirect fire, HE (1")',
          });
          rows.push({
            qty: String(lightMortarMen),
            weapons: 'Infantry with Light mortar',
            ...lmStats,
          });
        }

        if (atRifleMen > 0) {
          const atrStats = findUnitWeaponRow(def, /anti-tank rifle/i, {
            range: '36"',
            shots: '1',
            pen: '+2',
            special: 'Team',
          });
          rows.push({
            qty: String(atRifleMen),
            weapons: 'Infantry with Anti-tank rifle',
            ...atrStats,
          });
        }

        rows.push(...extraRows);
        return { isVehicle: false, rows };
      }

      // =========================================================================
      // UNIT VALIDATION & DYNAMIC LIMIT CALCULATION ENGINE
      // Validates squad weapon replacements, leader options, additions, and caps
      // =========================================================================
      function validateUnitConfiguration(def, config) {
        if (!def) return { isValid: true, errors: [], dynamicMaxes: {}, breakdown: null };

        // Vehicles and transports have fixed weapon loadouts and options (pintle, etc.)
        const hasVehicleRows = (def.weaponsTable || []).some((w) => w.rowType === 'vehicle_stat');
        if (def.damageValue || hasVehicleRows) {
          return { isValid: true, errors: [], dynamicMaxes: {}, breakdown: null };
        }

        const compRaw = def.composition || def.profile?.Composition || '';
        const options = config?.options || {};
        const extraMen = Number(config?.extraMen || 0);

        // 1. Parse Squad Structure
        let leaderLabel = 'NCO';
        let hasLeader = false;
        let leaderCount = 0;
        let baseRankAndFile = 0;

        const ncoMatch = compRaw.match(/(\d+)\s*nco.*?(\d+)\s*men/i);
        if (ncoMatch) {
          leaderLabel = 'NCO';
          hasLeader = true;
          leaderCount = parseInt(ncoMatch[1], 10);
          baseRankAndFile = parseInt(ncoMatch[2], 10);
        } else if (/officer|commander/i.test(compRaw)) {
          leaderLabel = 'Officer';
          hasLeader = true;
          leaderCount = 1;
          const m = compRaw.match(/and\s*(\d+)\s*men/i);
          baseRankAndFile = m ? parseInt(m[1], 10) : 0;
        } else if (/commissar/i.test(compRaw)) {
          leaderLabel = 'Commissar';
          hasLeader = true;
          leaderCount = 1;
          const m = compRaw.match(/and\s*(\d+)\s*men/i);
          baseRankAndFile = m ? parseInt(m[1], 10) : 0;
        } else if (/medic/i.test(compRaw)) {
          leaderLabel = 'Medic';
          hasLeader = true;
          leaderCount = 1;
          const m = compRaw.match(/and\s*(\d+)\s*(unarmed\s*)?men/i);
          baseRankAndFile = m ? parseInt(m[1], 10) : 0;
        } else if (/observer/i.test(compRaw)) {
          leaderLabel = 'Forward Observer';
          hasLeader = true;
          leaderCount = 1;
          const m = compRaw.match(/and\s*(\d+)\s*men/i);
          baseRankAndFile = m ? parseInt(m[1], 10) : 0;
        } else {
          const m = compRaw.match(/(\d+)\s*men/i);
          if (m) {
            hasLeader = false;
            leaderCount = 0;
            baseRankAndFile = parseInt(m[1], 10);
          } else {
            leaderLabel = def.name;
            hasLeader = false;
            leaderCount = 0;
            baseRankAndFile = getUnitBaseMen(def);
          }
        }

        const extraCrew = options.extra_crew ? 1 : 0;
        const availableRankAndFile = baseRankAndFile + extraMen + extraCrew;
        const totalSquadModels = leaderCount + availableRankAndFile;

        // 2. Classify each option
        const categorized = [];
        const errors = [];
        const dynamicMaxes = {};

        let leaderReplacementsCount = 0;
        const leaderReplacementsNames = [];

        for (const opt of def.optionsList || []) {
          if (opt.id === 'extra_men') continue;
          const fullText = `${opt.group || ''} ${opt.rawText || opt.label || ''}`;
          const lower = fullText.toLowerCase();

          // In addition to other weapons (Panzerfaust, demolition charge, etc.)
          const isAddition = /in addition (to )?(other |their )?weapons/i.test(lower);

          // Squad-wide or per-man upgrades (SN-42 body armour, AT grenades, Stubborn, etc.)
          const isPerManOrSquadUpgrade =
            opt.type === 'per_man' ||
            /entire squad|all models|all men/i.test(lower) ||
            /body armour|anti-tank grenades|molotov|skis|horses|cavalry|tough fighters|fanatics|stubborn|infiltrator/i.test(lower);

          // Leader-only weapon replacement (e.g. NCO SMG, Officer Pistol, NCO Assault Rifle)
          const mentionsLeader = /\b(nco|officer|commissar)\b/i.test(lower);
          const mentionsOtherMen = /\b(\d+|up to|additional)\s*men\b/i.test(lower) || /\band\b.*?\bmen\b/i.test(lower);
          const isLeaderOnly = mentionsLeader && !mentionsOtherMen;
          const isCombinedLeaderAndMen = mentionsLeader && mentionsOtherMen;

          // Weapon replacement
          const isWeaponOption =
            /replace.*(rifle|carbine|submachine|weapon)|submachine gun|assault rifle|light machine gun|\blmg\b|flamethrower|light mortar|knee mortar|anti-tank rifle|shotgun|pistol/i.test(lower);

          const isRankAndFileReplacement =
            !isAddition &&
            !isPerManOrSquadUpgrade &&
            !isLeaderOnly &&
            !isCombinedLeaderAndMen &&
            (isWeaponOption || /any model|any man|anybody|up to \d+ men/i.test(lower));

          // Extract normative rule limit if specified in the rule text (e.g. "Up to 2 men", "Up to 1 man")
          let normativeLimit = null;
          const upToMatch = lower.match(/\bup to\s*(\d+)\s*(other\s*)?(men|model|soldier|man)/i);
          if (upToMatch) {
            normativeLimit = parseInt(upToMatch[1], 10);
            if (isCombinedLeaderAndMen && hasLeader) {
              normativeLimit += 1;
            }
          } else if (opt.max && !/any model|any man|anybody|any number/i.test(lower)) {
            normativeLimit = opt.max;
          }

          categorized.push({
            opt,
            lower,
            normativeLimit,
            isAddition,
            isPerManOrSquadUpgrade,
            isLeaderOnly,
            isCombinedLeaderAndMen,
            isRankAndFileReplacement
          });
        }

        // 3. Count active replacements
        let totalRankAndFileReplacements = 0;
        const rankAndFileBreakdown = [];
        let hasTeamWeapon = false;

        for (const item of categorized) {
          const { opt, lower, isLeaderOnly, isCombinedLeaderAndMen, isRankAndFileReplacement } = item;
          const val = options[opt.id];
          if (!val) continue;

          if (isLeaderOnly) {
            leaderReplacementsCount += 1;
            leaderReplacementsNames.push(opt.rawText || opt.label);
          }

          if (isCombinedLeaderAndMen) {
            const count = opt.type === 'counter' ? Number(val) : 1;
            if (count > 0) {
              if (hasLeader) {
                leaderReplacementsCount += 1;
                leaderReplacementsNames.push(`${opt.rawText || opt.label} (Leader)`);
                const menPortion = Math.max(0, count - 1);
                if (menPortion > 0) {
                  totalRankAndFileReplacements += menPortion;
                  rankAndFileBreakdown.push({ opt, count: menPortion, label: opt.rawText || opt.label });
                }
              } else {
                totalRankAndFileReplacements += count;
                rankAndFileBreakdown.push({ opt, count, label: opt.rawText || opt.label });
              }
            }
          }

          if (isRankAndFileReplacement) {
            const count = opt.type === 'counter' ? Number(val) : 1;
            if (count > 0) {
              totalRankAndFileReplacements += count;
              rankAndFileBreakdown.push({ opt, count, label: opt.rawText || opt.label });
            }
          }

          if (/light machine gun|\blmg\b|flamethrower/i.test(lower)) {
            hasTeamWeapon = true;
          }
        }

        // 4. Calculate dynamic maxes for all counter options (normative rules take precedence)
        for (const item of categorized) {
          const { opt, normativeLimit, isAddition, isCombinedLeaderAndMen, isRankAndFileReplacement } = item;
          if (opt.type !== 'counter') continue;

          if (isAddition) {
            const squadCap = Math.min(opt.max ?? totalSquadModels, totalSquadModels);
            const finalCap = normativeLimit !== null ? Math.min(normativeLimit, squadCap) : squadCap;
            dynamicMaxes[opt.id] = Math.max(0, finalCap);
          } else if (isCombinedLeaderAndMen) {
            const maxCapacity = (hasLeader ? 1 : 0) + availableRankAndFile;
            const finalCap = normativeLimit !== null ? Math.min(normativeLimit, maxCapacity) : maxCapacity;
            dynamicMaxes[opt.id] = Math.max(0, finalCap);
          } else if (isRankAndFileReplacement) {
            const currentOptCount = Number(options[opt.id] || 0);
            const otherReplacements = totalRankAndFileReplacements - currentOptCount;
            const remainingCapacity = Math.max(0, availableRankAndFile - otherReplacements);
            const baseCap = opt.max ? Math.min(opt.max, remainingCapacity) : remainingCapacity;
            const finalCap = normativeLimit !== null ? Math.min(normativeLimit, baseCap) : baseCap;
            dynamicMaxes[opt.id] = Math.max(0, finalCap);
          } else {
            dynamicMaxes[opt.id] = normativeLimit !== null ? normativeLimit : (opt.max || 1);
          }
        }

        // 5. Detect Errors
        // Error A: Rank-and-file weapon replacements exceed available rank-and-file soldiers
        if (totalRankAndFileReplacements > availableRankAndFile) {
          const detail = rankAndFileBreakdown.map((b) => `${b.count}× ${b.opt.label || b.opt.id}`).join(', ');
          errors.push(
            `Exceso de armas: ${totalRankAndFileReplacements} soldados han reemplazado su fusil (${detail}), pero solo hay ${availableRankAndFile} soldados regulares en la escuadra (${hasLeader ? `el ${leaderLabel} cuenta en otra casilla` : 'sin líder'}).`
          );
        }

        // Error B: Specific counter option exceeds its dynamic max
        for (const item of categorized) {
          const { opt, isAddition, isRankAndFileReplacement } = item;
          if (opt.type !== 'counter') continue;
          const val = Number(options[opt.id] || 0);
          const dMax = dynamicMaxes[opt.id] ?? opt.max ?? 1;
          if (val > dMax) {
            if (isRankAndFileReplacement) {
              errors.push(
                `"${opt.rawText || opt.label}": seleccionado ${val}, pero el máximo disponible es ${dMax} soldados.`
              );
            } else if (isAddition) {
              errors.push(
                `"${opt.rawText || opt.label}": seleccionado ${val}, pero excede el tamaño de la escuadra (${totalSquadModels} modelos).`
              );
            }
          }
        }

        // Error C: Normative rule limit strictly exceeded
        for (const item of categorized) {
          const { opt, normativeLimit } = item;
          if (normativeLimit === null) continue;
          const val = opt.type === 'counter' ? Number(options[opt.id] || 0) : (options[opt.id] ? 1 : 0);
          if (val > normativeLimit) {
            errors.push(
              `Límite reglamentario superado: "${opt.rawText || opt.label}": la norma sólo permite un máximo de ${normativeLimit} arma${normativeLimit > 1 ? 's' : ''} (seleccionado ${val}).`
            );
          }
        }

        // Error C: Leader taking more than 1 primary weapon replacement
        if (leaderReplacementsCount > 1) {
          errors.push(
            `Conflicto en ${leaderLabel}: ha seleccionado más de una opción de reemplazo de arma (${leaderReplacementsNames.join(' y ')}). Solo puede llevar una.`
          );
        }

        // Error D: Team weapon requires at least 2 models
        if (hasTeamWeapon && totalSquadModels < 2) {
          errors.push(
            `El arma de apoyo requiere al menos 2 soldados en la escuadra (tirador y servidor/asistente).`
          );
        }

        return {
          isValid: errors.length === 0,
          errors: Array.from(new Set(errors)),
          dynamicMaxes,
          breakdown: {
            hasLeader,
            leaderLabel,
            leaderCount,
            baseRankAndFile,
            extraMen,
            availableRankAndFile,
            totalSquadModels,
            leaderReplacementsCount,
            totalRankAndFileReplacements,
            remainingRifles: Math.max(0, availableRankAndFile - totalRankAndFileReplacements)
          }
        };
      }

// Export / Attach to global scope (works in browser window and Node globalThis)
const _root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
_root.LEGACY_UNIT_ALIASES = LEGACY_UNIT_ALIASES;
_root.getUnitDefinition = getUnitDefinition;
_root.getUnitBaseMen = getUnitBaseMen;
_root.calculateUnitPoints = calculateUnitPoints;
_root.getUnitSummary = getUnitSummary;
_root.formatPtsDelta = formatPtsDelta;
_root.cleanSpecialText = cleanSpecialText;
_root.findUnitWeaponRow = findUnitWeaponRow;
_root.buildUnitRosterTable = buildUnitRosterTable;
_root.validateUnitConfiguration = validateUnitConfiguration;
