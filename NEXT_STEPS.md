# NEXT_STEPS.md
# Fasi di Implementazione — Option C Hybrid

Ogni fase è autonoma e deployabile. Non iniziare una fase se quella precedente non è completa e stabile in produzione.

---

## Fase 0 — Prerequisito: eseguire `CLEANUP_PLAN.md`

**Durata stimata**: 2–3 ore  
**Rischio**: zero (solo eliminazioni e semplificazioni)  
**Deploy**: sì, immediatamente dopo

Prima di qualsiasi altra cosa, completare tutti i 11 step del `CLEANUP_PLAN.md`. L'architettura ibrida si costruisce sopra una base pulita, non sopra i detriti attuali.

**Segnale di completamento**: la checklist finale del CLEANUP_PLAN è tutta spuntata.

---

## Fase 1 — Stabilizzazione (senza nuove funzionalità)

**Durata stimata**: 3–4 ore  
**Obiettivo**: app stabile, nessun bug bloccante, nessun warning in console  
**Deploy**: sì

### 1.1 — Fix key React in Mappa (15 min)
Seguire Step 6 di CLEANUP_PLAN. Verifica: nessun warning "Each child in a list should have a unique key" in console.

### 1.2 — Guard configurazione Supabase (30 min)
Seguire Step 9 di CLEANUP_PLAN. Verifica: aprire app senza `.env` mostra il messaggio di configurazione invece di uno schermo bianco.

### 1.3 — Loading state in tutte le pagine (30 min)
Seguire Step 10 di CLEANUP_PLAN. Verifica: navigare su Mappa, Clienti, Prenota, Disponibilita mentre il fetch è in corso mostra lo spinner invece di dati vuoti.

### 1.4 — Confirm dialog in ImportExcel (1 ora)
Seguire Step 11 di CLEANUP_PLAN. Verifica: caricare un file Excel mostra il preview + "Conferma sovrascrittura" prima di qualsiasi modifica al DB.

### 1.5 — Liberazione postazione dalla Mappa (1 ora)
Aggiungere bottone "🔓 Libera postazione" nel popup delle postazioni occupate in `Mappa.jsx`:

```jsx
async function liberaPostazione(postazione) {
  if (!confirm(`Liberare ${postazione.tipo} ${postazione.numero} (${postazione.cliente})?`)) return
  const { error } = await supabase
    .from('occupazioni')
    .delete()
    .eq('tipo', postazione.tipo)
    .eq('numero', postazione.numero)
  if (error) { showToast('Errore nella liberazione', 'error'); return }
  showToast('Postazione liberata ✓')
  setSelected(null)
  onReload()
}
```

Questo è la funzionalità mancante più richiesta in qualsiasi sistema di gestione posti.

---

## Fase 2 — Schema ibrido (DB + useStore)

**Durata stimata**: 4–5 ore  
**Prerequisito**: Fase 1 completata e in produzione  
**Deploy**: sì, ma con attenzione (modifica DB)

### 2.1 — Creare tabella `dettagli` su Supabase (15 min)
Eseguire lo script SQL da `HYBRID_ARCHITECTURE.md` nel Supabase SQL Editor. Verificare che `select count(*) from dettagli` torni 0 senza errori.

### 2.2 — Aggiornare `useStore.loadAll()` (1 ora)
Implementare il fetch parallelo con `Promise.all` e il merge come descritto in `HYBRID_ARCHITECTURE.md`. La modifica deve essere backward-compatible: se `dettagli` è vuota, il comportamento è identico a prima.

Verifica: l'app funziona esattamente come prima. Nessuna regressione visibile.

### 2.3 — Aggiungere `SaldoBadge.jsx` (30 min)
Creare il componente come da `HYBRID_ARCHITECTURE.md`. Non è ancora usato — preparare il terreno.

```jsx
// src/components/SaldoBadge.jsx
export default function SaldoBadge({ prezzo, acconto }) {
  if (!prezzo || prezzo === 0) return null
  const saldo = (prezzo || 0) - (acconto || 0)
  if (saldo <= 0) return <span className="badge badge-green">✓ Pagato</span>
  if (acconto > 0) return <span className="badge badge-orange">Acconto versato</span>
  return <span className="badge badge-red">Da pagare</span>
}
```

