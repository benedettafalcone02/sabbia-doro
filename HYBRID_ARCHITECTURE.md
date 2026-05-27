# HYBRID_ARCHITECTURE.md
# Architettura Ibrida — Sabbia d'Oro (Option C)

## Principio guida

Il sistema `occupazioni` rimane la **fonte di verità per chi occupa cosa**. Viene esteso, non sostituito. Una seconda tabella `dettagli` è collegata via foreign key `(tipo, numero)` e porta le informazioni opzionali (contatti, prezzi, pagamenti). L'import Excel continua a toccare solo `occupazioni`. Tutto il resto si aggiunge sopra.

---

## Schema Database Target

### Tabella `occupazioni` (invariata)

```sql
create table if not exists occupazioni (
  id          bigserial primary key,
  tipo        text not null,                    -- 'palma' | 'ombrellone'
  numero      integer not null,
  cliente     text,                             -- nome in UPPERCASE
  stato       text default 'occupato',
  lettini     integer default 0,
  sdraio      integer default 0,
  regista     integer default 0,
  created_at  timestamptz default now(),
  unique(tipo, numero)
);
```

Nessuna modifica. L'import Excel funziona esattamente come prima.

---

### Tabella `dettagli` (nuova)

```sql
create table if not exists dettagli (
  id                bigserial primary key,
  tipo              text not null,
  numero            integer not null,

  -- Contatti
  telefono          text,
  email             text,
  note_cliente      text,

  -- Finanziario
  prezzo_totale     numeric default 0,
  acconto_versato   numeric default 0,
  data_acconto      date,
  metodo_pagamento  text check (metodo_pagamento in ('contanti', 'carta', 'bonifico')),
  note_pagamento    text,

  -- Metadata
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),

  unique(tipo, numero),
  foreign key (tipo, numero) references occupazioni(tipo, numero) on delete cascade
);

-- RLS (stessa policy di occupazioni)
alter table dettagli enable row level security;
create policy "accesso_pubblico" on dettagli
  for all using (true) with check (true);

-- Indice per lookup frequente
create index if not exists idx_dettagli_tipo_numero on dettagli(tipo, numero);
```

**Caratteristiche chiave**:
- `unique(tipo, numero)`: una riga per postazione, mai duplicati
- `on delete cascade`: quando un'occupazione viene rimossa, i dettagli spariscono automaticamente
- Tutti i campi sono opzionali — un record può esistere senza dettagli e viceversa
- `updated_at` deve essere aggiornato con un trigger o lato client ad ogni UPDATE

---

## Flusso dati target

```
Supabase
  occupazioni  ──────────────────────┐
  dettagli     ─────────────────────┐│
                                    ││
                         loadAll()  ││
                                    ▼▼
                              useStore
                         ┌─────────────────────────────┐
                         │  db.postazioni               │
                         │    (292 spot)                │
                         │    .stato                    │
                         │    .cliente                  │
                         │    .lettini/sdraio/regista   │
                         │    .telefono     ← dettagli  │
                         │    .email        ← dettagli  │
                         │    .prezzo_totale ← dettagli │
                         │    .acconto      ← dettagli  │
                         │    .saldo        ← computed  │
                         │                              │
                         │  db.clienti                  │
                         │    (derivati da occupazioni) │
                         │    .telefono ← dettagli      │
                         │    .email    ← dettagli      │
                         │                              │
                         │  db.loading: boolean         │
                         └─────────────────────────────┘
                                    │
                              props │
                 ┌──────────────────┼─────────────────┐
                 ▼                  ▼                  ▼
            Dashboard           Mappa              Clienti
            (legge stats)  (legge + popup)    (legge + edit dettagli)
                                   │
                                   ▼
                              Prenota.jsx
                         (scrive occupazioni)
                                   +
                              DettagliPanel
                         (scrive dettagli — opzionale)
```

---

## Merge dati in `useStore.loadAll()`

