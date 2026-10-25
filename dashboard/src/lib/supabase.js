import { createClient } from '@supabase/supabase-js'
import { DEFAULT_SUPABASE } from './projectConfig.js'

const LS_KEY = 'flippari.supabase'

export function getSupabaseConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (envUrl && envKey) return { url: envUrl, key: envKey, fromEnv: true }
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    if (saved?.url && saved?.key) return { ...saved, fromEnv: false }
  } catch { /* ignore */ }
  if (DEFAULT_SUPABASE?.url && DEFAULT_SUPABASE?.key) return { ...DEFAULT_SUPABASE, fromEnv: true }
  return null
}

export function saveSupabaseConfig(url, key) {
  localStorage.setItem(LS_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }))
}

export function clearSupabaseConfig() {
  localStorage.removeItem(LS_KEY)
}

let client = null
export function sb() {
  if (client) return client
  const cfg = getSupabaseConfig()
  if (!cfg) throw new Error('Supabase ei ole määritetty')
  client = createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return client
}

export const BUCKET = 'item-images'

// ---------- Data helpers ----------

export async function fetchItems() {
  const { data, error } = await sb()
    .from('items')
    .select('*, item_images(id,path,position), listings(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  for (const it of data) it.item_images?.sort((a, b) => a.position - b.position)
  return data
}

export async function fetchItem(id) {
  const { data, error } = await sb()
    .from('items')
    .select('*, item_images(id,path,position), listings(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  data.item_images?.sort((a, b) => a.position - b.position)
  return data
}

export async function createItem(fields = {}) {
  const { data, error } = await sb().from('items').insert(fields).select().single()
  if (error) throw error
  return data
}

export async function updateItem(id, fields) {
  const { data, error } = await sb().from('items').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteItem(item) {
  const paths = (item.item_images || []).map((i) => i.path)
  if (paths.length) await sb().storage.from(BUCKET).remove(paths)
  const { error } = await sb().from('items').delete().eq('id', item.id)
  if (error) throw error
}

export async function upsertListing(itemId, platform, fields) {
  const { data, error } = await sb()
    .from('listings')
    .upsert({ item_id: itemId, platform, ...fields }, { onConflict: 'item_id,platform' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadImage(userId, itemId, blob, position) {
  const path = `${userId}/${itemId}/${crypto.randomUUID()}.jpg`
  const { error } = await sb().storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  const { data, error: e2 } = await sb()
    .from('item_images')
    .insert({ item_id: itemId, path, position })
    .select()
    .single()
  if (e2) throw e2
  return data
}

export async function deleteImage(img) {
  await sb().storage.from(BUCKET).remove([img.path])
  const { error } = await sb().from('item_images').delete().eq('id', img.id)
  if (error) throw error
}

export async function reorderImages(images) {
  await Promise.all(
    images.map((img, i) => sb().from('item_images').update({ position: i }).eq('id', img.id)),
  )
}

const urlCache = new Map()
const isExternal = (p) => /^https?:\/\//.test(p)   // Vintedistä tuotujen tuotteiden kuvat ovat suoria linkkejä

export async function signedUrls(paths, expiresIn = 3600) {
  if (!paths.length) return []
  const now = Date.now()
  const missing = paths.filter((p) => !isExternal(p) && !(urlCache.get(p)?.exp > now + 60_000))
  if (missing.length) {
    const { data, error } = await sb().storage.from(BUCKET).createSignedUrls(missing, expiresIn)
    if (error) throw error
    for (const d of data) {
      if (d.signedUrl) urlCache.set(d.path, { url: d.signedUrl, exp: now + expiresIn * 1000 })
    }
  }
  return paths.map((p) => (isExternal(p) ? p : urlCache.get(p)?.url || null))
}

export async function fetchSettings(userId) {
  const { data, error } = await sb().from('settings').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (data) return data
  const { data: created, error: e2 } = await sb()
    .from('settings')
    .insert({ user_id: userId })
    .select()
    .single()
  if (e2) throw e2
  return created
}

export async function saveSettings(userId, fields) {
  const { data, error } = await sb()
    .from('settings')
    .update(fields)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
