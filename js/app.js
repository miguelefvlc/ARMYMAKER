// =========================================================================
// ARMY MAKER — MAIN REACT APPLICATION (State, Layout & View Tree)
// =========================================================================

var { useState, useEffect, useRef, useMemo } = React;

const FACTIONS_REGISTRY = window.FACTIONS_REGISTRY || window.EASYARMY_FACTIONS || {
  soviet_union: window.EASYARMY_SOVIET_DATA,
};

// Global EXP_LABELS provided by js/engine.js

try { localStorage.removeItem('boltaction.draft.v1'); } catch {}

      function App() {
        const availableFactions = Object.keys(FACTIONS_REGISTRY);
        const [activeFactionId, setActiveFactionId] = useState(() => {
          try {
            const saved = localStorage.getItem('boltaction.last_faction');
            if (saved && FACTIONS_REGISTRY[saved]) return saved;
          } catch {}
          return availableFactions[0] || 'soviet_union';
        });
        const factionData = FACTIONS_REGISTRY[activeFactionId] || window.EASYARMY_SOVIET_DATA;
        const platoonTypes = factionData?.platoons || [];

        const [platoons, setPlatoons] = useState([
          { id: 1, typeId: 'infantry', period: 'All', slots: {} }
        ]);

        const [activePlatoonId, setActivePlatoonId] = useState(1);

        const [editingUnitModal, setEditingUnitModal] = useState({
          isOpen: false,
          slotId: null,
          slotLabel: null,
          unitItem: null
        });
        const [draggedSlot, setDraggedSlot] = useState(null);
        const [isExportModalOpen, setIsExportModalOpen] = useState(false);
        const [exportOptions, setExportOptions] = useState(() => {
          try {
            const saved = localStorage.getItem('boltaction.export_options');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.includeUnitCards === undefined) parsed.includeUnitCards = true;
              return parsed;
            }
          } catch (_) {}
          return {
            includeUnitRules: true,
            includeArmyRules: true,
            includeUnitCards: true,
          };
        });

        useEffect(() => {
          try {
            localStorage.setItem('boltaction.export_options', JSON.stringify(exportOptions));
          } catch (_) {}
        }, [exportOptions]);

        const [armyListName, setArmyListName] = useState("");
        const [armyNotes, setArmyNotes] = useState("");
        const [toast, setToast] = useState(null);
        const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

        // Accounts & cloud lists
        const { user } = useAuth();
        const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
        const [isMyListsOpen, setIsMyListsOpen] = useState(false);
        const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
        const [isAddPlatoonOpen, setIsAddPlatoonOpen] = useState(false);
        const addPlatoonRef = useRef(null);
        const [currentListId, setCurrentListId] = useState(null);
        const [isSaving, setIsSaving] = useState(false);

        const showToast = (message, type = "info") => {
          setToast({ message, type });
          setTimeout(() => setToast(null), 4000);
        };

        // Close the user menu on outside tap
        useEffect(() => {
          if (!isUserMenuOpen) return;
          const close = () => setIsUserMenuOpen(false);
          const t = setTimeout(() => document.addEventListener('click', close), 0);
          return () => {
            clearTimeout(t);
            document.removeEventListener('click', close);
          };
        }, [isUserMenuOpen]);

        // Close the add platoon dropdown on outside tap
        useEffect(() => {
          if (!isAddPlatoonOpen) return;
          const handleClickOutside = (e) => {
            if (addPlatoonRef.current && !addPlatoonRef.current.contains(e.target)) {
              setIsAddPlatoonOpen(false);
            }
          };
          document.addEventListener('mousedown', handleClickOutside);
          return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [isAddPlatoonOpen]);

        const handleCloudSave = async (asNew = false) => {
          let targetName = (armyListName || 'Untitled Force').trim();
          if (asNew || !currentListId) {
            const prompted = window.prompt('List name:', targetName);
            if (prompted === null) return;
            targetName = (prompted || 'Untitled Force').trim();
            setArmyListName(targetName);
          }

          const row = {
            name: targetName,
            faction_id: activeFactionId,
            total_points: totalPoints,
            order_dice: totalOrderDice,
            data: { version: '2.0', factionId: activeFactionId, listName: targetName, notes: armyNotes, platoons },
          };

          // If signed in to Supabase Cloud, save to cloud + mirror locally
          if (user && supabaseClient) {
            setIsSaving(true);
            try {
              const isCloudUUID = currentListId && !String(currentListId).startsWith('local-');
              if (isCloudUUID && !asNew) {
                const { error } = await supabaseClient.from('army_lists').update(row).eq('id', currentListId);
                if (error) throw error;
              } else {
                const { data, error } = await supabaseClient.from('army_lists').insert(row).select('id').single();
                if (error) throw error;
                setCurrentListId(data.id);
              }
              showToast(`Saved "${row.name}" to Cloud.`, "success");
            } catch (err) {
              showToast("Cloud save failed: " + (err.message || err), "error");
            } finally {
              setIsSaving(false);
            }
            return;
          }

          // Fallback: save to local device library (works offline / without login)
          const localLists = loadLocalLists();
          const nowIso = new Date().toISOString();
          const isExistingLocal = currentListId && String(currentListId).startsWith('local-') && !asNew;
          const nextId = isExistingLocal ? currentListId : `local-${Date.now()}`;
          const localEntry = {
            id: nextId,
            ...row,
            updated_at: nowIso,
          };
          const filtered = localLists.filter((x) => x.id !== nextId);
          saveLocalLists([localEntry, ...filtered]);
          setCurrentListId(nextId);
          showToast(
            isSupabaseConfigured()
              ? `Saved "${row.name}" on this device (Sign in to sync to Cloud).`
              : `Saved "${row.name}" on this device.`,
            "success"
          );
        };

        const handleLoadCloudList = (row) => {
          const d = row.data || {};
          if (!Array.isArray(d.platoons) || d.platoons.length === 0) {
            showToast("This saved list is empty or invalid.", "error");
            return;
          }
          if (row.faction_id && FACTIONS_REGISTRY[row.faction_id]) setActiveFactionId(row.faction_id);
          setPlatoons(d.platoons);
          setActivePlatoonId(d.platoons[0].id);
          setArmyListName(row.name || d.listName || '');
          setArmyNotes(d.notes || '');
          setCurrentListId(row.id);
          showToast(`Loaded "${row.name}" (${row.total_points} pts)`, "success");
        };

        const handleNewList = () => {
          if (!window.confirm('Start a new empty list? Unsaved changes to the current list will be lost.')) return;
          setPlatoons([{ id: 1, typeId: 'infantry', period: 'All', slots: {} }]);
          setActivePlatoonId(1);
          setArmyListName('');
          setArmyNotes('');
          setCurrentListId(null);
        };

        const handleSignOut = async () => {
          await supabaseClient?.auth.signOut();
          signOutLocalUser();
          setCurrentListId(null);
          showToast("Signed out.", "success");
        };
        const currentPlatoon = useMemo(
          () => platoons.find(p => p.id === activePlatoonId) || platoons[0],
          [platoons, activePlatoonId]
        );
        const currentType = useMemo(
          () => platoonTypes.find(t => t.id === currentPlatoon.typeId) || platoonTypes[0],
          [platoonTypes, currentPlatoon.typeId]
        );

        const { totalOrderDice, totalPoints } = useMemo(() => {
          let dice = 0;
          let pts = 0;
          for (const p of platoons) {
            for (const u of Object.values(p.slots || {})) {
              if (u) {
                dice += 1;
                pts += u.points || 0;
              }
            }
          }
          return { totalOrderDice: dice, totalPoints: pts };
        }, [platoons]);

        const currentPlatoonPoints = useMemo(
          () => Object.values(currentPlatoon.slots || {}).reduce((sum, u) => sum + (u?.points || 0), 0),
          [currentPlatoon.slots]
        );

        const platoonCountByType = useMemo(() => {
          const counts = {};
          for (const p of platoons) {
            counts[p.typeId] = (counts[p.typeId] || 0) + 1;
          }
          return counts;
        }, [platoons]);


        const handleSelectPlatoonByTypeId = (typeId) => {
          const matching = platoons.filter(p => p.typeId === typeId);
          if (matching.length > 0) {
            if (currentPlatoon?.typeId === typeId && matching.length > 1) {
              const currentIdx = matching.findIndex(p => p.id === activePlatoonId);
              const nextPlatoon = matching[(currentIdx + 1) % matching.length];
              setActivePlatoonId(nextPlatoon.id);
            } else {
              setActivePlatoonId(matching[0].id);
            }
          } else {
            const currentUnitsCount = Object.keys(currentPlatoon?.slots || {}).length;
            if (currentUnitsCount === 0) {
              setPlatoons(platoons.map(p => p.id === activePlatoonId ? { ...p, typeId } : p));
            } else {
              const nextId = platoons.length > 0 ? Math.max(...platoons.map(p => p.id)) + 1 : 1;
              const newPlatoon = { id: nextId, typeId, period: 'All', slots: {} };
              setPlatoons([...platoons, newPlatoon]);
              setActivePlatoonId(nextId);
            }
          }
        };
        const handleSelectSlot = (slotId, unitName, slotLabel) => {
          const def = getUnitDefinition(factionData, unitName);
          const initialExp = def.defaultExp || "regular";
          const initialCost = def.costs[initialExp]?.points ?? 0;

          const newUnitItem = {
            name: unitName,
            points: initialCost,
            config: {
              experience: initialExp,
              extraMen: 0,
              options: {}
            }
          };

          setPlatoons(platoons.map(p => {
            if (p.id === activePlatoonId) {
              return {
                ...p,
                slots: { ...p.slots, [slotId]: newUnitItem }
              };
            }
            return p;
          }));

          setEditingUnitModal({
            isOpen: true,
            slotId,
            slotLabel,
            unitItem: newUnitItem
          });
        };

        const handleOpenEditModal = (slotId, unitItem, slotLabel) => {
          setEditingUnitModal({
            isOpen: true,
            slotId,
            slotLabel,
            unitItem
          });
        };
        const handleSaveUnitFromModal = (updatedUnit) => {
          if (!editingUnitModal.slotId) return;
          setPlatoons(platoons.map(p => {
            if (p.id === activePlatoonId) {
              return {
                ...p,
                slots: { ...p.slots, [editingUnitModal.slotId]: updatedUnit }
              };
            }
            return p;
          }));
        };

        const handleClearSlot = (slotId, platoonId = activePlatoonId) => {
          setPlatoons(prevPlatoons => {
            let nextPlatoons = prevPlatoons.map(p => {
              if (p.id === platoonId) {
                const nextSlots = { ...p.slots };
                delete nextSlots[slotId];
                return { ...p, slots: nextSlots };
              }
              return p;
            });

            // "Cuando un pelotón añadido (segundo de rifle por ejemplo) se queda vacío, desaparece de la barra."
            const targetPlatoon = nextPlatoons.find(p => p.id === platoonId);
            if (targetPlatoon && Object.keys(targetPlatoon.slots || {}).length === 0 && nextPlatoons.length > 1) {
              const isDuplicateType = nextPlatoons.filter(p => p.typeId === targetPlatoon.typeId).length > 1;
              const isAddedPlatoon = isDuplicateType || targetPlatoon.id !== nextPlatoons[0].id;
              if (isAddedPlatoon) {
                nextPlatoons = nextPlatoons.filter(p => p.id !== targetPlatoon.id);
                if (activePlatoonId === targetPlatoon.id) {
                  const fallback = nextPlatoons.find(p => p.typeId === targetPlatoon.typeId) || nextPlatoons[0];
                  setActivePlatoonId(fallback.id);
                }
                showToast("Pelotón vacío eliminado de la barra", "info");
              }
            }

            return nextPlatoons;
          });
        };

        const handleCopySlot = (sourceSlotId, targetSlotId, sourcePlatoonId = activePlatoonId, targetPlatoonId = activePlatoonId) => {
          const srcPlatoonId = sourcePlatoonId || activePlatoonId;
          const tgtPlatoonId = targetPlatoonId || activePlatoonId;

          // 1. Cannot copy onto the exact same slot in the same platoon
          if (srcPlatoonId === tgtPlatoonId && sourceSlotId === targetSlotId) {
            return;
          }

          // 2. Platoons lookup
          const srcPlatoon = platoons.find(p => p.id === srcPlatoonId);
          const tgtPlatoon = platoons.find(p => p.id === tgtPlatoonId);
          if (!srcPlatoon || !tgtPlatoon) return;

          const sourceUnit = srcPlatoon.slots[sourceSlotId];
          if (!sourceUnit) return;

          // 3. Verify slot titles match ("siempre y cuando haya coincidencia de tipo de unidad (infantry, sniper, mortar, etc.)")
          const srcType = platoonTypes.find(t => t.id === srcPlatoon.typeId);
          const tgtType = platoonTypes.find(t => t.id === tgtPlatoon.typeId);

          let sourceSlotDef = null;
          for (const col of srcType?.columns || []) {
            for (const s of col.slots || []) {
              if (s.id === sourceSlotId) sourceSlotDef = s;
            }
          }

          let targetSlotDef = null;
          for (const col of tgtType?.columns || []) {
            for (const s of col.slots || []) {
              if (s.id === targetSlotId) targetSlotDef = s;
            }
          }

          const sourceTitle = (sourceSlotDef?.label || '').trim().toLowerCase();
          const targetTitle = (targetSlotDef?.label || '').trim().toLowerCase();

          if (!sourceTitle || !targetTitle || sourceTitle !== targetTitle) {
            showToast(`No se puede copiar: tipos incompatibles ("${sourceSlotDef?.label || 'origen'}" no coincide con "${targetSlotDef?.label || 'destino'}")`, "error");
            return;
          }

          // 4. Deep clone source unit config
          const clonedUnit = JSON.parse(JSON.stringify(sourceUnit));

          // Recalculate points integrity
          const def = getUnitDefinition(factionData, clonedUnit.name);
          if (def && clonedUnit.config) {
            clonedUnit.points = calculateUnitPoints(def, clonedUnit.config);
          }

          // 5. Update target platoon slots with the cloned configuration
          setPlatoons(prevPlatoons => prevPlatoons.map(p => {
            if (p.id === tgtPlatoonId) {
              return {
                ...p,
                slots: {
                  ...p.slots,
                  [targetSlotId]: clonedUnit
                }
              };
            }
            return p;
          }));

          // Make sure target platoon is active
          if (activePlatoonId !== tgtPlatoonId) {
            setActivePlatoonId(tgtPlatoonId);
          }

          setDraggedSlot(null);
          const tgtInfo = PLATOON_TACTICAL_INFO[tgtPlatoon.typeId]?.es || tgtType?.name || 'Pelotón';
          showToast(`Copiado: "${clonedUnit.name}" a ${tgtInfo} (${targetSlotDef?.label || 'celda'})`, "success");
        };

        const handleDropOnPlatoon = (targetPlatoonId) => {
          if (!draggedSlot) return;

          const targetPlatoon = platoons.find(p => p.id === targetPlatoonId);
          if (!targetPlatoon) return;

          // Open target platoon
          if (activePlatoonId !== targetPlatoonId) {
            setActivePlatoonId(targetPlatoonId);
          }

          if (targetPlatoonId === draggedSlot.platoonId) {
            return;
          }

          const pType = platoonTypes.find(t => t.id === targetPlatoon.typeId);
          const allSlots = [];
          for (const col of pType?.columns || []) {
            for (const s of col.slots || []) {
              allSlots.push(s);
            }
          }

          const sourceTitle = (draggedSlot.slotLabel || '').trim().toLowerCase();
          const matchingSlots = allSlots.filter(s => (s.label || '').trim().toLowerCase() === sourceTitle);

          if (matchingSlots.length === 0) {
            showToast(`Este pelotón no admite unidades de tipo "${draggedSlot.slotLabel}"`, "error");
            return;
          }

          let availableMatching = matchingSlots;
          const uDef = factionData?.units?.[draggedSlot.unitName];
          if (uDef) {
            const text = `${uDef.specialRulesText || ''} ${(uDef.unitRules || []).map((r) => r.text).join(' ')}`;
            const isRestrictedFromMandatory = /cannot be taken as a compulsory|may never be taken as a mandatory|instead of one of the non-mandatory|instead of one or both of the non-mandatory|instead of one or both of the nonmandatory/i.test(text);
            if (isRestrictedFromMandatory) {
              availableMatching = availableMatching.filter(s => !s.mandatory);
              if (availableMatching.length === 0) {
                showToast(`"${draggedSlot.unitName}" no puede asignarse a casillas obligatorias`, "warning");
                return;
              }
            }
          }

          const emptySlot = availableMatching.find(s => !targetPlatoon.slots[s.id]);
          if (!emptySlot) {
            showToast(`Todas las casillas válidas de "${draggedSlot.slotLabel}" en este pelotón están ocupadas`, "error");
            return;
          }

          handleCopySlot(draggedSlot.slotId, emptySlot.id, draggedSlot.platoonId, targetPlatoonId);
        };

        // Auto-cleanup: remove inactive empty duplicate / added platoons
        useEffect(() => {
          setPlatoons(prevPlatoons => {
            if (prevPlatoons.length <= 1) return prevPlatoons;
            const pruned = prevPlatoons.filter(p => {
              const unitsCount = Object.keys(p.slots || {}).length;
              if (unitsCount > 0) return true;
              if (p.id === activePlatoonId) return true; // Keep currently open platoon
              const matchingTypeCount = prevPlatoons.filter(other => other.typeId === p.typeId).length;
              if (matchingTypeCount > 1) {
                return false; // Remove empty duplicate platoon
              }
              if (p.id !== prevPlatoons[0].id) {
                return false; // Remove empty added platoon
              }
              return true;
            });
            if (pruned.length !== prevPlatoons.length) {
              return pruned;
            }
            return prevPlatoons;
          });
        }, [activePlatoonId]);

        useEffect(() => {
          setDraggedSlot(null);
        }, [activePlatoonId]);

        useEffect(() => {
          const handleGlobalDragEnd = () => setDraggedSlot(null);
          window.addEventListener('dragend', handleGlobalDragEnd);
          return () => window.removeEventListener('dragend', handleGlobalDragEnd);
        }, []);
        const handleDeletePlatoon = (e, platoonId) => {
          if (e && e.stopPropagation) e.stopPropagation();
          if (platoons.length <= 1) return;
          const nextPlatoons = platoons.filter(p => p.id !== platoonId);
          setPlatoons(nextPlatoons);
          if (activePlatoonId === platoonId) {
            setActivePlatoonId(nextPlatoons[0].id);
          }
        };

        const handleDirectPDFDownload = () => {
          const element = document.getElementById("printable-army-roster-preview");
          if (!element || !window.html2pdf) {
            window.print();
            return;
          }
          setIsGeneratingPdf(true);
          const cleanName = (armyListName || "ArmyMaker_Roster").replace(/[^a-zA-Z0-9_-]/g, "_");
          const opt = {
            margin: [8, 8, 8, 8],
            filename: `${cleanName}_${totalPoints}pts.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            pagebreak: {
              mode: ['css', 'legacy'],
              before: '.page-break-before',
              avoid: ['.unit-card-cromo', '.unit-card', '.platoon-print-block', '.rules-print-block']
            },
            html2canvas: {
              scale: 2,
              useCORS: true,
              logging: false,
              onclone: (clonedDoc) => {
                // Ensure all SVG elements in the cloned document have explicit width, height, xmlns, and concrete colors
                const svgs = clonedDoc.querySelectorAll('svg');
                svgs.forEach((svg) => {
                  const rect = svg.getBoundingClientRect ? svg.getBoundingClientRect() : null;
                  const w = (rect && rect.width > 0) ? Math.round(rect.width) : (parseInt(svg.getAttribute('width'), 10) || 28);
                  const h = (rect && rect.height > 0) ? Math.round(rect.height) : (parseInt(svg.getAttribute('height'), 10) || 22);
                  svg.setAttribute('width', String(w));
                  svg.setAttribute('height', String(h));
                  svg.style.width = w + 'px';
                  svg.style.height = h + 'px';
                  svg.style.overflow = 'visible';
                  if (!svg.getAttribute('xmlns')) {
                    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                  }
                  const compColor = (window.getComputedStyle && window.getComputedStyle(svg).color) || '#18181b';
                  svg.querySelectorAll('*').forEach((child) => {
                    const fill = child.getAttribute('fill');
                    if (fill === 'currentColor') {
                      child.setAttribute('fill', compColor);
                    }
                    const stroke = child.getAttribute('stroke');
                    if (stroke === 'currentColor') {
                      child.setAttribute('stroke', compColor);
                    }
                  });
                });
              }
            },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
          };
          window.html2pdf().set(opt).from(element).save().then(() => {
            setIsGeneratingPdf(false);
            showToast("PDF downloaded successfully.", "success");
          }).catch(() => {
            setIsGeneratingPdf(false);
            window.print();
          });
        };

        return (
          <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans safe-top safe-x sm:px-6 antialiased pb-28 sm:pb-24">
            {toast && (
              <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-3 right-3 sm:left-auto sm:right-5 z-[60] animate-in fade-in slide-in-from-top-2 duration-150 no-print">
                <div className={`px-4 py-2.5 rounded-xl shadow-2xl border font-mono text-xs font-bold flex items-center gap-2.5 ${
                  toast.type === 'error'
                    ? 'bg-red-950/95 border-red-500 text-red-200'
                    : 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <span>{toast.message}</span>
                </div>
              </div>
            )}

            <div className="max-w-[1400px] mx-auto space-y-2 sm:space-y-2.5 no-print">

              {/* TOP BRAND HEADER: FULL-WIDTH CELL WITH DEAD-CENTER HELMET LOGO */}
              <div className="w-full bg-zinc-900 border border-zinc-750 rounded-xl py-2 px-3 sm:px-4 shadow-sm select-none">
                <div className="w-full relative flex items-center justify-center">
                  <div className="flex-1 flex justify-end items-center pr-3 sm:pr-4">
                    <span className="font-tactical font-black text-lg sm:text-2xl tracking-widest uppercase text-white leading-none">
                      ARMY
                    </span>
                  </div>
                  <div className="shrink-0 flex items-center justify-center">
                    <HelmetLogo className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 drop-shadow" />
                  </div>
                  <div className="flex-1 flex justify-start items-center pl-3 sm:pl-4">
                    <span className="font-tactical font-black text-lg sm:text-2xl tracking-widest uppercase text-amber-400 leading-none">
                      MAKER
                    </span>
                  </div>
                </div>
              </div>

              {/* 0. APP BAR: EXPANDED CELLS SPANNING FULL ROW */}
              <div className="flex items-center gap-1.5 sm:gap-2 w-full font-mono text-[11px] sm:text-xs">
                {/* 1. Faction Selector */}
                <div className="flex-[1.3] sm:flex-1 min-w-0 h-8 sm:h-9 flex items-center justify-center bg-zinc-900 border border-zinc-750 hover:border-amber-400/60 rounded-lg px-2 sm:px-2.5 transition-colors">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold hidden sm:inline mr-1">Faction:</span>
                  <select
                    value={activeFactionId}
                    onChange={(e) => {
                      const nextFId = e.target.value;
                      setActiveFactionId(nextFId);
                      try { localStorage.setItem('boltaction.last_faction', nextFId); } catch {}
                      setPlatoons([{ id: 1, typeId: 'infantry', period: 'All', slots: {} }]);
                      setActivePlatoonId(1);
                    }}
                    className="bg-transparent text-amber-400 font-bold text-[11px] sm:text-xs focus:outline-none cursor-pointer truncate w-full sm:w-auto text-center"
                  >
                    {availableFactions.map(fId => (
                      <option key={fId} value={fId} className="bg-zinc-900 text-white">
                        {FACTIONS_REGISTRY[fId]?.faction || fId}
                      </option>
                    ))}
                  </select>
                  <span className="text-amber-400/80 text-[8px] ml-1 pointer-events-none select-none">▼</span>
                </div>

                {/* 2. New List */}
                <button
                  type="button"
                  onClick={handleNewList}
                  className="flex-1 min-w-0 h-8 sm:h-9 px-1.5 sm:px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 hover:text-white font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="New list"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">New</span>
                </button>

                {/* 3. My Lists */}
                <button
                  type="button"
                  onClick={() => setIsMyListsOpen(true)}
                  className="flex-1 min-w-0 h-8 sm:h-9 px-1.5 sm:px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 hover:text-white font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="My Saved Lists (Cloud & Device)"
                >
                  <FolderIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                  <span className="truncate hidden sm:inline">My Lists</span>
                  <span className="truncate sm:hidden">Lists</span>
                </button>

                {/* 4. Save Button */}
                <button
                  type="button"
                  onClick={() => handleCloudSave(false)}
                  disabled={isSaving}
                  className="flex-1 min-w-0 h-8 sm:h-9 px-1.5 sm:px-2 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-black font-extrabold flex items-center justify-center gap-1 transition-colors shadow cursor-pointer"
                  title={user ? (currentListId ? 'Save changes to Cloud' : 'Save list to Cloud') : 'Save list'}
                >
                  <CloudIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">{isSaving ? '...' : 'Save'}</span>
                </button>

                {/* 5. Account / Sign In */}
                {user ? (
                  <div className="flex-1 min-w-0 relative">
                    <button
                      type="button"
                      onClick={() => setIsUserMenuOpen((v) => !v)}
                      className="w-full h-8 sm:h-9 px-1.5 sm:px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-300 font-black font-mono text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title={user.email}
                    >
                      {(user.user_metadata?.avatar_url || user.user_metadata?.picture || user.picture) ? (
                        <img
                          src={user.user_metadata?.avatar_url || user.user_metadata?.picture || user.picture}
                          alt=""
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center uppercase shrink-0">
                          {(user.email || '?')[0]}
                        </span>
                      )}
                      <span className="hidden md:inline text-zinc-200 font-semibold max-w-[90px] lg:max-w-[120px] truncate normal-case">
                        {user.user_metadata?.full_name || user.user_metadata?.name || user.name || (user.email || '').split('@')[0]}
                      </span>
                    </button>
                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl overflow-hidden">
                        <div className="px-3.5 py-2.5 bg-zinc-950 border-b border-zinc-800">
                          <div className="text-[10px] font-mono uppercase text-zinc-500">Signed in as</div>
                          {(user.user_metadata?.full_name || user.user_metadata?.name || user.name) && (
                            <div className="text-xs font-bold text-white truncate">
                              {user.user_metadata?.full_name || user.user_metadata?.name || user.name}
                            </div>
                          )}
                          <div className="text-[11px] font-mono text-zinc-400 truncate">{user.email}</div>
                        </div>
                        <div className="p-1.5 space-y-0.5 text-xs font-mono">
                          <button
                            type="button"
                            onClick={() => setIsMyListsOpen(true)}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                          >
                            <FolderIcon className="w-4 h-4 text-amber-400" /> My Lists
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCloudSave(true)}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                          >
                            <CloudIcon className="w-4 h-4 text-amber-400" /> Save as new list
                          </button>
                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-red-300 hover:bg-red-950/60 flex items-center gap-2 cursor-pointer"
                          >
                            <LogOutIcon className="w-4 h-4" /> Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex-1 min-w-0 h-8 sm:h-9 px-1.5 sm:px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 hover:text-white font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Sign in to sync lists across devices"
                  >
                    <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate hidden sm:inline">Sign In</span>
                    <span className="truncate sm:hidden">Login</span>
                  </button>
                )}
              </div>

              {/* 1. CONTROL BAR: LIST NAME, PLATOON TABS, PERIOD SELECTOR & LIVE TOTALS */}
              <div className="bg-zinc-900 border border-zinc-750 rounded-xl px-2.5 sm:px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono shadow-sm">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 min-w-0">
                  {/* Army List Name (In place of Faction Selector) */}
                  <div className="flex items-center bg-zinc-850 border border-zinc-750 rounded-lg px-2 py-0.5 sm:py-1">
                    <input
                      type="text"
                      value={armyListName}
                      onChange={(e) => setArmyListName(e.target.value)}
                      placeholder="Untitled..."
                      className="bg-transparent text-amber-300 font-bold text-[11px] sm:text-xs font-mono focus:outline-none w-28 sm:w-44 placeholder-zinc-500 truncate"
                      title="Click to rename list"
                    />
                  </div>

                  <div className="h-4 w-px bg-zinc-750 hidden sm:block mx-0.5" />

                  {/* Fixed Tactical Platoon Icons Strip */}
                  <div className="flex items-center gap-1 sm:gap-1.5 py-0.5 select-none relative">
                    {platoonTypes.map((t) => {
                      const typeId = t.id;
                      const info = PLATOON_TACTICAL_INFO[typeId] || { es: t.name || t.title, en: t.title };
                      // Filter out empty duplicate platoons that are not active ("desaparece de la barra")
                      const typePlatoons = platoons.filter(p => {
                        if (p.typeId !== typeId) return false;
                        const matchingCount = platoonCountByType[typeId] || 0;
                        const unitsCount = Object.keys(p.slots || {}).length;
                        if (matchingCount > 1 && unitsCount === 0 && p.id !== activePlatoonId) {
                          return false;
                        }
                        return true;
                      });

                      const draggedTitle = (draggedSlot?.slotLabel || '').trim().toLowerCase();
                      const typeAcceptsDragged = !!draggedSlot && (t.columns || []).some(col =>
                        (col.slots || []).some(s => (s.label || '').trim().toLowerCase() === draggedTitle)
                      );

                      if (typePlatoons.length === 0) {
                        const tooltipText = `${info.es} (${info.en}) • Sin unidades`;
                        return (
                          <button
                            key={typeId}
                            type="button"
                            onClick={() => handleSelectPlatoonByTypeId(typeId)}
                            className="w-9 h-7 sm:w-10 sm:h-7.5 rounded-lg border flex items-center justify-center relative transition-all cursor-pointer bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850 border-zinc-800 opacity-35 hover:opacity-85"
                            title={tooltipText}
                          >
                            <PlatoonTacticalIcon
                              typeId={typeId}
                              className="w-6 h-4 sm:w-6.5 sm:h-4.5"
                            />
                          </button>
                        );
                      }

                      return (
                        <React.Fragment key={typeId}>
                          {typePlatoons.map((p, pIdx) => {
                            const isCurrent = p.id === activePlatoonId;
                            const unitsCount = Object.keys(p.slots || {}).length;
                            const isEquipped = unitsCount > 0;
                            const platoonNumber = pIdx + 1;
                            const isExtra = pIdx > 0;

                            let btnStyle = "";
                            if (isCurrent) {
                              btnStyle = "bg-amber-400 text-black border-amber-400 shadow-md ring-2 ring-amber-300 font-black";
                            } else if (isEquipped) {
                              btnStyle = "bg-zinc-800 text-zinc-100 hover:text-white hover:bg-zinc-750 border-zinc-650 opacity-100 shadow-xs";
                            } else {
                              btnStyle = "bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850 border-zinc-800 opacity-45 hover:opacity-85";
                            }

                            if (draggedSlot) {
                              if (typeAcceptsDragged) {
                                btnStyle += " ring-2 ring-emerald-400/90 shadow-md shadow-emerald-950/50";
                              } else {
                                btnStyle += " opacity-25";
                              }
                            }

                            const tooltipText = `${info.es}${isExtra ? ` #${platoonNumber}` : ''} (${info.en}${isExtra ? ` #${platoonNumber}` : ''})${
                              isEquipped ? ` • ${unitsCount} unidad${unitsCount > 1 ? 'es' : ''}` : ' • Sin unidades'
                            }${isCurrent ? ' [Activo]' : ''}`;

                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setActivePlatoonId(p.id)}
                                onDragOver={(e) => {
                                  if (draggedSlot && typeAcceptsDragged) {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'copy';
                                  }
                                }}
                                onDragEnter={(e) => {
                                  if (draggedSlot && p.id !== activePlatoonId) {
                                    setActivePlatoonId(p.id);
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (draggedSlot) {
                                    handleDropOnPlatoon(p.id);
                                  }
                                }}
                                className={`w-9 h-7 sm:w-10 sm:h-7.5 rounded-lg border flex items-center justify-center relative transition-all cursor-pointer ${btnStyle}`}
                                title={tooltipText}
                              >
                                <PlatoonTacticalIcon
                                  typeId={typeId}
                                  className="w-6 h-4 sm:w-6.5 sm:h-4.5"
                                />

                                {/* Unit counter badge if equipped (top-right) */}
                                {isEquipped && !isCurrent && (
                                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-zinc-700 border border-zinc-500 rounded-full text-[8.5px] font-mono font-bold text-zinc-200 flex items-center justify-center leading-none">
                                    {unitsCount}
                                  </span>
                                )}
                                {isEquipped && isCurrent && (
                                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-black text-amber-300 border border-black rounded-full text-[8.5px] font-mono font-bold flex items-center justify-center leading-none">
                                    {unitsCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}

                    {/* Add Platoon Button & Dropdown */}
                    <div className="relative shrink-0" ref={addPlatoonRef}>
                      <button
                        type="button"
                        onClick={() => setIsAddPlatoonOpen((v) => !v)}
                        className={`w-9 h-7 sm:w-10 sm:h-7.5 rounded-lg border flex items-center justify-center relative transition-all cursor-pointer ${
                          isAddPlatoonOpen
                            ? 'bg-amber-400 text-black border-amber-400 shadow-md ring-2 ring-amber-300 font-black'
                            : 'bg-zinc-850 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 border-zinc-700 hover:border-amber-400/60 shadow-xs'
                        }`}
                        title="Añadir pelotón / Add platoon"
                      >
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      </button>

                      {isAddPlatoonOpen && (
                        <div className="absolute top-full left-0 mt-1.5 z-50 w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1.5 animate-in fade-in duration-150">
                          <div className="px-3 py-1.5 border-b border-zinc-800 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                            <span>Añadir Pelotón</span>
                            <span className="text-zinc-500 font-normal">{factionData?.faction || 'Bolt Action v3'}</span>
                          </div>
                          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/60 py-0.5">
                            {platoonTypes.map((t) => {
                              const typeId = t.id;
                              const info = PLATOON_TACTICAL_INFO[typeId] || { es: t.name || t.title, en: t.title };
                              const existingCount = platoons.filter(p => p.typeId === typeId).length;
                              return (
                                <button
                                  key={typeId}
                                  type="button"
                                  onClick={() => {
                                    const nextId = platoons.length > 0 ? Math.max(...platoons.map(p => p.id)) + 1 : 1;
                                    const newP = { id: nextId, typeId, period: 'All', slots: {} };
                                    setPlatoons([...platoons, newP]);
                                    setActivePlatoonId(nextId);
                                    setIsAddPlatoonOpen(false);
                                    showToast(`Añadido ${info.es} #${existingCount + 1}`, "success");
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-zinc-800/80 flex items-center gap-2.5 transition-colors group cursor-pointer"
                                >
                                  <div className="w-7 h-5 flex items-center justify-center shrink-0">
                                    <PlatoonTacticalIcon typeId={typeId} className="w-6 h-4 text-amber-400 group-hover:scale-105 transition-transform" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 truncate">
                                      {info.es}
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-400 truncate">
                                      {info.en}
                                    </div>
                                  </div>
                                  <div className="shrink-0 flex items-center gap-1.5">
                                    {existingCount > 0 && (
                                      <span className="text-[9.5px] font-mono px-1.5 py-0.2 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">
                                        #{existingCount + 1}
                                      </span>
                                    )}
                                    <Plus className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Live Points & Order Dice (Tablet/Desktop; mobile uses fixed bottom bar) */}
                <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-zinc-300">
                  <div>
                    Platoon: <strong className="text-zinc-100">{currentPlatoonPoints} pts</strong>
                  </div>
                  <div className="h-3 w-px bg-zinc-700" />
                  <div>
                    Total Points: <strong className="text-sm font-bold text-white">{totalPoints}</strong>
                  </div>
                  <div className="h-3 w-px bg-zinc-700" />
                  <div className="flex items-center gap-1.5">
                    <span>Order Dice:</span>
                    <strong className="text-sm font-bold text-amber-400">{totalOrderDice}</strong>
                  </div>
                </div>

              </div>

              {/* ACTIVE PLATOON TITLE & CONTROLS SUB-BAR */}
              <div className="flex items-center justify-between px-2.5 sm:px-3 py-1 bg-zinc-900/70 border border-zinc-750 rounded-lg text-xs font-mono shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <PlatoonTacticalIcon typeId={currentPlatoon.typeId} className="w-5 h-3.5 sm:w-6 sm:h-4 text-amber-400 shrink-0" />
                  <span className="font-tactical font-black text-xs sm:text-sm uppercase text-amber-300 tracking-wider truncate">
                    {PLATOON_TACTICAL_INFO[currentPlatoon.typeId]?.es || currentType.title}
                    {platoons.filter(p => p.typeId === currentPlatoon.typeId).length > 1
                      ? ` #${platoons.filter(p => p.typeId === currentPlatoon.typeId).findIndex(p => p.id === currentPlatoon.id) + 1}`
                      : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {platoons.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeletePlatoon(e, currentPlatoon.id)}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-300 border border-zinc-750 hover:border-red-800 text-[10.5px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                      title="Eliminar este pelotón"
                    >
                      <span>×</span>
                      <span className="hidden sm:inline">Eliminar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3. 5-COLUMN SLOT GRID (Exact EasyArmy Platoon Structure) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 items-start pt-0.5">
                {(currentType?.columns || []).map((col, colIdx) => (
                  <div key={col.id || colIdx} className="space-y-1.5">
                    {col.slots.map((slot) => (
                      <Slot
                        key={slot.id}
                        slot={slot}
                        factionData={factionData}
                        platoonTypeId={currentType.id}
                        platoonId={currentPlatoon.id}
                        periodKey={currentPlatoon.period || 'All'}
                        value={currentPlatoon.slots[slot.id]}
                        onSelect={(unitName, slotLabel) => handleSelectSlot(slot.id, unitName, slotLabel)}
                        onEdit={(slotId, unitItem, slotLabel) => handleOpenEditModal(slotId, unitItem, slotLabel)}
                        onClear={() => handleClearSlot(slot.id)}
                        draggedSlot={draggedSlot}
                        onDragStart={(info) => setDraggedSlot(info)}
                        onDragEnd={() => setDraggedSlot(null)}
                        onCopySlot={handleCopySlot}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {/* FLOATING EXPORT BUTTON (tablet / desktop) */}
            <div className="hidden sm:block fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 z-40 no-print">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-extrabold text-sm font-tactical uppercase tracking-wider transition-all duration-150 shadow-2xl border border-amber-300 flex items-center gap-2 cursor-pointer"
              >
                <DownloadIcon className="w-4 h-4 text-black" />
                <span className="font-black tracking-wide">EXPORT</span>
              </button>
            </div>

            {/* MOBILE BOTTOM BAR (app mode): live totals + export */}
            <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 no-print bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 safe-bottom safe-x pt-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 font-mono text-[10px] text-zinc-400 min-w-0">
                  <div className="leading-tight">
                    <div className="uppercase text-[9px]">Total</div>
                    <div className="text-white font-black text-sm">{totalPoints}<span className="text-[9.5px] text-zinc-500 font-bold"> pts</span></div>
                  </div>
                  <div className="h-6 w-px bg-zinc-800" />
                  <div className="leading-tight">
                    <div className="uppercase text-[9px]">Dice</div>
                    <div className="text-amber-400 font-black text-sm">{totalOrderDice}</div>
                  </div>
                  <div className="h-6 w-px bg-zinc-800" />
                  <div className="leading-tight min-w-0">
                    <div className="uppercase text-[9px]">Platoon</div>
                    <div className="text-zinc-200 font-bold text-xs truncate">{currentPlatoonPoints} pts</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="h-9 px-3.5 rounded-lg bg-amber-400 active:bg-amber-300 text-black font-black text-[11px] font-tactical uppercase tracking-wider flex items-center gap-1.5 shadow-lg shrink-0 cursor-pointer"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  EXPORT
                </button>
              </div>
            </div>

            {/* ACCOUNT MODALS */}
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
            <MyListsModal
              isOpen={isMyListsOpen}
              onClose={() => setIsMyListsOpen(false)}
              user={user}
              currentListId={currentListId}
              onLoadList={handleLoadCloudList}
              onSaveCurrentAsNew={() => handleCloudSave(true)}
              onListDeleted={(id) => {
                if (id === currentListId) setCurrentListId(null);
              }}
            />

            {/* FULL-WINDOW UNIT EDIT MODAL */}
            <UnitEditModal
              isOpen={editingUnitModal.isOpen}
              onClose={() => setEditingUnitModal({ isOpen: false, slotId: null, slotLabel: null, unitItem: null })}
              factionData={factionData}
              unitItem={editingUnitModal.unitItem}
              slotLabel={editingUnitModal.slotLabel}
              onSave={handleSaveUnitFromModal}
              onClearUnit={() => {
                if (editingUnitModal.slotId) {
                  handleClearSlot(editingUnitModal.slotId);
                }
              }}
            />
            {/* EXPORT MODAL */}
            <ExportModal
              isOpen={isExportModalOpen}
              onClose={() => setIsExportModalOpen(false)}
              factionData={factionData}
              armyListName={armyListName}
              setArmyListName={setArmyListName}
              armyNotes={armyNotes}
              setArmyNotes={setArmyNotes}
              totalPoints={totalPoints}
              totalOrderDice={totalOrderDice}
              platoons={platoons}
              onDirectPDFDownload={handleDirectPDFDownload}
              isGeneratingPdf={isGeneratingPdf}
              exportOptions={exportOptions}
              setExportOptions={setExportOptions}
            />

            {/* PRINT-ONLY ROSTER */}
            <div id="printable-army-roster" className="print-only">
              <ArmyRosterPrintView
                factionData={factionData}
                armyListName={armyListName}
                armyNotes={armyNotes}
                totalPoints={totalPoints}
                totalOrderDice={totalOrderDice}
                platoons={platoons}
                isPreview={false}
                exportOptions={exportOptions}
              />
            </div>
          </div>
        );
      }
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<App />);
