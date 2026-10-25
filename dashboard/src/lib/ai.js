// Tekoälytoiminnot Claude API:lla suoraan selaimesta (oma avain asetuksista).
import { TORI_CATEGORY_TREE } from './toriCategories.js'
import { VINTED_CATEGORY_TREE } from './vintedCategories.js'

export const COLOR_CODES = [
  'BLACK', 'GREY', 'WHITE', 'CREAM', 'BODY', 'APRICOT', 'ORANGE', 'CORAL', 'RED', 'BURGUNDY', 'PINK', 'ROSE',
  'PURPLE', 'LILAC', 'LIGHT-BLUE', 'BLUE', 'NAVY', 'TURQUOISE', 'MINT', 'GREEN', 'DARK-GREEN', 'KHAKI', 'BROWN',
  'MUSTARD', 'YELLOW', 'SILVER', 'GOLD', 'VARIOUS', 'CLEAR',
]
export const COLOR_FI = {
  BLACK: 'Musta', GREY: 'Harmaa', WHITE: 'Valkoinen', CREAM: 'Kerma', BODY: 'Beige', APRICOT: 'Aprikoosi',
  ORANGE: 'Oranssi', CORAL: 'Koralli', RED: 'Punainen', BURGUNDY: 'Viininpunainen', PINK: 'Vaaleanpunainen',
  ROSE: 'Roosa', PURPLE: 'Violetti', LILAC: 'Liila', 'LIGHT-BLUE': 'Vaaleansininen', BLUE: 'Sininen',
  NAVY: 'Tummansininen', TURQUOISE: 'Turkoosi', MINT: 'Minttu', GREEN: 'Vihreä', 'DARK-GREEN': 'Tummanvihreä',
  KHAKI: 'Khaki', BROWN: 'Ruskea', MUSTARD: 'Sinappi', YELLOW: 'Keltainen', SILVER: 'Hopea', GOLD: 'Kulta',
  VARIOUS: 'Monivärinen', CLEAR: 'Läpinäkyvä',
}

const LISTING_TOOL = {
  name: 'save_listing',
  description: 'Tallenna valmis myynti-ilmoitus tuotteelle.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Suomenkielinen otsikko, max 60 merkkiä: merkki + malli/tuote + tärkein ominaisuus + koko.' },
      description: { type: 'string', description: 'Suomenkielinen kuvaus 3–8 riviä: mikä tuote, kunto rehellisesti (myös viat), mitat/koko, materiaali. Ei hashtageja eikä emojeja.' },
      title_en: { type: 'string', description: 'English title for eBay/international buyers, max 80 chars, keyword-rich.' },
      description_en: { type: 'string', description: 'English description for international buyers.' },
      brand: { type: 'string', description: 'Merkki tai valmistaja sellaisena kuin se kirjoitetaan (esim. "Arc\'teryx", "Hoka"). Tyhjä jos ei tunnistettavissa.' },
      category: { type: 'string', description: 'Lyhyt yleiskategoria suomeksi, esim. "Miesten kengät > Lenkkarit".' },
      category_tori: { type: 'string', description: 'TÄSMÄLLEEN yksi polku annetusta Torin kategoriapuusta muodossa "Osasto > Alaosasto > Tuoteryhmä" (tuoteryhmä vain jos alaosastolla on niitä).' },
      category_vinted: { type: 'string', description: 'TÄSMÄLLEEN yksi polku annetusta Vintedin kategoriapuusta muodossa "Yläkategoria > Lehti", esim. "Miehet > Vaatteet > Neulepuserot ja villapaidat > Hupparit ja collegepuserot". Valitse sukupuoli tuotteen mukaan (unisex ja epäselvä = Miehet). Tyhjä jos tuote ei sovi puuhun.' },
      size: { type: 'string', description: 'Koko täsmälleen sellaisena kuin se näkyy kuvan lapussa, kengän kielessä tai myyjän lisätiedoissa (M, 38, 42 1/3, W32 L32). ÄLÄ ARVAA ulkonäöstä: jos kokoa ei näy, jätä tyhjäksi. Kengissä EU-koko; jos lapussa on vain UK/US-koko, jätä tyhjäksi.' },
      condition: { type: 'string', enum: ['new_tags', 'new', 'very_good', 'good', 'satisfactory'] },
      color: { type: 'string', enum: COLOR_CODES, description: 'Pääväri koodina.' },
      material: { type: 'string', description: 'Päämateriaali suomeksi (esim. Puuvilla, Nahka, Keramiikka). Tyhjä jos ei tiedossa.' },
      material_en: { type: 'string', description: 'Sama materiaali englanniksi (Cotton, Leather, Ceramic).' },
      price: { type: 'number', description: 'Suositeltu pyyntihinta euroina Suomen käytettyjen markkinoilla.' },
      min_price: { type: 'number', description: 'Alin järkevä hinta nopeaan myyntiin.' },
      price_reasoning: { type: 'string', description: '1–2 lausetta hinnan perusteista.' },
      authenticity_notes: { type: 'string', description: 'Jos merkkituote: mitä aitoudesta tarkistaa. Muuten tyhjä.' },
      shipping_size: { type: 'string', enum: ['S', 'M', 'L', 'XL'], description: 'S = kirjekuori, M = kenkälaatikko, L = muuttolaatikko, XL = vain nouto.' },
    },
    required: ['title', 'description', 'title_en', 'description_en', 'brand', 'category', 'category_tori', 'category_vinted', 'condition', 'color', 'price', 'min_price', 'shipping_size'],
  },
}

