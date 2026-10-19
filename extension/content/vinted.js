// Flippari – Vinted-täyttö
/* global Flippari */
;(async () => {
  const F = window.Flippari
  if (!F || window.__flippariVinted) return
  window.__flippariVinted = true

  const resp = await F.send({ type: 'getJob' }).catch(() => null)
  const job = resp?.job
  if (!job || job.platform !== 'vinted') return

  if (job.kind === 'remove') return showRemovePanel(job)
  if (job.kind !== 'publish') return
  if (!/^\/items\/new/.test(location.pathname)) return

  const p = job.payload
  const $ = (s, root = document) => root.querySelector(s)
  const $$ = (s, root = document) => [...root.querySelectorAll(s)]
  const tid = (t) => $(`[data-testid="${t}"]`)

  const CONDITION_ID = { new_tags: 6, new: 1, very_good: 2, good: 3, satisfactory: 4 }
  const PACKAGE = { S: 1, M: 2, L: 3, XL: 3 }

  function closeDropdowns() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    F.realClick($('h1') || document.body)
  }

  async function openDropdown(inputTid) {
    const input = tid(inputTid)
    if (!input) return null
    F.realClick(input)
    const content = await F.waitFor(() => tid(inputTid.replace(/-input$/, '-content')), { timeout: 3000 })
    return content
  }

  function setText(selector, value) {
    const el = $(selector)
    if (!el) return { state: 'warn', value: 'kenttää ei löytynyt' }
    F.setNativeValue(el, String(value ?? ''))
    F.blur(el)
    return { state: 'ok', value: String(value ?? '').slice(0, 60) }
  }

  // ---------- kategoriat ----------
  async function setCategory(path) {
    const parts = String(path || '').split('>').map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return { state: 'warn', value: 'ei annettu – valitse itse' }
    const content = await openDropdown('catalog-select-dropdown-input')
    if (!content) return { state: 'warn', value: 'valitsinta ei löytynyt' }
    const search = $('#catalog-search-input', content)
    const tokens = parts.map(F.norm)

    for (const q of [parts[parts.length - 1], parts[parts.length - 2]].filter(Boolean)) {
      F.setNativeValue(search, q)
      await F.sleep(1200)
      const results = $$('[id^="catalog-search-"][id$="-result"]', content).map((el) => {
        const text = F.norm(el.innerText.replace(/\n/g, ' | '))
        // kokonaiset sanat: "men" ei saa osua "women"-sanaan
        const hasWord = (t) => new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text)
        const score = tokens.reduce((s, t, i) => s + (hasWord(t) ? 1 + i * 0.5 : 0), 0)
        return { el, text: el.innerText.replace(/\n/g, ' – '), score }
      })
      results.sort((a, b) => b.score - a.score)
      if (results[0] && results[0].score > 0) {
        F.realClick(results[0].el)
        await F.sleep(800)
        return { state: 'ok', value: results[0].text }
      }
    }
    closeDropdowns()
    return { state: 'warn', value: `"${parts.join(' > ')}" – valitse itse` }
  }

  // ---------- merkki ----------
  async function setBrand(brand) {
    if (!brand) return { state: 'wait', value: 'ei annettu' }
    const content = await openDropdown('brand-select-dropdown-input')
    if (!content) return { state: 'wait', value: 'ei tässä kategoriassa' }
    const search = $('#brand-search-input', content)
    F.setNativeValue(search, brand)
    await F.sleep(1300)
    const options = $$('[id^="brand-"]', content).filter((el) => /^brand-\d+$/.test(el.id))
    const want = F.norm(brand)
    const hit =
      options.find((o) => F.norm(o.innerText) === want) ||
      options.find((o) => F.norm(o.innerText).startsWith(want)) ||
      null
    if (hit) {
      F.realClick(hit)
      await F.sleep(500)
      return { state: 'ok', value: hit.innerText.trim() }
    }
    // "Käytä X merkkinä" -vaihtoehto, jos Vinted tarjoaa sen
    const custom = $$('[role="button"], button', content).find((el) => F.norm(el.innerText).includes(want) && el.id !== 'brand-search-input')
    if (custom) {
      F.realClick(custom)
      await F.sleep(500)
      return { state: 'ok', value: brand }
    }
    closeDropdowns()
    return { state: 'warn', value: `"${brand}" ei löytynyt – valitse itse` }
  }

  // ---------- koko ----------
  async function setSize(size) {
    if (!size) return { state: 'wait', value: 'ei annettu' }
    // Kokovalitsimen testid vaihtelee kategorian mukaan (grid / grid_chips / list)
    const sizeTid = $('#size')?.dataset.testid
    const content = sizeTid ? await openDropdown(sizeTid) : null
    if (!content) return { state: 'wait', value: 'ei tässä kategoriassa' }
    const want = F.norm(String(size).replace(',', '.'))
    const find = () => $$('[role="checkbox"][aria-label], [role="radio"][aria-label]', content).find((el) => F.norm(el.getAttribute('aria-label')) === want)
    let hit = find()
    if (!hit) {
      const systems = $$('[data-testid="size-grid-chips"] button', content)
      for (const b of systems) {
        F.realClick(b)
        await F.sleep(400)
        hit = find()
        if (hit) break
      }
    }
    if (hit) {
      F.realClick(hit)
      await F.sleep(400)
      closeDropdowns()
      return { state: 'ok', value: hit.getAttribute('aria-label') }
    }
    closeDropdowns()
    return { state: 'warn', value: `kokoa "${size}" ei löytynyt – valitse itse` }
  }

  // ---------- kunto ----------
  async function setCondition(cond) {
    const id = CONDITION_ID[cond]
    if (!id) return { state: 'warn', value: 'valitse itse' }
    const content = await openDropdown('category-condition-single-list-input')
    if (!content) return { state: 'wait', value: 'ei tässä kategoriassa' }
    const cell = $(`#condition-${id}`, content)
    if (!cell) {
      closeDropdowns()
      return { state: 'warn', value: 'valitse itse' }
    }
    F.realClick(cell)
    await F.sleep(400)
    return { state: 'ok', value: cell.innerText.split('\n')[0] }
  }

  // ---------- väri ----------
  async function setColor(code) {
    if (!code) return { state: 'wait', value: 'ei annettu' }
    const content = await openDropdown('color-select-dropdown-input')
    if (!content) return { state: 'wait', value: 'ei tässä kategoriassa' }
    const swatch = $(`[data-testid="color_code_${code}"]`, content)
    const box = swatch?.closest('[role="checkbox"]')
    if (!box) {
      closeDropdowns()
      return { state: 'warn', value: 'valitse itse' }
    }
    if (box.getAttribute('aria-checked') !== 'true') F.realClick(box)
    await F.sleep(300)
    closeDropdowns()
    return { state: 'ok', value: box.getAttribute('aria-label') }
  }

  // ---------- materiaali ----------
  async function setMaterial(names) {
    const wanted = names.filter(Boolean).map(F.norm)
    if (!wanted.length) return { state: 'wait', value: 'ei annettu' }
    const content = await openDropdown('category-material-multi-list-input')
    if (!content) return { state: 'wait', value: 'ei tässä kategoriassa' }
    const cells = $$('[id^="material-"]', content).filter((el) => /^material-\d+$/.test(el.id))
    const hit = cells.find((c) => wanted.includes(F.norm(c.innerText)))
    if (hit) {
      F.realClick(hit)
      await F.sleep(300)
    }
    closeDropdowns()
    return hit ? { state: 'ok', value: hit.innerText.trim() } : { state: 'warn', value: 'valitse itse (suositeltu)' }
  }

  // ---------- paketti ----------
  function setPackage(size) {
    const n = PACKAGE[size] || 2
    const cell = tid(`${n}-package-size--cell`) || tid(`package_type_selector_${n}--input`)
    if (!cell) return { state: 'wait', value: 'ei näkyvissä' }
    F.realClick(cell)
    return { state: 'ok', value: ['', 'Pieni', 'Keskikokoinen', 'Suuri'][n] }
  }

  // ---------- ajo ----------
  const rows = []
  const render = (status, extra = {}) =>
    F.renderPanel({
      status,
      rows,
      ...extra,
      actions: [
        { label: 'Täytä uudelleen', onClick: () => run(true) },
        { label: 'Sulje', onClick: F.closePanel },
      ],
    })

  let running = false
  async function run(force = false) {
    if (running) return
    running = true
    rows.length = 0
    try {
      render('Odotetaan lomaketta…')
      const ready = await F.waitFor(() => $('#title') && tid('add-photos-input'), { timeout: 20000 })
      if (!ready) return render('Lomaketta ei löytynyt. Oletko kirjautunut Vintediin?')

      if (p.images?.length && (!job.imagesDone || force === 'images')) {
        const row = { label: 'Kuvat', state: 'wait', value: '' }
        rows.push(row)
        try {
          const n = await F.uploadImages(tid('add-photos-input'), p.images, (s) => {
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
      } else if (job.imagesDone) {
        rows.push({ label: 'Kuvat', state: 'ok', value: 'ladattu jo' })
      }

      rows.push({ label: 'Otsikko', ...setText('#title', p.title), copy: p.title })
      rows.push({ label: 'Kuvaus', ...setText('#description', p.description), copy: p.description })
      render('Täytetään…')

      rows.push({ label: 'Kategoria', ...(await setCategory(p.category_vinted)) })
      render('Täytetään…')
      await F.sleep(1000)

      rows.push({ label: 'Merkki', ...(await setBrand(p.brand)) })
      render('Täytetään…')
      rows.push({ label: 'Koko', ...(await setSize(p.size)) })
      render('Täytetään…')
      rows.push({ label: 'Kunto', ...(await setCondition(p.condition)) })
      render('Täytetään…')
      rows.push({ label: 'Väri', ...(await setColor(p.color)) })
      rows.push({ label: 'Materiaali', ...(await setMaterial([p.material_en, p.material])) })
      render('Täytetään…')

      if (p.price != null) rows.push({ label: 'Hinta', ...setText('#price', Number(p.price).toFixed(2)) })
      await F.sleep(500)
      rows.push({ label: 'Paketti', ...setPackage(p.shipping_size) })

      const problems = rows.filter((r) => r.state === 'warn' || r.state === 'err').length
      render(
        problems
          ? `Valmis – ${problems} kenttää tarkistettavana. Paina sitten "Lataa / Upload".`
          : 'Valmis! Tarkista ja paina "Lataa / Upload".',
        { note: 'Julkaisun jälkeen linkki tallentuu dashboardiin automaattisesti.' },
      )
      await F.send({ type: 'updateJob', patch: { filled: true } })
    } finally {
      running = false
    }
  }

  // Julkaisun tunnistus: Vinted siirtyy /items/<id>-sivulle
  F.onUrlChange(async (url) => {
    const m = url.match(/\/items\/(\d+)/)
    if (m) {
      await F.send({ type: 'event', event: { type: 'listed', platform: 'vinted', itemId: p.itemId, url: url.split('?')[0] } })
      await F.send({ type: 'clearJob' })
      F.renderPanel({ status: 'Julkaistu ja tallennettu dashboardiin. 🎉', rows: [], actions: [{ label: 'Sulje', onClick: F.closePanel }] })
    }
  })

  if (!job.filled) run()
  else render('Lomake on jo täytetty tässä välilehdessä.', { note: 'Paina "Täytä uudelleen", jos sivu latautui uudelleen.' })

  function showRemovePanel(j) {
    F.renderPanel({
      status: `"${j.itemTitle || 'Tuote'}" on myyty muualla – poista tämä ilmoitus Vintedistä (… → Poista).`,
      rows: [],
      actions: [
        {
          label: 'Poistettu ✓',
          primary: true,
          onClick: async () => {
            await F.send({ type: 'event', event: { type: 'removed', platform: 'vinted', itemId: j.itemId, url: location.href } })
            await F.send({ type: 'clearJob' })
            F.closePanel()
          },
        },
      ],
    })
  }
})()
