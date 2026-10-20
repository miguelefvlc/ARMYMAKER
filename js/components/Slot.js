// =========================================================================
// SLOT COMPONENT (Platoon Box, Unit Selection, Search, Edit & Clear)
// =========================================================================

const { useState, useEffect, useRef, useMemo } = React;

function Slot({ slot, factionData, platoonTypeId, periodKey, value, onSelect, onEdit, onClear }) {
        const [isOpen, setIsOpen] = useState(false);
        const [searchTerm, setSearchTerm] = useState("");
        const dropdownRef = useRef(null);
        const def = useMemo(() => {
          if (!value) return null;
          return getUnitDefinition(factionData, value.name);
        }, [factionData, value]);

        const summary = useMemo(() => {
          if (!value || !def) return null;
          return getUnitSummary(def, value.config);
        }, [def, value]);
        const availableUnits = useMemo(() => {
          if (!isOpen) return [];
          const sKey = slot.slotKey || slot.label;
          const periodSlots = factionData?.platoonPeriods?.[platoonTypeId]?.[periodKey || 'All']?.slots;
          if (periodSlots && periodSlots[sKey]) {
            return periodSlots[sKey];
          }
          return factionData?.slotCatalog?.[sKey] || factionData?.slotCatalog?.[slot.label] || [];
        }, [isOpen, factionData, platoonTypeId, periodKey, slot]);

        const filteredUnits = useMemo(() => {
          if (!isOpen) return [];
          if (!searchTerm) return availableUnits;
          const q = searchTerm.toLowerCase();
          return availableUnits.filter(u => u.toLowerCase().includes(q));
        }, [isOpen, availableUnits, searchTerm]);

        useEffect(() => {
          function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
              setIsOpen(false);
              setSearchTerm("");
            }
          }
          function handleKeyDown(event) {
            if (event.key === 'Escape') {
              setIsOpen(false);
              setSearchTerm("");
            }
          }
          if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
          }
          return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
          };
        }, [isOpen]);
        const isMandatory = slot.mandatory;
        const isFilled = !!value;

        return (
          <div className="relative w-full" ref={dropdownRef}>
            <div
              className={`w-full rounded-md border transition-all duration-150 overflow-hidden select-none ${
                isFilled
                  ? isMandatory
                    ? 'border-amber-400/80 bg-zinc-900 shadow-md ring-1 ring-amber-400/30'
                    : 'border-amber-400/70 bg-zinc-900 shadow-md ring-1 ring-amber-400/20'
                  : isMandatory
                    ? 'border-[#8C3D32]/50 bg-zinc-950/80 opacity-65 hover:opacity-95'
                    : 'border-zinc-800 bg-zinc-950/80 opacity-60 hover:opacity-90'
              }`}
            >
              {/* Slot Header (Exact EasyArmy Section Name) */}
              <div
                onClick={() => {
                  if (isFilled) {
                    onEdit(slot.id, value, slot.label);
                  } else {
                    setIsOpen(!isOpen);
                  }
                }}
                className={`px-2 py-1 flex items-center justify-between gap-1.5 cursor-pointer text-xs font-medium tracking-wide transition-colors ${
                  isMandatory
                    ? isFilled
                      ? 'bg-[#733028] hover:bg-[#85382F] text-[#F7F5EE] shadow-sm'
                      : 'bg-[#733028]/75 hover:bg-[#733028] text-zinc-300'
                    : isFilled
                      ? 'bg-[#3D4B35] hover:bg-[#4A5B3E] text-[#F7F5EE]'
                      : 'bg-[#2A3525] hover:bg-[#3D4B35] text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isFilled && (
                    <UnitTacticalIcon
                      slot={slot}
                      unitName={value.name}
                      platoonTypeId={platoonTypeId}
                      className="w-5 h-4 text-amber-300 shrink-0"
                    />
                  )}
                  <span className="truncate font-bold text-[10.5px] sm:text-[11px] uppercase tracking-wider">{slot.label}</span>
                </div>
                {!isFilled && (
                  <span className="font-mono font-bold text-[11px] shrink-0 text-amber-300 leading-tight select-none">
                    {isOpen ? '[-]' : '[+]'}
                  </span>
                )}
              </div>
              {/* Slot Body */}
              <div
                onClick={() => {
                  if (isFilled) {
                    onEdit(slot.id, value, slot.label);
                  } else {
                    setIsOpen(!isOpen);
                  }
                }}
                className={`px-2 py-1 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                  isFilled
                    ? 'bg-zinc-850 hover:bg-zinc-800'
                    : 'bg-zinc-950/90 hover:bg-zinc-900/90 min-h-[26px] sm:min-h-[28px]'
                }`}
              >
                {isFilled ? (
                  <div className="flex items-center justify-between w-full gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-amber-300 truncate font-mono text-[10.5px] sm:text-[11px] leading-tight">
                        {value.name}
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] text-zinc-400 font-mono flex items-center gap-1 leading-tight mt-0.5">
                        <span className="text-zinc-300 truncate">{EXP_LABELS[value.config?.experience] || value.config?.experience || "Regular"}</span>
                        <span className="text-zinc-600">•</span>
                        {summary?.headCountText && (
                          <>
                            <span className="text-zinc-300 shrink-0">{summary.headCountText}</span>
                            <span className="text-zinc-600">•</span>
                          </>
                        )}
                        <span className="text-amber-300 font-bold shrink-0">{value.points || 0} pts</span>
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClear(slot.id);
                        }}
                        className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors"
                        title="Remove unit"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-3 sm:h-3.5" />
                )}
              </div>
            </div>
            {/* DROPDOWN UNIT SELECTOR */}
            {isOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 min-w-[230px] sm:min-w-[300px] max-w-[calc(100vw-1.5rem)] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in duration-100">
                <div className="px-3 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="uppercase tracking-wider font-bold text-zinc-200">{slot.label} ({availableUnits.length})</span>
                  <button
                    onClick={() => { setIsOpen(false); setSearchTerm(""); }}
                    className="text-zinc-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {availableUnits.length > 5 && (
                  <div className="p-2 border-b border-zinc-800/80 bg-zinc-950/50">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs">
                      <Search className="w-3 h-3 text-zinc-500 shrink-0" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search unit..."
                        className="w-full bg-transparent text-zinc-200 placeholder-zinc-500 text-xs focus:outline-none font-mono"
                        autoFocus
                      />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm("")} className="text-zinc-500 hover:text-white">✕</button>
                      )}
                    </div>
                  </div>
                )}
                <div className="max-h-72 overflow-y-auto p-1 space-y-0.5">
                  {filteredUnits.length > 0 ? (
                    filteredUnits.map((unitName, index) => {
                      const isSelected = value?.name === unitName;
                      const uDef = getUnitDefinition(factionData, unitName);
                      const basePts = uDef.costs[uDef.defaultExp]?.points ?? Object.values(uDef.costs)[0]?.points ?? 0;
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            onSelect(unitName, slot.label);
                            setIsOpen(false);
                            setSearchTerm("");
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono transition-colors flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-500/30'
                              : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          <span className="truncate text-[11.5px]">{unitName}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {uDef.period && (
                              <span className="text-[9.5px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                {uDef.period}
                              </span>
                            )}
                            <span className="text-[10.5px] text-amber-400/90 font-semibold">
                              {basePts} pts
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-xs text-zinc-500 font-mono">
                      No units matching filter
                    </div>
                  )}
                </div>
                {isFilled && (
                  <div className="p-1.5 bg-zinc-950/80 border-t border-zinc-800">
                    <button
                      onClick={() => {
                        onClear(slot.id);
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className="w-full py-1 rounded bg-zinc-800 hover:bg-red-950/80 text-zinc-400 hover:text-red-300 text-[10.5px] font-mono transition-colors border border-zinc-700/60"
                    >
                      Remove selected unit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.Slot = Slot;
}
