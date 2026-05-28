import { useState } from 'react'
import styles from './Login.module.css'

const CREDENZIALI = [
  { email: 'admin@sabbiadoro.it',      pwd: 'demo1234',    role: 'admin'       },
  { email: 'spiaggista@sabbiadoro.it', pwd: 'spiaggia2025', role: 'spiaggista' },
]

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pwd, setPwd]     = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const match = CREDENZIALI.find(c => c.email === email && c.pwd === pwd)
    if (match) {
      onLogin(match.role)
    } else {
      setError('Credenziali errate.')
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
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="email@sabbiadoro.it"
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
            Accedi
          </button>
        </form>
      </div>
    </div>
  )
}
