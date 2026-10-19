import React, { useContext, useEffect, useState } from 'react'
import { saveSettings, sb, clearSupabaseConfig } from '../lib/supabase.js'
import { EXTENSION_ID } from '../lib/extension.js'
import { Toast } from '../App.jsx'

const MODELS = [
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet (suositus: laatu/hinta)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku (halvin, nopein)' },
  { id: 'claude-opus-4-1', label: 'Claude Opus (paras, kallein)' },
]

/** flip-radarin yhdistäminen: rajattu avain, jolla tutka voi vain lisätä tärppejä. */
function RadarLink() {
  const toast = useContext(Toast)
  const [tokens, setTokens] = useState(null)
  const [shown, setShown] = useState(null)

  const load = () =>
    sb().from('ingest_tokens').select('token, created_at').order('created_at', { ascending: false })
      .then(({ data }) => setTokens(data || []))
  useEffect(() => { load() }, [])

  async function create() {
    const bytes = crypto.getRandomValues(new Uint8Array(24))
    const token = 'frt_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    const { error } = await sb().from('ingest_tokens').insert({ token })
    if (error) return toast(error.message)
    setShown(token)
    load()
  }

  async function revoke(token) {
    if (!confirm('Poistetaanko avain? flip-radar ei voi sen jälkeen viedä tärppejä tällä avaimella.')) return
    await sb().from('ingest_tokens').delete().eq('token', token)
    if (shown === token) setShown(null)
    load()
  }

  return (
    <section className="card pad stack">
      <h2>flip-radar (Tärpit)</h2>
      <p className="small muted" style={{ margin: 0 }}>
        Luo tutka-avain ja liitä se flip-radarin <code>config.json</code> → <code>"flippari"</code> → <code>"ingest_token"</code>.
        Avaimella voi vain lisätä tärppejä – se ei näe eikä muuta muita tietojasi.
      </p>
      {shown && (
        <div className="alert ok" style={{ wordBreak: 'break-all' }}>
          Uusi avain (näytetään vain nyt): <code>{shown}</code>{' '}
          <button className="btn sm" onClick={() => navigator.clipboard.writeText(shown).then(() => toast('Kopioitu'))}>Kopioi</button>
        </div>
      )}
      {tokens?.map((t) => (
        <div key={t.token} className="row small">
          <code>{t.token.slice(0, 10)}…{t.token.slice(-4)}</code>
          <span className="muted">luotu {new Date(t.created_at).toLocaleDateString('fi-FI')}</span>
          <div className="spacer" />
          <button className="btn sm ghost danger" onClick={() => revoke(t.token)}>Poista</button>
        </div>
      ))}
      <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={create}>+ Luo tutka-avain</button>
    </section>
  )
}

export default function Settings({ user, settings, onSaved, extVersion }) {
  const toast = useContext(Toast)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (settings) setForm({ ...settings, platforms: { tori: true, vinted: true, ebay: false, ...(settings.platforms || {}) } })
  }, [settings])

  if (!form) return <div className="empty"><span className="spinner" /></div>

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setPlatform = (k, v) => setForm((f) => ({ ...f, platforms: { ...f.platforms, [k]: v } }))

  async function save() {
    setBusy(true)
    try {
      const saved = await saveSettings(user.id, {
        anthropic_key: form.anthropic_key?.trim() || null,
        ai_model: form.ai_model,
        postal_code: form.postal_code?.trim() || null,
        signature_fi: form.signature_fi || '',
        signature_en: form.signature_en || '',
        platforms: form.platforms,
      })
      onSaved(saved)
      toast('Asetukset tallennettu')
    } catch (e) {
      toast(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <section className="card pad stack">
        <h2>Tekoäly</h2>
        <label className="field">Claude API -avain
          <input type="password" value={form.anthropic_key || ''} onChange={(e) => set('anthropic_key', e.target.value)} placeholder="sk-ant-…" autoComplete="off" />
        </label>
        <p className="small muted">Luo avain: console.anthropic.com → API Keys. Avain tallentuu omaan Supabase-tietokantaasi (vain sinä näet sen). Ilmoitus maksaa noin 1–3 senttiä, Ostoapurin verkkohaulla noin 5–10 senttiä.</p>
        <label className="field">Malli (voit myös kirjoittaa uudemman mallin tunnuksen)
          <input list="models" value={form.ai_model || ''} onChange={(e) => set('ai_model', e.target.value)} />
          <datalist id="models">{MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</datalist>
        </label>
      </section>

      <section className="card pad stack">
        <h2>Ilmoitukset</h2>
        <label className="field">Postinumero (Tori)
          <input inputMode="numeric" value={form.postal_code || ''} onChange={(e) => set('postal_code', e.target.value)} />
        </label>
        <label className="field">Allekirjoitus kuvauksen loppuun
          <textarea style={{ minHeight: 70 }} value={form.signature_fi || ''} onChange={(e) => set('signature_fi', e.target.value)} placeholder="Esim. Postitan Matkahuollolla tai Postilla. Katso myös muut ilmoitukseni!" />
        </label>
      </section>

      <section className="card pad stack">
        <h2>Myyntikanavat</h2>
        {[
          ['tori', 'Tori'],
          ['vinted', 'Vinted'],
          ['ebay', 'eBay (tulossa)'],
        ].map(([k, label]) => (
          <label key={k} className="row" style={{ fontWeight: 600 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.platforms[k] !== false && !!form.platforms[k]} onChange={(e) => setPlatform(k, e.target.checked)} />
            {label}
          </label>
        ))}
      </section>

      <RadarLink user={user} />

      <section className="card pad stack">
        <h2>Chrome-laajennus</h2>
        {extVersion ? (
          <div className="alert ok">Laajennus {extVersion} on asennettu ja yhteydessä.</div>
        ) : (
          <div className="alert warn">Laajennusta ei löydy tästä selaimesta.</div>
        )}
        <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Avaa Chromessa <code>chrome://extensions</code> ja laita <b>Kehittäjätila</b> päälle.</li>
          <li>Valitse <b>Lataa pakkaamaton</b> ja valitse Flippari-kansion <code>extension</code>-kansio.</li>
          <li>Tarkista että laajennuksen ID on <code>{EXTENSION_ID}</code> ja päivitä tämä sivu.</li>
          <li>Ole kirjautuneena Toriin ja Vintediin samassa Chromessa.</li>
        </ol>
      </section>

      <div className="row">
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? <span className="spinner" /> : 'Tallenna asetukset'}</button>
        <div className="spacer" />
        <button className="btn ghost" onClick={() => sb().auth.signOut()}>Kirjaudu ulos</button>
        <button className="btn ghost muted" onClick={() => { clearSupabaseConfig(); sb().auth.signOut().finally(() => location.reload()) }}>Vaihda Supabase</button>
      </div>
    </div>
  )
}
