export default function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`toast ${toast.type}`} key={toast.id}>
      {toast.msg}
    </div>
  )
}
