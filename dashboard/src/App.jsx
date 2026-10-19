import React, { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabaseConfig, sb, fetchItems, fetchSettings, upsertListing, updateItem } from './lib/supabase.js'
import { pingExtension, pullExtensionEvents } from './lib/extension.js'
import Setup from './components/Setup.jsx'
import Login from './components/Login.jsx'
import Inventory from './components/Inventory.jsx'
import ItemEditor from './components/ItemEditor.jsx'
import DealCheck from './components/DealCheck.jsx'
import Settings from './components/Settings.jsx'
import Tarpit from './components/Tarpit.jsx'

export const Toast = React.createContext(() => {})

const TABS = [
  { id: 'inventory', label: 'Varasto' },
  { id: 'tarpit', label: 'Tärpit' },
  { id: 'deal', label: 'Ostoapuri' },
  { id: 'settings', label: 'Asetukset' },
]

export default function App() {
  const [configured, setConfigured] = useState(!!getSupabaseConfig())
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!configured) return
    sb().auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb().auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [configured])

  if (!configured) return <Setup onDone={() => setConfigured(true)} />
  if (session === undefined) return <div className="center-screen"><span className="spinner" /></div>
  if (!session) return <Login />
  return <Main user={session.user} />
}

function Main({ user }) {
  const [tab, setTab] = useState('inventory')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [extVersion, setExtVersion] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef()

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const reload = useCallback(async () => {
    try {
      setItems(await fetchItems())
    } catch (e) {
      showToast(`Virhe: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    reload()
    fetchSettings(user.id).then(setSettings).catch((e) => showToast(e.message))
    pingExtension().then(setExtVersion)
  }, [user.id, reload, showToast])

  // Laajennuksen tapahtumat (julkaistu / poistettu) → tietokantaan
  useEffect(() => {
    let stop = false
    async function tick() {
      const events = await pullExtensionEvents()
      if (!events.length || stop) return
      for (const ev of events) {
        try {
          if (!ev.itemId) continue
          if (ev.type === 'listed') {
            await upsertListing(ev.itemId, ev.platform, { status: 'listed', url: ev.url, listed_at: ev.at })
            const it = items.find((i) => i.id === ev.itemId)
            if (!it || ['draft', 'ready'].includes(it.status)) await updateItem(ev.itemId, { status: 'listed' })
            showToast(`Julkaistu: ${ev.platform}`)
          } else if (ev.type === 'removed') {
            await upsertListing(ev.itemId, ev.platform, { status: 'removed', removed_at: ev.at })
            showToast(`Poistettu: ${ev.platform}`)
          }
        } catch (e) {
          console.warn(e)
        }
      }
      reload()
    }
    const id = setInterval(tick, 4000)
    const onFocus = () => {
      tick()
      pingExtension().then(setExtVersion)
    }
    window.addEventListener('focus', onFocus)
    return () => {
      stop = true
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [items, reload, showToast])

  return (
    <Toast.Provider value={showToast}>
      <div className="app">
        <header className="topbar">
          <div className="brand"><span className="logo">F</span>Flippari</div>
          <nav className="nav">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </nav>
          <div className="spacer" />
          <span className={`ext-pill ${extVersion ? 'ok' : ''}`} title="Chrome-laajennus täyttää Torin ja Vintedin lomakkeet">
            {extVersion ? `Laajennus ${extVersion} ✓` : 'Laajennus ei käytössä'}
          </span>
        </header>

        {tab === 'inventory' && (
          <Inventory items={items} loading={loading} user={user} onOpen={setOpenId} onReload={reload} />
        )}
        {tab === 'tarpit' && <Tarpit settings={settings} onCreateItem={(id) => { reload(); setOpenId(id); setTab('inventory') }} />}
        {tab === 'deal' &&<DealCheck settings={settings} user={user} onCreateItem={(id) => { reload(); setOpenId(id); setTab('inventory') }} />}
        {tab === 'settings' && <Settings user={user} settings={settings} onSaved={setSettings} extVersion={extVersion} />}

        <nav className="mobile-nav">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
      </div>

      {openId && (
        <ItemEditor
          key={openId}
          itemId={openId}
          user={user}
          settings={settings}
          extVersion={extVersion}
          onClose={() => { setOpenId(null); reload() }}
          onChanged={reload}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </Toast.Provider>
  )
}
