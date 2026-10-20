// =========================================================================
// ARMY ROSTER PRINT & PDF VIEW (Official Tournament A4 Roster)
// =========================================================================

function ArmyRosterPrintView({ factionData, armyListName, armyNotes, totalPoints, totalOrderDice, platoons, isPreview = false }) {
        const platoonTypes = factionData?.platoons || [];
        const totalUnits = useMemo(() => platoons.reduce((acc, p) => acc + Object.keys(p.slots).length, 0), [platoons]);

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
                const activeUnits = Object.entries(p.slots).filter(([_, u]) => u && u.name);
                if (activeUnits.length === 0) return null;

                const platoonPts = activeUnits.reduce((sum, [_, u]) => sum + (u.points || 0), 0);
                const platoonDice = activeUnits.length;
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
                      {activeUnits.map(([slotId, unitItem]) => {
                        const def = getUnitDefinition(factionData, unitItem.name);
                        const summary = getUnitSummary(def, unitItem.config);
                        const rosterTable = buildUnitRosterTable(def, unitItem.config);
                        let slotName = slotId;
                        let matchedSlot = { id: slotId, label: slotId, slotKey: slotId };
                        for (const col of pType?.columns || []) {
                          const foundSlot = col.slots.find(s => s.id === slotId);
                          if (foundSlot) {
                            slotName = foundSlot.label;
                            matchedSlot = foundSlot;
                            break;
                          }
                        }

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
            {armyActiveRules.length > 0 && (
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
            {factionData?.armyRules && factionData.armyRules.length > 0 && (
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
            <div className="mt-5 pt-2 border-t border-zinc-300 flex items-center justify-between text-[9px] font-mono text-zinc-500">
              <span>ARMY MAKER — Bolt Action v3 Army Builder • {factionData?.book}</span>
              <span>Generated on {currentDateStr}</span>
            </div>
          </div>
        );
      }
      // =========================================================================

      // =========================================================================

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.ArmyRosterPrintView = ArmyRosterPrintView;
}
