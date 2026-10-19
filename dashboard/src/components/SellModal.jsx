import React, { useContext, useState } from 'react'
import { updateItem, upsertListing } from '../lib/supabase.js'
import { eur } from '../lib/constants.js'
import { Toast } from '../App.jsx'

const OPTIONS = [
  { id: 'tori', label: 'Tori' },
  { id: 'vinted', label: 'Vinted' },
  { id: 'ebay', label: 'eBay' },
  { id: 'huuto', label: 'Huuto.net' },
  { id: 'other', label: 'Muu / käteinen' },
]

export default function SellModal({ item, listings, onClose, onDone }) {
  const toast = useContext(Toast)
  const listed = listings.filter((l) => l.status === 'listed')
  const [platform, setPlatform] = useState(listed[0]?.platform || 'tori')
  const [price, setPrice] = useState(item.price ?? '')
  const [busy, setBusy] = useState(false)

  const p = Number(String(price).replace(',', '.'))
  const profit = Number.isFinite(p) ? p - (Number(item.purchase_price) || 0) : null
  const others = listed.filter((l) => l.platform !== platform)

  async function save() {
    if (!Number.isFinite(p)) return toast('Anna myyntihinta')
    setBusy(true)
    try {
      await updateItem(item.id, {
        status: 'sold',
        sold_price: p,
        sold_platform: platform,
        sold_at: new Date().toISOString(),
      })
      await upsertListing(item.id, platform, { status: 'sold' })
      toast(others.length ? 'Myyty! Poista nyt ilmoitukset muilta alustoilta.' : 'Myyty! 🎉')
      onDone()
    } catch (e) {
      toast(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="modal-wrap" onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="card pad stack modal" onClick={(e) => e.stopPropagation()}>
        <h2>Merkitse myydyksi</h2>
        <label className="field">Missä myytiin?
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label className="field">Myyntihinta € (mitä jäi käteen)
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus />
        </label>
        {profit != null && <div className={`alert ${profit >= 10 ? 'ok' : 'warn'}`}>Voitto: <strong>{eur(profit)}</strong></div>}
        {others.length > 0 && (
          <div className="alert warn">
            Tuote on myynnissä myös: {others.map((o) => o.platform).join(', ')}. Tallennuksen jälkeen poista ne Julkaisu-osiosta (”Avaa ja poista”).
          </div>
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Peruuta</button>
          <button className="btn primary" onClick={save} disabled={busy}>{busy ? <span className="spinner" /> : 'Tallenna'}</button>
        </div>
      </div>
    </div>
  )
}
