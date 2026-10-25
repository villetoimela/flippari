import React, { useContext, useEffect, useMemo, useState } from 'react'
import { createItem, signedUrls } from '../lib/supabase.js'
import { PLATFORMS, eur, statusLabel } from '../lib/constants.js'
import { Toast } from '../App.jsx'

const FILTERS = [
  { id: 'active', label: 'Aktiiviset', match: (s) => ['draft', 'ready', 'listed'].includes(s) },
  { id: 'draft', label: 'Luonnokset', match: (s) => s === 'draft' || s === 'ready' },
  { id: 'listed', label: 'Myynnissä', match: (s) => s === 'listed' },
  { id: 'sold', label: 'Myydyt', match: (s) => s === 'sold' || s === 'shipped' },
  { id: 'all', label: 'Kaikki', match: () => true },
]

export default function Inventory({ items, loading, onOpen }) {
  const toast = useContext(Toast)
  const [filter, setFilter] = useState('active')
  const [q, setQ] = useState('')
  const [thumbs, setThumbs] = useState({})
  const [creating, setCreating] = useState(false)

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)
    const needle = q.trim().toLowerCase()
    return items.filter(
      (i) => f.match(i.status) && (!needle || `${i.title} ${i.brand} ${i.category}`.toLowerCase().includes(needle)),
    )
  }, [items, filter, q])

  useEffect(() => {
    const paths = items.map((i) => i.item_images?.[0]?.path).filter(Boolean)
    signedUrls(paths)
      .then((urls) => {
        const map = {}
        paths.forEach((p, idx) => (map[p] = urls[idx]))
        setThumbs(map)
      })
      .catch(() => {})
  }, [items])

  const kpi = useMemo(() => {
    const unsold = items.filter((i) => ['draft', 'ready', 'listed'].includes(i.status))
    const sold = items.filter((i) => ['sold', 'shipped'].includes(i.status))
    const monthAgo = Date.now() - 30 * 864e5
    const sold30 = sold.filter((i) => i.sold_at && new Date(i.sold_at).getTime() > monthAgo)
    // Voitto vain tuotteista, joiden ostohinta tiedetään (muuten koko myyntihinta näkyisi voittona).
    const withCost = (arr) => arr.filter((i) => i.purchase_price != null)
    const profit = (arr) => withCost(arr).reduce((s, i) => s + (Number(i.sold_price) || 0) - Number(i.purchase_price), 0)
    return {
      stockCount: unsold.length,
      stockValue: unsold.reduce((s, i) => s + (Number(i.price) || 0), 0),
      stockCost: unsold.reduce((s, i) => s + (Number(i.purchase_price) || 0), 0),
      sold30: sold30.length,
      profit30: profit(sold30),
      profitAll: profit(sold),
      soldCount: sold.length,
      soldWithCost: withCost(sold).length,
    }
  }, [items])

  async function newItem() {
    setCreating(true)
    try {
      const it = await createItem({})
      onOpen(it.id)
    } catch (e) {
      toast(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <section className="kpis">
        <div className="card kpi"><div className="label">Varastossa</div><div className="value">{kpi.stockCount} kpl</div><div className="small muted">ostettu {eur(kpi.stockCost)}</div></div>
        <div className="card kpi"><div className="label">Varaston myyntiarvo</div><div className="value">{eur(kpi.stockValue)}</div><div className="small muted">pyyntihinnoilla</div></div>
        <div className="card kpi"><div className="label">Myyty 30 pv</div><div className="value">{kpi.sold30} kpl</div><div className="small muted">voitto {eur(kpi.profit30)}</div></div>
        <div className="card kpi"><div className="label">Voitto yhteensä</div><div className="value">{eur(kpi.profitAll)}</div><div className="small muted">myynti − ostohinta ({kpi.soldWithCost}/{kpi.soldCount} kpl)</div></div>
      </section>

      <div className="toolbar">
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.id} className={`chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <div className="spacer" />
        <input className="search" placeholder="Hae…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn primary" onClick={newItem} disabled={creating}>
          {creating ? <span className="spinner" /> : '+ Uusi tuote'}
        </button>
      </div>

      {loading ? (
        <div className="empty"><span className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div className="card empty">
          <h2>Ei tuotteita tässä näkymässä</h2>
          <p className="muted">Lisää tuote, ota kuvat ja anna tekoälyn kirjoittaa ilmoitus.</p>
          <button className="btn primary" onClick={newItem}>+ Uusi tuote</button>
        </div>
      ) : (
        <div className="items">
          {visible.map((it) => {
            const path = it.item_images?.[0]?.path
            const listed = (it.listings || []).filter((l) => l.status === 'listed')
            const margin = it.price != null && it.purchase_price != null ? Number(it.price) - Number(it.purchase_price) : null
            return (
              <article key={it.id} className="card item" onClick={() => onOpen(it.id)}>
                <div className="thumb">{path && thumbs[path] ? <img src={thumbs[path]} alt="" loading="lazy" /> : <span className="small">Ei kuvaa</span>}</div>
                <div className="meta">
                  <div className="title">{it.title || <span className="muted">Nimetön tuote</span>}</div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong className="mono">{eur(it.status === 'sold' || it.status === 'shipped' ? it.sold_price : it.price)}</strong>
                    {margin != null && it.status !== 'sold' && it.status !== 'shipped' && (
                      <span className={`small mono ${margin >= 10 ? '' : 'muted'}`}>+{eur(margin)}</span>
                    )}
                  </div>
                  <div className="badges">
                    <span className={`badge status-${it.status}`}>{statusLabel(it.status)}</span>
                    {listed.map((l) => (
                      <span key={l.platform} className={`badge ${l.platform}`}>{PLATFORMS[l.platform]?.name || l.platform}</span>
                    ))}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}