// $ / miljoona tokenia (input, output). Verkkohaku $0.01 / haku.
const PRICES = {
  'claude-haiku-4-5': [1, 5],
  'claude-sonnet-4-5': [3, 15],
  'claude-opus-4-1': [15, 75],
}
export function costOf(json, model) {
  const [pin, pout] = PRICES[model] || PRICES['claude-sonnet-4-5']
  const u = json?.usage || {}
  const tokensIn = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) * 0.1
  const searches = u.server_tool_use?.web_search_requests || 0
  return (tokensIn * pin + (u.output_tokens || 0) * pout) / 1e6 + searches * 0.01
}

export const DEAL_MODEL = 'claude-haiku-4-5'

async function callClaude({ apiKey, model, body }) {
  if (!apiKey) throw new Error('Lisää Claude API -avain asetuksiin.')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: model || 'claude-sonnet-4-5', ...body }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Claude API: ${json?.error?.message || res.status}`)
  return json
}

export async function generateListing({ apiKey, model, imageUrls, hints, signature }) {
  if (!imageUrls.length) throw new Error('Lisää vähintään yksi kuva.')
  const content = [
    ...imageUrls.slice(0, 8).map((url) => ({ type: 'image', source: { type: 'url', url } })),
    {
      type: 'text',
      text: [
        'Olet kokenut suomalainen jälleenmyyjä (Tori, Vinted, eBay). Tee kuvien perusteella myynti-ilmoitus.',
        'Ole rehellinen kunnosta. Älä keksi tietoja, joita kuvista ei näe – jätä kenttä tyhjäksi. Erityisesti kokoa ei saa arvata.',
        'Sukupuoli (Vinted- ja Tori-kategoria): naisten jos lapussa, mallissa tai lisätiedoissa on naisten/women/W/damski, muuten miesten.',
        hints ? `Myyjän lisätiedot (luota näihin): ${hints}` : '',
        signature ? `Lisää suomenkielisen kuvauksen loppuun tämä allekirjoitus sellaisenaan:\n${signature}` : '',
        `Torin kategoriapuu (valitse category_tori tästä täsmälleen samoilla nimillä):\n${TORI_CATEGORY_TREE}`,
        `Vintedin kategoriapuu (valitse category_vinted tästä: rivin alku + yksi "|"-eroteltu lehti, täsmälleen samoilla nimillä):\n${VINTED_CATEGORY_TREE}`,
      ].filter(Boolean).join('\n\n'),
    },
  ]
  const json = await callClaude({
    apiKey,
    model,
    body: {
      max_tokens: 2500,
      tools: [LISTING_TOOL],
      tool_choice: { type: 'tool', name: LISTING_TOOL.name },
      messages: [{ role: 'user', content }],
    },
  })
  const block = json.content?.find((b) => b.type === 'tool_use')
  if (!block) throw new Error('Claude ei palauttanut ilmoitusta.')
  return block.input
}

// ---------------- Ostoapuri ----------------

/**
 * Arvioi kannattaako tuote ostaa jälleenmyyntiin. Käyttää verkkohakua hintadataan.
 * Palauttaa { verdict, item, median_price, price_low, price_high, expected_sale_price,
 *            profit, sell_speed, platforms, reasoning, sources[] }
 */
export async function evaluateDeal({ apiKey, model = DEAL_MODEL, imageDataUrls = [], text, buyPrice, minProfit = 10, useWebSearch = true }) {
  const content = [
    ...imageDataUrls.slice(0, 4).map((d) => {
      const [meta, data] = d.split(',')
      const media_type = meta.match(/data:(.*?);/)?.[1] || 'image/jpeg'
      return { type: 'image', source: { type: 'base64', media_type, data } }
    }),
    {
      type: 'text',
      text: `Olet suomalainen jälleenmyynnin ammattilainen. Arvioi kannattaako tämä tuote ostaa edelleenmyyntiin Suomessa (Tori, Vinted, Huuto.net) tai ulkomaille (eBay).

