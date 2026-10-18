# 📖 LIST MAKER — Documentación de Arquitectura y Escalabilidad

> **Referencia Técnica Rápida para Desarrolladores**  
> Bolt Action v3 Army List Builder • Stack Zero-Build React 18 SPA • Motor Multi-Facción

---

## 1. Visión General del Proyecto

**LIST MAKER** es un constructor de listas de ejército para **Bolt Action: Tercera Edición (v3)** diseñado con un enfoque modular, ultraligero y de alto rendimiento.

- **Filosofía**: Zero-build runtime. Funciona directamente abriendo `index.html` o mediante un servidor estático (GitHub Pages, Live Server, `start.bat`), sin requerir empaquetadores en tiempo de ejecución.
- **PWA Standalone**: Instalable como aplicación de escritorio, tablet y móvil sin barras del navegador ni dependencias externas pesadas.
- **Nomenclatura**: Basada estrictamente en la estructura oficial de Bolt Action v3 y **EasyArmy (`wg.easyarmy.com`)**.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Framework UI** | React 18 (UMD) + Babel Standalone | Componentes declarativos y estado reactivo sin build step previo. |
| **Estilos** | Tailwind CSS (CDN) + Paleta Militar Personalizada | Diseño táctico militar (`zinc`, `amber`, `tacticalRed`, `#161B15`). |
| **Tipografía** | Inter, Chakra Petch (tactical), JetBrains Mono | Jerarquía visual clara para valores de puntos, dados y nombres de unidades. |
| **Iconografía** | SVG nativos en línea + Símbolos tácticos OTAN v3 | Cero peticiones de red para iconos. Símbolos reglamentarios adaptativos. |
| **Exportación** | `html2pdf.js` (html2canvas + jsPDF) | Generación instantánea de hojas de lista A4 en PDF listo para imprimir. |
| **Sincronización** | Supabase JS v2 + Google Identity Services | Guardado en la nube con cuentas de Google y respaldo en LocalStorage. |
| **Offline / PWA** | Web App Manifest + Service Worker (`sw.js`) | Modo App completa en Android, iOS, Windows y macOS. |

---

## 3. Estructura de Directorios

```text
listmaker/
├── index.html                   # Core de la aplicación (Motor React, componentes, estilos)
├── config.js                    # Credenciales públicas Supabase & Google OAuth
├── manifest.webmanifest         # Manifiesto PWA (display: standalone, iconos)
├── sw.js                        # Service Worker de caché offline e instalación
├── package.json                 # Herramientas de soporte y dependencias del crawler
├── ARCHITECTURE.md              # Este documento técnico
├── README.md                    # Descripción general del repositorio
├── factions/                    # Módulos de datos por facción
│   ├── soviet_union_app_data.js # Registro activo Unión Soviética
│   ├── soviet_union.json        # Dataset estructurado en JSON
│   ├── soviet_union.md          # Referencia humana en Markdown
│   ├── germany_app_data.js      # Registro activo Alemania
│   ├── germany.json             # Dataset estructurado en JSON
│   └── germany.md               # Referencia humana en Markdown
├── icons/                       # Iconos de la app y PWA (192px, 512px, favicon SVG)
├── images/                      # Ilustraciones oficiales de unidades
└── scraper/                     # Scripts de scraping para EasyArmy
```

---

## 4. Componentes y Flujo de Datos (`index.html`)

```mermaid
graph TD
    App[App Container] --> BrandHeader[Header: HelmetLogo & LIST MAKER]
    App --> ControlBar[Control Bar: Faction, Platoon Tabs, Live Totals]
    App --> PlatoonGrid[5-Column EasyArmy Slot Grid]
    PlatoonGrid --> Slot[Slot Component: Header, TacticalIcon, Body, [+] / Dropdown]
    Slot --> UnitSelector[Unit Search Dropdown]
    Slot --> UnitTacticalIcon[UnitTacticalIcon: NATO-style symbols]
    App --> UnitEditModal[UnitEditModal: Fullscreen Config & Points Engine]
    App --> ExportModal[ExportModal: Download PDF & Live Preview]
    ExportModal --> ArmyRosterPrintView[ArmyRosterPrintView: A4 Official Layout]
    App --> MyListsModal[MyListsModal: Cloud & Device Roster Library]
    App --> AuthModal[AuthModal: Google Sign-In & Supabase]
```

### Componentes Clave:
1. **`App`**:
   - Administra el estado global: `activeFactionId`, `platoons`, `armyListName`, `armyNotes`, y modal states.
   - Autosave automático en `localStorage` (`boltaction.draft.v1`) en cada cambio.
   - Cálculo memoizado de puntos y dados de orden mediante `useMemo`.
2. **`Slot`**:
   - Renderiza cada casilla del pelotón.
   - Si está vacía (`!isFilled`): se muestra sombreada/atenuada (`opacity-60`, fondo oscuro) manteniendo el espacio físico para preservar la estructura visual.
   - Si está llena (`isFilled`): resalta con contraste total (`border-amber-400`, `shadow-md`, icono táctico dorado).
3. **`UnitTacticalIcon`**:
   - Resuelve el símbolo táctico OTAN en función de la naturaleza de la unidad (HQ, Infantería, Médico, Observador, Francotirador, Mortero, MMG, Artillería, Tanque, Transporte, etc.).
4. **`UnitEditModal`**:
   - Interfaz a dos columnas: opciones, experiencia, soldados adicionales a la izquierda; desglose de costes e ilustración a la derecha.
