// Flippari – taustaprosessi (MV3 service worker)

const VERSION = chrome.runtime.getManifest().version

const START_URLS = {
  tori: 'https://www.tori.fi/create-item/start',
  vinted: 'https://www.vinted.fi/items/new',
}
// ---------------------------------------------------------------- tallennus
async function getJobs() {
  const { jobs = {} } = await chrome.storage.session.get('jobs')
  return jobs
}
async function setJob(tabId, job) {
  const jobs = await getJobs()
  if (job) jobs[tabId] = job
  else delete jobs[tabId]
  await chrome.storage.session.set({ jobs })
}
async function pushEvent(ev) {
  const { events = [] } = await chrome.storage.local.get('events')
  events.push({ ...ev, at: new Date().toISOString() })
  await chrome.storage.local.set({ events: events.slice(-300) })
}

// ---------------------------------------------------------------- kuvat
async function fetchAsDataUrl(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Kuvan haku epäonnistui (${res.status})`)
  const blob = await res.blob()
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`
}

// ---------------------------------------------------------------- viestit dashboardilta
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  ;(async () => {
    try {
      switch (msg?.type) {
        case 'ping':
          return sendResponse({ ok: true, version: VERSION })

        case 'publish': {
          const url = START_URLS[msg.platform]
          if (!url) return sendResponse({ error: `Tuntematon alusta: ${msg.platform}` })
          const tab = await chrome.tabs.create({ url, active: true })
          await setJob(tab.id, { kind: 'publish', platform: msg.platform, payload: msg.payload, createdAt: Date.now(), filled: false })
          return sendResponse({ ok: true, tabId: tab.id })
        }

        case 'openRemove': {
          const tab = await chrome.tabs.create({ url: msg.url, active: true })
          await setJob(tab.id, { kind: 'remove', platform: msg.platform, itemTitle: msg.itemTitle, itemId: msg.itemId, createdAt: Date.now() })
          return sendResponse({ ok: true, tabId: tab.id })
        }

        case 'pullEvents': {
          const { events = [] } = await chrome.storage.local.get('events')
          await chrome.storage.local.set({ events: [] })
          return sendResponse({ ok: true, events })
        }

        default:
          return sendResponse({ error: 'Tuntematon viesti' })
      }
    } catch (e) {
      sendResponse({ error: String(e?.message || e) })
    }
  })()
  return true
})

// ---------------------------------------------------------------- viestit sisältöskripteiltä
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id
  ;(async () => {
    try {
      switch (msg?.type) {
        case 'getJob': {
          const jobs = await getJobs()
          return sendResponse({ job: jobs[tabId] || null })
        }
        case 'updateJob': {
          const jobs = await getJobs()
          if (jobs[tabId]) await setJob(tabId, { ...jobs[tabId], ...msg.patch })
          return sendResponse({ ok: true })
        }
        case 'clearJob':
          await setJob(tabId, null)
          return sendResponse({ ok: true })
        case 'fetchImage':
          return sendResponse({ dataUrl: await fetchAsDataUrl(msg.url) })
        case 'event':
          await pushEvent(msg.event)
          return sendResponse({ ok: true })
        default:
          return sendResponse({ error: 'Tuntematon viesti' })
      }
    } catch (e) {
      sendResponse({ error: String(e?.message || e) })
    }
  })()
  return true
})

chrome.tabs.onRemoved.addListener((tabId) => {
  setJob(tabId, null)
})
