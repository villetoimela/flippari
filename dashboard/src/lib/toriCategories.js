// Torin kategoriapuu (kartoitettu tori.fi:n ilmoituslomakkeesta 10/2026).
// Muoto: "Osasto > Alaosasto > tuoteryhmä1 | tuoteryhmä2 | …"
export const TORI_CATEGORY_TREE = `Piha ja remontointi > Rakennustarvikkeet ja remontointi > Ikkunat | Lattiat | Ovet | Portaat | Talopaketit | Tapetit ja maalit | Muut rakennusmateriaalit
Piha ja remontointi > Keittiöt
Piha ja remontointi > Piha ja puutarha > Grillit | Juhlateltat | Kasvit ja istutus | Lumenluonti | Markiisit ja aurinkovarjot | Puutarhakalusteet | Puutarhatyökalut | Ruohonleikkurit | Uima-altaat ja ulkoporealtaat | Muut puutarhatarvikkeet
Piha ja remontointi > Mökkitarvikkeet
Piha ja remontointi > Muu piha ja remontointi
Piha ja remontointi > Lämmitys ja ilmanvaihto > Ilmalämpöpumput | Ilmastointilaitteet ja tuulettimet | Lämmittimet | Patterit | Polttopuut ja polttoaineet | Takat
Piha ja remontointi > Työkalut
Piha ja remontointi > Kylpyhuone > Hanat ja suihkut | Höyrysuihkukaapit | Kylpyammeet | Kylpyhuonekalusteet | Kylpyhuonetarvikkeet | Pesualtaat | Sauna | Suihkuseinät ja suihkukaapit | WC-pöntöt
Piha ja remontointi > Hälyttimet ja turvallisuus
Piha ja remontointi > Autotallin ovet ja kalusteet
Lapset ja vanhemmat > Turvaistuimet > Lastenistuimet pyörään | Turvaistuimet autoon
Lapset ja vanhemmat > Lelut > LEGO ja DUPLO | Leluautot ja junaradat | Pehmolelut, nuket ja figuurit | Piirustus- ja askartelutarvikkeet | Rakennussarjat ja rakennuspalikat | Ulkopelit lapsille | Vauvan lelut | Muut lelut
Lapset ja vanhemmat > Lasten vaatteet > Juhlavaatteet ja erityistilaisuudet | Lasten hatut, hanskat ja rukkaset | Lasten housut ja shortsit | Lasten mekot ja hameet | Lasten oloasut ja yöasut | Lasten t-paidat ja paidat | Lasten ulkovaatteet | Lasten villapaidat ja muut neuleet | Vaatepaketit | Vauvan bodyt | Muut lasten vaatteet
Lapset ja vanhemmat > Lastenvaunut ja rattaat > Juoksurattaat | Lastenvaunujen osat ja tarvikkeet | Lastenvaunut | Matkarattaat | Rattaat | Sisarusrattaat ja tuplarattaat | Yhdistelmävaunut
Lapset ja vanhemmat > Lasten kengät > Ballerinat | Lasten juhlakengät | Lasten kumisaappaat | Lasten lenkkarit | Lasten loaferit ja purjehduskengät | Lasten pistokkaat ja puukengät | Lasten saappaat | Lasten sandaalit | Lasten talvikengät | Tohvelit | Vauvan kengät | Muut lasten kengät
Lapset ja vanhemmat > Lasten kalusteet > Hoitopöydät | Koulupöydät ja muut lasten pöydät | Lastenhuoneen säilytyskalusteet | Lasten sängyt | Lasten tuolit | Muut lasten kalusteet
Lapset ja vanhemmat > Lastentarvikkeet ja turvallisuus
Lapset ja vanhemmat > Äitiysvaatteet
Lapset ja vanhemmat > Muut
Lapset ja vanhemmat > Lasten kirjat
Lapset ja vanhemmat > Lasten tekstiilit ja sisustustarvikkeet
Urheilu ja ulkoilu > Fanituotteet
Urheilu ja ulkoilu > Extreme-urheilu > Kiipeily | Laskuvarjohyppy | Leijalautailu | Rullalautailu ja longboarding
Urheilu ja ulkoilu > Urheiluvaatteet ja -kengät > Lasten urheiluvaatteet | Lenkkarit ja muut urheilukengät | Miesten urheiluvaatteet | Naisten urheiluvaatteet | Unisex-urheiluvaatteet
Urheilu ja ulkoilu > Pallopelit > Jalkapallo | Koripallo | Käsipallo | Lentopallo | Padel | Pesäpallo | Pingis | Salibandy | Squash | Sulkapallo | Tennis | Muut pallopelit
Urheilu ja ulkoilu > Hiihto ja laskettelu > Laskettelu | Lumilautailu | Murtomaahiihto | Telemark | Muut hiihtovarusteet
Urheilu ja ulkoilu > Pyöräily > Lasten polkupyörät | Polkupyörät | Pyöräilykengät | Pyöräilyvaatteet | Pyöräilyvarusteet | Skuutit
Urheilu ja ulkoilu > Retkeily, kalastus ja metsästys > Aseet ja patruunat | Kajakit ja kanootit | Kalastusvaatteet | Kelat, perhot ja koukut | Kiikarit ja kaukoputket | Makuupussit | Metsästysvaatteet | Reput ja rinkat | Teltat | Vavat | Verkot, katiskat ja merrat | Muut kalastustarvikkeet | Muut metsästysvarusteet | Muut retkeilyvarusteet
Urheilu ja ulkoilu > Muu urheilu
Urheilu ja ulkoilu > Urheilukellot ja aktiivisuusrannekkeet
Urheilu ja ulkoilu > Golf > Golfkengät | Golfkärryt ja -bägit | Golfmailat | Golfpallot | Golfsetit | Golfvaatteet | Muut golfvälineet
Urheilu ja ulkoilu > Kuntosalilaitteet ja kuntoiluvälineet > Crosstrainerit | Juoksumatot | Kuntoiluvälineet | Kuntopyörät | Soutulaitteet | Steppilaudat | Voimaharjoittelu
Urheilu ja ulkoilu > Vesiurheilu > Melonta ja suppailu | Purjehdus | Purjelautailu | Sukellus | Surffaus | Wingfoil | Muu vesiurheilu
Urheilu ja ulkoilu > Ravintolisät
Urheilu ja ulkoilu > Jääkiekko ja luistelu > Jääkiekko- ja luisteluvarusteet | Lasten luistimet | Naisten ja miesten luistimet
Vaatteet, kosmetiikka ja asusteet > Naisten vaatteet > Alusvaatteet | Farkut | Hameet | Hatut, huivit ja hanskat | Housut ja shortsit | Hääpuvut | Jumpsuitit ja haalarit | Kansallispuvut | Mekot | Paidat ja puserot | Puvut ja bleiserit | Takit | Topit | T-paidat | Ulkovaatteet | Villapaidat ja muut neuleet | Muut naistenvaatteet
Vaatteet, kosmetiikka ja asusteet > Kellot ja rannekellot
Vaatteet, kosmetiikka ja asusteet > Laukut ja lompakot > Iltalaukut | Käsilaukut | Lompakot ja kukkarot | Lähettilaukut | Matkalaukut | Olkalaukut | Reput | Salkut ja tietokonelaukut | Treenikassit | Muut laukut
Vaatteet, kosmetiikka ja asusteet > Kengät > Miesten kengät | Naisten kengät
Vaatteet, kosmetiikka ja asusteet > Miesten vaatteet > Collegepaidat ja neuleet | Frakit, smokit ja saketit | Kauluspaidat | Miesten alusvaatteet | Miesten farkut | Miesten hatut, huivit ja hanskat | Miesten housut ja shortsit | Miesten kansallispuvut | Miesten puvut | Miesten T-paidat ja paidat | Ulkovaatteet | Muut miesten vaatteet
Vaatteet, kosmetiikka ja asusteet > Muut vaatteet, kosmetiikka ja asusteet
Vaatteet, kosmetiikka ja asusteet > Korut ja korurasiat > Helat ja riipukset | Kalvosinnapit | Kaulakorut | Korurasiat ja säilytys | Korusetit | Korvakorut | Rannekorut | Rintaneulat ja -korut | Sormukset | Muut korut
Vaatteet, kosmetiikka ja asusteet > Ihonhoito ja hiustenhoito
Vaatteet, kosmetiikka ja asusteet > Kosmetiikka > Hajuvesi | Meikki
Vaatteet, kosmetiikka ja asusteet > Silmälasit ja linssit > Aurinkolasit | Piilolinssit | Silmälasit
Vaatteet, kosmetiikka ja asusteet > Naamiaisasut
Vaatteet, kosmetiikka ja asusteet > Asusteet > Solmiot ja rusetit | Vyöt | Muut asusteet
Antiikki ja taide > Muu antiikki
Antiikki ja taide > Keramiikka, posliini ja lasi
Antiikki ja taide > Taide > Akryylimaalaukset | Grafiikka | Litografia | Piirustukset | Puupiirrokset | Sekatekniikkateokset | Valokuvat | Veistokset | Vesivärimaalaukset | Öljyvärimaalaukset | Muu taide
Antiikki ja taide > Antiikkihuonekalut
Antiikki ja taide > Aterimet ja pöytähopeat
Eläimet ja eläintarvikkeet > Koiratarvikkeet
Eläimet ja eläintarvikkeet > Kissatarvikkeet
Eläimet ja eläintarvikkeet > Muut eläintarvikkeet
Eläimet ja eläintarvikkeet > Hevostarvikkeet ja ratsastustarvikkeet > Hevosen varusteet | Ratsastusvaatteet | Satulat | Muut varusteet
Koti ja sisustus > Muu koti ja sisustus
Koti ja sisustus > Matot ja tekstiilit > Matot | Pyyhkeet | Pöytäliinat | Tyynyt | Verhot | Vuodetekstiilit | Muut matot ja tekstiilit
Koti ja sisustus > Valaisimet > Kattovalaisimet | Lattiavalaisimet | Pöytävalaisimet | Seinävalaisimet | Muut valaisimet
Koti ja sisustus > Pöydät ja tuolit > Ruokailuryhmät | Ruokapöydät | Sohvapöydät | Toimistotuolit | Tuolit ja jakkarat | Työpöydät | Muut pöydät ja tuolit
Koti ja sisustus > Makuuhuone > Patjat | Runkopatjat | Sängyt
Koti ja sisustus > Kaapit > Astiakaapit | Vaatekaapit | Muut kaapit
Koti ja sisustus > Koriste- ja sisustusesineet > Kuvat ja kehykset | Kynttilänjalat | Maljakot ja ruukut | Peilit | Seinälautaset | Muut koriste-esineet
Koti ja sisustus > Astiat ja keittiötarvikkeet > Astiastot | Juomalasit | Kahvikupit ja mukit | Keittiövälineet | Ruokailuvälineet | Säilytysastiat | Tarjoiluastiat | Muut keittiötarvikkeet
Koti ja sisustus > Sohvat ja lepotuolit > Kulmasohvat | Nojatuolit | Rahit | Sohvaryhmät | Sohvat | Vuodesohvat
Koti ja sisustus > Hyllyt ja lipastot > Lipastot | Seinähyllyt ja hyllyt | Senkit | TV-tasot ja mediakalusteet | Yöpöydät
Koti ja sisustus > Sesonkitarvikkeet > Joulukuuset | Kattaus | Koristeet | Koristevalot | Tekstiilit
Viihde ja harrastukset > Soittimet > Bassot | Harmonikat | Jousisoittimet | Kitarat | Kosketinsoittimet ja syntetisaattorit | Pianot ja flyygelit | Puupuhaltimet | Rummut ja perkussiosoittimet | Studiolaitteet | Urut | Vaskisoittimet | Muut kielisoittimet | Muut soittimet
Viihde ja harrastukset > Keräily > Keräilyfiguurit | Keräilykortit | Keräilylelut | Kolikot ja setelit | Kyltit ja julisteet | Militaria | Pinssit | Postikortit | Postimerkit | Muut keräilykohteet
Viihde ja harrastukset > Musiikki ja elokuvat > Blu-rayt | CD-levyt | C-kasetit | DVD:t | VHS-kasetit | Vinyylilevyt
Viihde ja harrastukset > Muu viihde ja harrastukset
Viihde ja harrastukset > Seurapelit ja lautapelit > Lautapelit | Pulmapelit | Pöytäpelit | Ulkopelit | Muut pelit
Viihde ja harrastukset > Kirjat ja lehdet > Aikakauslehdet ja lehtiset | Kaunokirjallisuus | Keittokirjat | Oppikirjat | Sarjakuvat | Tietokirjat | Yleisteokset, sanakirjat | Muut kirjat
Viihde ja harrastukset > Pienoismallit ja rakennussarjat
Viihde ja harrastukset > Radio-ohjattavat > Autot | Droonit | Helikopterit | Lentokoneet | Pienoisrautatiet | Veneet
Viihde ja harrastukset > Käsityöt > Helmet ja jalokivet | Kangaspuut | Kankaat | Langat | Maalit ja maalaustarvikkeet | Ompelukoneet | Ompelutarvikkeet ja neulomistarvikkeet | Puutyöt | Savityöt | Skräppäys
Auto-, vene- ja moottoripyörätarvikkeet > MP-tarvikkeet ja varaosat > Moottorikelkan varaosat ja tarvikkeet | Moottoripyörän varaosat | Moottoripyörävaatteet | Moottoripyörävarusteet | Mopon varaosat ja tarvikkeet
Auto-, vene- ja moottoripyörätarvikkeet > Auton osat > Auton istuimet | Auton sisätilatarvikkeet | Auton varaosat | Autostereot | Kattotelineet ja suksiboksit | Navigaattorit autoon | Renkaat ja vanteet | Muut auton osat
Auto-, vene- ja moottoripyörätarvikkeet > Muut autotarvikkeet
Elektroniikka ja kodinkoneet > Muu elektroniikka ja kodinkoneet
Elektroniikka ja kodinkoneet > Tietotekniikka > Kannettavat tietokoneet | Kiintolevyt ja tallennustila | Laskimet | Näytöt | Oheislaitteet | Ohjelmistot | Pöytäkoneet | Tabletit ja lukulaitteet | Tietokonekomponentit | Verkkolaitteet
Elektroniikka ja kodinkoneet > Kodin pienkoneet > Kahvinkeittimet | Leivänpaahtimet | Monitoimikoneet ja yleiskoneet | Pölynimurit | Sauvasekoittimet ja sähkövatkaimet | Silitysraudat | Tehosekoittimet ja blenderit | Vedenkeittimet | Vohveliraudat ja voileipägrillit | Muut kodin pienkoneet
Elektroniikka ja kodinkoneet > Puhelimet ja tarvikkeet > Matkapuhelimet | Puhelintarvikkeet | Muut puhelimet
Elektroniikka ja kodinkoneet > Valokuvaus ja video > Hybridikamerat | Järjestelmäkamerat | Kameralaukut | Kompaktikamerat | Objektiivit | Videokamerat | Muut valokuvaustarvikkeet
Elektroniikka ja kodinkoneet > Videopelit ja konsolit > Oheistuotteet | Pelikonsolit | Pelit
Elektroniikka ja kodinkoneet > Ääni ja kuva > Blu-ray-soittimet | DVD-soittimet | Kaapelit ja oheislaitteet | Kaiuttimet | Kotiteatterilaitteet | Kuulokkeet | Mediatoistimet ja digiboksit | MP3-soittimet ja muut kannettavat soittimet | PA-laitteet | Radiot | Stereot | TV | Vahvistimet ja viritinvahvistimet | Videonauhurit | Videotykit ja valkokankaat
Elektroniikka ja kodinkoneet > Kodinkoneet > Astianpesukoneet | Jääkaapit | Keittolevyt | Kuivausrummut ja kuivauskaapit | Liedet | Liesituulettimet | Mikroaaltouunit | Pakastimet | Pyykinpesukoneet | Uunit | Muut kodinkoneet
Elektroniikka ja kodinkoneet > Terveys ja hyvinvointi
Liiketoiminta ja palvelut > Muu liiketoiminta ja palvelut`
