// =========================================================================
// ACCOUNTS & CLOUD / LOCAL LISTS (Supabase + Local Library)
// =========================================================================

const LOCAL_LISTS_KEY = 'boltaction.saved_lists.v1';
const RUNTIME_SB_KEY = 'boltaction.supabase_config.v1';
const LOCAL_USER_KEY = 'boltaction.local_user.v1';

const DEFAULT_SUPABASE_URL = 'https://hllgymckihgmzlwkurid.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_QRIZ1T7JnqTKBbVcWegxEQ_9tsX0tiJ';

function getEffectiveSupabaseConfig() {
  const winCfg = window.APP_CONFIG || {};
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(RUNTIME_SB_KEY) || 'null');
  } catch {}
  return {
    supabaseUrl: winCfg.supabaseUrl || saved?.supabaseUrl || DEFAULT_SUPABASE_URL,
    supabaseAnonKey: winCfg.supabaseAnonKey || saved?.supabaseAnonKey || DEFAULT_SUPABASE_KEY,
  };
}

const initialSbCfg = getEffectiveSupabaseConfig();
let supabaseClient =
  initialSbCfg.supabaseUrl && initialSbCfg.supabaseAnonKey && window.supabase
    ? window.supabase.createClient(initialSbCfg.supabaseUrl, initialSbCfg.supabaseAnonKey)
    : null;

if (supabaseClient) {
  try {
    localStorage.removeItem(LOCAL_USER_KEY);
  } catch {}
}

function isSupabaseConfigured() {
  return !!supabaseClient;
}

function loadLocalUser() {
  if (supabaseClient) return null;
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function signInLocalUser(userObj) {
  try {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userObj));
    window.dispatchEvent(new CustomEvent('boltaction-auth-change'));
  } catch {}
}

function signOutLocalUser() {
  try {
    localStorage.removeItem(LOCAL_USER_KEY);
    window.dispatchEvent(new CustomEvent('boltaction-auth-change'));
  } catch {}
}

function loadLocalLists() {
  try {
    const arr = JSON.parse(localStorage.getItem(LOCAL_LISTS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveLocalLists(lists) {
  try {
    localStorage.setItem(LOCAL_LISTS_KEY, JSON.stringify(lists));
  } catch {}
}

function useAuth() {
  const [session, setSession] = React.useState(null);
  const [localUser, setLocalUser] = React.useState(() => loadLocalUser());
  const [authReady, setAuthReady] = React.useState(!supabaseClient);

  React.useEffect(() => {
    const onLocalAuth = () => setLocalUser(loadLocalUser());
    window.addEventListener('boltaction-auth-change', onLocalAuth);
    if (!supabaseClient) {
      return () => window.removeEventListener('boltaction-auth-change', onLocalAuth);
    }
    supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      window.removeEventListener('boltaction-auth-change', onLocalAuth);
      sub.subscription.unsubscribe();
    };
  }, []);

  const activeUser = session?.user || localUser || null;
  return { session, user: activeUser, isCloudUser: !!session?.user, authReady };
}

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.LOCAL_LISTS_KEY = LOCAL_LISTS_KEY;
  window.RUNTIME_SB_KEY = RUNTIME_SB_KEY;
  window.LOCAL_USER_KEY = LOCAL_USER_KEY;
  window.DEFAULT_SUPABASE_URL = DEFAULT_SUPABASE_URL;
  window.DEFAULT_SUPABASE_KEY = DEFAULT_SUPABASE_KEY;
  window.getEffectiveSupabaseConfig = getEffectiveSupabaseConfig;
  window.initialSbCfg = initialSbCfg;
  window.supabaseClient = supabaseClient;
  window.isSupabaseConfigured = isSupabaseConfigured;
  window.loadLocalUser = loadLocalUser;
  window.signInLocalUser = signInLocalUser;
  window.signOutLocalUser = signOutLocalUser;
  window.loadLocalLists = loadLocalLists;
  window.saveLocalLists = saveLocalLists;
  window.useAuth = useAuth;
}
