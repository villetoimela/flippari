// Flippari – yhteiset apufunktiot sisältöskripteille
/* global chrome */
;(() => {
  if (window.Flippari) return

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[’'`´]/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

  /** Odottaa kunnes fn() palauttaa totuusarvoisen arvon. */
  async function waitFor(fn, { timeout = 15000, interval = 200 } = {}) {
    const end = Date.now() + timeout
    while (Date.now() < end) {
      try {
        const v = fn()
        if (v) return v
      } catch { /* yritä uudelleen */ }
      await sleep(interval)
    }
    return null
  }

  /** Asettaa arvon Reactin/Litin huomaamalla tavalla. */
  function setNativeValue(el, value) {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : el instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
    el.focus?.()
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  function blur(el) {
    el.dispatchEvent(new Event('blur', { bubbles: true, composed: true }))
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
  }

  function realClick(el) {
    if (!el) return false
    el.scrollIntoView?.({ block: 'center' })
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true, cancelable: true, view: window }))
    }
    el.click()
    return true
  }

  async function dataUrlToFile(dataUrl, name) {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    return new File([blob], name, { type: blob.type || 'image/jpeg' })
  }

  /** Hakee kuvat taustaprosessin kautta ja syöttää ne file-inputtiin. */
  async function uploadImages(input, urls, onProgress) {
    const files = []
    for (let i = 0; i < urls.length; i++) {
      onProgress?.(`Haetaan kuvaa ${i + 1}/${urls.length}…`)
      const resp = await chrome.runtime.sendMessage({ type: 'fetchImage', url: urls[i] })
      if (resp?.error) throw new Error(resp.error)
      files.push(await dataUrlToFile(resp.dataUrl, `kuva-${i + 1}.jpg`))
    }
    const dt = new DataTransfer()
    files.forEach((f) => dt.items.add(f))
    input.files = dt.files
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    return files.length
  }

  function send(msg) {
    return chrome.runtime.sendMessage(msg)
  }

  // ---------------- Paneeli ----------------
  let panelHost = null
  let panelRoot = null

  const PANEL_CSS = `
    :host { all: initial; }
    .card { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 320px; max-height: 70vh;
      overflow: auto; background: #111214; color: #f4f4f5; border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.35);
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; border: 1px solid #27272a; }
    .head { display:flex; align-items:center; gap:8px; padding: 12px 14px; border-bottom: 1px solid #27272a; position: sticky; top: 0; background:#111214; }
    .logo { width: 22px; height: 22px; border-radius: 6px; background: #16a34a; display:grid; place-items:center; font-weight: 800; color: #fff; }
    .title { font-weight: 700; flex:1; }
    .x { background:none; border:0; color:#a1a1aa; font-size:18px; cursor:pointer; }
    .body { padding: 10px 14px 14px; }
    .status { color:#a1a1aa; margin-bottom: 8px; }
    ul { list-style:none; margin:0; padding:0; }
    li { display:flex; gap:8px; align-items:flex-start; padding: 4px 0; border-bottom: 1px dashed #27272a; }
    li:last-child { border-bottom: 0; }
    .ic { width: 18px; flex: none; text-align:center; }
    .ok { color:#22c55e } .warn { color:#f59e0b } .err { color:#ef4444 } .wait { color:#a1a1aa }
    .lbl { flex:1; }
    .val { color:#a1a1aa; font-size: 12px; word-break: break-word; }
    .copy { background:#27272a; color:#e4e4e7; border:0; border-radius:6px; padding:2px 8px; cursor:pointer; font-size:12px; }
    .btns { display:flex; gap:8px; margin-top: 12px; flex-wrap: wrap; }
    .btn { flex:1; background:#27272a; color:#fff; border:0; border-radius:8px; padding:8px 10px; cursor:pointer; font-weight:600; }
    .btn.primary { background:#16a34a; }
    .note { margin-top:10px; padding:8px 10px; background:#1c1917; border-radius:8px; color:#fde68a; }
  `

  function ensurePanel() {
    if (panelHost && document.documentElement.contains(panelHost)) return panelRoot
    panelHost = document.createElement('flippari-panel')
    panelRoot = panelHost.attachShadow({ mode: 'open' })
    document.documentElement.appendChild(panelHost)
    return panelRoot
  }

  const ICONS = { ok: '✓', warn: '!', err: '✕', wait: '…' }

  /**
   * state = { status, rows: [{label, state, value, copy}], note, actions: [{label, primary, onClick}] }
   */
  function renderPanel(state) {
    const root = ensurePanel()
    root.innerHTML = ''
    const style = document.createElement('style')
    style.textContent = PANEL_CSS
    root.appendChild(style)

    const card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = `
      <div class="head"><div class="logo">F</div><div class="title">Flippari</div><button class="x" title="Sulje">×</button></div>
      <div class="body"><div class="status"></div><ul></ul><div class="btns"></div></div>`
    card.querySelector('.x').onclick = () => panelHost.remove()
    card.querySelector('.status').textContent = state.status || ''
    const ul = card.querySelector('ul')
    for (const r of state.rows || []) {
      const li = document.createElement('li')
      li.innerHTML = `<span class="ic ${r.state}">${ICONS[r.state] || ''}</span>
        <span class="lbl"><div></div><div class="val"></div></span>`
      li.querySelector('.lbl div').textContent = r.label
      li.querySelector('.val').textContent = r.value ?? ''
      if (r.copy) {
        const b = document.createElement('button')
        b.className = 'copy'
        b.textContent = 'Kopioi'
        b.onclick = async () => {
          await navigator.clipboard.writeText(String(r.copy))
          b.textContent = 'Kopioitu'
          setTimeout(() => (b.textContent = 'Kopioi'), 1200)
        }
        li.appendChild(b)
      }
      ul.appendChild(li)
    }
    if (state.note) {
      const n = document.createElement('div')
      n.className = 'note'
      n.textContent = state.note
      card.querySelector('.body').appendChild(n)
    }
    const btns = card.querySelector('.btns')
    for (const a of state.actions || []) {
      const b = document.createElement('button')
      b.className = 'btn' + (a.primary ? ' primary' : '')
      b.textContent = a.label
      b.onclick = a.onClick
      btns.appendChild(b)
    }
    root.appendChild(card)
  }

  function closePanel() {
    panelHost?.remove()
  }

  /** Seuraa SPA-sivun URL-muutoksia. */
  function onUrlChange(cb) {
    let last = location.href
    setInterval(() => {
      if (location.href !== last) {
        const prev = last
        last = location.href
        cb(location.href, prev)
      }
    }, 500)
  }

  // Vinted-värikoodit → Torin värit
  const COLOR_TO_TORI = {
    BLACK: 'Musta', GREY: 'Harmaa', WHITE: 'Valkoinen', CREAM: 'Beige', BODY: 'Beige', APRICOT: 'Oranssi',
    ORANGE: 'Oranssi', CORAL: 'Oranssi', RED: 'Punainen', BURGUNDY: 'Punainen', PINK: 'Vaaleanpunainen',
    ROSE: 'Vaaleanpunainen', PURPLE: 'Violetti', LILAC: 'Violetti', 'LIGHT-BLUE': 'Sininen', BLUE: 'Sininen',
    NAVY: 'Sininen', TURQUOISE: 'Sininen', MINT: 'Vihreä', GREEN: 'Vihreä', 'DARK-GREEN': 'Vihreä',
    KHAKI: 'Vihreä', BROWN: 'Ruskea', MUSTARD: 'Keltainen', YELLOW: 'Keltainen', SILVER: 'Hopea',
    GOLD: 'Kulta', VARIOUS: 'Kirjava', CLEAR: 'Valkoinen',
  }

  /** "€1,234.50" / "1 234,50 €" / "120 €" → numero */
  function parsePrice(text) {
    let s = String(text || '').replace(/[^\d.,]/g, '')
    if (!s) return 0
    const lastDot = s.lastIndexOf('.')
    const lastComma = s.lastIndexOf(',')
    const dec = Math.max(lastDot, lastComma)
    if (dec > -1 && s.length - dec - 1 <= 2) {
      s = s.slice(0, dec).replace(/[.,]/g, '') + '.' + s.slice(dec + 1)
    } else {
      s = s.replace(/[.,]/g, '')
    }
    return Number(s) || 0
  }

  window.Flippari = {
    parsePrice, sleep, norm, waitFor, setNativeValue, blur, realClick, uploadImages, send,
    renderPanel, closePanel, onUrlChange, COLOR_TO_TORI,
  }
})()
