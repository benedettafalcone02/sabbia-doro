# PROJECT_MAP.md
# Sabbia d'Oro — Mappa Completa del Progetto

## Struttura cartelle

```
sabbia-doro/
├── public/
│   ├── logosabbiadoro.png      # Logo principale (header + login)
│   ├── logosabbia.png          # Logo alternativo
│   ├── pwa-192.png             # Icona PWA 192×192
│   ├── pwa-512.png             # Icona PWA 512×512
│   ├── favicon.svg             # Favicon
│   └── icons.svg               # Sprite icone
│
├── src/
│   ├── main.jsx                # Entry point React (monta <App />)
│   ├── App.jsx                 # Root: gestisce loggedIn + page state, renderizza pagine
│   │
│   ├── styles/
│   │   └── global.css          # Tutti i token CSS, classi globali (btn, card, badge, form, table, modal, toast)
│   │
│   ├── lib/
│   │   ├── supabase.js         # Client Supabase singleton + flag isConfigured
│   │   └── data.js             # generatePostazioni(), formatter helpers, uid()
│   │
│   ├── hooks/
│   │   ├── useStore.js         # Unico store globale — fetch Supabase + stato in-memory
│   │   └── useToast.js         # Toast temporaneo (3s auto-dismiss)
│   │
│   ├── pages/
│   │   ├── Login.jsx           # Schermata login (auth hardcoded, nessuna sessione)
│   │   ├── Login.module.css
│   │   ├── Dashboard.jsx       # Statistiche occupazione + azioni rapide
│   │   ├── Mappa.jsx           # Vista grafica della spiaggia (circle grid)
│   │   ├── Mappa.module.css
│   │   ├── Prenota.jsx         # Form nuova prenotazione → scrive su Supabase
│   │   ├── Clienti.jsx         # Anagrafica clienti derivata da occupazioni
│   │   ├── Disponibilita.jsx   # Griglia postazioni libere con filtri
│   │   ├── Admin.jsx           # Import Excel + SQL setup snippet
│   │   └── Prenotazioni.jsx    # ⚠️ PAGINA ORFANA — non montata in App.jsx
│   │
│   └── components/
│       ├── Navbar.jsx          # Navbar sticky desktop + bottom tab bar mobile
│       ├── Navbar.module.css
│       ├── Modal.jsx           # Modale generico (Esc + click-fuori per chiudere)
│       ├── Toast.jsx           # Componente notifica temporanea
│       ├── ImportExcel.jsx     # Upload + parsing Excel → upsert Supabase
│       ├── FormPrenotazione.jsx # ⚠️ COMPONENTE ORFANO — non usato in App.jsx
│       ├── FormPagamento.jsx   # ⚠️ COMPONENTE ORFANO — non usato in App.jsx
│       └── SqlModal.jsx        # ⚠️ COMPONENTE ORFANO — non usato in App.jsx
│
├── index.html
├── vite.config.js
├── eslint.config.js
├── package.json
├── vercel.json                 # Deploy Vercel (config minima)
├── .env                        # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
├── .env.example
└── CLAUDE.md
```

---

## Dipendenze chiave

| Pacchetto | Versione | Ruolo |
|-----------|----------|-------|
| react | ^19.2.6 | UI |
| @supabase/supabase-js | ^2.106.1 | Database client |
| xlsx | ^0.18.5 | Parsing file Excel/CSV |
| vite | ^8.0.12 | Build tool + dev server |
| @vitejs/plugin-react | ^6.0.1 | JSX transform (Oxc) |

Nessuna libreria di routing, state management, o UI component library.

---

## Pagine attive (montate in App.jsx)

| page string | Componente | Descrizione |
|-------------|-----------|-------------|
| `dashboard` | `Dashboard` | Statistiche + azioni rapide |
| `mappa` | `Mappa` | Mappa visuale postazioni |
| `prenota` | `Prenota` | Form prenotazione → Supabase |
| `clienti` | `Clienti` | Lista clienti (derivata) |
| `disponibilita` | `Disponibilita` | Postazioni libere con filtri |
| `admin` | `Admin` | Import Excel + SQL snippet |

---

## Componenti attivi (effettivamente montati)

| Componente | Dove usato | Ruolo |
|-----------|-----------|-------|
| `Navbar` | App.jsx | Navigazione desktop + mobile |
| `Modal` | Mappa, Clienti | Dialog generico |
| `Toast` | App.jsx | Notifiche temporanee |
| `ImportExcel` | Admin | Upload e parsing Excel |

---

## File orfani (codice esistente ma non raggiungibile)

| File | Stato |
|------|-------|
| `src/pages/Prenotazioni.jsx` | Non montato in App.jsx — nessuna route verso di esso |
| `src/components/FormPrenotazione.jsx` | Non importato da nessun componente attivo |
| `src/components/FormPagamento.jsx` | Non importato da nessun componente attivo |
| `src/components/SqlModal.jsx` | Non importato da nessun componente attivo |

Questi file rappresentano una versione più evoluta dell'app (con gestione finanziaria completa) che non è stata cablata.

---

## Supabase — Tabella effettivamente in uso

### `occupazioni` (unica tabella attiva)
| Colonna | Tipo | Note |
|---------|------|------|
| id | bigserial PK | Auto-generato |
| tipo | text | `'palma'` o `'ombrellone'` |
| numero | integer | Numero postazione |
| cliente | text | Nome in UPPERCASE |
| stato | text | Default `'occupato'` |
| lettini | integer | Default 0 |
| sdraio | integer | Default 0 |
| regista | integer | Default 0 |
| created_at | timestamptz | Auto |
| UNIQUE | (tipo, numero) | Vincolo unico |

RLS: policy pubblica (`for all using (true)`) — **nessuna vera autenticazione a livello DB**.

---

## Schema aspirazionale (in SqlModal.jsx — mai implementato)

SqlModal.jsx contiene uno schema a 4 tabelle con RLS autenticata che non viene mai usato:
- `postazioni` — definizioni spots (rimpiazzato da generazione client-side)
- `clienti` — anagrafica persistita (rimpiazzata da derivazione client-side)
- `prenotazioni` — prenotazioni complete con prezzi (rimpiazzate da oggetti virtuali)
- `pagamenti` — storico pagamenti (non persistito, array in-memory sempre vuoto)

---

## Variabili d'ambiente

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Entrambe obbligatorie. Senza di esse `isConfigured = false` ma l'app non mostra un errore esplicito — si blocca silenziosamente al caricamento.
