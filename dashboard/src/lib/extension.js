// Silta Flippari-Chrome-laajennukseen (externally_connectable).

export const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID || 'gnfpmhnkdhpkbepekgpegcnkjfikgdah'

export function sendToExtension(message, timeoutMs = 4000) {
  return send(message, timeoutMs)
}

function send(message, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const rt = window.chrome?.runtime
    if (!rt?.sendMessage) return reject(new Error('NO_EXTENSION'))
    const t = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    try {
      rt.sendMessage(EXTENSION_ID, message, (resp) => {
        clearTimeout(t)
        const err = window.chrome.runtime.lastError
        if (err) return reject(new Error(err.message || 'NO_EXTENSION'))
        if (resp?.error) return reject(new Error(resp.error))
        resolve(resp)
      })
    } catch (e) {
      clearTimeout(t)
      reject(e)
    }
  })
}

export async function pingExtension() {
  try {
    const r = await send({ type: 'ping' }, 1500)
    return r?.version || null
  } catch {
    return null
  }
}

/** Avaa alustan "uusi ilmoitus" -sivun ja täyttää sen. */
export function publishViaExtension(platform, payload) {
  return send({ type: 'publish', platform, payload }, 8000)
}

/** Avaa olemassa olevan ilmoituksen poistettavaksi. */
export function openForRemoval(platform, url, itemTitle, itemId) {
  return send({ type: 'openRemove', platform, url, itemTitle, itemId }, 8000)
}

/** Hakee laajennuksen keräämät tapahtumat (esim. ilmoitus julkaistu, URL). */
export async function pullExtensionEvents() {
  try {
    const r = await send({ type: 'pullEvents' }, 2000)
    return r?.events || []
  } catch {
    return []
  }
}