Tuote: ${text || '(katso kuvat)'}
Ostohinta: ${buyPrice != null && buyPrice !== '' ? buyPrice + ' €' : 'ei tiedossa – kerro maksimiostohinta'}
Myyjän tavoite: vähintään ${minProfit} € voittoa per tuote alustamaksujen ja postikulujen jälkeen.

${useWebSearch ? 'Tee korkeintaan 2 tarkkaa verkkohakua (esim. Tori + Vinted tai eBay sold) toteutuneista tai pyydetyistä hinnoista ja laske mediaani. Käytetyn tuotteen hinta, ei uuden.' : 'Arvioi hinnat oman tietämyksesi perusteella.'}

Vastaa LOPUKSI pelkällä JSON-objektilla (ei muuta tekstiä sen jälkeen) tässä muodossa:
{"verdict":"OSTA|HARKITSE|ÄLÄ OSTA","item":"tunnistettu tuote","median_price":0,"price_low":0,"price_high":0,"expected_sale_price":0,"max_buy_price":0,"profit":0,"sell_speed":"nopea|keskiverto|hidas","platforms":["Tori"],"reasoning":"2–4 lausetta","authenticity":"mitä tarkistaa tai tyhjä"}`,
    },
  ]
  const body = {
    max_tokens: 3000,
    messages: [{ role: 'user', content }],
  }
  if (useWebSearch) body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }]
  const json = await callClaude({ apiKey, model, body })

  const texts = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n')
  const match = texts.match(/\{[\s\S]*\}\s*$/) || texts.match(/\{[\s\S]*"verdict"[\s\S]*\}/)
  if (!match) throw new Error('Arviota ei saatu luettua. Yritä uudelleen.')
  let result
  try {
    result = JSON.parse(match[0])
  } catch {
    throw new Error('Arvion muoto oli virheellinen. Yritä uudelleen.')
  }
  const sources = []
  for (const b of json.content || []) {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content) if (r.url) sources.push({ url: r.url, title: r.title })
    }
  }
  result.sources = sources.slice(0, 8)
  result.cost_usd = Math.round(costOf(json, model) * 1000) / 1000
  return result
}