5. **`ArmyRosterPrintView`**:
   - Vista de impresión A4 con formato de tabla EasyArmy, notas de pelotón, desglose de armas y filtrado inteligente de reglas especiales activas.

---

## 5. Motor de Cálculo de Puntos y Armas

- **`calculateUnitPoints(def, config)`**:
  - Coste base según nivel de experiencia (`Inexperienced`, `Regular`, `Veteran`).
  - Soldados adicionales (`extraMen * costPerMan`).
  - Opciones de tipo `checkbox` (coste fijo).
  - Opciones de tipo `counter` (`count * opt.cost`).
  - Opciones de tipo `per_man` (`totalMenCount * opt.costPerMan`).
- **`buildUnitRosterTable(def, config)`**:
  - Resuelve la dotación exacta de armas del pelotón o escuadra (NCO/líder con subfusil/pistola/rifle, soldados con LMG, Panzerfaust, morteros ligeros, rifles antitanque).
  - En vehículos, extrae el chasis blindado, valor de daño (`Damage Value`), armas axiales, en torreta y afustes pivotantes.

---

## 6. Guía para Añadir Nuevas Facciones (Escalabilidad)

El proyecto es **100% agnóstico a la facción**. Para incorporar una facción (por ejemplo: `germany`, `usa`, `great_britain` o `japan`):

### Paso 1: Crear el archivo de datos de la facción
Crea `factions/<faction_id>_app_data.js`. La estructura básica debe registrarse en el objeto global `window.EASYARMY_FACTIONS`:

```javascript
window.EASYARMY_FACTIONS = window.EASYARMY_FACTIONS || {};

window.EASYARMY_FACTIONS['germany'] = {
  id: 'germany',
  faction: 'Germany',
  book: 'Armies of Germany (v3)',
  platoons: [
    {
      id: 'infantry',
      title: 'GRENADIER PLATOON',
      name: 'Grenadier Platoon',
      officialTitle: '** v3 Armies of Germany - Grenadier (All)',
      columns: [
        {
          id: 'col_1',
          slots: [
            { id: 'cmd_1', label: 'Platoon Commander', slotKey: 'Platoon Commander', mandatory: true },
            { id: 'inf_1', label: 'Infantry', slotKey: 'Infantry', mandatory: true },
            { id: 'inf_2', label: 'Infantry', slotKey: 'Infantry', mandatory: true },
            { id: 'inf_3', label: 'Infantry', slotKey: 'Infantry', mandatory: false },
            { id: 'inf_4', label: 'Infantry', slotKey: 'Infantry', mandatory: false }
          ]
        },
        // Columnas col_2, col_3, col_4, col_5 (Armas de apoyo, artillería, vehículos)
      ]
    }
  ],
  units: {
    "Heer Veteran Grenadier Squad": {
      name: "Heer Veteran Grenadier Squad",
      cardTitle: "Heer Veteran Grenadier Squad",
      composition: "1 NCO and 4 Men",
      defaultExp: "veteran",
      maxExtraMen: 5,
      costs: {
        veteran: { points: 65, extraCost: 13 }
      },
      weapons: "Rifles",
      specialRulesText: "Hitler's Buzzsaw, Tank Hunters",
      optionsList: [
        { id: "smg_nco", type: "checkbox", label: "NCO may have an SMG", cost: 5 },
        { id: "lmg", type: "counter", label: "Up to 2 men may have an LMG", cost: 20, max: 2 },
        { id: "panzerfaust", type: "counter", label: "Up to 4 men may have a Panzerfaust", cost: 10, max: 4 }
      ],
      weaponsTable: [
        { name: "Rifle", range: '24"', shots: "1", pen: "n/a", special: "" },
        { name: "Submachine gun", range: '12"', shots: "2", pen: "n/a", special: "Assault" },
        { name: "Light machine gun", range: '36"', shots: "4", pen: "n/a", special: "Team" }
      ],
      unitRules: [
        { name: "Hitler's Buzzsaw", text: "MGs fire an extra shot." },
        { name: "Tank Hunters", text: "Infantry can attack tanks in close combat." }
      ]
    }
  }
};
```

### Paso 2: Vincular el script en `index.html`
En el bloque `<head>` de `index.html`, añade la línea correspondiente:

```html
<!-- Faction Data Modules -->
<script src="./factions/soviet_union_app_data.js"></script>
<script src="./factions/germany_app_data.js"></script>
```

### Paso 3: Cachear en el Service Worker (`sw.js`)
Añade la ruta en la lista `PRECACHE` de `sw.js` para asegurar soporte offline:

```javascript
const PRECACHE = [
  './',
  './index.html',
  './factions/soviet_union_app_data.js',
  './factions/germany_app_data.js',
  // ...
];
```

**Resultado automático**:
- El selector `Faction:` de la barra superior detectará `germany` automáticamente.
- Al seleccionarla, se cargarán sus pelotones, unidades, opciones y reglas sin requerir ningún cambio en el código fuente de los componentes.

---

## 7. Directrices de Rendimiento y Mantenimiento

1. **Evitar Re-renders innecesarios**: Mantener memoizados (`useMemo`) los cálculos pesados (`totalPoints`, `totalOrderDice`, `currentPlatoonPoints`, `armyActiveRules`).
2. **Cero Dependencias de Compilación en Producción**: Mantener la compatibilidad para despliegue directo en GitHub Pages / navegadores modernos.
3. **Preservar la Paleta Militar**: Los códigos cromáticos (`#161B15`, `#20281E`, `#3D4B34`, `#4A5B3E`, `#C4A238`, `#733028`) aseguran coherencia estética y legibilidad en pantallas AMOLED, tablets de juego y en papel A4.
