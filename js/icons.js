// =========================================================================
// SVG ICONS & TACTICAL NATO INSIGNIA
// =========================================================================

const GoogleIcon = ({ className = "w-4 h-4" }) => (
        <svg viewBox="0 0 48 48" className={className}>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
      );
      const Plus = ({ className = "w-4 h-4" }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M5 12h14"/><path d="M12 5v14"/>
        </svg>
      );
      const Check = ({ className = "w-4 h-4" }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      );
      const Trash = ({ className = "w-3 h-3" }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      );
      const XIcon = ({ className = "w-3.5 h-3.5" }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      );
      const Search = ({ className = "w-3.5 h-3.5" }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
      );
      const HelmetLogo = ({ className = "w-11 h-11", width = 44, height = 44 }) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 64"
          width={width}
          height={height}
          fill="none"
          className={className}
          style={{ overflow: 'visible' }}
          aria-hidden="true"
        >
          <circle cx="32" cy="32" r="28" fill="#283224" stroke="#DFBF52" strokeWidth="2.5"/>
          {/* Chinstrap (Symmetrical front loop) */}
          <path d="M21 38.5 C21 47.5, 26 51, 32 51 C38 51, 43 47.5, 43 38.5" stroke="#C4A238" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
          <path d="M29.5 51 H34.5" stroke="#7A7F52" strokeWidth="2.8" strokeLinecap="round"/>
          {/* Inner helmet brow opening / shadow */}
          <path d="M16 40 C21 43.5, 43 43.5, 48 40 C44 42.5, 20 42.5, 16 40 Z" fill="#161B15"/>
          {/* Helmet Shell (Symmetrical Front View) */}
          <path d="M12.5 38.5 C13 28, 17 14, 32 14 C47 14, 51 28, 51.5 38.5 C51.5 40.5, 48 42, 44 41 C37 39.5, 27 39.5, 20 41 C16 42, 12.5 40.5, 12.5 38.5 Z" fill="#DFBF52"/>
          {/* Visor / Brow Arch Line */}
          <path d="M14 37.5 C20 35.5, 44 35.5, 50 37.5" stroke="#20281E" strokeWidth="2" strokeLinecap="round"/>
          {/* Lower rim line */}
          <path d="M16 40.5 C23 39, 41 39, 48 40.5" stroke="#20281E" strokeWidth="1.2" strokeLinecap="round"/>
          {/* Symmetrical Crown Highlight Arch */}
          <path d="M22 26 C24 18.5, 28 16.5, 32 16.5 C36 16.5, 40 18.5, 42 26" stroke="#F4F1E8" strokeWidth="1.6" strokeLinecap="round" opacity="0.55"/>
          {/* Symmetrical Rivets / Air Vents */}
          <circle cx="18.5" cy="31.5" r="1.3" fill="#20281E"/>
          <circle cx="45.5" cy="31.5" r="1.3" fill="#20281E"/>
          {/* Tactical Red Star Emblem */}
          <polygon points="32,19.5 33.2,23.2 36.9,23.2 33.9,25.4 35,29.1 32,26.9 29,29.1 30.1,25.4 27.1,23.2 30.8,23.2" fill="#733028"/>
        </svg>
      );
      const DownloadIcon = ({ className = "w-4 h-4" }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      );
      const EyeIcon = ({ className = "w-4 h-4" }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      );
      const CloudIcon = ({ className = "w-4 h-4" }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
        </svg>
      );
      const FolderIcon = ({ className = "w-4 h-4" }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
        </svg>
      );
      const UserIcon = ({ className = "w-4 h-4" }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      );
      const LogOutIcon = ({ className = "w-4 h-4" }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
        </svg>
      );

      // =========================================================================
      // NATO TACTICAL SYMBOLOGY & MILITARY INSIGNIA RESOLVER
      // =========================================================================

      function resolveTacticalIconType(slot, unitName, platoonTypeId) {
        const key = ((slot?.slotKey || slot?.label || '') + '').toLowerCase();
        const uName = ((unitName || '') + '').toLowerCase();

        if (key.includes('command vehicle') || key.includes('cmd vehicle') || key.includes('recce vehicles rule')) {
          return { type: 'armoured_hq', dots: 1 };
        }
        if (key.includes('commander') || key.includes('commissar') || key.includes('hq') || key.includes('officer')) {
          if (platoonTypeId === 'armoured') return { type: 'armoured_hq', dots: 1 };
          return { type: 'hq', dots: 1 };
        }
        if (key.includes('engineer')) {
          return { type: 'engineer', dots: 2 };
        }
        if (key.includes('infantry') || key.includes('squad')) {
          return { type: 'infantry', dots: 2 };
        }
        if (key.includes('medic')) {
          return { type: 'medic', dots: 1 };
        }
        if (key.includes('observer')) {
          return { type: 'observer', dots: 1 };
        }
        if (key.includes('sniper')) {
          return { type: 'sniper', dots: 1 };
        }
        if (key.includes('flamethrower')) {
          return { type: 'flamethrower', dots: 1 };
        }
        if (key.includes('heavy weapon')) {
          if (uName.includes('machine gun') || uName.includes('mmg') || uName.includes('hmg')) {
            return { type: 'mg', dots: 1 };
          }
          return { type: 'mortar', dots: 1 };
        }
        if (key.includes('machine gun')) {
          return { type: 'mg', dots: 1 };
        }
        if (key.includes('mortar')) {
          return { type: 'mortar', dots: 1 };
        }
        if (key.includes('anti-tank') || key.includes('anti tank')) {
          return { type: 'anti_tank', dots: 1 };
        }
        if (key.includes('artillery') || key.includes('gun')) {
          return { type: 'artillery', dots: slot?.mandatory ? 2 : 1 };
        }
        if (key.includes('recce') || key.includes('recon')) {
          return { type: 'recce', dots: 1 };
        }
        if (key.includes('transport') || key.includes('tow')) {
          return { type: 'transport', dots: 1 };
        }
        if (key.includes('vehicle') || key.includes('tank') || key.includes('armoured')) {
          return { type: 'armoured', dots: 1 };
        }
        return { type: 'infantry', dots: 1 };
      }

      function UnitTacticalIcon({ slot, unitName, platoonTypeId, className = "w-8 h-6 text-amber-300 shrink-0", width = 32, height = 24, color = "currentColor" }) {
        const { type, dots } = resolveTacticalIconType(slot, unitName, platoonTypeId);
        return (
          <svg
            viewBox="0 0 38 30"
            width={width}
            height={height}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ overflow: 'visible' }}
            aria-hidden="true"
          >
            {/* Top Unit Size Dots */}
            {dots === 1 && <circle cx="19" cy="3.5" r="1.5" fill={color} />}
            {dots === 2 && (
              <>
                <circle cx="16" cy="3.5" r="1.5" fill={color} />
                <circle cx="22" cy="3.5" r="1.5" fill={color} />
              </>
            )}
            {dots === 3 && (
              <>
                <circle cx="13" cy="3.5" r="1.5" fill={color} />
                <circle cx="19" cy="3.5" r="1.5" fill={color} />
                <circle cx="25" cy="3.5" r="1.5" fill={color} />
              </>
            )}

            {/* Outer Tactical Rectangle Frame */}
            <rect x="3" y="7.5" width="32" height="19.5" rx="0.5" fill="none" stroke={color} strokeWidth="1.7" />

            {/* Interior Tactical Symbol */}
            {type === 'hq' && (
              <text x="19" y="21" textAnchor="middle" fill={color} fontSize="10.5" fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="0.4">
                HQ
              </text>
            )}

            {type === 'infantry' && (
              <>
                <line x1="3" y1="7.5" x2="35" y2="27" stroke={color} strokeWidth="1.6" />
                <line x1="35" y1="7.5" x2="3" y2="27" stroke={color} strokeWidth="1.6" />
              </>
            )}

            {type === 'medic' && (
              <>
                <line x1="19" y1="7.5" x2="19" y2="27" stroke={color} strokeWidth="1.5" />
                <line x1="3" y1="17.25" x2="35" y2="17.25" stroke={color} strokeWidth="1.5" />
              </>
            )}

            {type === 'observer' && (
              <polygon points="19,10.5 12.5,23 25.5,23" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
            )}

            {type === 'sniper' && (
              <>
                <circle cx="19" cy="17.25" r="4.6" fill="none" stroke={color} strokeWidth="1.5" />
                <line x1="19" y1="10.5" x2="19" y2="24" stroke={color} strokeWidth="1.5" />
                <line x1="12.2" y1="17.25" x2="25.8" y2="17.25" stroke={color} strokeWidth="1.5" />
              </>
            )}

            {type === 'anti_tank' && (
              <polyline points="3,27 19,7.5 35,27" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
            )}

            {type === 'mortar' && (
              <>
                <line x1="3" y1="7.5" x2="8.5" y2="11" stroke={color} strokeWidth="1.5" />
                <line x1="35" y1="7.5" x2="29.5" y2="11" stroke={color} strokeWidth="1.5" />
                <line x1="3" y1="27" x2="8.5" y2="23.5" stroke={color} strokeWidth="1.5" />
                <line x1="35" y1="27" x2="29.5" y2="23.5" stroke={color} strokeWidth="1.5" />
                <circle cx="19" cy="22" r="2.4" fill={color} />
                <line x1="19" y1="11" x2="19" y2="21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}

            {type === 'mg' && (
              <>
                <line x1="3" y1="7.5" x2="8.5" y2="11" stroke={color} strokeWidth="1.5" />
                <line x1="35" y1="7.5" x2="29.5" y2="11" stroke={color} strokeWidth="1.5" />
                <line x1="3" y1="27" x2="8.5" y2="23.5" stroke={color} strokeWidth="1.5" />
                <line x1="35" y1="27" x2="29.5" y2="23.5" stroke={color} strokeWidth="1.5" />
                <text x="19" y="20.5" textAnchor="middle" fill={color} fontSize="9.2" fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="0.3">
                  MG
                </text>
              </>
            )}

            {type === 'engineer' && (
              <path
                d="M8.5 22.5 V12.5 H29.5 V22.5 M19 12.5 V22.5"
                fill="none"
                stroke={color}
                strokeWidth="1.6"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            )}

            {type === 'flamethrower' && (
              <>
                <polyline points="3,7.5 19,17.25 35,7.5" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
                <line x1="19" y1="17.25" x2="19" y2="27" stroke={color} strokeWidth="1.6" />
              </>
            )}

            {type === 'artillery' && (
              <circle cx="19" cy="17.25" r="3.4" fill={color} />
            )}

            {type === 'armoured_hq' && (
              <>
                <rect x="7" y="10.75" width="24" height="13" rx="5.5" fill="none" stroke={color} strokeWidth="1.5" />
                <text x="19" y="20" textAnchor="middle" fill={color} fontSize="8.2" fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="0.3">
                  HQ
                </text>
              </>
            )}

            {type === 'armoured' && (
              <rect x="7" y="10.75" width="24" height="13" rx="5.5" fill="none" stroke={color} strokeWidth="1.6" />
            )}

            {type === 'transport' && (
              <>
                <circle cx="19" cy="17.25" r="5.5" fill="none" stroke={color} strokeWidth="1.5" />
                <line x1="19" y1="11.75" x2="19" y2="22.75" stroke={color} strokeWidth="1.2" />
                <line x1="13.5" y1="17.25" x2="24.5" y2="17.25" stroke={color} strokeWidth="1.2" />
                <line x1="15.1" y1="13.35" x2="22.9" y2="21.15" stroke={color} strokeWidth="1.2" />
                <line x1="22.9" y1="13.35" x2="15.1" y2="21.15" stroke={color} strokeWidth="1.2" />
              </>
            )}

            {type === 'recce' && (
              <line x1="3" y1="27" x2="35" y2="7.5" stroke={color} strokeWidth="1.6" />
            )}
          </svg>
        );
      }

      const PLATOON_TACTICAL_INFO = {
        infantry: { es: 'Pelotón de fusileros', en: 'Rifle Platoon' },
        heavy_weapon: { es: 'Pelotón de armas pesadas', en: 'Heavy Weapons Platoon' },
        engineer: { es: 'Pelotón de ingenieros', en: 'Engineer Platoon' },
        artillery: { es: 'Pelotón de artillería', en: 'Artillery Platoon' },
        armoured: { es: 'Pelotón blindado', en: 'Armoured Platoon' },
        recce: { es: 'Pelotón de reconocimiento', en: 'Recce Platoon' },
      };

      function PlatoonTacticalIcon({ typeId, className = "w-7 h-5 shrink-0", width = 28, height = 20, color = "currentColor" }) {
        return (
          <svg
            viewBox="0 0 38 30"
            width={width}
            height={height}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ overflow: 'visible' }}
            aria-hidden="true"
          >
            {/* Top 3 dots indicating platoon echelon */}
            <circle cx="13" cy="3.5" r="1.5" fill={color} />
            <circle cx="19" cy="3.5" r="1.5" fill={color} />
            <circle cx="25" cy="3.5" r="1.5" fill={color} />

            {/* Tactical outer frame */}
            <rect x="3" y="7.5" width="32" height="19.5" rx="0.5" fill="none" stroke={color} strokeWidth="1.7" />

            {/* Interior symbols based on Bolt Action v3 Rulebook */}
            {(typeId === 'infantry' || !typeId) && (
              <>
                <line x1="3" y1="7.5" x2="35" y2="27" stroke={color} strokeWidth="1.6" />
                <line x1="35" y1="7.5" x2="3" y2="27" stroke={color} strokeWidth="1.6" />
              </>
            )}

            {typeId === 'heavy_weapon' && (
              <>
                <line x1="3" y1="7.5" x2="19" y2="13.5" stroke={color} strokeWidth="1.5" />
                <line x1="35" y1="7.5" x2="19" y2="13.5" stroke={color} strokeWidth="1.5" />
                <line x1="19" y1="12" x2="19" y2="21.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="19" cy="22" r="2.5" fill={color} />
              </>
            )}

            {typeId === 'engineer' && (
              <path
                d="M8.5 22.5 V12.5 H29.5 V22.5 M19 12.5 V22.5"
                fill="none"
                stroke={color}
                strokeWidth="1.7"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            )}

            {typeId === 'artillery' && (
              <circle cx="19" cy="17.25" r="3.6" fill={color} />
            )}

            {typeId === 'armoured' && (
              <rect x="7" y="10.75" width="24" height="13" rx="5.5" fill="none" stroke={color} strokeWidth="1.6" />
            )}

            {typeId === 'recce' && (
              <line x1="3" y1="27" x2="35" y2="7.5" stroke={color} strokeWidth="1.6" />
            )}
          </svg>
        );
      }

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.GoogleIcon = GoogleIcon;
  window.Plus = Plus;
  window.Check = Check;
  window.Trash = Trash;
  window.XIcon = XIcon;
  window.Search = Search;
  window.HelmetLogo = HelmetLogo;
  window.DownloadIcon = DownloadIcon;
  window.EyeIcon = EyeIcon;
  window.CloudIcon = CloudIcon;
  window.FolderIcon = FolderIcon;
  window.UserIcon = UserIcon;
  window.LogOutIcon = LogOutIcon;
  window.resolveTacticalIconType = resolveTacticalIconType;
  window.UnitTacticalIcon = UnitTacticalIcon;
  window.PlatoonTacticalIcon = PlatoonTacticalIcon;
  window.PLATOON_TACTICAL_INFO = PLATOON_TACTICAL_INFO;
}
