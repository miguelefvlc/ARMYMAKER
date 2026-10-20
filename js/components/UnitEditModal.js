// =========================================================================
// UNIT CONFIGURATION MODAL (Two-Column Layout: Options, Weapons, Rules, Illustration)
// =========================================================================

function QuantityStepper({ value, max, onChange, min = 0 }) {
        return (
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-700 rounded-lg px-1.5 py-0.5 select-none">
            <button
              type="button"
              onClick={() => onChange(Math.max(min, value - 1))}
              className="px-1.5 py-0.5 text-zinc-400 hover:text-white font-mono font-bold text-xs cursor-pointer select-none"
            >
              −
            </button>
            <select
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="bg-transparent text-amber-300 font-mono font-bold text-xs focus:outline-none text-center cursor-pointer"
            >
              {min === 0 && <option value={0} className="bg-zinc-900 text-zinc-400">0</option>}
              {Array.from({ length: max - min }, (_, i) => min + i + (min === 0 ? 1 : 0)).map((num) => (
                <option key={num} value={num} className="bg-zinc-900 text-amber-300">
                  {min === 0 ? `+${num}` : num}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onChange(Math.min(max, value + 1))}
              className="px-1.5 py-0.5 text-zinc-400 hover:text-white font-mono font-bold text-xs cursor-pointer select-none"
            >
              +
            </button>
          </div>
        );
      }

      // =========================================================================
      // FULL-WINDOW UNIT CONFIGURATION MODAL (EasyArmy Two-Column Layout)
      // Left: Experience, Profile, Verbatim Options, Weapon Table, Special Rules
      // Right: Large Unit Illustration + Live Cost Breakdown
      // =========================================================================
      function UnitEditModal({ isOpen, onClose, factionData, unitItem, slotLabel, onSave, onClearUnit }) {
        if (!isOpen || !unitItem) return null;

        const def = useMemo(() => getUnitDefinition(factionData, unitItem.name), [factionData, unitItem.name]);

        const [experience, setExperience] = useState(unitItem.config?.experience || def.defaultExp || "regular");
        const [extraMen, setExtraMen] = useState(unitItem.config?.extraMen || 0);
        const [options, setOptions] = useState(unitItem.config?.options || {});

        useEffect(() => {
          setExperience(unitItem.config?.experience || def.defaultExp || "regular");
          setExtraMen(unitItem.config?.extraMen || 0);
          setOptions(unitItem.config?.options || {});
        }, [unitItem, def]);

        const currentConfig = useMemo(() => ({
          experience,
          extraMen,
          options
        }), [experience, extraMen, options]);

        const calculatedPoints = useMemo(
          () => calculateUnitPoints(def, currentConfig),
          [def, currentConfig]
        );
        const summary = useMemo(
          () => getUnitSummary(def, currentConfig),
          [def, currentConfig]
        );

        const handleOptionToggle = (optId, checked) => {
          setOptions(prev => ({ ...prev, [optId]: checked }));
        };

        const handleOptionCount = (optId, count) => {
          setOptions(prev => ({ ...prev, [optId]: count }));
        };

        const handleSave = () => {
          onSave({
            name: def.name,
            points: calculatedPoints,
            config: {
              experience,
              extraMen,
              options
            }
          });
          onClose();
        };
        const totalModels = summary?.totalModels || getUnitBaseMen(def) + extraMen;
        const costPerMan = def.costs[experience]?.extraCost ?? 10;

        // Group options by EasyArmy's original group headings
        const groupedOptions = useMemo(() => {
          const groups = [];
          const map = new Map();
          for (const opt of def.optionsList || []) {
            if (opt.id === 'extra_men') continue;
            const grpKey = opt.group || 'Options';
            if (!map.has(grpKey)) {
              const g = { title: grpKey, items: [] };
              map.set(grpKey, g);
              groups.push(g);
            }
            map.get(grpKey).items.push(opt);
          }
          return groups;
        }, [def]);
        const profileEntries = useMemo(() => {
          return Object.entries(def.profile || {});
        }, [def]);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100 no-print">
            <div className="bg-zinc-900 border-0 sm:border border-zinc-700 rounded-none sm:rounded-2xl shadow-2xl w-full sm:w-[96vw] max-w-[1440px] h-[100dvh] sm:h-[92dvh] overflow-hidden flex flex-col">
              {/* TOP HEADER BAR */}
              <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0 safe-top">
                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black font-tactical text-white tracking-wide uppercase truncate">
                    {def.cardTitle || def.name}
                  </h2>
                  {summary?.headCountText && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-amber-300 font-mono text-xs font-bold">
                      {summary.headCountText}
                    </span>
                  )}
                  {slotLabel && (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[11px] font-semibold">
                      {slotLabel}
                    </span>
                  )}
                  {def.period && (
                    <span className="hidden sm:inline px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-xs font-bold">
                      Period: {def.period}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">

                  <div className="bg-amber-400 text-black px-2.5 sm:px-3.5 py-1 rounded-lg font-black font-mono text-xs sm:text-sm shadow">
                    {calculatedPoints} pts
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    className="hidden sm:inline-flex px-4 py-1.5 rounded-lg bg-[#7A7F52] hover:bg-[#8A8F5E] text-[#E7E1CF] border border-[#B2A77A]/40 font-extrabold text-xs font-mono transition-colors shadow cursor-pointer"
                  >
                    Save Unit
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* MAIN TWO-COLUMN BODY (EasyArmy Official Layout) */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                {/* COMPACT MOBILE / PORTRAIT-TABLET ILLUSTRATION BANNER */}
                {def.image && (
                  <div className="lg:hidden mb-4 bg-white rounded-xl p-3 border-2 border-zinc-700 flex items-center justify-center max-h-48 overflow-hidden shadow">
                    <img src={`./${def.image}`} alt={def.name} className="max-h-40 w-auto object-contain" />
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
                  {/* LEFT COLUMN (7/12): COST, UNIT PROFILE, OPTIONS, WEAPONS TABLE, SPECIAL RULES */}
                  <div className="lg:col-span-7 space-y-4 sm:space-y-5">

                    {/* 1. COST / EXPERIENCE SELECTOR */}
                    <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-tactical font-bold uppercase tracking-wider text-amber-400">
                          Cost / Experience Level
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          Select unit rating
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {Object.entries(def.costs).map(([expKey, data]) => {
                          const isSelected = experience === expKey;
                          const expLabel = EXP_LABELS[expKey] || expKey;
                          return (
                            <button
                              key={expKey}
                              type="button"
                              onClick={() => setExperience(expKey)}
                              className={`py-2.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-between border cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-400 text-black border-amber-300 font-black shadow-md'
                                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                              }`}
                            >
                              <span>{expLabel}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${isSelected ? 'bg-black/15 text-black font-black' : 'bg-zinc-800 text-amber-400'}`}>
                                {data.points} pts
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* 2. UNIT PROFILE (Exact EasyArmy Fields) */}
                    {profileEntries.length > 0 && (
                      <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 space-y-2">
                        <div className="text-xs font-tactical font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800/80 pb-1.5">
                          Unit Profile
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs font-mono pt-1">
                          {profileEntries.map(([k, v]) => (
                            <div key={k} className={k === 'Special Rules' || k === 'Transport' || k === 'Tow' ? 'sm:col-span-2' : ''}>
                              <span className="text-zinc-400 font-semibold">{k}: </span>
                              <span className="text-zinc-100 whitespace-pre-line">{v}</span>
                            </div>
                          ))}
                          {def.notes && (
                            <div className="sm:col-span-2 pt-1.5 border-t border-zinc-800/60 text-zinc-400 italic text-[11px]">
                              {def.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* 3. OPTIONS (Verbatim EasyArmy Groups & Option Texts) */}
                    <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                        <span className="text-xs font-tactical font-bold uppercase tracking-wider text-amber-400">
                          Options
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          Official EasyArmy unit configuration
                        </span>
                      </div>

                      {/* Additional Men Control (when unit supports adding models) */}
                      {def.maxExtraMen > 0 && (
                        <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2">
                          <div className="text-[11px] font-mono font-bold text-amber-300/90">
                            {def.extraMenGroupText || (def.maxExtraMen === 1 ? 'Add 1 additional man:' : `Add up to ${def.maxExtraMen} men:`)}
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none min-w-0">
                              <input
                                type="checkbox"
                                checked={extraMen > 0}
                                onChange={(e) => setExtraMen(e.target.checked ? 1 : 0)}
                                className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-0 cursor-pointer shrink-0"
                              />
                              <span className={`text-xs font-mono ${extraMen > 0 ? 'text-amber-300 font-bold' : 'text-zinc-200'}`}>
                                +{costPerMan}pts each ({EXP_LABELS[experience] || experience}) — up to {def.maxExtraMen} {def.maxExtraMen === 1 ? 'man' : 'men'}
                              </span>
                            </label>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <QuantityStepper
                                value={extraMen}
                                max={def.maxExtraMen}
                                onChange={setExtraMen}
                              />
                              <span className="text-amber-400 font-mono text-xs font-bold w-20 text-right">
                                {formatPtsDelta(extraMen > 0 ? extraMen * costPerMan : costPerMan)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Grouped Options */}
                      {groupedOptions.map((grp, gIdx) => (
                        <div key={gIdx} className="space-y-1.5">
                          {grp.title && grp.title !== 'Options' && grp.title !== 'Options:' && (
                            <div className="text-[11px] font-mono font-bold text-amber-300/90 pt-1">
                              {grp.title}
                            </div>
                          )}

                          <div className="divide-y divide-zinc-800/60 border border-zinc-800/80 rounded-lg bg-zinc-900/50 overflow-hidden">
                            {grp.items.map((opt) => {
                              const displayLabel = opt.rawText || opt.label;

                              if (opt.type === "counter") {
                                const val = Number(options[opt.id] || 0);
                                const isChecked = val > 0;
                                const maxAllowed = opt.max || 1;
                                return (
                                  <div key={opt.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-zinc-800/40 transition-colors gap-3">
                                    <label className="flex items-center gap-2.5 cursor-pointer min-w-0 select-none">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => handleOptionCount(opt.id, e.target.checked ? 1 : 0)}
                                        className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-0 cursor-pointer shrink-0"
                                      />
                                      <span className={`text-xs font-mono leading-snug ${isChecked ? 'text-amber-300 font-semibold' : 'text-zinc-200'}`}>
                                        {displayLabel}
                                      </span>
                                    </label>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                      <QuantityStepper
                                        value={val}
                                        max={maxAllowed}
                                        onChange={(newCount) => handleOptionCount(opt.id, newCount)}
                                      />
                                      <span className="text-amber-400 font-mono text-xs font-bold w-20 text-right">
                                        {formatPtsDelta(val > 0 ? val * opt.cost : opt.cost)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }

                              if (opt.type === "per_man") {
                                const isChecked = !!options[opt.id];
                                const cost = totalModels * (opt.costPerMan || 0);
                                return (
                                  <div key={opt.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-zinc-800/40 transition-colors gap-3">
                                    <label className="flex items-center gap-2.5 cursor-pointer min-w-0 select-none">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => handleOptionToggle(opt.id, e.target.checked)}
                                        className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-0 cursor-pointer shrink-0"
                                      />
                                      <span className={`text-xs font-mono leading-snug ${isChecked ? 'text-amber-300 font-semibold' : 'text-zinc-200'}`}>
                                        {displayLabel}
                                      </span>
                                    </label>
                                    <span className="text-amber-400 font-mono text-xs font-bold w-20 text-right shrink-0">
                                      {formatPtsDelta(cost)}
                                    </span>
                                  </div>
                                );
                              }

                              const isChecked = !!options[opt.id];
                              return (
                                <div key={opt.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-zinc-800/40 transition-colors gap-3">
                                  <label className="flex items-center gap-2.5 cursor-pointer min-w-0 select-none">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => handleOptionToggle(opt.id, e.target.checked)}
                                      className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-amber-500 focus:ring-0 cursor-pointer shrink-0"
                                    />
                                    <span className={`text-xs font-mono leading-snug ${isChecked ? 'text-amber-300 font-semibold' : 'text-zinc-200'}`}>
                                      {displayLabel}
                                    </span>
                                  </label>
                                  <span className="text-amber-400 font-mono text-xs font-bold w-20 text-right shrink-0">
                                    {formatPtsDelta(opt.cost || 0)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {groupedOptions.length === 0 && def.maxExtraMen === 0 && (
                        <div className="text-zinc-500 text-xs font-mono italic py-3 text-center">
                          No additional options for this unit.
                        </div>
                      )}
                    </div>

                    {/* 4. WEAPONS TABLE (Official EasyArmy Weapon Chart) */}
                    {((def.weaponsTable && def.weaponsTable.length > 0) || (def.weaponNotes && def.weaponNotes.length > 0)) && (() => {
                      const hasVehicleStats = (def.weaponsTable || []).some(w => w.rowType === 'vehicle_stat');
                      const weaponRowsCount = (def.weaponsTable || []).filter(w => w.rowType !== 'vehicle_stat').length || (def.weaponsTable?.length || 0);
                      return (
                        <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                            <span className="text-xs font-tactical font-bold uppercase tracking-wider text-amber-400">
                              {hasVehicleStats ? `Vehicle & Weapons (${weaponRowsCount})` : `Weapons (${weaponRowsCount})`}
                            </span>
                            {def.damageValue && (
                              <span className="text-xs font-mono text-zinc-400">
                                Damage Value: <strong className="text-zinc-100">{def.damageValue}</strong>
                              </span>
                            )}
                          </div>

                          {def.weaponsTable && def.weaponsTable.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left border-collapse font-mono">
                                <thead>
                                  <tr className="text-zinc-400 border-b border-zinc-800 text-[10.5px] uppercase">
                                    <th className="py-1.5 pr-2 font-semibold">{hasVehicleStats ? 'Vehicle / Weapons' : 'Weapons'}</th>
                                    <th className="py-1.5 px-2 font-semibold text-center">{hasVehicleStats ? 'Type / Range' : 'Range'}</th>
                                    <th className="py-1.5 px-2 font-semibold text-center">{hasVehicleStats ? 'Trans / Shots' : 'Shots'}</th>
                                    <th className="py-1.5 px-2 font-semibold text-center">{hasVehicleStats ? 'DV / Pen' : 'Pen'}</th>
                                    <th className="py-1.5 pl-2 font-semibold">Special</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50 text-[11px]">
                                  {def.weaponsTable.map((w, idx) => {
                                    if (w.rowType === 'vehicle_stat') {
                                      return (
                                        <tr key={idx} className="bg-zinc-900/90 border-t border-zinc-700/80 text-amber-300">
                                          <td className="py-1.5 px-2 font-bold text-amber-300">
                                            <span>{w.name}</span>
                                            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-400/15 border border-amber-400/30 text-[9.5px] uppercase tracking-wider text-amber-200">
                                              Chassis
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-2 text-center font-semibold text-zinc-200">{w.range}</td>
                                          <td className="py-1.5 px-2 text-center text-zinc-300">{w.shots}</td>
                                          <td className="py-1.5 px-2 text-center font-black text-amber-300">{w.pen}</td>
                                          <td className="py-1.5 pl-2 text-zinc-300 italic">{w.special}</td>
                                        </tr>
                                      );
                                    }
                                    return (
                                      <tr key={idx} className="text-zinc-200 hover:bg-zinc-900/50">
                                        <td className={`py-1.5 pr-2 font-semibold text-white ${hasVehicleStats ? 'pl-2.5' : ''}`}>
                                          {hasVehicleStats ? `↳ ${w.name}` : w.name}
                                        </td>
                                        <td className="py-1.5 px-2 text-center text-zinc-300">{w.range}</td>
                                        <td className="py-1.5 px-2 text-center font-bold text-amber-300">{w.shots}</td>
                                        <td className="py-1.5 px-2 text-center font-bold text-amber-400">{w.pen}</td>
                                        <td className="py-1.5 pl-2 text-zinc-300">{w.special}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {def.weaponNotes && def.weaponNotes.length > 0 && (
                            <div className="pt-2 border-t border-zinc-800/60 space-y-1 text-[11px] font-mono text-zinc-400">
                              {def.weaponNotes.map((wn, idx) => (
                                <div key={idx}>• {wn}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {/* 5. UNIT SPECIAL RULES (Official EasyArmy Rule Descriptions) */}
                    {def.unitRules && def.unitRules.length > 0 && (
                      <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 space-y-2.5">
                        <div className="text-xs font-tactical font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800/80 pb-1.5">
                          Unit Special Rules ({def.unitRules.length})
                        </div>
                        <div className="space-y-2 text-xs font-mono">
                          {def.unitRules.map((r, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800/80">
                              <div className="font-bold text-amber-300">
                                <span>{r.name}</span>
                              </div>
                              {r.text && (
                                <p className="text-zinc-300 text-[11px] leading-relaxed mt-1 font-sans">
                                  {r.text}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* RIGHT COLUMN (5/12): LARGE UNIT ILLUSTRATION + LIVE SUMMARY CARD */}
                  <div className="lg:col-span-5 lg:sticky lg:top-0 space-y-5">

                    {/* LARGE ILLUSTRATION SHOWCASE (Right side on lg+, like original EasyArmy) */}
                    <div className="hidden lg:block bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-tactical font-bold uppercase tracking-wider text-zinc-400">
                        <span>Unit Illustration</span>
                        <span className="font-mono text-[11px] text-zinc-500">{def.name}</span>
                      </div>
                      {def.image ? (
                        <div className="w-full min-h-[280px] sm:min-h-[360px] lg:min-h-[420px] rounded-xl bg-white p-4 flex items-center justify-center overflow-hidden border-2 border-zinc-700 shadow-xl">
                          <img
                            src={`./${def.image}`}
                            alt={def.name}
                            className="max-w-full max-h-[400px] w-auto h-auto object-contain transition-transform duration-200 hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="w-full min-h-[220px] rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center p-6 text-center">
                          <div className="text-zinc-500 font-tactical uppercase tracking-widest text-sm font-bold">
                            No Illustration Available
                          </div>
                          <div className="text-zinc-600 font-mono text-xs mt-1">
                            {def.name}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* LIVE CONFIGURATION & COST BREAKDOWN */}
                    <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span className="font-tactical font-bold uppercase tracking-wider text-amber-400">
                          Configuration Summary
                        </span>
                        <span className="text-zinc-400 text-[11px]">
                          {EXP_LABELS[experience] || experience}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11.5px]">
                        <div className="flex items-center justify-between text-zinc-300">
                          <span>Base Unit ({EXP_LABELS[experience] || experience})</span>
                          <span className="font-bold text-white">{def.costs[experience]?.points ?? 0} pts</span>
                        </div>

                        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                          <span>Strength / Composition</span>
                          <span className="text-zinc-200">{summary?.compositionSummary}</span>
                        </div>
                        {summary?.selectedOptions && summary.selectedOptions.length > 0 && (
                          <div className="pt-2 mt-2 border-t border-zinc-800/80 space-y-1.5">
                            <div className="text-[10.5px] uppercase tracking-wider text-zinc-500 font-bold">
                              Selected Options ({summary.selectedOptions.length})
                            </div>
                            {summary.selectedOptions.map((item, idx) => (
                              <div key={idx} className="flex items-start justify-between gap-3 text-[11px]">
                                <span className="text-zinc-300 leading-snug">{item.text}</span>
                                <span className="text-amber-400 font-bold shrink-0">{formatPtsDelta(item.points)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                        <span className="font-tactical font-bold uppercase text-sm text-white">Total Unit Cost</span>
                        <span className="text-base font-black text-amber-400">{calculatedPoints} pts</span>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
              {/* BOTTOM FOOTER BAR */}
              <div className="px-3.5 sm:px-5 py-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-2 shrink-0 safe-bottom">
                <button
                  type="button"
                  onClick={() => {
                    onClearUnit();
                    onClose();
                  }}
                  className="px-3 py-2 sm:py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/70 border border-red-800/60 text-red-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
                >
                  Remove
                </button>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 sm:py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-semibold transition-colors border border-zinc-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-mono transition-colors shadow cursor-pointer"
                  >
                    Save Unit ({calculatedPoints} pts)
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      }
      // =========================================================================
      // TACTICAL UNIT ICON (Bolt Action v3 Official NATO-Style Symbols)

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.QuantityStepper = QuantityStepper;
  window.UnitEditModal = UnitEditModal;
}