```js
async function loadAll() {
  // Fetch parallelo — entrambe le tabelle contemporaneamente
  const [occResult, detResult] = await Promise.all([
    supabase.from('occupazioni').select('*'),
    supabase.from('dettagli').select('*'),
  ])

  if (occResult.error) {
    console.error('occupazioni:', occResult.error)
    setDB(p => ({ ...p, loading: false }))
    return
  }

  const occupazioni = occResult.data
  const dettagli = detResult.data || []  // dettagli può non esistere ancora → array vuoto

  setDB(prev => {
    // Mappa dettagli per lookup veloce O(1)
    const detMap = {}
    dettagli.forEach(d => { detMap[`${d.tipo}_${d.numero}`] = d })

    // Postazioni: merge occupazioni + dettagli
    const postazioni = prev.postazioni.map(p => {
      const occ = occupazioni.find(o => Number(o.numero) === Number(p.numero) && o.tipo === p.tipo)
      const det = detMap[`${p.tipo}_${p.numero}`] || null

      if (!occ) return {
        ...p, stato: 'libero', cliente: null,
        lettini: 0, sdraio: 0, regista: 0,
        telefono: null, email: null, prezzo_totale: 0,
        acconto_versato: 0, saldo_residuo: 0,
      }

      const prezzo = det?.prezzo_totale || 0
      const acconto = det?.acconto_versato || 0

      return {
        ...p,
        stato: 'occupato',
        cliente: occ.cliente || null,
        lettini: Number(occ.lettini) || 0,
        sdraio: Number(occ.sdraio) || 0,
        regista: Number(occ.regista) || 0,
        // Da dettagli (null se non ancora compilati)
        telefono: det?.telefono || null,
        email: det?.email || null,
        note_cliente: det?.note_cliente || null,
        prezzo_totale: prezzo,
        acconto_versato: acconto,
        saldo_residuo: prezzo - acconto,
        metodo_pagamento: det?.metodo_pagamento || null,
        data_acconto: det?.data_acconto || null,
      }
    })

    // Clienti: aggregati da occupazioni, arricchiti con contatti da dettagli
    const clientiMap = {}
    occupazioni.forEach(occ => {
      if (!occ.cliente) return
      const key = normalizeCliente(occ.cliente)
      const det = detMap[`${occ.tipo}_${occ.numero}`]
      if (!clientiMap[key]) {
        clientiMap[key] = {
          id: `cl_${key}`,
          nome: occ.cliente.trim(),
          telefono: det?.telefono || '',
          email: det?.email || '',
          postazioni_occ: [],
        }
      }
      // Aggiorna contatti se trovati (prende il primo non-null)
      if (!clientiMap[key].telefono && det?.telefono) clientiMap[key].telefono = det.telefono
      if (!clientiMap[key].email && det?.email) clientiMap[key].email = det.email
      clientiMap[key].postazioni_occ.push({
        tipo: occ.tipo,
        numero: Number(occ.numero),
        lettini: Number(occ.lettini) || 0,
        sdraio: Number(occ.sdraio) || 0,
        regista: Number(occ.regista) || 0,
      })
    })

    return {
      ...prev,
      postazioni,
      clienti: Object.values(clientiMap),
      loading: false,
    }
  })
}
```

---

## Write paths

### Path 1 — Prenotazione spot (invariato)
```
Prenota.jsx
  → supabase.from('occupazioni').upsert({ tipo, numero, cliente, lettini, sdraio, regista })
  → onReload()
```
Nessuna modifica. L'import Excel usa lo stesso path.

### Path 2 — Salvataggio dettagli (nuovo)
```
[Mappa popup | Pannello cliente]
  → supabase.from('dettagli').upsert(
      { tipo, numero, telefono, email, prezzo_totale, acconto_versato, ... },
      { onConflict: 'tipo,numero' }
    )
  → onReload()
```

L'upsert con `onConflict: 'tipo,numero'` garantisce che ci sia sempre al massimo un record per postazione. Non serve gestire insert vs update.

### Path 3 — Liberazione spot (da aggiungere)
```
[Mappa popup → "Libera postazione"]
  → conferma dialog
  → supabase.from('occupazioni').delete().eq('tipo', t).eq('numero', n)
  → (dettagli eliminato automaticamente via cascade)
  → onReload()
```

---

## Componenti target post-architettura

### Componenti da aggiungere

**`DettagliPanel.jsx`** — pannello (non modal separato) per aggiungere/modificare dettagli di una postazione occupata. Appare:
- Nel popup della Mappa, sotto le info esistenti, solo per postazioni occupate
- Nella pagina Clienti, nel modal dettaglio cliente

```
DettagliPanel props:
  postazione: { tipo, numero, telefono, email, prezzo_totale, acconto_versato, ... }
  onSaved: () => void   ← chiama reload
  showToast: fn

Internamente:
  - form locale con i campi dettagli
  - submit → upsert su dettagli
  - showToast su successo/errore
```

**`SaldoBadge.jsx`** — badge visual per lo stato pagamento, derivato da prezzo/acconto:
```jsx
// Rimpiazza le 3 occorrenze di calcolo inline
function SaldoBadge({ prezzo, acconto }) {
  if (!prezzo) return null
  const saldo = prezzo - acconto
  if (saldo <= 0) return <span className="badge badge-green">✓ Saldo</span>
  if (acconto > 0) return <span className="badge badge-orange">Acconto</span>
  return <span className="badge badge-red">Da pagare</span>
}
```

### Componenti da migliorare

**`Mappa.jsx` — popup postazione occupata**
Aggiungere dopo le info equipment:
- Telefono (se presente, cliccabile `tel:`)
- Saldo badge (`SaldoBadge`)
- Bottone "Modifica dettagli" → apre `DettagliPanel`
- Bottone "Libera postazione" (con conferma)

