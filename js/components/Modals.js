// =========================================================================
// MODALS (Auth, Saved Lists & Cloud Sync, JSON / Backup Export)
// =========================================================================

function ModalShell({ title, subtitle, icon, onClose, children, maxWidth = "max-w-md" }) {
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm no-print">
            <div className={`bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[92dvh] overflow-hidden flex flex-col`}>
              <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-black font-tactical text-white tracking-wide uppercase truncate">{title}</h2>
                    {subtitle && <p className="text-[11px] font-mono text-zinc-400 truncate">{subtitle}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Close"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 safe-bottom">{children}</div>
            </div>
          </div>
        );
      }

      function AuthModal({ isOpen, onClose }) {
        const [mode, setMode] = useState('signin'); // signin | signup | reset | config
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [busy, setBusy] = useState(false);
        const [message, setMessage] = useState(null);
        const [sbUrl, setSbUrl] = useState(initialSbCfg.supabaseUrl || '');
        const [sbKey, setSbKey] = useState(initialSbCfg.supabaseAnonKey || '');

        useEffect(() => {
          if (isOpen) {
            setMessage(null);
            if (mode === 'config') setMode('signin');
          }
        }, [isOpen]);

        if (!isOpen) return null;

        const currentOrigin =
          window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')
            ? window.location.origin
            : 'https://miguelefvlc.github.io';
        let currentPath = window.location.pathname && window.location.pathname.startsWith('/')
          ? window.location.pathname
          : '/ARMYMAKER/';
        if (currentPath.endsWith('index.html')) {
          currentPath = currentPath.slice(0, -'index.html'.length);
        }
        if (!currentPath.endsWith('/')) {
          currentPath += '/';
        }
        const redirectTo = currentOrigin + currentPath;

        const handleSaveConfig = (e) => {
          e.preventDefault();
          localStorage.setItem(
            RUNTIME_SB_KEY,
            JSON.stringify({
              supabaseUrl: sbUrl.trim(),
              supabaseAnonKey: sbKey.trim(),
            })
          );
          window.location.reload();
        };

        const handleSubmit = async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage(null);
          try {
            if (supabaseClient) {
              if (mode === 'signin') {
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onClose();
              } else if (mode === 'signup') {
                const { data, error } = await supabaseClient.auth.signUp({
                  email,
                  password,
                  options: { emailRedirectTo: redirectTo },
                });
                if (error) throw error;
                if (data.session) {
                  onClose();
                } else {
                  setMessage({ type: 'success', text: 'Account created. Check your email to confirm it, then sign in.' });
                  setMode('signin');
                }
              } else {
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Password reset email sent.' });
              }
            } else {
              // Instant account sign-in
              const cleanEmail = email.trim().toLowerCase();
              if (!cleanEmail) throw new Error('Please enter your email.');
              if (mode === 'reset') {
                setMessage({ type: 'success', text: 'You can sign in directly with a new password.' });
                setMode('signin');
              } else {
                signInLocalUser({
                  id: `user-${cleanEmail}`,
                  email: cleanEmail,
                  provider: 'email',
                });
                onClose();
              }
            }
          } catch (err) {
            setMessage({ type: 'error', text: err.message || String(err) });
          } finally {
            setBusy(false);
          }
        };

        const titles = {
          signin: 'Sign In',
          signup: 'Create Account',
          reset: 'Reset Password',
          config: 'Cloud Settings',
        };
        const inputCls =
          "w-full bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-zinc-600 outline-none transition-colors";

        return (
          <ModalShell
            title={titles[mode] || 'Sign In'}
            subtitle="Save & access your Bolt Action army lists"
            icon={<UserIcon className="w-4 h-4" />}
            onClose={onClose}
          >
            {mode === 'config' ? (
              <form onSubmit={handleSaveConfig} className="space-y-3 text-xs font-mono text-zinc-300 leading-relaxed">
                <div>
                  <label className="block text-[10.5px] uppercase text-zinc-400 font-bold mb-1">Supabase Project URL (Optional)</label>
                  <input
                    type="url"
                    value={sbUrl}
                    onChange={(e) => setSbUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase text-zinc-400 font-bold mb-1">Supabase Anon Public Key (Optional)</label>
                  <input
                    type="text"
                    value={sbKey}
                    onChange={(e) => setSbKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs font-mono transition-colors shadow cursor-pointer"
                >
                  Save Settings
                </button>
                <button type="button" onClick={() => setMode('signin')} className="text-amber-400 hover:text-amber-300 text-xs cursor-pointer block">
                  ← Back to Sign In
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className={inputCls}
                  />
                  {mode !== 'reset' && (
                    <input
                      type="password"
                      required
                      minLength={6}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (min. 6 characters)"
                      className={inputCls}
                    />
                  )}

                  {message && (
                    <div
                      className={`px-3 py-2 rounded-lg text-xs font-mono border ${
                        message.type === 'error'
                          ? 'bg-red-950/60 border-red-800 text-red-200'
                          : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      }`}
                    >
                      {message.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-black font-extrabold text-sm font-mono transition-colors shadow cursor-pointer"
                  >
                    {busy ? 'Please wait...' : titles[mode]}
                  </button>
                </form>

                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  {mode === 'signin' ? (
                    <>
                      <button type="button" onClick={() => setMode('signup')} className="text-amber-400 hover:text-amber-300 cursor-pointer">
                        Create account
                      </button>
                      <button type="button" onClick={() => setMode('reset')} className="text-zinc-400 hover:text-white cursor-pointer">
                        Forgot password?
                      </button>
                      <button type="button" onClick={() => setMode('config')} className="text-zinc-500 hover:text-zinc-300 text-[11px] cursor-pointer" title="Configure Cloud storage">
                        ⚙ Settings
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setMode('signin')} className="text-amber-400 hover:text-amber-300 cursor-pointer">
                      ← Back to sign in
                    </button>
                  )}
                </div>
              </div>
            )}
          </ModalShell>
        );
      }

      function SavedListRow({ list, isCurrent, onOpen, onDelete, deleteTitle }) {
        const factionsMap = window.FACTIONS_REGISTRY || window.EASYARMY_FACTIONS || {};
        return (
          <div
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              isCurrent ? 'bg-amber-400/10 border-amber-500/40' : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-left cursor-pointer">
              <div className="font-bold text-sm text-white truncate">{list.name}</div>
              <div className="text-[11px] font-mono text-zinc-400 flex flex-wrap items-center gap-x-2">
                <span>{factionsMap[list.faction_id]?.faction || list.faction_id}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-amber-400 font-bold">{list.total_points} pts</span>
                <span className="text-zinc-600">•</span>
                <span>{list.order_dice} dice</span>
                <span className="text-zinc-600">•</span>
                <span>{new Date(list.updated_at).toLocaleDateString()}</span>
              </div>
            </button>
            {isCurrent && (
              <span className="hidden sm:inline text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-400 text-black font-bold">
                Active
              </span>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors cursor-pointer"
              title={deleteTitle}
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        );
      }

      function MyListsModal({ isOpen, onClose, user, currentListId, onLoadList, onListDeleted, onSaveCurrentAsNew }) {
        const [cloudLists, setCloudLists] = useState([]);
        const [localLists, setLocalLists] = useState([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState(null);

        const refreshLists = async () => {
          setLocalLists(loadLocalLists());
          if (!supabaseClient || !user) {
            setCloudLists([]);
            return;
          }
          setLoading(true);
          setError(null);
          const { data, error: err } = await supabaseClient
            .from('army_lists')
            .select('id, name, faction_id, total_points, order_dice, updated_at')
            .order('updated_at', { ascending: false });
          if (err) setError(err.message);
          else setCloudLists(data || []);
          setLoading(false);
        };

        useEffect(() => {
          if (isOpen) refreshLists();
        }, [isOpen, user?.id]);

        if (!isOpen) return null;

        const handleOpenCloud = async (id) => {
          const { data, error: err } = await supabaseClient.from('army_lists').select('*').eq('id', id).single();
          if (err) {
            setError(err.message);
            return;
          }
          onLoadList(data);
          onClose();
        };

        const handleOpenLocal = (row) => {
          onLoadList(row);
          onClose();
        };

        const handleDeleteCloud = async (row) => {
          if (!window.confirm(`Delete cloud list "${row.name}"?`)) return;
          const { error: err } = await supabaseClient.from('army_lists').delete().eq('id', row.id);
          if (err) {
            setError(err.message);
            return;
          }
          setCloudLists((prev) => prev.filter((l) => l.id !== row.id));
          onListDeleted(row.id);
        };

        const handleDeleteLocal = (row) => {
          if (!window.confirm(`Delete saved list "${row.name}" from this device?`)) return;
          const next = localLists.filter((l) => l.id !== row.id);
          saveLocalLists(next);
          setLocalLists(next);
          onListDeleted(row.id);
        };

        const combinedEmpty = cloudLists.length === 0 && localLists.length === 0;

        return (
          <ModalShell
            title="My Saved Lists"
            subtitle={user?.email ? `Cloud (${user.email}) & Device` : 'Saved on this device (Sign in to sync to cloud)'}
            icon={<FolderIcon className="w-4 h-4" />}
            onClose={onClose}
            maxWidth="max-w-2xl"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-zinc-400">
                {user ? 'Cloud + Local storage active' : 'Local browser storage active'}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await onSaveCurrentAsNew();
                  refreshLists();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-mono font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Current as New List
              </button>
            </div>

            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg text-xs font-mono border bg-red-950/60 border-red-800 text-red-200">
                {error}
              </div>
            )}
            {loading ? (
              <div className="py-10 text-center text-xs font-mono text-zinc-500">Loading lists...</div>
            ) : combinedEmpty ? (
              <div className="py-10 text-center text-xs font-mono text-zinc-500">
                No saved lists yet. Tap <strong className="text-amber-400">Save</strong> to store your current roster.
              </div>
            ) : (
              <div className="space-y-4">
                {cloudLists.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10.5px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                      Cloud Lists ({cloudLists.length})
                    </div>
                    {cloudLists.map((l) => (
                      <SavedListRow
                        key={l.id}
                        list={l}
                        isCurrent={l.id === currentListId}
                        onOpen={() => handleOpenCloud(l.id)}
                        onDelete={() => handleDeleteCloud(l)}
                        deleteTitle="Delete cloud list"
                      />
                    ))}
                  </div>
                )}

                {localLists.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10.5px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                      Saved on This Device ({localLists.length})
                    </div>
                    {localLists.map((l) => (
                      <SavedListRow
                        key={l.id}
                        list={l}
                        isCurrent={l.id === currentListId}
                        onOpen={() => handleOpenLocal(l)}
                        onDelete={() => handleDeleteLocal(l)}
                        deleteTitle="Delete local list"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </ModalShell>
        );
      }
      function ExportModal({
        isOpen,
        onClose,
        factionData,
        armyListName,
        setArmyListName,
        armyNotes,
        setArmyNotes,
        totalPoints,
        totalOrderDice,
        platoons,
        onDirectPDFDownload,
        isGeneratingPdf,
        exportOptions,
        setExportOptions
      }) {
        if (!isOpen) return null;
        const totalUnits = platoons.reduce((acc, p) => acc + Object.keys(p.slots).length, 0);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 no-print">
            <div className="bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <DownloadIcon className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-black font-tactical text-white tracking-wide uppercase">
                    Export
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 min-w-[240px]">
                      <label className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Force Roster Name
                      </label>
                      <input
                        type="text"
                        value={armyListName}
                        onChange={(e) => setArmyListName(e.target.value)}
                        placeholder="Untitled..."
                        className="w-full bg-zinc-900 border border-zinc-750 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-zinc-600 outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs font-mono shrink-0">
                      <div className="bg-zinc-900 border border-zinc-750 px-2.5 py-1 rounded-lg text-zinc-200">
                        Points: <strong className="text-amber-400">{totalPoints}</strong>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-750 px-2.5 py-1 rounded-lg text-zinc-200">
                        Dice: <strong className="text-white">{totalOrderDice}</strong>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-750 px-2.5 py-1 rounded-lg text-zinc-200">
                        Platoons: <strong className="text-white">{platoons.length}</strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Force Notes (Optional)
                    </label>
                    <textarea
                      value={armyNotes}
                      onChange={(e) => setArmyNotes(e.target.value)}
                      rows={2}
                      placeholder="Add deployment notes or tactical reminders..."
                      className="w-full bg-zinc-900 border border-zinc-750 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-zinc-600 outline-none transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* PDF CONTENT SECTIONS / EXPORT OPTIONS */}
                <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 sm:p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                      Opciones de Roster / PDF Sections
                    </label>
                    <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                      Desmarca para excluir del PDF
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <label className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all select-none ${
                      exportOptions?.includeUnitRules !== false
                        ? 'bg-amber-400/10 border-amber-400/50 text-amber-300 font-semibold shadow-xs'
                        : 'bg-zinc-900/60 border-zinc-750 text-zinc-500 hover:text-zinc-300 hover:border-zinc-650'
                    }`}>
                      <input
                        type="checkbox"
                        checked={exportOptions?.includeUnitRules !== false}
                        onChange={(e) =>
                          setExportOptions &&
                          setExportOptions((prev) => ({ ...prev, includeUnitRules: e.target.checked }))
                        }
                        className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-amber-400 accent-amber-400 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <span>Unit Special Rules</span>
                    </label>

                    <label className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all select-none ${
                      exportOptions?.includeArmyRules !== false
                        ? 'bg-amber-400/10 border-amber-400/50 text-amber-300 font-semibold shadow-xs'
                        : 'bg-zinc-900/60 border-zinc-750 text-zinc-500 hover:text-zinc-300 hover:border-zinc-650'
                    }`}>
                      <input
                        type="checkbox"
                        checked={exportOptions?.includeArmyRules !== false}
                        onChange={(e) =>
                          setExportOptions &&
                          setExportOptions((prev) => ({ ...prev, includeArmyRules: e.target.checked }))
                        }
                        className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-amber-400 accent-amber-400 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <span>Army Special Rules</span>
                    </label>

                    <label className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all select-none ${
                      exportOptions?.includeUnitCards !== false
                        ? 'bg-amber-400/10 border-amber-400/50 text-amber-300 font-semibold shadow-xs'
                        : 'bg-zinc-900/60 border-zinc-750 text-zinc-500 hover:text-zinc-300 hover:border-zinc-650'
                    }`}>
                      <input
                        type="checkbox"
                        checked={exportOptions?.includeUnitCards !== false}
                        onChange={(e) =>
                          setExportOptions &&
                          setExportOptions((prev) => ({ ...prev, includeUnitCards: e.target.checked }))
                        }
                        className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-amber-400 accent-amber-400 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <span>Tarjetas de Unidad (Battle Cards)</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onDirectPDFDownload}
                  disabled={totalUnits === 0 || isGeneratingPdf}
                  className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-black text-sm font-tactical uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>{isGeneratingPdf ? "Generating PDF..." : "Download PDF"}</span>
                </button>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <EyeIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Live Roster Preview</span>
                    </span>
                  </div>
                  <div className="bg-white text-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-300 shadow-inner max-h-[46vh] overflow-y-auto">
                    <div id="printable-army-roster-preview">
                      <ArmyRosterPrintView
                        factionData={factionData}
                        armyListName={armyListName}
                        armyNotes={armyNotes}
                        totalPoints={totalPoints}
                        totalOrderDice={totalOrderDice}
                        platoons={platoons}
                        isPreview={true}
                        exportOptions={exportOptions}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.ModalShell = ModalShell;
  window.AuthModal = AuthModal;
  window.SavedListRow = SavedListRow;
  window.MyListsModal = MyListsModal;
  window.ExportModal = ExportModal;
}
