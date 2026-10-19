import React, { useContext, useEffect, useRef, useState } from 'react'
import { sb, createItem, uploadImage } from '../lib/supabase.js'
import { evaluateDeal } from '../lib/ai.js'
import { prepareImage } from '../lib/images.js'
import { eur } from '../lib/constants.js'
import { Toast } from '../App.jsx'

const blobToDataUrl = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(blob)
  })

export default function DealCheck({ settings, user, onCreateItem }) {
  const toast = useContext(Toast)
  const [photos, setPhotos] = useState([]) // { blob, url }
  const [text, setText] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [minProfit, setMinProfit] = useState(10)
  const [web, setWeb] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const fileRef = useRef()

  useEffect(() => {
    sb().from('deals').select('*').order('created_at', { ascending: false }).limit(15)
      .then(({ data }) => setHistory(data || []))
  }, [])

  async function addPhotos(files) {
    for (const f of [...files].slice(0, 4 - photos.length)) {
      try {
        const blob = await prepareImage(f, 1200, 0.82)
        setPhotos((p) => [...p, { blob, url: URL.createObjectURL(blob) }])
      } catch (e) {
        toast(e.message)
      }
    }
  }

  async function run() {
    if (!settings?.anthropic_key) return toast('Lisää Claude API -avain Asetuksissa.')
    if (!photos.length && !text.trim()) return toast('Lisää kuva tai kirjoita mikä tuote on.')
    setBusy(true)
    setResult(null)
    try {
      const imageDataUrls = await Promise.all(photos.map((p) => blobToDataUrl(p.blob)))
      const r = await evaluateDeal({
        apiKey: settings.anthropic_key,
        imageDataUrls,
        text,
        buyPrice: buyPrice === '' ? null : Number(buyPrice.replace(',', '.')),
        minProfit: Number(minProfit) || 10,
        useWebSearch: web,
      })
      setResult(r)
      const { data } = await sb().from('deals').insert({
        query: text || r.item || '',
        buy_price: buyPrice === '' ? null : Number(buyPrice.replace(',', '.')),
        result: r,
      }).select().single()
      if (data) setHistory((h) => [data, ...h].slice(0, 15))
    } catch (e) {
      toast(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function bought() {
    try {
      const it = await createItem({
        title: result.item?.slice(0, 80) || text.slice(0, 80),
        purchase_price: buyPrice === '' ? null : Number(buyPrice.replace(',', '.')),
        price: result.expected_sale_price || result.median_price || null,
        notes: `Ostoapuri: ${result.reasoning || ''}`,
      })
      let pos = 0
      for (const p of photos) await uploadImage(user.id, it.id, p.blob, pos++)
      toast('Lisätty varastoon')
      onCreateItem(it.id)
    } catch (e) {
      toast(e.message)
    }
  }

  const verdictClass = (v) => (/OSTA/.test(v) && !/ÄLÄ/.test(v) ? 'osta' : /HARKITSE/.test(v) ? 'harkitse' : 'ala')

  return (
    <div className="grid2" style={{ alignItems: 'start' }}>
      <section className="card pad stack">
        <h1>Kannattaako ostaa?</h1>
        <p className="muted small">Ota kuva (myös merkkilapusta) tai kirjoita tuote. Tekoäly hakee hintoja verkosta ja laskee, jääkö välistä tavoitteesi.</p>
        <div className="photos">
          {photos.map((p, i) => (
            <div className="photo" key={i}>
              <img src={p.url} alt="" />
              <div className="tools"><span /><button onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))}>✕</button></div>
            </div>
          ))}
          {photos.length < 4 && <div className="dropzone" onClick={() => fileRef.current.click()}>📷 Kuva</div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
        <label className="field">Tuote (valinnainen jos kuva)
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="esim. Hoka Clifton 9 miesten 44, hyvä kunto" />
        </label>
        <div className="grid2">
          <label className="field">Ostohinta €<input inputMode="decimal" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="15" /></label>
          <label className="field">Min. voitto €<input inputMode="decimal" value={minProfit} onChange={(e) => setMinProfit(e.target.value)} /></label>
        </div>
        <label className="row small" style={{ fontWeight: 600 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={web} onChange={(e) => setWeb(e.target.checked)} />
          Hae hintadataa verkosta (tarkempi, n. 3–6 senttiä · ilman n. 0,5 senttiä)
        </label>
        <button className="btn primary block" onClick={run} disabled={busy}>
          {busy ? <><span className="spinner" /> Arvioidaan…</> : 'Arvioi'}
        </button>
      </section>

      <section className="stack">
        {result && (
          <div className="card pad stack">
            <div className={`verdict ${verdictClass(result.verdict)}`}>{result.verdict}</div>
            <div className="muted">{result.item}</div>
            <div className="grid3">
              <div className="stat"><span className="v">{eur(result.median_price)}</span><span className="l">mediaani</span></div>
              <div className="stat"><span className="v">{eur(result.expected_sale_price)}</span><span className="l">odotettu myynti</span></div>
              <div className="stat"><span className="v">{eur(result.max_buy_price)}</span><span className="l">max ostohinta</span></div>
              <div className="stat"><span className="v">{eur(result.profit)}</span><span className="l">arvioitu voitto</span></div>
              <div className="stat"><span className="v">{eur(result.price_low)}–{eur(result.price_high)}</span><span className="l">hintahaarukka</span></div>
              <div className="stat"><span className="v">{result.sell_speed || '–'}</span><span className="l">myyntinopeus</span></div>
            </div>
            <p style={{ margin: 0 }}>{result.reasoning}</p>
            {result.platforms?.length > 0 && <div className="small muted">Myy: {result.platforms.join(', ')}</div>}
            {result.authenticity && <div className="alert warn"><strong>Aitous:</strong> {result.authenticity}</div>}
            {result.sources?.length > 0 && (
              <details className="small">
                <summary className="muted">Lähteet ({result.sources.length})</summary>
                <ul style={{ paddingLeft: 18 }}>
                  {result.sources.map((s, i) => <li key={i}><a href={s.url} target="_blank" rel="noreferrer">{s.title || s.url}</a></li>)}
                </ul>
              </details>
            )}
            {result.cost_usd != null && <div className="small muted">Arvion hinta noin {(result.cost_usd * 100).toFixed(1)} senttiä</div>}
            <button className="btn" onClick={bought}>Ostin tämän → lisää varastoon</button>
          </div>
        )}
        {history.length > 0 && (
          <div className="card pad stack">
            <h3>Viimeisimmät arviot</h3>
            {history.map((h) => (
              <div key={h.id} className="row small" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 6, cursor: 'pointer' }} onClick={() => setResult(h.result)}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.result?.item || h.query}</span>
                <span className={`verdict ${verdictClass(h.result?.verdict || '')}`} style={{ fontSize: 12 }}>{h.result?.verdict}</span>
                <span className="mono muted">{eur(h.result?.profit)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
