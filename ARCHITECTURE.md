# ARCHITECTURE.md
# Sabbia d'Oro — Architettura Tecnica

## Overview

Applicazione React SPA mobile-first per la gestione stagionale di uno stabilimento balneare (Pescara, Conc. N°10). Gestisce 292 postazioni: 84 palme + 208 ombrelloni (Settore A + B). Backend esclusivamente Supabase (PostgreSQL).

---

## Stack tecnico

- **Frontend**: React 19 + Vite 8 (JSX via Oxc)
- **Database**: Supabase (PostgreSQL con RLS)
- **Styling**: CSS Modules per componenti specifici + global.css per design system
- **Build/Deploy**: Vite build → Vercel

---

## Navigazione (No Router)

Non esiste React Router. La navigazione è gestita da uno `useState` in `App.jsx`:

```
App.jsx
  ├── loggedIn: boolean  →  false → mostra <Login />
  └── page: string       →  'dashboard' | 'mappa' | 'prenota' | 'clienti' | 'disponibilita' | 'admin'
```

`<Navbar>` riceve `onNavigate` e chiama `setPage`. Ogni pagina è montata con rendering condizionale `{page === 'xxx' && <Xxx />}`. Non c'è URL routing — l'URL rimane sempre `/`.

**Implicazione**: nessun browser back/forward, nessun link diretto a una pagina specifica, nessun refresh preserva la pagina corrente.

---

## State Management

Nessuna libreria (no Redux, Zustand, Context). Tutto lo stato vive in `useStore` e viene propagato via props (prop drilling).

### useStore (`src/hooks/useStore.js`)

```
Supabase: occupazioni.*
    ↓ loadAll()
db.postazioni   ← generatePostazioni() + merge occupazioni
db.clienti      ← estratti da occupazioni (campo cliente)
db.prenotazioni ← oggetti virtuali da occupazioni (prezzi sempre a 0)
db.pagamenti    ← array sempre vuoto (non caricato da DB)
db.loading      ← boolean
```

**Funzioni esposte:**
- `reload()` — ri-fetch completo da Supabase
- `salvaCliente(obj)` — aggiorna `db.clienti` solo in memoria (non scrive su DB)
- `registraPagamento(...)` — aggiorna `db.pagamenti` solo in memoria (non chiamata da nessun componente)

**Pattern di aggiornamento dati**: le mutazioni di occupazioni (Prenota, ImportExcel) chiamano direttamente Supabase e poi invocano `onReload()` per ri-sincronizzare tutto lo stato.

### Flusso dati completo

```
Supabase occupazioni
      │
      │ loadAll() all'avvio
      ▼
  useStore (db)
      │
      │ props
      ├─────────────────────────────────────────────────┐
      ▼                                                 ▼
  Dashboard          Mappa          Prenota        Clienti
  (read-only)    (read + modal)  (write → reload)  (read-only)
```

---

## Generazione Postazioni (`src/lib/data.js`)

Tutte le 292 postazioni vengono generate client-side ad ogni mount di `useStore`. Non esiste una tabella `postazioni` su Supabase. La struttura è fissa e hardcoded.

### Palme (84 posti)
- 6 file × 14 colonne
- Numerazione sequenziale: fila 1 col 1 = n.1, fila 1 col 14 = n.14, fila 2 col 1 = n.15...
- Prezzi stagionali per fila: [2100, 1900, 1800, 1700, 1600, 1600]

### Ombrelloni (208 posti)
- 13 file × 16 colonne
- Numerazione a serpentina partendo dalla fila 13 verso la fila 1
- Le file pari (in ordine di step: 0,2,4...) vanno da col 1 a 16; le dispari da col 16 a 1
- Settore A = file 1–6 (96 posti), Settore B = file 7–13 (112 posti)
- Prezzi per settore: A fila 1 → €750/€650, A resto → €700/€600, B → €600/€500

L'ID di ogni postazione è `palma_N` o `ombr_N` dove N è il numero progressivo.

---

## Sistema di Mappa (`src/pages/Mappa.jsx`)

La mappa è una griglia CSS pura — nessun SVG, nessun canvas.

```
mappaWrap (overflow-x: auto, touch scroll)
  sezione [Palme]
    row F1: [rowLabel] [rowItems: 14× .postazione.palma]
    row F2: ...
    ...
  sezione [Settore A]
    row F1: [rowLabel] [rowItems: 8× ombr + passerella + 8× ombr]
    ...
  sezione [Settore B]
    row F7: ...
```

Ogni postazione è un `<div>` circolare con:
- Classe `.libero` (verde) o `.occupato` (rosso) per lo stato
- Classe `.hidden` (opacity 0.12) quando non corrisponde al filtro attivo
- Dimensioni diverse per tipo: palma 36px, ombrA 28px, ombrB 22px
- `onClick` apre un `<Modal>` con dettagli e bottone "Prenota"

La `passerella` (striscia visiva per il camminamento) viene inserita dopo l'indice 8 in ogni riga ombrelloni.

**Filtri disponibili**: tutti / palme / ombrelloni / liberi / occupati

---

## Sistema di Prenotazione

### Prenota.jsx (unico form attivo)

```
Form state locale
  ├── postazione_id  →  dropdown filtrato solo su libere
  ├── cliente_nome   →  input con autocomplete su db.clienti
  ├── dotazione      →  toggle visuale (4 opzioni)
  └── lettini/sdraio/regista → contatori con +/−

Salva:
  supabase.from('occupazioni').upsert(
    { tipo, numero, cliente, lettini, sdraio, regista },
    { onConflict: 'tipo,numero' }
  )
  → onReload()
```

