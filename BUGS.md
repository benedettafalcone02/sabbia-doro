# BUGS.md
# Sabbia d'Oro — Bug Noti e Rischi Tecnici

---

## CRITICO

### BUG-01 — Autenticazione hardcoded, nessuna sessione
**File**: `src/pages/Login.jsx:11`
**Problema**: Le credenziali sono in chiaro nel codice (`admin@sabbiadoro.it` / `demo1234`). `loggedIn` è un semplice `useState(false)` — al refresh della pagina l'utente viene disconnesso. Non esiste sessione, JWT, cookie, o localStorage.
**Rischio**: Chiunque guardi il codice sorgente (bundle JS incluso) vede le credenziali. Nessuna protezione reale.
**Fix**: Usare Supabase Auth (`supabase.auth.signInWithPassword`) + `supabase.auth.onAuthStateChange` per persistere la sessione.

---

### BUG-02 — RLS Supabase completamente aperta
**File**: `src/pages/Admin.jsx` (SQL snippet mostrato)
**Problema**: La policy RLS attuale è `for all using (true) with check (true)` — chiunque abbia la anon key (esposta pubblicamente nel bundle JS) può leggere, scrivere, cancellare tutti i dati.
**Rischio**: Un attore malintenzionato può svuotare l'intera tabella `occupazioni` con una semplice chiamata REST.
**Fix**: Sostituire con policy autenticata: `for all to authenticated using (true)`. Richiede l'implementazione di BUG-01.

---

### BUG-03 — Import Excel cancella tutti i dati senza conferma
**File**: `src/components/ImportExcel.jsx:77`
```js
const { error: delError } = await supabase.from('occupazioni').delete().eq('tipo', tipo)
```
**Problema**: Prima di ogni import, vengono cancellati TUTTI i record del tipo (palme o ombrelloni) senza nessun dialog di conferma. Un file Excel sbagliato (colonne errate, dati vuoti) può risultare in una delezione seguita da un insert di 0 righe — tabella svuotata.
**Rischio**: Perdita irrecuperabile di dati stagionali.
**Fix**: Aggiungere un dialog di conferma esplicita prima del delete. Opzionalmente, implementare un soft-delete o backup prima dell'import.

---

## ALTO

### BUG-04 — Dati finanziari sempre a zero
**File**: `src/hooks/useStore.js:70-81`
**Problema**: Le `prenotazioni` costruite in `loadAll()` hanno sempre `prezzo_totale: 0`, `acconto_versato: 0`, `saldo_residuo: 0` perché la tabella `occupazioni` non ha colonne finanziarie. Questi valori non vengono mai aggiornati.
**Impatto**: La pagina `Prenotazioni.jsx` (quando verrà collegata) mostrerà sempre €0 per tutti. `FormPagamento` riceverà sempre `saldo_residuo: 0`.
**Fix**: Aggiungere colonne finanziarie alla tabella `occupazioni`, oppure implementare la tabella `prenotazioni` separata (schema già definito in `SqlModal.jsx`).

---

### BUG-05 — Quattro file orfani non raggiungibili
**File**: 
- `src/pages/Prenotazioni.jsx`
- `src/components/FormPrenotazione.jsx`
- `src/components/FormPagamento.jsx`
- `src/components/SqlModal.jsx`

**Problema**: Nessuno di questi file è importato in `App.jsx` o in qualsiasi componente attivo. Rappresentano funzionalità pianificate (gestione finanziaria completa) mai cablate.
**Impatto**: Codice morto che aumenta la dimensione del bundle e crea confusione su cosa sia effettivamente funzionante. `FormPrenotazione` e `FormPagamento` hanno dipendenze (`calcolaStato`, `fmtEurDec`) che potrebbero divergere dal codice attivo.
**Fix**: Eliminare tutti e quattro i file o integrarli nell'app.

---

### BUG-06 — `salvaCliente` non persiste su Supabase
**File**: `src/hooks/useStore.js:89-96`, `src/pages/Clienti.jsx`
**Problema**: `salvaCliente()` aggiorna solo `db.clienti` in memoria React. Alla prossima `loadAll()` (es. dopo un reload), i clienti aggiunti/modificati spariscono perché non esistono su Supabase — i clienti vengono estratti esclusivamente da `occupazioni.cliente`.
**Impatto**: Modifiche ai dati cliente (telefono, email, note) non vengono salvate. Ogni reload li resetta.
**Fix**: Aggiungere una tabella `clienti` su Supabase e persistere le modifiche.

---

### BUG-07 — `registraPagamento` definita ma mai chiamata
**File**: `src/hooks/useStore.js:98-104`
**Problema**: La funzione aggiorna `db.pagamenti` in memoria ma non viene mai chiamata da nessun componente attivo. `db.pagamenti` è sempre un array vuoto.
**Impatto**: `FormPagamento` (se collegato) mostrerebbe uno storico pagamenti sempre vuoto.
**Fix**: Collegare `FormPagamento` e far scrivere i pagamenti su Supabase.

---

