# IMPROVEMENTS.md
# Sabbia d'Oro — Miglioramenti Proposti

Organizzati per priorità. Gli item con "Prerequisito" richiedono che un altro miglioramento sia completato prima.

---

## PRIORITÀ ALTA

### IMP-01 — Autenticazione reale con Supabase Auth
**Problema risolto**: BUG-01, BUG-02, BUG-13
**Approccio**:
1. Abilitare Email Auth nel dashboard Supabase
2. Creare un utente admin tramite Supabase Dashboard
3. Sostituire `Login.jsx` con `supabase.auth.signInWithPassword()`
4. In `App.jsx`, sostituire `loggedIn` con `supabase.auth.getSession()` e `onAuthStateChange`
5. Aggiornare la RLS su `occupazioni`: `for all to authenticated using (true)`

```js
// App.jsx
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
  return () => subscription.unsubscribe()
}, [])
```
**Impatto**: Sessione persistente al refresh, credenziali fuori dal codice, DB protetto.

---

### IMP-02 — Collegare i file orfani o rimuoverli
**Problema risolto**: BUG-05
**Opzione A (collegare)**: Integrare `Prenotazioni`, `FormPrenotazione`, `FormPagamento`, `SqlModal` nell'app — richiede anche IMP-04 per avere dati finanziari reali.
**Opzione B (rimuovere)**: Eliminare i 4 file se si sceglie di non implementare la gestione finanziaria.

Lasciare il codice morto crea confusione su quali funzionalità siano disponibili.

---

### IMP-03 — Conferma prima di import distruttivo
**Problema risolto**: BUG-03
**Approccio**: Prima di `supabase.delete()` in `ImportExcel.jsx`, mostrare un dialog:
```
"Stai per sovrascrivere N record esistenti per [palme/ombrelloni].
Questa operazione non è reversibile. Continuare?"
[ Annulla ]  [ Conferma Import ]
```
Aggiungere anche un conteggio dei record esistenti prima del delete.

---

### IMP-04 — Persistenza dati finanziari
**Problema risolto**: BUG-04, BUG-06, BUG-07
**Prerequisito**: IMP-01 (RLS autenticata)
**Approccio**: Aggiungere colonne a `occupazioni` o implementare lo schema a 4 tabelle di `SqlModal.jsx`.

**Opzione minima** (aggiungere colonne a `occupazioni`):
```sql
alter table occupazioni
  add column telefono text,
  add column prezzo_totale numeric default 0,
  add column acconto_versato numeric default 0,
  add column metodo_pagamento text,
  add column note text;
```

**Opzione completa**: Usare lo schema di `SqlModal.jsx` con tabelle separate `clienti`, `prenotazioni`, `pagamenti` + aggiornare `useStore` per caricarle tutte.

---

### IMP-05 — Navigazione URL-based con React Router
**Problema risolto**: BUG-13 (parzialmente)
**Approccio**:
```bash
npm install react-router-dom
```
- Ogni page diventa una route (`/dashboard`, `/mappa`, `/prenota`, ecc.)
- Il back/forward del browser funziona correttamente
- Possibile condividere link diretti a pagine specifiche
- `<Navbar>` usa `<Link>` invece di `onNavigate`

---

## PRIORITÀ MEDIA

### IMP-06 — Conferma overbooking in Prenota
**Problema risolto**: BUG-08
**Approccio**: Controllare lo stato della postazione immediatamente prima dell'upsert:
```js
const { data } = await supabase
  .from('occupazioni')
  .select('cliente')
  .eq('tipo', pos.tipo)
  .eq('numero', pos.numero)
  .single()

if (data) {
  showToast(`Postazione già occupata da ${data.cliente}`, 'error')
  return
}
```

---

### IMP-07 — Fix key React nella Mappa
**Problema risolto**: BUG-09
**File**: `src/pages/Mappa.jsx:37`
**Fix minimo**:
```jsx
<Fragment key={p.id}>
  {idx === 8 && <div className={styles.passerella} />}
  <div className={...}>{p.numero}</div>
</Fragment>
```

---

### IMP-08 — Loading state nelle pagine
**Problema risolto**: BUG-15
**Approccio**: Aggiungere in ogni pagina:
```jsx
if (db.loading) return (
  <div className="page-content" style={{ textAlign: 'center', paddingTop: 60 }}>
    <div style={{ fontSize: 32 }}>🌊</div>
    <div style={{ color: 'var(--muted)', fontWeight: 600, marginTop: 12 }}>Caricamento...</div>
  </div>
)
```

---