Il nome cliente viene salvato come `UPPERCASE` in `occupazioni.cliente`. Il dropdown dell'autocomplete cerca tra `db.clienti` (derivati da occupazioni al caricamento). Clienti nuovi scritti direttamente nel campo di testo diventano automaticamente visibili al reload successivo.

### Dotazioni disponibili
| Codice | Lettini | Sdraio | Regista |
|--------|---------|--------|---------|
| `2lettini` | 2 | 0 | 0 |
| `lettino_sdraio` | 1 | 1 | 0 |
| `lettino_regista` | 1 | 0 | 1 |
| `3lettini_regista` | 3 | 0 | 1 |

---

## Sistema di Import Excel (`src/components/ImportExcel.jsx`)

```
Input file (.xlsx/.xls/.csv)
    ↓ XLSX.read()
    ↓ XLSX.utils.sheet_to_json()
    ↓ Rileva tipo da header: 'Numero Palma' o 'Numero Ombrellone'
    ↓ parseAttrezzatura() → regex /(\d*)([LSR])/g
    ↓ supabase.delete().eq('tipo', tipo)   ← cancella TUTTI i record del tipo
    ↓ supabase.insert() in batch da 50
    ↓ onReload()
```

**Formato attrezzatura supportato**: codici tipo `2L`, `LR`, `LS`, `2LR`, `LRS`, `SR`, `R2L` — qualsiasi combinazione di quantità + L/S/R.

**Colonne richieste nel file Excel**:
- Palme: `Numero Palma`, `Cliente`, `Attrezzatura`
- Ombrelloni: `Numero Ombrellone`, `Cliente`, `Attrezzatura`

Righe senza numero o senza cliente vengono ignorate silenziosamente.

---

## Autenticazione

Login completamente hardcoded in `Login.jsx`:

```js
if (email === 'admin@sabbiadoro.it' && pwd === 'demo1234') {
  onLogin()  // setLoggedIn(true) in App.jsx
}
```

Non c'è sessione, JWT, cookie, o localStorage. Il refresh della pagina ricomincia dal login.

La policy RLS su Supabase è `for all using (true)` — qualsiasi client con la anon key può leggere e scrivere, autenticato o meno.

---

## Navigazione Mobile

Due livelli sovrapposti:

### Bottom Tab Bar (`.mobileNav`)
5 tab fisse: Home, Dispon., Prenota, Clienti, Gestione
La **Mappa è esclusa** dai tab — ha un bottone dedicato nella navbar header.

### Bottone Mappa nel header
Solo su mobile (`display: none` su desktop), accanto al logo, naviga a `page === 'mappa'`.

### Desktop
Sticky navbar in alto con tutti i link inclusa Mappa. `.links` contiene 6 bottoni (PAGES + mappa).

### Padding bottom
`.bodyPad` (68px) aggiunto dopo il bottom tab bar per evitare che il contenuto venga coperto. `.page-content` ha `padding-bottom: 110px !important` per sicurezza.

**Safe area**: il mobileNav usa `padding-bottom: env(safe-area-inset-bottom)` per iPhone con notch.

---

## Design System (`src/styles/global.css`)

### Token CSS
```css
--navy: #1F4E79    (colore primario)
--yellow: #EAB308  (accent / CTA)
--red: #D9533F     (occupato / errore)
--sky: #7DB8E6     (secondario)
--green: #22C55E   (libero / successo)
--muted: #64748B   (testo secondario)
--font-display: 'Manrope'
--font-body: 'Inter'
```

### Classi utility principali
- `.btn`, `.btn-primary`, `.btn-yellow`, `.btn-outline`, `.btn-sm`, `.btn-lg`
- `.card`, `.stat-card`, `.disp-card`
- `.badge`, `.badge-green`, `.badge-orange`, `.badge-red`, `.badge-blue`
- `.form-group`, `.form-row`, `.form-row.triple`
- `.tbl-wrap`, `.modal`, `.modal-sm`, `.modal-lg`
- `.mobile-only`, `.desktop-only` (togglati via media query a 768px)
- `.page-content`, `.page-title`

### Breakpoints
- `≤768px`: layout mobile (bottom tab, no desktop nav, single-column forms)
- `≤640px`: griglia stat a 1 colonna, riduzione dimensioni tipografiche

---

## API Interactions (Supabase)

Tutte le chiamate usano `@supabase/supabase-js` in modo diretto, senza wrapper astratti.

| Operazione | Dove | Supabase call |
|-----------|------|---------------|
| Carica tutto | `useStore.loadAll()` | `.from('occupazioni').select('*')` |
| Nuova/modifica prenotazione | `Prenota.jsx` | `.from('occupazioni').upsert({...}, { onConflict: 'tipo,numero' })` |
| Import bulk palme | `ImportExcel.jsx` | `.delete().eq('tipo', 'palma')` + `.insert(batch)` |
| Import bulk ombrelloni | `ImportExcel.jsx` | `.delete().eq('tipo', 'ombrellone')` + `.insert(batch)` |

Non ci sono chiamate real-time (nessun `.subscribe()`). L'aggiornamento avviene solo su `reload()` esplicito post-mutazione.

---

## Deployment

- Platform: Vercel
- `vercel.json`: configurazione minima (campo vuoto o redirect non specificato)
- `.vercel/project.json`: link al progetto Vercel (non committare token)
- Build command: `vite build` → output in `dist/`
- Le variabili d'ambiente vanno impostate nel dashboard Vercel (non nel file `.env` committato)
