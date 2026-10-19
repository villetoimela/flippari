// Flippari – Tori.fi-täyttö
/* global Flippari */
;(async () => {
  const F = window.Flippari
  if (!F || window.__flippariTori) return
  window.__flippariTori = true

  const resp = await F.send({ type: 'getJob' }).catch(() => null)
  const job = resp?.job
  if (!job || job.platform !== 'tori') return

  if (job.kind === 'remove') return showRemovePanel(job)
  if (job.kind !== 'publish') return

  const p = job.payload

  // ---------- apurit Torin Warp-komponenteille ----------
  const wSelect = (label) =>
    document.querySelector(`w-select[aria-label="${label}"], w-select[label="${label}"]`)
  const wCombo = (label) =>
    document.querySelector(`w-combobox[aria-label="${label}"], w-combobox[label="${label}"]`)
  const wText = (sel) => document.querySelector(sel)

  function innerInput(host) {
    if (!host) return null
    const root = host.shadowRoot || host
    const direct = root.querySelector('input, textarea, select')
    if (direct) return direct
    const nested = root.querySelector('w-textfield, w-textarea')
    return nested ? innerInput(nested) : null
  }

  function pickOption(options, wanted) {
    const w = F.norm(wanted)
    if (!w) return null
    return (
      options.find((o) => F.norm(o.text) === w) ||
      options.find((o) => F.norm(o.text).startsWith(w) || w.startsWith(F.norm(o.text))) ||
      options.find((o) => F.norm(o.text).includes(w) || w.includes(F.norm(o.text)))
    )
  }

  async function setSelect(label, wanted, { timeout = 6000 } = {}) {
    const host = await F.waitFor(() => wSelect(label), { timeout })
    if (!host) return { state: 'warn', value: 'kenttää ei löytynyt' }
    const sel = host.shadowRoot?.querySelector('select')
    if (!sel) return { state: 'warn', value: 'kenttää ei löytynyt' }
    const opts = [...sel.options].filter((o) => o.value && o.value !== '0')
    const hit = pickOption(opts.map((o) => ({ value: o.value, text: o.text })), wanted)
    if (!hit) return { state: 'warn', value: `ei vaihtoehtoa "${wanted}" – valitse itse` }
    F.setNativeValue(sel, hit.value)
    return { state: 'ok', value: hit.text }
  }

  async function setCombo(label, wanted) {
    if (!wanted) return { state: 'wait', value: 'ei annettu' }
    const host = wCombo(label)
    if (!host) return { state: 'wait', value: 'ei tässä kategoriassa' }
    const input = innerInput(host)
    if (!input) return { state: 'warn', value: 'kenttää ei löytynyt' }
    input.focus()
    F.setNativeValue(input, String(wanted))
    await F.sleep(700)
    const lis = [...(host.shadowRoot?.querySelectorAll('li[role="option"]') || [])]
    const hit = pickOption(lis.map((li) => ({ el: li, text: li.textContent.trim() })), wanted)
    if (hit) {
      F.realClick(hit.el)
      await F.sleep(300)
      return { state: 'ok', value: hit.text }
    }
    F.blur(input)
    return { state: 'warn', value: `"${wanted}" kirjoitettu – tarkista` }
  }

  function setTextField(host, value) {
    const input = innerInput(host)
    if (!input) return { state: 'warn', value: 'kenttää ei löytynyt' }
    F.setNativeValue(input, String(value ?? ''))
    F.blur(input)
    return { state: 'ok', value: String(value ?? '').slice(0, 60) }
  }

  const CONDITION = {
    new_tags: 'Uusi',
    new: 'Uusi',
    very_good: 'Kuin uusi',
    good: 'Hyvä',
    satisfactory: 'Kohtalainen',
  }

  // ---------- vaihe 1: "Luo ilmoitus" -valinta ----------
  if (location.pathname.startsWith('/create-item/start')) {
    F.renderPanel({ status: 'Avataan Torin ilmoituslomake…', rows: [] })
    const card = await F.waitFor(() => {
      const cards = [...document.querySelectorAll('w-card, .market-card, [class*="cursor-pointer"]')]
      return cards.find((c) => /^\s*Tori\b/.test(c.innerText || '') && /Vaatteita|huonekaluja/i.test(c.innerText || ''))
    })
    if (card) {
      const clickable = card.querySelector('[class*="cursor-pointer"]') || card
      F.realClick(clickable)
    } else {
      F.renderPanel({ status: 'Klikkaa "Tori"-korttia, niin jatkan täyttöä.', rows: [] })
    }
    return
  }

  // ---------- vaihe 2: lomake ----------
  const m = location.pathname.match(/\/recommerce\/create\/(\d+)/)
  if (!m) return
  const draftId = m[1]
  await F.send({ type: 'updateJob', patch: { draftId } })

  const rows = []
  const render = (status, extra = {}) =>
    F.renderPanel({
      status,
      rows,
      ...extra,
      actions: extra.actions || [
        { label: 'Täytä uudelleen', onClick: () => run() },
        {
          label: 'Julkaistu ✓',
          primary: true,
          onClick: () => markListed(),
        },
      ],
    })

  async function markListed() {
    await F.send({
      type: 'event',
      event: {
        type: 'listed',
        platform: 'tori',
        itemId: p.itemId,
        url: `https://www.tori.fi/recommerce/forsale/item/${draftId}`,
      },
    })
    await F.send({ type: 'clearJob' })
    F.renderPanel({ status: 'Merkitty julkaistuksi dashboardiin. 🎉', rows: [], actions: [{ label: 'Sulje', onClick: F.closePanel }] })
  }

  let running = false
  async function run() {
    if (running) return
    running = true
    rows.length = 0
    try {
      render('Odotetaan lomaketta…')
      const ok = await F.waitFor(() => wSelect('Osasto'), { timeout: 20000 })
      if (!ok) {
        render('Lomaketta ei löytynyt. Päivitä sivu.')
        return
      }

      // Kuvat
      if (p.images?.length && !job.imagesDone) {
        const input = await F.waitFor(() => document.querySelector('input[type="file"]'))
        const row = { label: 'Kuvat', state: 'wait', value: '' }
        rows.push(row)
        try {
          const n = await F.uploadImages(input, p.images, (s) => {
            row.value = s
            render('Täytetään…')
          })
          row.state = 'ok'
          row.value = `${n} kuvaa ladattu`
          job.imagesDone = true
          await F.send({ type: 'updateJob', patch: { imagesDone: true } })
        } catch (e) {
          row.state = 'err'
          row.value = String(e.message || e)
        }
        render('Täytetään…')
      } else if (job.imagesDone) {
        rows.push({ label: 'Kuvat', state: 'ok', value: 'ladattu aiemmin' })
      }

      // Kategoriat
      const parts = String(p.category_tori || '').split('>').map((s) => s.trim()).filter(Boolean)
      const levels = ['Osasto', 'Alaosasto', 'Tuoteryhmä']
      if (!parts.length) rows.push({ label: 'Kategoria', state: 'warn', value: 'ei annettu – valitse itse' })
      for (let i = 0; i < Math.min(parts.length, levels.length); i++) {
        const r = await setSelect(levels[i], parts[i])
        rows.push({ label: levels[i], ...r })
        render('Täytetään…')
        if (r.state !== 'ok') break
        await F.sleep(900)
      }
      await F.sleep(800)

      // Kategoriakohtaiset kentät
      if (wSelect('Kunto')) rows.push({ label: 'Kunto', ...(await setSelect('Kunto', CONDITION[p.condition] || 'Hyvä', { timeout: 1500 })) })
      if (wSelect('Väri') && p.color) {
        rows.push({ label: 'Väri', ...(await setSelect('Väri', F.COLOR_TO_TORI[p.color] || p.color, { timeout: 1500 })) })
      }
      if (wCombo('Koko') && p.size) rows.push({ label: 'Koko', ...(await setCombo('Koko', p.size)) })
      if (wCombo('Merkki') && p.brand) rows.push({ label: 'Merkki', ...(await setCombo('Merkki', p.brand)) })
      if (wCombo('Materiaali') && p.material) rows.push({ label: 'Materiaali', ...(await setCombo('Materiaali', p.material)) })
      render('Täytetään…')

      // Tekstit
      rows.push({
        label: 'Otsikko',
        ...setTextField(wText('w-textfield[name="title"], w-textfield[aria-label="Ilmoituksen otsikko"]'), p.title),
        copy: p.title,
      })
      rows.push({
        label: 'Kuvaus',
        ...setTextField(wText('w-textarea[aria-label="Kuvaus"], w-textarea[label="Kuvaus"]'), p.description),
        copy: p.description,
      })
      if (p.price != null) {
        rows.push({
          label: 'Hinta',
          ...setTextField(wText('w-textfield[label="Hinta"], w-textfield[aria-label="Hinta"]'), Math.round(Number(p.price))),
        })
      }
      const postal = wText('w-textfield[label="Postinumero"], w-textfield[aria-label="Postinumero"]')
      if (postal && p.postal_code && !innerInput(postal)?.value) {
        rows.push({ label: 'Postinumero', ...setTextField(postal, p.postal_code) })
      }

      const problems = rows.filter((r) => r.state === 'warn' || r.state === 'err').length
      render(
        problems
          ? `Valmis – ${problems} kenttää tarkistettavana. Paina sitten Torin "Jatka".`
          : 'Valmis! Tarkista ja paina Torin "Jatka" → julkaise.',
        {
          note: 'Kun ilmoitus on julkaistu, paina "Julkaistu ✓", niin linkki tallentuu dashboardiin.',
        },
      )
      await F.send({ type: 'updateJob', patch: { filled: true } })
    } finally {
      running = false
    }
  }

  // Tunnista julkaisu automaattisesti URL:n perusteella
  F.onUrlChange((url) => {
    if (/\/forsale\/item\/\d+/.test(url) || /(receipt|kuitti|confirmation|success|vahvist)/i.test(url)) {
      markListed()
    }
  })

  if (!job.filled) run()
  else render('Lomake on jo täytetty tässä välilehdessä.', { note: 'Paina "Täytä uudelleen", jos jokin kenttä tyhjeni.' })

  // ---------- poisto ----------
  function showRemovePanel(j) {
    F.renderPanel({
      status: `"${j.itemTitle || 'Tuote'}" on myyty muualla – poista tai merkitse tämä ilmoitus myydyksi Torissa.`,
      rows: [],
      actions: [
        {
          label: 'Poistettu ✓',
          primary: true,
          onClick: async () => {
            await F.send({ type: 'event', event: { type: 'removed', platform: 'tori', itemId: j.itemId, url: location.href } })
            await F.send({ type: 'clearJob' })
            F.closePanel()
          },
        },
      ],
    })
  }
})()