### BUG-08 — Overbooking silenzioso tramite race condition
**File**: `src/pages/Prenota.jsx:93`
**Problema**: Il dropdown in `Prenota` mostra solo le postazioni libere al momento del caricamento. Se due utenti aprono `Prenota` contemporaneamente, vedono le stesse postazioni libere e possono prenotare la stessa postazione. L'`upsert` di Supabase sovrascrive silenziosamente il primo con il secondo.
**Impatto**: Un cliente perde la propria prenotazione senza essere avvisato.
**Fix**: Verificare lo stato della postazione prima dell'upsert o usare una transaction Supabase con lock.

---

## MEDIO

### BUG-09 — Key React mancante nella Mappa
**File**: `src/pages/Mappa.jsx:37-47`
**Problema**: Il fragment `<>` che wrappa `.passerella` + `.postazione` dentro `.map()` non ha un attributo `key`. React mostra un warning in console e potrebbe causare rendering errato durante aggiornamenti di stato.
```jsx
{idx === 8 && <div key={`pass-${fila}`} className={styles.passerella} />}
<div key={p.id} className={...}>
```
Il `key` è sul figlio, non sul fragment esterno.
**Fix**: Usare `<Fragment key={p.id}>` invece di `<>` oppure ristrutturare il rendering.

---

### BUG-10 — `FormPrenotazione` permette prenotazione su postazioni occupate
**File**: `src/components/FormPrenotazione.jsx:88-95`
**Problema**: Il dropdown postazioni include TUTTE le 292 postazioni (occupate in grigio), non solo le libere. Non c'è validazione che impedisca di salvare su una postazione occupata.
**Nota**: Il file è attualmente orfano (BUG-05), ma il bug si manifesta se viene collegato.
**Fix**: Filtrare il dropdown o aggiungere validazione pre-salvataggio.

---

### BUG-11 — Nessun feedback se Supabase non è configurato
**File**: `src/lib/supabase.js`, `src/hooks/useStore.js:19-23`
**Problema**: Se le variabili d'ambiente non sono impostate, `supabase.from('occupazioni').select('*')` fallisce silenziosamente: `loading` viene messo a `false` e l'app mostra dati vuoti senza spiegare il problema all'utente.
**Fix**: Controllare `isConfigured` all'avvio e mostrare un banner di errore configurazione.

---

### BUG-12 — Nessun error boundary React
**File**: `src/main.jsx`, `src/App.jsx`
**Problema**: Qualsiasi errore non gestito in un componente figlio causerà un crash dell'intera applicazione con schermo bianco.
**Fix**: Aggiungere un `<ErrorBoundary>` al top-level in `main.jsx`.

---

### BUG-13 — Refresh pagina = logout + ritorno a dashboard
**File**: `src/App.jsx:17-18`
**Problema**: `loggedIn` e `page` sono `useState` senza persistenza. Ogni refresh reimposta tutto a `loggedIn=false, page='dashboard'`. L'utente deve ri-effettuare il login e ritornare manualmente alla pagina dove stava lavorando.
**Fix**: Risolvibile come side effect di BUG-01 (Supabase session) + aggiungere la pagina all'URL via React Router.

---

## BASSO

### BUG-14 — Schema SqlModal diverge dallo schema Admin
**File**: `src/components/SqlModal.jsx`, `src/pages/Admin.jsx`
**Problema**: Admin.jsx mostra SQL per creare solo la tabella `occupazioni` con RLS pubblica. SqlModal.jsx mostra uno schema a 4 tabelle con RLS autenticata. L'utente che cerca di capire come configurare Supabase riceve istruzioni contraddittorie.
**Fix**: Allineare i due snippet o rimuovere quello non attuale.

---

### BUG-15 — Nessun loading state nelle pagine singole
**File**: Tutte le pagine tranne Dashboard
**Problema**: Solo `Dashboard.jsx` gestisce `db.loading`. Le altre pagine (Mappa, Clienti, Prenota, Disponibilita) rendono immediatamente con dati vuoti durante il fetch iniziale, potendo mostrare brevemente "0 clienti" o mappe vuote.
**Fix**: Aggiungere un guard `if (db.loading) return <Spinner />` nelle pagine che hanno dati critici.

---

### BUG-16 — Dati cliente non collegati tra Prenota e Clienti
**File**: `src/pages/Prenota.jsx`, `src/hooks/useStore.js`
**Problema**: Il form `Prenota` salva solo il nome del cliente (stringa uppercase) in `occupazioni`. Il telefono, email e altre info inseribili in `Clienti` non vengono mai collegate alla prenotazione né persistite.
**Impatto**: Il campo telefono mostrato in `Clienti.jsx` viene da `occupazioni.telefono` (mai valorizzato tramite Prenota) — risulta sempre vuoto per le prenotazioni manuali.

---

### BUG-17 — `uid()` non è crittograficamente sicuro
**File**: `src/lib/data.js:86`
```js
export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
```
**Problema**: Usato per ID clienti e prenotazioni locali. `Math.random()` non è CSPRNG. In un sistema con più utenti potrebbe generare collisioni.
**Fix**: Usare `crypto.randomUUID()` (disponibile in tutti i browser moderni).
