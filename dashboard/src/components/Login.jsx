import React, { useState } from 'react'
import { sb, clearSupabaseConfig } from '../lib/supabase.js'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'signin') {
        const { error } = await sb().auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await sb().auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        if (!data.session) setMsg({ type: 'ok', text: 'Tili luotu. Klikkaa sähköpostiin tullutta vahvistuslinkkiä ja kirjaudu sitten tällä sivulla. (Jos linkki avaa väärän sivun, ei haittaa – tili on silti vahvistettu.)' })
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      <form className="card pad stack auth" onSubmit={submit}>
        <div className="brand"><span className="logo">F</span>Flippari</div>
        <h1>{mode === 'signin' ? 'Kirjaudu' : 'Luo tili'}</h1>
        <label className="field">Sähköposti<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field">Salasana<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>
        {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? <span className="spinner" /> : mode === 'signin' ? 'Kirjaudu' : 'Luo tili'}</button>
        <button type="button" className="btn ghost sm" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Ei tiliä? Luo tili' : 'Onko jo tili? Kirjaudu'}
        </button>
        <button type="button" className="btn ghost sm muted" onClick={() => { clearSupabaseConfig(); location.reload() }}>
          Vaihda Supabase-projekti
        </button>
      </form>
    </div>
  )
}
