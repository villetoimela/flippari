import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { sb, createItem } from '../lib/supabase.js'
import { evaluateDeal } from '../lib/ai.js'
import { PLATFORMS, eur } from '../lib/constants.js'
import { Toast } from '../App.jsx'

const ago = (iso) => {
  if (!iso) return ''
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'juuri nyt'
  if (m < 60) return `${m} min sitten`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} t sitten` : `${Math.round(h / 24)} pv sitten`
}

const profitOf = (f) => (f.est_net != null ? Number(f.est_net) : f.discount != null ? Number(f.discount) : 0)

export default function Tarpit({ settings, onCreateItem }) {
  const toast = useContext(Toast)
  const [finds, setFinds] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('new')
  const [minNet, setMinNet] = useState(() => Number(localStorage.getItem('flippari.minNet') || 10))
  const [platform, setPlatform] = useState('all')
  const [q, setQ] = useState('')
  const [evals, setEvals] = useState({})
  const [, tick] = useState(0)
  const notifOk = useRef(false)

  const load = useCallback(async () => {
    const { data, error } = await sb()
      .from('finds')
      .select('*')
      .gte('last_seen', new Date(Date.now() - 7 * 864e5).toISOString())
      .order('first_seen', { ascending: false })
      .limit(500)
    if (error) toast(error.message)
    setFinds(data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => {
    load()
    if ('Notification' in window && Notification.permission === 'granted') notifOk.current = true
    // Reaaliaikaiset uudet tärpit
    const ch = sb()
      .channel('finds-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'finds' }, (payload) => {
        const f = payload.new
        setFinds((arr) => [f, ...arr.filter((x) => x.id !== f.id)])
        if (notifOk.current && profitOf(f) >= minNet && document.visibilityState !== 'visible') {
          try {
            const n = new Notification(`${f.hot ? '🔥 ' : ''}${eur(f.price)} → +${eur(profitOf(f))}`, { body: f.title, icon: f.image || undefined, tag: f.id })
            n.onclick = () => window.open(f.url, '_blank')
          } catch { /* ei ilmoituksia */ }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'finds' }, (payload) => {
        setFinds((arr) => arr.map((x) => (x.id === payload.new.id ? payload.new : x)))
      })
      .subscribe()
    const t = setInterval(() => tick((n) => n + 1), 30000)
    return () => {
      sb().removeChannel(ch)
      clearInterval(t)
    }
  }, [load, minNet])

  useEffect(() => {
    try { localStorage.setItem('flippari.minNet', String(minNet)) } catch { /* ignore */ }
  }, [minNet])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return finds.filter((f) =>
      // flip-radarin fokustila kirjoittaa jokaiselle tärpille kaistarivin (ai_reason); ilman sitä tulleet
      // ovat fokusta edeltävää kohinaa ja putoavat muutenkin pois 7 päivän ikkunasta.
      (f.source !== 'flip-radar' || f.ai_reason) &&
      (view === 'new' ? f.status === 'new' : view === 'saved' ? f.status === 'saved' : f.status !== 'dismissed') &&
      profitOf(f) >= minNet &&
      (platform === 'all' || f.platform === platform) &&
      (!needle || `${f.title} ${f.subtitle} ${f.search_name}`.toLowerCase().includes(needle)),
    )
  }, [finds, view, minNet, platform, q])

  const latest = finds[0]?.first_seen

  async function setStatus(f, status) {
    setFinds((arr) => arr.map((x) => (x.id === f.id ? { ...x, status } : x)))
    const { error } = await sb().from('finds').update({ status }).eq('id', f.id)
    if (error) toast(error.message)
  }

  async function evaluate(f) {
    if (!settings?.anthropic_key) return toast('Lisää Claude API -avain Asetuksissa.')
    setEvals((e) => ({ ...e, [f.id]: { busy: true } }))
    try {
      const r = await evaluateDeal({
        apiKey: settings.anthropic_key,
        text: `${f.title} (${f.subtitle}). Ilmoitus: ${f.url}. Vertailumediaani ${f.median} €.`,
        buyPrice: f.price,
        minProfit: 10,
      })
      setEvals((e) => ({ ...e, [f.id]: r }))
    } catch (err) {
      setEvals((e) => ({ ...e, [f.id]: null }))
      toast(err.message)
    }
  }

  async function bought(f) {
    try {
      const it = await createItem({
        title: f.title.slice(0, 80),
        purchase_price: f.price,
        price: f.est_resale_high || f.median || null,
        notes: `Ostettu tärppinä: ${f.url}`,
      })
      await setStatus(f, 'bought')
      toast('Lisätty varastoon – lisää kuvat kun tuote saapuu')
      onCreateItem?.(it.id)
    } catch (e) {
      toast(e.message)
    }
  }

  async function enableNotifications() {
    if (!('Notification' in window)) return toast('Selain ei tue ilmoituksia')
    const p = await Notification.requestPermission()
    notifOk.current = p === 'granted'
    toast(p === 'granted' ? 'Ilmoitukset päällä' : 'Ilmoitukset estetty')
  }

  return (
    <div className="stack">
      <section className="card pad stack">
        <div className="row">
          <h1>Tärpit</h1>
          <span className="small muted">flip-radar · viimeisin {latest ? ago(latest) : '–'}</span>
          <div className="spacer" />
          {'Notification' in window && Notification.permission !== 'granted' && (
            <button className="btn sm" onClick={enableNotifications}>🔔 Ilmoitukset</button>
          )}
        </div>
        <div className="row">
          <label className="field" style={{ flex: '1 1 220px' }}>
            Min. arvioitu voitto: {eur(minNet)}
            <input type="range" min="0" max="60" step="5" value={minNet} onChange={(e) => setMinNet(Number(e.target.value))} style={{ padding: 0 }} />
          </label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">Kaikki alustat</option>
            <option value="vinted">Vinted</option>
            <option value="tori">Tori</option>
          </select>
          <input className="search" placeholder="Hae…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips">
          {[['new', 'Uudet'], ['saved', 'Tallennetut'], ['all', 'Kaikki 7 pv']].map(([id, label]) => (
            <button key={id} className={`chip ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>{label}</button>
          ))}
          <span className="small muted" style={{ alignSelf: 'center' }}>{visible.length} näkyvissä</span>
        </div>
      </section>

      {loading ? (
        <div className="empty"><span className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div className="card empty">
          <h2>Ei tärppejä näillä ehdoilla</h2>
          <p className="muted">Tärpit tulevat flip-radarilta. Varmista että se on käynnissä (<code>./run.sh</code>) ja Flippari-vienti on päällä sen config.json:ssa.</p>
        </div>
      ) : (
        <div className="items">
          {visible.map((f) => {
            const ev = evals[f.id]
            return (
              <article key={f.id} className="card item" style={{ cursor: 'default' }}>
                <a className="thumb" href={f.url} target="_blank" rel="noreferrer" style={{ position: 'relative' }}>
                  {f.image ? <img src={f.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="small">Ei kuvaa</span>}
                  {f.hot && <span className="main" style={{ position: 'absolute', top: 6, left: 6, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 6 }}>🔥 KUUMA</span>}
                </a>
                <div className="meta">
                  <div className="title">{f.title}</div>
                  <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.subtitle}</div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span>
                      <strong className="mono">{eur(f.price)}</strong>
                      {/posti/.test(f.subtitle || '') && <span className="small muted"> sis. posti + suoja</span>}
                    </span>
                    <span className="small mono" style={{ color: 'var(--accent)', fontWeight: 800 }}>+{eur(profitOf(f))}</span>
                  </div>
                  <div className="small muted">
                    {f.est_resale_low ? `myynti ${eur(f.est_resale_low)}–${eur(f.est_resale_high)}` : `vertailu ${eur(f.median)}`} · {ago(f.first_seen)}
                  </div>
                  {f.ai_reason && <div className="small" style={{ color: 'var(--accent)' }}>✓ {f.ai_reason}</div>}
                  <div className="badges">
                    <span className={`badge ${f.platform}`}>{PLATFORMS[f.platform]?.name || f.platform}</span>
                    {f.search_name && <span className="badge">{f.search_name}</span>}
                  </div>
                  {ev && !ev.busy && (
                    <div className="small" style={{ marginTop: 4 }}>
                      <strong className={`verdict ${/ÄLÄ/.test(ev.verdict) ? 'ala' : /HARKITSE/.test(ev.verdict) ? 'harkitse' : 'osta'}`} style={{ fontSize: 13 }}>{ev.verdict}</strong>{' '}
                      ~{eur(ev.profit)} · {ev.reasoning}
                    </div>
                  )}
                  <div className="row" style={{ marginTop: 6 }}>
                    <a className="btn sm primary" href={f.url} target="_blank" rel="noreferrer">Avaa ↗</a>
                    <button className="btn sm" onClick={() => evaluate(f)} disabled={ev?.busy} title="Tarkka tekoälyarvio verkkohaulla">{ev?.busy ? <span className="spinner" /> : 'Arvioi'}</button>
                    <button className="btn sm ghost" onClick={() => bought(f)} title="Ostin tämän → varastoon">Ostin</button>
                    {f.status !== 'saved' && <button className="btn sm ghost" onClick={() => setStatus(f, 'saved')} title="Tallenna">★</button>}
                    <button className="btn sm ghost" onClick={() => setStatus(f, 'dismissed')} title="Turha – piilota">✕</button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