**`Clienti.jsx` — modal cliente**
Aggiungere:
- Campo telefono cliccabile (già nell'UI, ora con dati reali da dettagli)
- Sezione finanziaria aggregata (totale dovuto, totale versato, saldo globale per tutte le postazioni)
- Bottone per aprire `DettagliPanel` per ogni postazione del cliente

**`Prenota.jsx`**
Nessuna modifica al flusso principale. Opzionalmente, dopo il salvataggio del booking:
- Mostrare `DettagliPanel` in-page per completare i dati finanziari (step 2 opzionale)

---

## Componenti da tenere invariati

| Componente | Motivo |
|-----------|--------|
| `Modal.jsx` | Pulito e riusabile |
| `Toast.jsx` + `useToast.js` | Funziona correttamente |
| `ImportExcel.jsx` | Parsing solido, solo UI da migliorare |
| `Dashboard.jsx` | Statistiche corrette |
| `Disponibilita.jsx` | Semplice e funzionale |
| `Admin.jsx` | Da semplificare (Step 8 CLEANUP_PLAN) |
| `Login.jsx` | Da migliorare con Supabase Auth, non urgente |
| `global.css` | Design system stabile |

---

## Struttura cartelle post-Option C

```
src/
├── lib/
│   ├── supabase.js      (invariato)
│   └── data.js          (ridotto: solo generatePostazioni + fmtEur + today + tomorrow + normalizeCliente)
│
├── hooks/
│   ├── useStore.js      (semplificato: db={postazioni, clienti, loading} + reload)
│   └── useToast.js      (invariato)
│
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Mappa.jsx        (+ DettagliPanel + liberazione spot)
│   ├── Prenota.jsx      (invariato nel core)
│   ├── Clienti.jsx      (+ dati reali da dettagli)
│   ├── Disponibilita.jsx
│   └── Admin.jsx        (semplificato)
│
└── components/
    ├── Navbar.jsx        (Mappa nel PAGES array)
    ├── Modal.jsx
    ├── Toast.jsx
    ├── ImportExcel.jsx   (+ confirm dialog)
    ├── DettagliPanel.jsx (NUOVO)
    └── SaldoBadge.jsx    (NUOVO)
```

Rimossi: `Prenotazioni.jsx`, `FormPrenotazione.jsx`, `FormPagamento.jsx`, `SqlModal.jsx` (4 file orfani).

---

## Invarianti di sistema

Queste regole devono essere sempre vere nel sistema ibrido:

1. **`occupazioni` è il gate**: un record `dettagli` può esistere solo se esiste il corrispondente record in `occupazioni`. Il cascade delete lo garantisce a livello DB.

2. **L'import Excel non tocca `dettagli`**: l'import elimina solo `occupazioni`. I dettagli sopravvivono se una postazione viene re-importata con lo stesso `(tipo, numero)` — il cascade delete li elimina. Se si vuole preservare i dettagli durante un re-import, bisogna eliminare il `delete()` e usare solo upsert.

3. **Il nome cliente in `occupazioni` è la chiave di identità**: non esiste un ID cliente persistito. L'identità è `normalizeCliente(occ.cliente)`. Se il nome viene scritto diversamente in due import diversi, diventano due clienti separati.

4. **`saldo_residuo` è sempre calcolato client-side**: `prezzo_totale - acconto_versato`. Non è una colonna DB computed. Questo permette di mostrare preview live nel form senza round-trip.

5. **`dettagli` è sempre opzionale**: nessuna pagina deve crashare se `dettagli` non esiste o se la tabella non è ancora stata creata. `useStore` gestisce il caso con `detResult.data || []`.

---

## Migrazione DB — script eseguibile in Supabase SQL Editor

```sql
-- Aggiunge la tabella dettagli al DB esistente (safe, idempotente)

create table if not exists dettagli (
  id                bigserial primary key,
  tipo              text not null,
  numero            integer not null,
  telefono          text,
  email             text,
  note_cliente      text,
  prezzo_totale     numeric default 0,
  acconto_versato   numeric default 0,
  data_acconto      date,
  metodo_pagamento  text check (metodo_pagamento in ('contanti', 'carta', 'bonifico')),
  note_pagamento    text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique(tipo, numero),
  foreign key (tipo, numero) references occupazioni(tipo, numero) on delete cascade
);

alter table dettagli enable row level security;

create policy if not exists "accesso_pubblico" on dettagli
  for all using (true) with check (true);

create index if not exists idx_dettagli_tipo_numero on dettagli(tipo, numero);

-- Verifica
select count(*) from occupazioni;  -- deve tornare il numero di occupazioni attive
select count(*) from dettagli;     -- deve tornare 0 (tabella vuota, si riempie con l'uso)
```

Nessuna migrazione dei dati esistenti necessaria. I dati finanziari partiranno da zero nella nuova tabella.
