# CLEANUP_PLAN.md
# Piano di Pulizia — Sabbia d'Oro

Questo documento descrive ogni singola modifica da fare nella **Fase 1 (Stabilizzazione)** prima di aggiungere funzionalità. L'ordine è importante: ogni step è indipendente e reversibile. Nessuno di questi interventi modifica il comportamento visibile dall'utente.

---

## Step 1 — Eliminazione file orfani

Questi 4 file non sono importati da nessun componente attivo. La loro rimozione riduce la superficie di codice del ~35% senza alcun effetto sull'app.

```bash
rm src/pages/Prenotazioni.jsx
rm src/components/FormPrenotazione.jsx
rm src/components/FormPagamento.jsx
rm src/components/SqlModal.jsx
```

**Verifica**: `grep -r "Prenotazioni\|FormPrenotazione\|FormPagamento\|SqlModal" src/` deve tornare vuoto.

---

## Step 2 — Pulizia `src/lib/data.js`

Rimuovere le funzioni usate esclusivamente dai file orfani. Dopo lo Step 1, queste diventano dead code confermato.

**Rimuovere**:
- `uid()` — usata solo da `FormPrenotazione` (eliminato) e `salvaCliente` (da eliminare nello Step 3)
- `calcolaStato()` — usata solo da `FormPrenotazione` (eliminato)
- `fmtEurDec()` — usata solo da `FormPrenotazione` e `FormPagamento` (eliminati)
- `getStatoBadgeClass()` — usata solo da `Prenotazioni.jsx` (eliminato)
- `getStatoLabel()` — usata solo da `Prenotazioni.jsx` (eliminato)

**Aggiungere** in coda al file:
```js
export const normalizeCliente = (name) => String(name).trim().toUpperCase()
```

Questa utility consolidata sostituirà le 3 occorrenze inline identiche sparse nel codebase.

**Verifica**: `grep -r "uid\|calcolaStato\|fmtEurDec\|getStatoBadgeClass\|getStatoLabel" src/` deve tornare vuoto.

---

## Step 3 — Pulizia `src/hooks/useStore.js`

Rimuovere tutto ciò che simula persistenza senza averla.

**Rimuovere**:
- `import { generatePostazioni, uid } from '../lib/data'` → togliere `uid` dall'import
- Funzione `salvaCliente` — aggiorna solo stato locale, non scrive su DB, fuorviante
- Funzione `registraPagamento` — mai chiamata, array pagamenti sempre vuoto
- Derivazione `prenotazioni` nel body di `loadAll()` — oggetti con `prezzo_totale: 0` hardcoded
- Campo `pagamenti: []` da `initialDB`
- Campo `prenotazioni: []` da `initialDB`
- `return { db, salvaCliente, registraPagamento, reload }` → `return { db, reload }`

**Risultato dopo la pulizia**:
```js
const initialDB = {
  postazioni: generatePostazioni(),
  clienti: [],
  loading: true,
}

export function useStore() {
  const [db, setDB] = useState(initialDB)
  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data, error } = await supabase.from('occupazioni').select('*')
    if (error) {
      console.error('Supabase error:', error)
      setDB(p => ({ ...p, loading: false }))
      return
    }
    setDB(prev => {
      const postazioni = prev.postazioni.map(p => {
        const occ = data.find(o => Number(o.numero) === Number(p.numero) && o.tipo === p.tipo)
        if (!occ) return { ...p, stato: 'libero', cliente: null, lettini: 0, sdraio: 0, regista: 0 }
        return { ...p, stato: 'occupato', cliente: occ.cliente || null,
          lettini: Number(occ.lettini) || 0, sdraio: Number(occ.sdraio) || 0, regista: Number(occ.regista) || 0 }
      })
      const clientiMap = {}
      data.forEach(occ => {
        if (!occ.cliente) return
        const key = normalizeCliente(occ.cliente)
        if (!clientiMap[key]) {
          clientiMap[key] = { id: `cl_${key}`, nome: occ.cliente.trim(), telefono: '', email: '', postazioni_occ: [] }
        }
        clientiMap[key].postazioni_occ.push({ tipo: occ.tipo, numero: Number(occ.numero),
          lettini: Number(occ.lettini) || 0, sdraio: Number(occ.sdraio) || 0, regista: Number(occ.regista) || 0 })
      })
      return { ...prev, postazioni, clienti: Object.values(clientiMap), loading: false }
    })
  }

  return { db, reload: useCallback(() => loadAll(), []) }
}
```

