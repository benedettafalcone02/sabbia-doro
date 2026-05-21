import Modal from './Modal'

const SQL = `-- LA SABBIA D'ORO — Supabase SQL Setup
-- Incolla nell'SQL Editor e clicca RUN

create table if not exists postazioni (
  id text primary key,
  tipo text not null check (tipo in ('palma','ombrellone')),
  numero integer, fila integer, col integer, settore text,
  prezzo_2lettini numeric, prezzo_lettino_regista numeric,
  prezzo_stagionale numeric
);

create table if not exists clienti (
  id uuid default gen_random_uuid() primary key,
  nome text not null, cognome text not null,
  telefono text, email text, note text,
  created_at timestamptz default now()
);

create table if not exists prenotazioni (
  id uuid default gen_random_uuid() primary key,
  postazione_id text references postazioni(id),
  cliente_id uuid references clienti(id),
  tipo text check (tipo in ('stagionale','periodo','giornaliero')),
  data_inizio date, data_fine date, dotazione text,
  prezzo_totale numeric default 0,
  acconto_versato numeric default 0,
  saldo_residuo numeric generated always as (prezzo_totale - acconto_versato) stored,
  data_acconto date, metodo_pagamento text,
  stato_pagamento text default 'da_pagare'
    check (stato_pagamento in ('da_pagare','acconto_versato','saldo')),
  note text, created_at timestamptz default now()
);

create table if not exists pagamenti (
  id uuid default gen_random_uuid() primary key,
  prenotazione_id uuid references prenotazioni(id) on delete cascade,
  importo numeric not null, data date,
  metodo text check (metodo in ('contanti','carta','bonifico')),
  note text, created_at timestamptz default now()
);

-- RLS
alter table postazioni enable row level security;
alter table clienti enable row level security;
alter table prenotazioni enable row level security;
alter table pagamenti enable row level security;

create policy "solo_autenticati" on postazioni for all to authenticated using (true);
create policy "solo_autenticati" on clienti for all to authenticated using (true);
create policy "solo_autenticati" on prenotazioni for all to authenticated using (true);
create policy "solo_autenticati" on pagamenti for all to authenticated using (true);

-- Indici
create index if not exists idx_pren_postazione on prenotazioni(postazione_id);
create index if not exists idx_pren_cliente on prenotazioni(cliente_id);
create index if not exists idx_pren_date on prenotazioni(data_inizio, data_fine);`

export default function SqlModal({ open, onClose }) {
  function copy() {
    navigator.clipboard.writeText(SQL).catch(() => {})
  }
  return (
    <Modal open={open} onClose={onClose} title="⚙ SQL Setup — Supabase" size="modal-lg">
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Copia e incolla nel <strong>SQL Editor</strong> del tuo progetto Supabase, poi clicca <strong>Run</strong>.
      </p>
      <pre style={{ background: '#1a1a2e', color: '#7DB8E6', borderRadius: 8, padding: 16, fontSize: 11, lineHeight: 1.7, overflow: 'auto', maxHeight: 380, fontFamily: 'monospace' }}>
        {SQL}
      </pre>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button className="btn btn-yellow" onClick={copy}>📋 Copia SQL</button>
        <button className="btn btn-outline" onClick={onClose}>Chiudi</button>
      </div>
    </Modal>
  )
}