### 2.4 — Creare `DettagliPanel.jsx` (2 ore)
Componente form per salvare i dati della tabella `dettagli`. Deve essere usabile sia inline (nella pagina) che dentro un Modal esistente.

```
Props:
  tipo: string
  numero: integer
  initialData: object | null   ← i dati attuali da db.postazioni (può essere null)
  onSaved: () => void
  showToast: fn

State interno:
  form: { telefono, email, note_cliente, prezzo_totale, acconto_versato, data_acconto, metodo_pagamento }
  saving: boolean

Submit:
  supabase.from('dettagli').upsert(
    { tipo, numero, ...form },
    { onConflict: 'tipo,numero' }
  )
  onSaved()   ← chiama reload in App.jsx
```

Il saldo deve essere calcolato in tempo reale: `prezzo_totale - acconto_versato` mostrato come `SaldoBadge` mentre si digita.

---

## Fase 3 — Integrazione UI (postazioni con dati finanziari)

**Durata stimata**: 4–5 ore  
**Prerequisito**: Fase 2 completata  
**Deploy**: sì

### 3.1 — Mappa: popup postazione occupata arricchito (2 ore)
Aggiungere al popup delle postazioni occupate in `Mappa.jsx`:

```
Sezione "Dettagli"
  ├── Telefono: [numero cliccabile] o [+ Aggiungi]
  ├── SaldoBadge (se prezzo_totale > 0)
  └── Bottone "✏ Modifica dettagli" → apre DettagliPanel dentro il Modal esistente
```

Il `DettagliPanel` viene montato dentro il modal già aperto (non un secondo modal). Il modal si allarga a `modal-lg` quando il pannello è aperto.

### 3.2 — Clienti: contatti reali e saldo aggregato (2 ore)
Aggiornare il modal cliente in `Clienti.jsx`:
- Telefono ora ha dati reali (da `dettagli` via `db.clienti`)
- Aggiungere sezione "Situazione finanziaria": somma di `prezzo_totale` e `acconto_versato` su tutte le postazioni del cliente
- Per ogni postazione nella lista, aggiungere `SaldoBadge` + bottone "Modifica dettagli"

### 3.3 — Dashboard: stat finanziarie (1 ora)
Aggiungere una riga al dashboard con i totali stagionali derivati da `db.postazioni`:
```
Totale da incassare: €XX.XXX
Incassato:           €XX.XXX
Saldo residuo:       €XX.XXX
```
Visibile solo se almeno un record `dettagli` esiste (altrimenti nascondere la sezione).

---

## Fase 4 — Import Excel migliorato

**Durata stimata**: 2–3 ore  
**Prerequisito**: Fase 2 completata  
**Deploy**: sì

### 4.1 — Preservare i dettagli durante re-import (1 ora)
Il problema attuale: importare nuovamente le palme elimina tutti i record `occupazioni` palme → il cascade delete elimina anche i `dettagli` → si perdono telefoni, prezzi, pagamenti registrati.

**Soluzione**: cambiare la strategia di import da delete+insert a upsert:

```js
// Prima (distruttivo):
await supabase.from('occupazioni').delete().eq('tipo', tipo)
await supabase.from('occupazioni').insert(formatted)

// Dopo (preserva dettagli):
await supabase.from('occupazioni').upsert(
  formatted,
  { onConflict: 'tipo,numero' }
)
// Eliminare solo le occupazioni non presenti nel file:
const numeriImportati = formatted.map(r => r.numero)
await supabase
  .from('occupazioni')
  .delete()
  .eq('tipo', tipo)
  .not('numero', 'in', `(${numeriImportati.join(',')})`)
```

Questo aggiorna le occupazioni esistenti e rimuove quelle scomparse dal file, senza toccare quelle presenti → il cascade delete non si attiva per i record rimasti → `dettagli` è preservato.

### 4.2 — Preview migliorata con confronto (1 ora)
Nel preview di ImportExcel, mostrare se una postazione è già occupata nel DB:
```
N°  | Cliente file | Cliente DB | Stato
-----|-------------|-----------|-------
 12  | ROSSI MARIO | ROSSI MARIO | ✓ Uguale
 45  | BIANCHI     | VERDI      | ⚠ Cambio cliente
 89  | FERRARI     | (libera)   | ✚ Nuova
```

Questo dà all'operatore visibilità su cosa sta per cambiare prima di confermare.

---

