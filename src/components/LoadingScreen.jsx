export default function LoadingScreen({ minHeight = '60vh' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight, flexDirection: 'column', gap: 14,
    }}>
      <div className="loading-icon" style={{ fontSize: 44, lineHeight: 1 }}>🌊</div>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
        Caricamento...
      </div>
    </div>
  )
}
