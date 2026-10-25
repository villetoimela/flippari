import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  fetchItem, updateItem, deleteItem, uploadImage, deleteImage, reorderImages, signedUrls, upsertListing,
} from '../lib/supabase.js'
import { prepareImage } from '../lib/images.js'
import { generateListing, COLOR_CODES, COLOR_FI } from '../lib/ai.js'
import { publishViaExtension, openForRemoval } from '../lib/extension.js'
import { CONDITIONS, ITEM_STATUSES, PLATFORMS, SHIPPING_SIZES, eur } from '../lib/constants.js'
import { TORI_PATHS } from '../lib/categories.js'
import { VINTED_CATEGORY_IDS, VINTED_PATHS } from '../lib/vintedCategories.js'
import { Toast } from '../App.jsx'
import SellModal from './SellModal.jsx'

const EDITABLE = [
  'title', 'description', 'title_en', 'description_en', 'brand', 'category', 'category_tori', 'category_vinted',
  'size', 'condition', 'color', 'material', 'material_en', 'purchase_price', 'price', 'min_price', 'shipping_size',
  'notes', 'status',
]
const NUMERIC = ['purchase_price', 'price', 'min_price']

export default function ItemEditor({ itemId, user, settings, extVersion, onClose, onChanged }) {
  const toast = useContext(Toast)
  const [item, setItem] = useState(null)
  const [images, setImages] = useState([])
  const [urls, setUrls] = useState({})
  const [uploading, setUploading] = useState(0)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiInfo, setAiInfo] = useState(null)
  const [hints, setHints] = useState('')
  const [saveState, setSaveState] = useState('saved')
  const [showEn, setShowEn] = useState(false)
  const [sellOpen, setSellOpen] = useState(false)
  const [drag, setDrag] = useState(false)
  const dirty = useRef({})
  const saveTimer = useRef()
  const fileRef = useRef()

  const load = useCallback(async () => {
    const it = await fetchItem(itemId)
    setItem(it)
    setImages(it.item_images || [])
  }, [itemId])

  useEffect(() => {
    load().catch((e) => toast(e.message))
  }, [load, toast])

  useEffect(() => {
    const paths = images.map((i) => i.path)
    signedUrls(paths).then((u) => {
      const map = {}
      paths.forEach((p, i) => (map[p] = u[i]))
      setUrls(map)
    }).catch(() => {})
  }, [images])

  // ---------- tallennus ----------
  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current)
    const patch = dirty.current
    if (!Object.keys(patch).length) return
    dirty.current = {}
    setSaveState('saving')
    try {
      await updateItem(itemId, patch)
      setSaveState('saved')
      onChanged?.()
    } catch (e) {
      dirty.current = { ...patch, ...dirty.current }
      setSaveState('error')
      toast(`Tallennus epäonnistui: ${e.message}`)
    }
  }, [itemId, onChanged, toast])

  function set(field, value) {
    let v = value
    if (NUMERIC.includes(field)) v = value === '' || value == null ? null : Number(String(value).replace(',', '.'))
    setItem((it) => ({ ...it, [field]: v }))
    dirty.current[field] = v
    setSaveState('dirty')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flush, 900)
  }

  function setMany(obj) {
    for (const [k, v] of Object.entries(obj)) if (EDITABLE.includes(k) && v !== undefined) set(k, v)
  }

  async function close() {
    await flush()
    onClose()
  }

  // ---------- kuvat ----------
  async function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (!files.length) return
    setUploading((n) => n + files.length)
    let pos = images.length
    for (const f of files) {
      try {
        const blob = await prepareImage(f)
        const img = await uploadImage(user.id, itemId, blob, pos++)
        setImages((arr) => [...arr, img])
      } catch (e) {
        toast(e.message)
      } finally {
        setUploading((n) => n - 1)
      }
    }
    onChanged?.()
  }

  async function removeImage(img) {
    if (!confirm('Poistetaanko kuva?')) return
    await deleteImage(img)
    const rest = images.filter((i) => i.id !== img.id)
    setImages(rest)
    await reorderImages(rest)
    onChanged?.()
  }

  async function move(idx, dir) {
    const arr = [...images]
    const j = idx + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
    setImages(arr)
    await reorderImages(arr)
    onChanged?.()
  }

  // ---------- tekoäly ----------
  async function runAI() {
    if (!settings?.anthropic_key) return toast('Lisää Claude API -avain Asetuksissa.')
    setAiBusy(true)
    setAiInfo(null)
    try {
      const imageUrls = (await signedUrls(images.map((i) => i.path))).filter(Boolean)
      const extra = [hints, item.purchase_price != null ? `Ostohinta ${item.purchase_price} €` : ''].filter(Boolean).join('. ')
      const r = await generateListing({
        apiKey: settings.anthropic_key,
        model: settings.ai_model,
        imageUrls,
        hints: extra,
        signature: settings.signature_fi,
      })
      setMany({
        title: r.title, description: r.description, title_en: r.title_en, description_en: r.description_en,
        brand: r.brand, category: r.category, category_tori: r.category_tori, category_vinted: r.category_vinted,
        size: r.size || '', condition: r.condition, color: r.color || '', material: r.material || '',
        material_en: r.material_en || '', price: r.price, min_price: r.min_price, shipping_size: r.shipping_size,
        status: item.status === 'draft' ? 'ready' : item.status,
      })
      dirty.current.ai_raw = r
      setAiInfo({ reasoning: r.price_reasoning, authenticity: r.authenticity_notes })
      await flush()
      toast('Ilmoitus valmis – tarkista tiedot')
    } catch (e) {
      toast(e.message)
    } finally {
      setAiBusy(false)
    }
  }

  // ---------- julkaisu ----------
  async function publish(platform, { quiet = false } = {}) {
    await flush()
    if (!extVersion) return toast('Asenna Flippari-laajennus Chromeen (ohje Asetuksissa).')
    if (!images.length) return toast('Lisää ensin kuvat.')
    if (!item.title || item.price == null) return toast('Otsikko ja hinta puuttuvat.')
    try {
      const imageUrls = (await signedUrls(images.map((i) => i.path), 7200)).filter(Boolean)
      await publishViaExtension(platform, {
        itemId,
        title: item.title,
        description: item.description,
        price: item.price,
        brand: item.brand,
        size: item.size,
        condition: item.condition,
        color: item.color,
        material: item.material,
        material_en: item.material_en,
        category_tori: item.category_tori,
        category_vinted: item.category_vinted,
        category_vinted_id: VINTED_CATEGORY_IDS[item.category_vinted] || null,
        shipping_size: item.shipping_size,
        postal_code: settings?.postal_code || '',
        images: imageUrls,
      })
      await upsertListing(itemId, platform, { status: 'pending', price: item.price })
      if (!quiet) {
        await load()
        onChanged?.()
      }
      return true
    } catch (e) {
      toast(`Laajennus: ${e.message}`)
      return false
    }
  }

  // Avaa Torin ja Vintedin lomakkeet rinnakkain; molemmat täyttyvät itsestään, julkaisu jää käyttäjälle.
  async function publishBoth() {
    const targets = ['tori', 'vinted'].filter((id) => {
      const l = listings[id]
      return enabled[id] !== false && (!l || l.status === 'pending' || l.status === 'removed')
    })
    for (const id of targets) {
      if (!(await publish(id, { quiet: true }))) break
    }
    await load()
    onChanged?.()
  }

  async function setListingUrl(platform) {
    const url = prompt(`${PLATFORMS[platform].name}-ilmoituksen osoite:`)
    if (!url) return
    await upsertListing(itemId, platform, { status: 'listed', url, listed_at: new Date().toISOString() })
    if (['draft', 'ready'].includes(item.status)) set('status', 'listed')
    await load()
    onChanged?.()
  }

  async function markRemoved(platform) {
    await upsertListing(itemId, platform, { status: 'removed', removed_at: new Date().toISOString() })
    await load()
    onChanged?.()
  }

  async function remove() {
    if (!confirm('Poistetaanko tuote ja sen kuvat pysyvästi?')) return
    await deleteItem({ ...item, item_images: images })
    onClose()
  }

  if (!item) {
    return (
      <div className="overlay" onClick={onClose}>
        <div className="drawer" onClick={(e) => e.stopPropagation()}><div className="empty"><span className="spinner" /></div></div>
      </div>
    )
  }

  const listings = Object.fromEntries((item.listings || []).map((l) => [l.platform, l]))
  const enabled = settings?.platforms || { tori: true, vinted: true }
  const margin = item.price != null && item.purchase_price != null ? item.price - item.purchase_price : null
  const isSold = item.status === 'sold' || item.status === 'shipped'

  return (
    <div className="overlay" onClick={close}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <button className="btn ghost sm" onClick={close}>← Takaisin</button>
          <div className="spacer" />
          <span className="small muted">
            {saveState === 'saving' ? 'Tallennetaan…' : saveState === 'dirty' ? 'Muutoksia…' : saveState === 'error' ? 'Tallennus epäonnistui' : 'Tallennettu'}
          </span>
          <select value={item.status} onChange={(e) => set('status', e.target.value)} style={{ width: 'auto' }}>
            {ITEM_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div className="drawer-body">
          {/* Kuvat */}
          <section className="card pad stack">
            <div className="row"><h2>Kuvat</h2><span className="muted small">Ensimmäinen on pääkuva. 5+ kuvaa myy parhaiten.</span></div>
            <div
              className="photos"
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
            >
              {images.map((img, i) => (
                <div className="photo" key={img.id}>
                  {urls[img.path] && <img src={urls[img.path]} alt="" />}
                  {i === 0 && <span className="main">PÄÄKUVA</span>}
                  <div className="tools">
                    <span>
                      <button onClick={() => move(i, -1)} title="Siirrä vasemmalle">◀</button>{' '}
                      <button onClick={() => move(i, 1)} title="Siirrä oikealle">▶</button>
                    </span>
                    <button onClick={() => removeImage(img)} title="Poista">✕</button>
                  </div>
                </div>
              ))}
              {Array.from({ length: uploading }).map((_, i) => (
                <div className="photo" key={`up${i}`} style={{ display: 'grid', placeItems: 'center' }}><span className="spinner" /></div>
              ))}
              <div className={`dropzone ${drag ? 'drag' : ''}`} onClick={() => fileRef.current.click()}>
                + Lisää kuvia<br />tai pudota tähän
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          </section>

          {/* Tekoäly */}
          <section className="card pad stack ai-box">
            <div className="row"><h2>✨ Tekoäly kirjoittaa ilmoituksen</h2></div>
            <textarea
              style={{ minHeight: 60 }}
              placeholder="Lisätiedot (valinnainen): esim. koko 42, käytetty 2 kertaa, pieni naarmu kärjessä, alkuperäinen laatikko mukana"
              value={hints}
              onChange={(e) => setHints(e.target.value)}
            />
            <div className="row">
              <button className="btn primary" onClick={runAI} disabled={aiBusy || !images.length}>
                {aiBusy ? <><span className="spinner" /> Kirjoitetaan…</> : 'Tee ilmoitus kuvista'}
              </button>
              {!images.length && <span className="small muted">Lisää ensin kuvat.</span>}
            </div>
            {aiInfo?.reasoning && <div className="alert ok"><strong>Hinta:</strong> {aiInfo.reasoning}</div>}
            {aiInfo?.authenticity && <div className="alert warn"><strong>Aitous:</strong> {aiInfo.authenticity}</div>}
          </section>

          {/* Tiedot */}
          <section className="card pad stack">
            <h2>Ilmoitus</h2>
            <label className="field">Otsikko <span className="muted">({(item.title || '').length}/60)</span>
              <input value={item.title} onChange={(e) => set('title', e.target.value)} maxLength={90} />
            </label>
            <label className="field">Kuvaus
              <textarea value={item.description} onChange={(e) => set('description', e.target.value)} rows={7} />
            </label>
            <div className="grid3">
              <label className="field">Merkki<input value={item.brand} onChange={(e) => set('brand', e.target.value)} /></label>
              <label className="field">Koko<input value={item.size} onChange={(e) => set('size', e.target.value)} /></label>
              <label className="field">Kunto
                <select value={item.condition} onChange={(e) => set('condition', e.target.value)}>
                  {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              <label className="field">Väri
                <select value={item.color || ''} onChange={(e) => set('color', e.target.value)}>
                  <option value="">–</option>
                  {COLOR_CODES.map((c) => <option key={c} value={c}>{COLOR_FI[c]}</option>)}
                </select>
              </label>
              <label className="field">Materiaali<input value={item.material} onChange={(e) => set('material', e.target.value)} /></label>
              <label className="field">Paketti
                <select value={item.shipping_size} onChange={(e) => set('shipping_size', e.target.value)}>
                  {SHIPPING_SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
            </div>
            <label className="field">Torin kategoria
              <input list="tori-cats" value={item.category_tori} onChange={(e) => set('category_tori', e.target.value)} placeholder="Osasto > Alaosasto > Tuoteryhmä" />
              <datalist id="tori-cats">{TORI_PATHS.map((p) => <option key={p} value={p} />)}</datalist>
            </label>
            <label className="field">Vintedin kategoria
              <input list="vinted-cats" value={item.category_vinted} onChange={(e) => set('category_vinted', e.target.value)} placeholder="Miehet > Vaatteet > … > Hupparit ja collegepuserot" />
              <datalist id="vinted-cats">{VINTED_PATHS.map((p) => <option key={p} value={p} />)}</datalist>
              {item.category_vinted && !VINTED_CATEGORY_IDS[item.category_vinted] && (
                <span className="small" style={{ color: 'var(--warn)' }}>Ei Vintedin kategoriapuussa – valitse listasta, muuten kategoria jää valitsematta</span>
              )}
            </label>
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowEn(!showEn)}>
              {showEn ? '▾' : '▸'} Englanninkielinen ilmoitus (eBay)
            </button>
            {showEn && (
              <>
                <label className="field">Title (EN)<input value={item.title_en} onChange={(e) => set('title_en', e.target.value)} /></label>
                <label className="field">Description (EN)<textarea value={item.description_en} onChange={(e) => set('description_en', e.target.value)} /></label>
              </>
            )}
          </section>

          {/* Hinnat */}
          <section className="card pad stack">
            <h2>Hinnat</h2>
            <div className="grid3">
              <label className="field">Ostohinta €<input inputMode="decimal" value={item.purchase_price ?? ''} onChange={(e) => set('purchase_price', e.target.value)} /></label>
              <label className="field">Pyyntihinta €<input inputMode="decimal" value={item.price ?? ''} onChange={(e) => set('price', e.target.value)} /></label>
              <label className="field">Alin hinta €<input inputMode="decimal" value={item.min_price ?? ''} onChange={(e) => set('min_price', e.target.value)} /></label>
            </div>
            {margin != null && (
              <div className={`alert ${margin >= 10 ? 'ok' : 'warn'}`}>
                Kate pyyntihinnalla: <strong>{eur(margin)}</strong>{margin < 10 && ' – alle 10 € tavoitteen'}
              </div>
            )}
            <label className="field">Muistiinpanot (vain sinulle)<textarea style={{ minHeight: 60 }} value={item.notes} onChange={(e) => set('notes', e.target.value)} /></label>
          </section>

          {/* Julkaisu */}
          <section className="card pad">
            <div className="row" style={{ marginBottom: 6 }}>
              <h2>Julkaisu</h2>
              {!extVersion && <span className="small muted">– asenna Chrome-laajennus (Asetukset)</span>}
              <div className="spacer" />
              {extVersion && !isSold && ['tori', 'vinted'].some((id) => enabled[id] !== false && (!listings[id] || ['pending', 'removed'].includes(listings[id].status))) && (
                <button className="btn sm primary" onClick={publishBoth} title="Avaa Torin ja Vintedin lomakkeet rinnakkain ja täytä ne">Julkaise molempiin</button>
              )}
            </div>
            {Object.values(PLATFORMS).filter((p) => enabled[p.id] !== false || listings[p.id]).map((p) => {
              const l = listings[p.id]
              return (
                <div className="platform-row" key={p.id}>
                  <span className="dot" style={{ background: p.color }} />
                  <span className="platform-name">{p.name}</span>
                  <span className="small muted" style={{ flex: 1 }}>
                    {p.soon && !l ? 'tulossa' :
                      !l ? 'ei julkaistu' :
                      l.status === 'pending' ? 'lomake avattu – julkaise Torissa/Vintedissä' :
                      l.status === 'listed' ? <>myynnissä {l.url && <a href={l.url} target="_blank" rel="noreferrer">avaa ↗</a>}</> :
                      l.status === 'sold' ? 'myyty täällä' : 'poistettu'}
                  </span>
                  {p.viaExtension && !isSold && (!l || l.status === 'pending' || l.status === 'removed') && (
                    <button className={`btn sm ${p.id}`} onClick={() => publish(p.id)}>{l?.status === 'pending' ? 'Avaa uudelleen' : `Julkaise ${p.name}`}</button>
                  )}
                  {!p.soon && !isSold && l?.status !== 'listed' && (
                    <button className="btn sm ghost" onClick={() => setListingUrl(p.id)} title="Lisää linkki käsin">+ linkki</button>
                  )}
                  {l?.status === 'listed' && isSold && (
                    <>
                      <button className="btn sm" onClick={() => openForRemoval(p.id, l.url, item.title, itemId).catch((e) => toast(e.message))} disabled={!l.url || !extVersion}>Avaa ja poista</button>
                      <button className="btn sm ghost" onClick={() => markRemoved(p.id)}>Poistettu ✓</button>
                    </>
                  )}
                </div>
              )
            })}
            {enabled.vinted !== false && (
              <p className="small muted" style={{ marginTop: 10 }}>
                Vinted sallii yksityishenkilöille vain ei-kaupallisen myynnin. Pidä Vinted-volyymi maltillisena.
              </p>
            )}
          </section>

          {/* Toiminnot */}
          <section className="row">
            {!isSold && <button className="btn primary" onClick={async () => { await flush(); setSellOpen(true) }}>Merkitse myydyksi</button>}
            {item.status === 'sold' && <button className="btn" onClick={() => set('status', 'shipped')}>Merkitse lähetetyksi</button>}
            {isSold && <span className="alert ok">Myyty {eur(item.sold_price)} ({PLATFORMS[item.sold_platform]?.name || item.sold_platform || '–'}) · voitto {eur((item.sold_price || 0) - (item.purchase_price || 0))}</span>}
            <div className="spacer" />
            <button className="btn danger ghost" onClick={remove}>Poista tuote</button>
          </section>
        </div>
      </div>

      {sellOpen && (
        <SellModal
          item={item}
          listings={item.listings || []}
          onClose={() => setSellOpen(false)}
          onDone={async () => { setSellOpen(false); await load(); onChanged?.() }}
        />
      )}
    </div>
  )
}
