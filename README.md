# Flippari

Oma jälleenmyynnin työkalu: varasto, tekoälyilmoitukset, ristiinlistaus Toriin ja Vintediin, tärpit (flip-radar) ja ostoapuri.

```
flippari/
├── supabase/schema.sql   – tietokanta (aja kerran Supabasessa)
├── dashboard/            – web-sovellus (React + Vite), toimii myös puhelimella
└── extension/            – Chrome-laajennus, joka täyttää Torin ja Vintedin lomakkeet
```

flip-radar (`~/flip-radar`) toimii tärppitutkana ja vie löydöt Flipparin Tärpit-sivulle.

---

## 1. Supabase ✅ valmis

Projekti **flippari** (kisseteam-organisaatio, EU) on luotu ja skeema ajettu. Osoite ja julkinen anon-avain ovat valmiina tiedostossa `dashboard/src/lib/projectConfig.js`.

Jos luot projektin joskus uudelleen, aja `supabase/schema.sql` SQL Editorissa.

## 2. Dashboard

Paikallisesti:

```bash
cd dashboard
npm install
npm run dev          # → http://localhost:3000
```

Luo tunnus ensimmäisellä avauksella ja vahvista sähköpostiin tullut linkki.

Puhelinkäyttöä varten (suositus) julkaise sovellus Verceliin:

```bash
npm i -g vercel
cd dashboard && vercel           # framework: Vite, output: dist
```

Voit myös lisätä `VITE_SUPABASE_URL` ja `VITE_SUPABASE_ANON_KEY` Vercelin ympäristömuuttujiksi, niin asetuskysely jää pois. Puhelimessa avaa sivu ja valitse **Jaa → Lisää Koti-valikkoon**, jolloin se toimii kuin sovellus.

**Asetukset-välilehdellä:** lisää Claude API -avain (console.anthropic.com), postinumero ja allekirjoitus.

## 3. Chrome-laajennus

1. Avaa `chrome://extensions` ja laita **Kehittäjätila** päälle.
2. Valitse **Lataa pakkaamaton** → `extension`-kansio.
3. ID:n pitää olla `gnfpmhnkdhpkbepekgpegcnkjfikgdah` (kiinteä avain manifestissa).
4. Kirjaudu Toriin ja Vintediin samassa Chromessa.
5. Päivitä dashboard. Yläpalkissa pitää näkyä **Laajennus 0.2.0 ✓**.

Jos julkaiset dashboardin omaan domainiin (ei vercel.app / netlify.app / localhost), lisää domain `extension/manifest.json` → `externally_connectable.matches` ja lataa laajennus uudelleen.

### Näin julkaisu toimii

1. Lisää tuote ja ota kuvat (myös puhelimella).
2. Valitse **Tee ilmoitus kuvista**. Tekoäly täyttää otsikon, kuvauksen, merkin, koon, kunnon, värin, kategoriat ja hinnan.
3. Valitse **Julkaise Tori** tai **Julkaise Vinted**. Uusi välilehti avautuu ja laajennus täyttää lomakkeen kuvineen. Oikean alakulman paneeli näyttää, mitkä kentät täyttyivät.
4. Tarkista lomake ja paina alustan omaa *Jatka / Julkaise / Lataa* -nappia. Laajennus ei koskaan julkaise itse.
5. Linkki tallentuu dashboardiin. Vintedissä tämä tapahtuu automaattisesti, Torissa painamalla paneelin *Julkaistu ✓*.
6. Kun tuote myy, valitse **Merkitse myydyksi**. Muiden alustojen ilmoitukset saat poistettua valinnalla *Avaa ja poista*.

## 4. flip-radar → Tärpit

flip-radariin tehtiin kaksi korjausta (varmuuskopiot: `~/flip-radar/.flippari-backup/`):

- **Vinted poisti `/api/v2/catalog/items`-rajapinnan (syyskuu 2026).** Tutka hakee nyt tuotteet `/catalog`-sivun datasta, ja haku, diilijahti ja uusimmat-poller toimivat taas.
- **Kaatumiskierre korjattu.** Epäonnistunut Chrome-yhteys aiheutti aiemmin jatkuvan *"Sync API inside the asyncio loop"* -virheen.

Vienti Flipparin Tärpit-sivulle on valmiiksi kytketty `~/flip-radar/config.json` → `"flippari"` (osoite ja anon-avain täytetty). Lisää vielä:

1. **`ingest_token`**: Flippari → Asetukset → **Luo tutka-avain** → kopioi ja liitä. Avaimella voi vain lisätä tärppejä, joten service_role-avainta ei tarvita.
2. **`anthropic_key`** (valinnainen, mutta suositeltava turhien tärppien karsintaan).
3. **`ntfy_topic`** on valmiiksi arvottu. Tilaa sama aihe puhelimen ntfy-sovelluksessa.

- **Vähemmän turhia tärppejä:** dashboardille viedään vain tärpit, joiden arvioitu nettovoitto on vähintään `min_net` (10 €). Kun `ai_verify` on päällä, Claude Haiku katsoo jokaisen tärpin kuvan ja hylkää esimerkiksi lasten koot, feikkiriskit ja harhaanjohtavat vertailut. Hinta on noin 0,1–0,3 senttiä per tärppi. Tärpit-sivulla on lisäksi voittoliukusäädin ja ✕-nappi.
- **Push puhelimeen:** asenna *ntfy*-sovellus (iOS/Android), tilaa sama `ntfy_topic` ja keksi siihen vaikeasti arvattava nimi. Ilmoitus tulee, kun nettovoitto on vähintään `notify_min_net`, ja sitä napauttamalla ilmoitus avautuu suoraan.

Käynnistys tapahtuu kuten ennenkin:

```bash
cd ~/flip-radar
.venv/bin/pip install -U playwright     # suositus: uusin Playwright
./run.sh
```

Jos lokissa näkyy *"Browser context management is not supported"*, sulje flip-radarin Chrome-ikkuna kokonaan ja käynnistä `./run.sh` uudelleen.

## 5. Ostoapuri

Ota kirpparilla kuva (myös merkkilapusta) ja syötä ostohinta. Tekoäly hakee verkosta toteutuneita hintoja ja antaa tuomion **OSTA / HARKITSE / ÄLÄ OSTA**, maksimiostohinnan ja arvioidun voiton. Valinnalla *Ostin tämän* tuote siirtyy suoraan varastoon.

## Hyvä tietää

- **Vinted:** yksityistilillä vain ei-kaupallinen myynti, eikä Vinted Pro ole vielä Suomessa saatavilla. Pidä volyymi maltillisena.
- **Verotus:** jatkuva jälleenmyynti on elinkeinotoimintaa. Alustat raportoivat myynnit Verohallinnolle (DAC7).
- Jos Tori tai Vinted muuttaa lomakettaan, laajennuksen kenttälogiikka on tiedostoissa `extension/content/tori.js` ja `vinted.js`. Kerro minulle, niin päivitän ne.
