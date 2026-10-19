export const PLATFORMS = {
  tori: { id: 'tori', name: 'Tori', color: '#f15a24', viaExtension: true },
  vinted: { id: 'vinted', name: 'Vinted', color: '#09b1ba', viaExtension: true },
  ebay: { id: 'ebay', name: 'eBay', color: '#0064d2', viaExtension: false, soon: true },
}

export const CONDITIONS = [
  { id: 'new_tags', label: 'Uusi, hintalapulla' },
  { id: 'new', label: 'Uusi, ilman hintalappua' },
  { id: 'very_good', label: 'Erittäin hyvä' },
  { id: 'good', label: 'Hyvä' },
  { id: 'satisfactory', label: 'Tyydyttävä' },
]
export const conditionLabel = (id) => CONDITIONS.find((c) => c.id === id)?.label || id

export const ITEM_STATUSES = [
  { id: 'draft', label: 'Luonnos' },
  { id: 'ready', label: 'Valmis' },
  { id: 'listed', label: 'Myynnissä' },
  { id: 'sold', label: 'Myyty' },
  { id: 'shipped', label: 'Lähetetty' },
  { id: 'archived', label: 'Arkisto' },
]
export const statusLabel = (id) => ITEM_STATUSES.find((s) => s.id === id)?.label || id

export const SHIPPING_SIZES = [
  { id: 'S', label: 'S – kirjekuori / pieni paketti' },
  { id: 'M', label: 'M – kenkälaatikko' },
  { id: 'L', label: 'L – iso paketti' },
  { id: 'XL', label: 'XL – nouto / iso' },
]

export const eur = (n) =>
  n == null || n === '' || Number.isNaN(Number(n))
    ? '–'
    : new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(Number(n))
