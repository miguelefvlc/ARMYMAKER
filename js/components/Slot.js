// =========================================================================
// SLOT COMPONENT (Platoon Box, Unit Selection, Search, Edit, Clear & Drag-to-Copy)
// =========================================================================

var { useState, useEffect, useRef, useMemo } = React;

function Slot({
  slot,
  factionData,
  platoonTypeId,
  platoonId,
  periodKey,
  value,
  onSelect,
  onEdit,
  onClear,
  draggedSlot,
  onDragStart,
  onDragEnd,
  onCopySlot,
}) {
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
    let list = [];
    const periodSlots = factionData?.platoonPeriods?.[platoonTypeId]?.[periodKey || 'All']?.slots;
    if (periodSlots && periodSlots[sKey]) {
      list = periodSlots[sKey];
    } else {
      list = factionData?.slotCatalog?.[sKey] || factionData?.slotCatalog?.[slot.label] || [];
    }

    // Filter out units prohibited from mandatory (compulsory) slots
    if (slot.mandatory) {
      list = list.filter((uName) => {
        const uDef = factionData?.units?.[uName];
        if (!uDef) return true;
        const text = `${uDef.specialRulesText || ''} ${(uDef.unitRules || []).map((r) => r.text).join(' ')}`;
        if (
          /cannot be taken as a compulsory|may never be taken as a mandatory|instead of one of the non-mandatory|instead of one or both of the non-mandatory|instead of one or both of the nonmandatory/i.test(
            text
          )
        ) {
          return false;
        }
        return true;
      });
    }

    return list;
  }, [isOpen, factionData, platoonTypeId, periodKey, slot]);

  const filteredUnits = useMemo(() => {
    if (!isOpen) return [];
    if (!searchTerm) return availableUnits;
    const q = searchTerm.toLowerCase();
    return availableUnits.filter((u) => u.toLowerCase().includes(q));
  }, [isOpen, availableUnits, searchTerm]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isMandatory = slot.mandatory;
  const isFilled = !!value;
  const canDrag = isFilled;

  // Drag State Tracking
  const isBeingDragged = !!(
    draggedSlot &&
    draggedSlot.platoonId === platoonId &&
    draggedSlot.slotId === slot.id
  );
  const isAnyDragging = !!draggedSlot;

  // Drop Validation:
  // 1. Must not drop onto the exact same slot in the same platoon
  // 2. Must have identical slot title ("obligatoriamente el título de la celda tiene que ser el mismo", e.g. Infantry to Infantry, Mortar to Mortar)
  const isValidTarget = useMemo(() => {
    if (!draggedSlot) return false;
    if (draggedSlot.platoonId === platoonId && draggedSlot.slotId === slot.id) return false;
    const sourceTitle = (draggedSlot.slotLabel || '').trim().toLowerCase();
    const targetTitle = (slot.label || '').trim().toLowerCase();
    return sourceTitle.length > 0 && sourceTitle === targetTitle;
  }, [draggedSlot, platoonId, slot.id, slot.label]);

  const [isDragOver, setIsDragOver] = useState(false);
  const dragEnterCountRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragEndedAtRef = useRef(0);

  // Clear hover state if global drag finishes
  useEffect(() => {
    if (!draggedSlot) {
      dragEnterCountRef.current = 0;
      setIsDragOver(false);
    }
  }, [draggedSlot]);

  // Listen for touch hover events on mobile/tablets
  useEffect(() => {
    const handleTouchHover = (e) => {
      if (!draggedSlot) return;
      setIsDragOver(e.detail?.targetSlotId === slot.id);
    };
    window.addEventListener('armymaker:touchdragover', handleTouchHover);
    return () => window.removeEventListener('armymaker:touchdragover', handleTouchHover);
  }, [draggedSlot, slot.id]);

  // Native HTML5 Drag Handlers
  const handleDragStart = (e) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'copy';
    try {
      e.dataTransfer.setData('text/plain', slot.id);
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          platoonId,
          slotId: slot.id,
          slotLabel: slot.label,
        })
      );
    } catch (_) {}

    if (onDragStart) {
      onDragStart({
        platoonId,
        slotId: slot.id,
        slotLabel: slot.label,
        value,
      });
    }
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    dragEndedAtRef.current = Date.now();
    dragEnterCountRef.current = 0;
    setIsDragOver(false);
    if (onDragEnd) onDragEnd();
  };

  const handleDragEnter = (e) => {
    if (!draggedSlot) return;
    e.preventDefault();
    dragEnterCountRef.current++;
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    if (!draggedSlot) return;
    if (isValidTarget) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    } else {
      try {
        e.dataTransfer.dropEffect = 'none';
      } catch (_) {}
    }
  };

  const handleDragLeave = (e) => {
    if (!draggedSlot) return;
    e.preventDefault();
    dragEnterCountRef.current--;
    if (dragEnterCountRef.current <= 0) {
      dragEnterCountRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragEnterCountRef.current = 0;
    setIsDragOver(false);

    if (isValidTarget && draggedSlot) {
      if (onCopySlot) {
        onCopySlot(draggedSlot.slotId, slot.id, draggedSlot.platoonId, platoonId);
      }
    }
    if (onDragEnd) onDragEnd();
  };

  // Touch Support for Tablets & Mobile
  const touchStartRef = useRef(null);
  const touchHoldTimerRef = useRef(null);
  const isTouchDraggingRef = useRef(false);

  const handleTouchStart = (e) => {
    if (!canDrag) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      targetSlotId: null,
    };
    isTouchDraggingRef.current = false;

    if (touchHoldTimerRef.current) clearTimeout(touchHoldTimerRef.current);
    touchHoldTimerRef.current = setTimeout(() => {
      isTouchDraggingRef.current = true;
      isDraggingRef.current = true;
      if (navigator.vibrate) {
        try { navigator.vibrate(35); } catch (_) {}
      }
      if (onDragStart) {
        onDragStart({
          platoonId,
          slotId: slot.id,
          slotLabel: slot.label,
          value,
        });
      }
    }, 220);
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || !canDrag) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!isTouchDraggingRef.current && dist > 10) {
      if (touchHoldTimerRef.current) clearTimeout(touchHoldTimerRef.current);
      return;
    }

    if (isTouchDraggingRef.current) {
      if (e.cancelable) e.preventDefault();
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const slotEl = el?.closest('[data-slot-id]');
      const targetId = slotEl?.getAttribute('data-slot-id') || null;
      touchStartRef.current.targetSlotId = targetId;

      window.dispatchEvent(
        new CustomEvent('armymaker:touchdragover', {
          detail: { targetSlotId: targetId },
        })
      );
    }
  };

  const handleTouchEnd = () => {
    if (touchHoldTimerRef.current) clearTimeout(touchHoldTimerRef.current);
    const wasTouchDrag = isTouchDraggingRef.current;
    const targetId = touchStartRef.current?.targetSlotId;

    touchStartRef.current = null;
    isTouchDraggingRef.current = false;

    window.dispatchEvent(
      new CustomEvent('armymaker:touchdragover', {
        detail: { targetSlotId: null },
      })
    );

    if (wasTouchDrag) {
      isDraggingRef.current = false;
      dragEndedAtRef.current = Date.now();
      if (onDragEnd) onDragEnd();

      if (targetId && targetId !== slot.id) {
        if (onCopySlot) {
          onCopySlot(slot.id, targetId, platoonId, platoonId);
        }
      }
    }
  };

  // Safe Click Handler (Ignores accidental clicks after dragging)
  const handleClick = () => {
    if (isDraggingRef.current || Date.now() - dragEndedAtRef.current < 250) {
      return;
    }
    if (isFilled) {
      onEdit(slot.id, value, slot.label);
    } else {
      setIsOpen(!isOpen);
    }
  };

  // Dynamic Card Styling based on drag state
  let cardStyle = '';
  if (isBeingDragged) {
    cardStyle = 'opacity-40 border-dashed border-amber-400 scale-[0.98] ring-2 ring-amber-400/50 bg-zinc-900';
  } else if (isDragOver && isValidTarget) {
    cardStyle = 'border-emerald-400 ring-2 ring-emerald-400 bg-emerald-950/70 scale-[1.02] shadow-xl z-20 cursor-copy';
  } else if (isValidTarget) {
    cardStyle = 'border-dashed border-emerald-400/80 ring-1 ring-emerald-400/40 bg-emerald-950/20 animate-pulse cursor-copy';
  } else if (isDragOver && !isValidTarget) {
    cardStyle = 'border-red-500/80 ring-2 ring-red-500/50 bg-red-950/40 cursor-not-allowed';
  } else if (isAnyDragging) {
    cardStyle = 'opacity-35 grayscale-[50%] border-zinc-800 cursor-not-allowed';
  } else if (isFilled) {
    cardStyle = isMandatory
      ? 'border-amber-400/80 bg-zinc-900 shadow-md ring-1 ring-amber-400/30 hover:border-amber-300'
      : 'border-amber-400/70 bg-zinc-900 shadow-md ring-1 ring-amber-400/20 hover:border-amber-300';
  } else {
    cardStyle = isMandatory
      ? 'border-[#8C3D32]/50 bg-zinc-950/80 opacity-65 hover:opacity-95'
      : 'border-zinc-800 bg-zinc-950/80 opacity-60 hover:opacity-90';
  }

  const expLabel =
    EXP_LABELS[value?.config?.experience] || value?.config?.experience || 'Regular';

  return (
    <div
      className="relative w-full group"
      ref={dropdownRef}
      data-slot-id={slot.id}
      data-slot-label={slot.label}
      data-platoon-id={platoonId}
    >
      <div
        draggable={canDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`w-full rounded-md border transition-all duration-150 overflow-hidden select-none relative ${cardStyle}`}
      >
        {/* Slot Header (Exact EasyArmy Section Name) */}
        <div
          onClick={handleClick}
          className={`px-2 py-1 flex items-center justify-between gap-1.5 text-xs font-medium tracking-wide transition-colors ${
            canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
          } ${
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
            <span className="truncate font-bold text-[10.5px] sm:text-[11px] uppercase tracking-wider">
              {slot.label}
            </span>
          </div>
          {isFilled ? (
            <div
              className="flex items-center justify-center shrink-0 text-amber-200/50 group-hover:text-amber-200 transition-colors"
              title="Arrastrar para copiar"
            >
              <CopyIcon className="w-3 h-3" />
            </div>
          ) : (
            <span className="font-mono font-bold text-[11px] shrink-0 text-amber-300 leading-tight select-none">
              {isOpen ? '[-]' : '[+]'}
            </span>
          )}
        </div>

        {/* Slot Body */}
        <div
          onClick={handleClick}
          className={`px-2 py-1 flex items-center justify-between text-xs transition-colors ${
            canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
          } ${
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
                  <span className="text-zinc-300 truncate">{expLabel}</span>
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
                  type="button"
                  draggable={false}
                  onDragStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
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

        {/* OVERLAY: Valid Drop Target (Hovering) */}
        {isDragOver && isValidTarget && (
          <div className="absolute inset-0 bg-emerald-950/95 border-2 border-emerald-400 rounded-md flex flex-col items-center justify-center gap-0.5 z-30 pointer-events-none p-1 text-center shadow-lg animate-in fade-in duration-100">
            <div className="flex items-center gap-1 text-emerald-300 font-mono font-bold text-[11px]">
              <CopyIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Copiar aquí</span>
            </div>
            <div className="text-[9.5px] text-emerald-200/90 font-mono truncate max-w-full px-1">
              {draggedSlot?.value?.name || 'Unidad'}
            </div>
          </div>
        )}

        {/* OVERLAY: Invalid Drop Target (Hovering) */}
        {isDragOver && !isValidTarget && draggedSlot && !isBeingDragged && (
          <div className="absolute inset-0 bg-red-950/95 border-2 border-red-500/90 rounded-md flex flex-col items-center justify-center gap-0.5 z-30 pointer-events-none p-1 text-center shadow-lg animate-in fade-in duration-100">
            <div className="flex items-center gap-1 text-red-300 font-mono font-bold text-[11px]">
              <span>🚫</span>
              <span>No permitido</span>
            </div>
            <div className="text-[9px] text-red-300/80 font-mono truncate max-w-full px-1">
              {draggedSlot.platoonId !== platoonId
                ? 'Distinto pelotón'
                : `${slot.label} ≠ ${draggedSlot.slotLabel}`}
            </div>
          </div>
        )}
      </div>

      {/* DROPDOWN UNIT SELECTOR */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 min-w-[230px] sm:min-w-[300px] max-w-[calc(100vw-1.5rem)] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in duration-100">
          <div className="px-3 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="uppercase tracking-wider font-bold text-zinc-200">
              {slot.label} ({availableUnits.length})
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                setSearchTerm("");
              }}
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
                  <button onClick={() => setSearchTerm("")} className="text-zinc-500 hover:text-white">
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto p-1 space-y-0.5">
            {filteredUnits.length > 0 ? (
              filteredUnits.map((unitName, index) => {
                const isSelected = value?.name === unitName;
                const uDef = getUnitDefinition(factionData, unitName);
                const basePts =
                  uDef?.costs?.[uDef.defaultExp]?.points ??
                  Object.values(uDef?.costs || {})[0]?.points ??
                  0;
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
                      {uDef?.period && (
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
