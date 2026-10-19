import { TORI_CATEGORY_TREE } from './toriCategories.js'

/** Kaikki Torin täydet kategoriapolut listana (datalistiä varten). */
export const TORI_PATHS = TORI_CATEGORY_TREE.split('\n').flatMap((line) => {
  const parts = line.split(' > ')
  if (parts.length < 3) return [line.trim()]
  const base = parts.slice(0, 2).join(' > ')
  return parts[2].split(' | ').map((g) => `${base} > ${g.trim()}`)
})
