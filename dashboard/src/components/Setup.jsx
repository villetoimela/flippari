import React, { useState } from 'react'
import { saveSupabaseConfig } from '../lib/supabase.js'

export default function Setup({ onDone }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [err, setErr] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url.trim())) return setErr('Osoite on muotoa https://xxxx.supabase.co')
    if (key.trim().length < 30) return setErr('Tarkista anon/publishable key')
    saveSupabaseConfig(url.replace(/\/$/, ''), key)
    onDone()
  }

  return (
    <div className="center-screen">
      <form className="card pad stack auth" onSubmit={submit}>
        <div className="brand"><span className="logo">F</span>Flippari</div>
        <h1>Yhdistä Supabase</h1>
        <p className="muted small">
          Supabase → Project Settings → API. Kopioi Project URL ja anon (public) key. Aja ensin <code>supabase/schema.sql</code> SQL Editorissa.
        </p>
        <label className="field">Project URL<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" /></label>
        <label className="field">Anon / publishable key<input value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJ…" /></label>
        {err && <div className="alert err">{err}</div>}
        <button className="btn primary block">Jatka</button>
      </form>
    </div>
  )
}