## Fase 5 — Gestione clienti migliorata

**Durata stimata**: 3–4 ore  
**Prerequisito**: Fase 3 completata  
**Deploy**: sì

### 5.1 — Modifica nome cliente dalla mappa (1 ora)
Problema attuale: il nome cliente è scritto nel campo `occupazioni.cliente`. Se scritto male (es. "ROOSI" invece di "ROSSI"), non c'è modo di correggerlo dall'UI.

Aggiungere un campo editabile per il nome nel `DettagliPanel`. Alla modifica, aggiornare `occupazioni.cliente` (non `dettagli`).

### 5.2 — Ricerca cliente cross-postazioni (1 ora)
Aggiungere nella pagina Clienti una ricerca che evidenzia tutte le postazioni di un cliente sulla Mappa. Quando si cerca "ROSSI" in Clienti e si clicca "Vedi su Mappa", navigare alla Mappa con un filtro pre-applicato che mostra solo le postazioni di quel cliente.

### 5.3 — Esportazione clienti CSV (1 ora)
Aggiungere bottone "⬇ Esporta CSV" in Clienti con:
```
Nome, N. Postazioni, Lettini tot., Telefono, Email, Totale €, Acconto €, Saldo €
```

---

## Fase 6 — Autenticazione (quando necessario)

**Durata stimata**: 4–6 ore  
**Prerequisito**: tutto il resto funzionante  
**Deploy**: con attenzione (breaking change per utenti esistenti)

Questa fase si affronta quando l'app viene usata da più operatori contemporaneamente o quando la sicurezza diventa prioritaria.

### 6.1 — Supabase Auth
```js
// Login.jsx
const { error } = await supabase.auth.signInWithPassword({ email, password })

// App.jsx
const [session, setSession] = useState(null)
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
  return () => subscription.unsubscribe()
}, [])
```

### 6.2 — Aggiornare RLS
Sostituire `for all using (true)` con `for all to authenticated using (true)` su tutte le tabelle.

### 6.3 — Creare utente admin
Nel Supabase Dashboard → Authentication → Users → Invite user.
Rimuovere le credenziali hardcoded da `Login.jsx`.

---

## Ordine di esecuzione raccomandato

```
CLEANUP_PLAN (Step 1–11)
    ↓
Fase 1 (Stabilizzazione)
    ↓
Fase 2.1–2.2 (DB + useStore)
    ↓
Fase 2.3–2.4 (SaldoBadge + DettagliPanel)
    ↓
Fase 3 (Integrazione UI)
    ↓
Fase 4 (Import migliorato)        ← parallela con Fase 5
Fase 5 (Clienti)                  ← parallela con Fase 4
    ↓
Fase 6 (Auth) — solo se necessario
```

---

## Regole per ogni fase

1. **Deploy dopo ogni fase**: non accumulare cambiamenti non rilasciati. Se qualcosa va storto in produzione, il rollback è limitato a una fase.

2. **Nessuna fase tocca i dati esistenti senza conferma**: ogni modifica al DB deve essere reversibile o idempotente.

3. **I test manuali minimi per ogni fase**:
   - Apertura app → login → dashboard carica dati
   - Mappa mostra occupazioni corrette
   - Import Excel funziona (test con file reale)
   - Prenota crea una nuova occupazione visibile in Mappa

4. **La Fase 4.1 (upsert import) è un cambio di comportamento significativo**: testare con file Excel reali in un DB di staging prima del deploy in produzione.

---

## Cosa NON fare

- **Non aggiungere React Router** finché la Fase 1 non è stabile. L'URL navigation è un miglioramento UX, non un prerequisito.
- **Non aggiungere una tabella `clienti` separata**. Il modello ibrido funziona con i clienti derivati da `occupazioni`. Una tabella separata richiederebbe un sistema di deduplicazione complesso.
- **Non migrare dati finanziari da sistemi esterni al DB**. Partire da zero con `dettagli`. I dati storici restano dove sono.
- **Non implementare pagamenti multipli** (storico pagamenti). Il modello `prezzo_totale + acconto_versato` è sufficiente per la maggior parte degli stabilimenti balneari. Se servisse un vero storico, si aggiunge una tabella `pagamenti` in una Fase 7 futura.
- **Non toccare `global.css`** durante la pulizia. Il design system funziona. Qualsiasi restyling è un progetto separato.
