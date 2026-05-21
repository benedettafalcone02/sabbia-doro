import ImportExcel from '../components/ImportExcel'

export default function Admin({ onReload }) {
  return (
    <div className="page-content">
      <h1 className="page-title">Gestione</h1>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Da qui puoi importare i file Excel con le occupazioni della stagione.
          Importa prima le <strong>Palme</strong>, poi gli <strong>Ombrelloni</strong>.
        </div>
        <ImportExcel onReload={onReload} />
      </div>

      {/* SQL Setup */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>⚙️ Setup Supabase</h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          Se non hai ancora creato la tabella <code style={{ background: '#f0f2f5', padding: '2px 6px', borderRadius: 4 }}>occupazioni</code> su Supabase, esegui questo SQL:
        </p>
        <pre style={{ background: '#1a1a2e', color: '#7DB8E6', borderRadius: 8, padding: 14, fontSize: 11, lineHeight: 1.7, overflow: 'auto', fontFamily: 'monospace' }}>
{`create table if not exists occupazioni (
  id bigserial primary key,
  tipo text not null,
  numero integer not null,
  cliente text,
  stato text default 'occupato',
  lettini integer default 0,
  sdraio integer default 0,
  regista integer default 0,
  created_at timestamptz default now(),
  unique(tipo, numero)
);

alter table occupazioni enable row level security;
create policy "accesso_pubblico" on occupazioni
  for all using (true) with check (true);`}
        </pre>
        <button
          className="btn btn-outline btn-sm"
          style={{ marginTop: 10 }}
          onClick={() => {
            const sql = `create table if not exists occupazioni (
  id bigserial primary key,
  tipo text not null,
  numero integer not null,
  cliente text,
  stato text default 'occupato',
  lettini integer default 0,
  sdraio integer default 0,
  regista integer default 0,
  created_at timestamptz default now(),
  unique(tipo, numero)
);
alter table occupazioni enable row level security;
create policy "accesso_pubblico" on occupazioni for all using (true) with check (true);`
            navigator.clipboard.writeText(sql)
          }}
        >
          📋 Copia SQL
        </button>
      </div>
    </div>
  )
}
