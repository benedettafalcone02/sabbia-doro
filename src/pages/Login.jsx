import { useState } from 'react'
import styles from './Login.module.css'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@sabbiadoro.it')
  const [pwd, setPwd]     = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (email === 'admin@sabbiadoro.it' && pwd === 'demo1234') {
      onLogin()
    } else {
      setError('Credenziali errate. Demo: admin@sabbiadoro.it / demo1234')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <img src="/logosabbiadoro.png" alt="Sabbia d'Oro" className={styles.logoImg} />
        </div>

        <p className={styles.sub}>Gestionale Stabilimento · Pescara · Conc. N°10</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@sabbiadoro.it"
              required
            />
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>Password</label>
            <input
              type="password"
              value={pwd}
              onChange={e => { setPwd(e.target.value); setError('') }}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}
          >
            Accedi al Gestionale
          </button>
        </form>

        <p className={styles.hint}>Demo: admin@sabbiadoro.it / demo1234</p>
      </div>
    </div>
  )
}