### IMP-09 — Messaggio di errore configurazione Supabase
**Problema risolto**: BUG-11
**Approccio**: In `App.jsx`, prima del render:
```jsx
if (!isConfigured) return (
  <div style={{ padding: 40, textAlign: 'center' }}>
    <h2>⚙️ Configurazione mancante</h2>
    <p>Imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nel file .env</p>
  </div>
)
```

---

### IMP-10 — Error boundary globale
**Problema risolto**: BUG-12
**Approccio**: Aggiungere in `src/main.jsx`:
```jsx
class ErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return <div>Errore: {this.state.error.message} — <button onClick={() => location.reload()}>Ricarica</button></div>
    return this.props.children
  }
}
```

---

### IMP-11 — Sostituire uid() con crypto.randomUUID()
**Problema risolto**: BUG-17
**File**: `src/lib/data.js:86`
```js
// Prima
export function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

// Dopo
export const uid = () => crypto.randomUUID()
```
Supportato in tutti i browser moderni e in Node.js 15+.

---

### IMP-12 — Liberazione postazione (unbook)
**Funzionalità mancante**: Non esiste modo di liberare una postazione occupata tramite l'UI.
**Approccio**: Nel popup della Mappa, aggiungere un bottone "Libera postazione" per le postazioni occupate:
```js
await supabase.from('occupazioni').delete().eq('tipo', p.tipo).eq('numero', p.numero)
onReload()
```
Con dialog di conferma.

---

## PRIORITÀ BASSA

### IMP-13 — PWA completa
Il progetto ha già le icone PWA (`pwa-192.png`, `pwa-512.png`) ma non ha un `manifest.json` o un service worker. Vite può generarli automaticamente con `vite-plugin-pwa`:
```bash
npm install vite-plugin-pwa
```
Beneficio: installabile su iOS/Android come app nativa, funzionamento offline (solo UI, non dati).

---

### IMP-14 — Esportazione dati
**Funzionalità parzialmente presente**: `Prenotazioni.jsx` (orfano) ha già `exportCSV()`.
Aggiungere export dalla pagina Clienti e dalla Mappa (lista occupazioni correnti).

---

### IMP-15 — Ricerca in Mappa
Aggiungere un campo di ricerca per nome cliente nella Mappa che evidenzia visivamente le postazioni di quel cliente (es. bordo giallo su tutti i cerchi).

---

### IMP-16 — React Context per db
Eliminare il prop drilling passando `db` tramite Context:
```jsx
const DBContext = createContext(null)
export const useDB = () => useContext(DBContext)
```
Wrappare `<App>` in `<DBContext.Provider value={db}>`. Le pagine importano `useDB()` invece di ricevere `db` come prop.

---

### IMP-17 — Allineare gli snippet SQL
**Problema risolto**: BUG-14
Rimuovere il SQL snippet inlininato in `Admin.jsx` e usare il componente `SqlModal.jsx` in modo che ci sia una sola fonte di verità per lo schema SQL. Aggiornare `SqlModal.jsx` per riflettere lo schema minimo effettivamente in uso (solo tabella `occupazioni`).

---

### IMP-18 — Test
Il progetto non ha nessun test. I candidati più utili:
- **Unit**: `parseAttrezzatura()` in `ImportExcel.jsx` (parsing complesso con molti casi edge)
- **Unit**: `generatePostazioni()` in `data.js` (numerazione serpentina)
- **Integration**: flusso Prenota → upsert Supabase → reload
```bash
npm install -D vitest @testing-library/react @testing-library/user-event
```

---

## Riepilogo priorità

| ID | Priorità | Sforzo stimato | Impatto |
|----|----------|----------------|---------|
| IMP-01 | Alta | 4–6h | Sicurezza critica |
| IMP-02 | Alta | 2–4h | Pulizia codebase |
| IMP-03 | Alta | 1h | Prevenzione perdita dati |
| IMP-04 | Alta | 8–16h | Feature completa |
| IMP-05 | Alta | 4h | UX navigazione |
| IMP-06 | Media | 1h | Integrità dati |
| IMP-07 | Media | 30min | Fix warning React |
| IMP-08 | Media | 1h | UX loading |
| IMP-09 | Media | 30min | DX configurazione |
| IMP-10 | Media | 1h | Resilienza |
| IMP-11 | Media | 15min | Robustezza ID |
| IMP-12 | Media | 2h | Feature mancante |
| IMP-13 | Bassa | 2h | PWA |
| IMP-14 | Bassa | 2h | Export dati |
| IMP-15 | Bassa | 2h | UX ricerca |
| IMP-16 | Bassa | 2h | DX codice |
| IMP-17 | Bassa | 30min | Consistenza doc |
| IMP-18 | Bassa | 8h+ | Qualità codice |