**Verifica**: `App.jsx` usa solo `db` e `reload` da `useStore` — entrambi presenti. `salvaCliente` non è passato a nessuna pagina attiva (Clienti riceve `onSalvaCliente` da App.jsx — rimuovere quella prop anche da App.jsx e da Clienti.jsx).

---

## Step 4 — Pulizia `src/App.jsx`

**Rimuovere**:
- `import { useStore }` → tenere ma rimuovere `salvaCliente` dal destructuring
- `onSalvaCliente={salvaCliente}` dalla prop di `<Clienti>`
- Import di `Prenotazioni` (se presente — non lo è, ma verificare)

**Prima**:
```jsx
const { db, salvaCliente, reload } = useStore()
// ...
{page === 'clienti' && <Clienti db={db} onSalvaCliente={salvaCliente} showToast={showToast} />}
```

**Dopo**:
```jsx
const { db, reload } = useStore()
// ...
{page === 'clienti' && <Clienti db={db} showToast={showToast} />}
```

---

## Step 5 — Pulizia `src/pages/Clienti.jsx`

**Rimuovere**:
- Prop `onSalvaCliente` dalla signature della funzione — non più passata da App.jsx
- Tutto il codice che chiama `onSalvaCliente` (se presente nel file — il componente mostra solo i clienti, non ha un form di creazione attivo)

**Verificare**: il file usa `onSalvaCliente`? No — Clienti.jsx riceve `onSalvaCliente` come prop ma non ha un bottone o form che la chiama direttamente nel codice attuale. La prop è dichiarata ma inutilizzata. Rimuoverla dalla signature.

**Sostituire** le occorrenze inline di `.trim().toUpperCase()` con `normalizeCliente()`:
```jsx
// Prima (3 occorrenze)
p.cliente.trim().toUpperCase() === c.nome.trim().toUpperCase()
p.cliente.trim().toUpperCase() === selected.nome.trim().toUpperCase()

// Dopo
import { normalizeCliente } from '../lib/data'
normalizeCliente(p.cliente) === normalizeCliente(c.nome)
```

---

## Step 6 — Fix React key warning in `src/pages/Mappa.jsx`

**Il problema** (riga 37):
```jsx
{items.map((p, idx) => (
  <>                                           // ← nessun key sul fragment
    {idx === 8 && <div key={`pass-${fila}`} className={styles.passerella} />}
    <div key={p.id} className={...}>{p.numero}</div>
  </>
))}
```

**Fix**:
```jsx
import { Fragment } from 'react'
// ...
{items.map((p, idx) => (
  <Fragment key={p.id}>
    {idx === 8 && <div className={styles.passerella} />}
    <div className={...} onClick={...}>{p.numero}</div>
  </Fragment>
))}
```

---

## Step 7 — Fix navigazione Mappa in `src/components/Navbar.jsx`

Il problema: `mappa` non è in `PAGES` ed è gestita come eccezione con un bottone separato su mobile.

**Fix**: aggiungere Mappa ai `PAGES` e rendere il bottone speciale mobile una conseguenza dello stile CSS invece che di una logica JS separata.

**Prima**:
```js
const PAGES = [
  { id: 'dashboard', label: 'Home', icon: '🏠' },
  { id: 'disponibilita', label: 'Dispon.', icon: '🔍' },
  { id: 'prenota', label: 'Prenota', icon: '➕' },
  { id: 'clienti', label: 'Clienti', icon: '👤' },
  { id: 'admin', label: 'Gestione', icon: '⚙️' },
]
```

**Dopo**: includere mappa, escludere `admin` dal tab bar mobile (spostarlo nel header):

```js
const PAGES = [
  { id: 'dashboard',     label: 'Home',     icon: '🏠', mobileTab: true  },
  { id: 'disponibilita', label: 'Dispon.',  icon: '🔍', mobileTab: true  },
  { id: 'prenota',       label: 'Prenota',  icon: '➕', mobileTab: true  },
  { id: 'mappa',         label: 'Mappa',    icon: '🗺',  mobileTab: true  },
  { id: 'clienti',       label: 'Clienti',  icon: '👤', mobileTab: true  },
  { id: 'admin',         label: 'Gestione', icon: '⚙️', mobileTab: false },
]
```

- Il bottom tab bar mostra solo le voci con `mobileTab: true`
- La navbar desktop mostra tutte le 6 voci
- `admin` è accessibile da desktop o da un link nel dashboard mobile
- Rimuovere completamente `mappaBtn` e la sua logica da JSX e CSS

---

## Step 8 — Fix duplicazione SQL in `src/pages/Admin.jsx`

Attualmente lo stesso SQL appare due volte nel file (nel `<pre>` e nella funzione clipboard):

```jsx
// Estrarre in cima al file
const SETUP_SQL = `create table if not exists occupazioni (
  id bigserial primary key,
  tipo text not null,
  numero integer not null,
  ...
);`

// Usare la costante ovunque
<pre>{SETUP_SQL}</pre>
// ...
navigator.clipboard.writeText(SETUP_SQL)
```

---

## Step 9 — Aggiungere guard configurazione Supabase

In `src/App.jsx`, prima del render principale, aggiungere un check visibile:

```jsx
import { isConfigured } from './lib/supabase'

// All'inizio di App()
if (!isConfigured) {
  return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--font-body)' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
      <h2 style={{ color: 'var(--navy)' }}>Configurazione mancante</h2>
      <p style={{ color: 'var(--muted)', marginTop: 8 }}>
        Crea un file <code>.env</code> con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
      </p>
    </div>
  )
}
```

---

## Step 10 — Aggiungere loading guard nelle pagine

Aggiungere in cima a `Mappa.jsx`, `Clienti.jsx`, `Disponibilita.jsx`, `Prenota.jsx`:

```jsx
if (db.loading) return (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', flexDirection: 'column', gap: 12, color: 'var(--muted)' }}>
    <div style={{ fontSize: 40 }}>🌊</div>
    <div style={{ fontWeight: 600, fontSize: 15 }}>Caricamento dati...</div>
  </div>
)
```

Dashboard già lo fa correttamente — usare lo stesso pattern.

---

## Step 11 — Aggiungere dialog di conferma a `ImportExcel.jsx`

Prima di `supabase.delete()`, mostrare uno stato intermedio con conferma esplicita:

```jsx
const [pendingData, setPendingData] = useState(null)  // dati pronti ma non ancora salvati

// Dopo il parsing, invece di procedere subito:
setPendingData(formatted)
setStatus('confirm')
setMessage(`${formatted.length} righe pronte. Questo sovrascriverà tutte le occupazioni (${tipo}) esistenti.`)

// Aggiungere pulsanti Conferma / Annulla quando status === 'confirm'
// Solo su "Conferma" eseguire il delete + insert
```

---

## Checklist finale post-cleanup

- [ ] `grep -r "salvaCliente\|registraPagamento\|uid()\|calcolaStato\|fmtEurDec\|getStatoBadgeClass\|getStatoLabel" src/` → nessun risultato
- [ ] `grep -r "FormPrenotazione\|FormPagamento\|SqlModal\|Prenotazioni" src/` → nessun risultato
- [ ] Nessun warning React in console (key mancante)
- [ ] Import Excel mostra dialog di conferma
- [ ] App carica correttamente con Supabase configurato
- [ ] App mostra messaggio utile senza Supabase configurato
- [ ] Mappa accessibile dal tab bar mobile senza bottone speciale
- [ ] `npm run lint` passa senza errori
- [ ] `npm run build` completa senza errori

---

## Metriche attese dopo la pulizia

| Metrica | Prima | Dopo |
|---------|-------|------|
| File sorgente | 22 | 18 |
| Linee totali (src/) | ~2100 | ~1400 |
| Export in data.js | 11 | 6 |
| Export in useStore | 4 | 2 |
| Tabelle Supabase riferite | 1 attiva + 4 aspirazionali | 1 (chiaro) |
| Props `onSalvaCliente` | passata ovunque | rimossa |
| Pattern navigazione Mappa | 2 (speciale + normale) | 1 (normale) |
