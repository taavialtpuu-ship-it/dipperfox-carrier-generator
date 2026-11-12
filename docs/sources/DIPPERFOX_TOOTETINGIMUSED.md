# Dipperfoxi tootespetsiifilised sobivustingimused

Dokumendi versioon: 0.1  
Koostatud: 29.10.2026  
Rakendus: Dipperfox Carrier Generator  
Staatus: arenduse lähtealus; tootja tehniline kinnitus ootel

## 1. Eesmärk ja kasutamine

Dokument koondab SC 400, SC 600 ja SC 850 Pro kandurmasinaga ehk carrier’iga sobitamise lähteandmed ning rakenduse hindamisreeglid. Avalikust veebist loetud väärtus ei tähenda tootja kinnitatud paigaldusluba.

Eristatakse kahte kihti:

- **Tooteandmed:** viidatud Dipperfoxi allikatest kogutud näitajad.
- **Rakenduse reeglid:** siin kavandatud viis andmete kontrollimiseks ja tulemuse esitamiseks. Need ei ole tootja paigaldusjuhendi nõuded.

Ükski selle dokumendi arvuline sobivusreegel ei ole veel tootmiskasutuseks heaks kiidetud. Enne aktiveerimist peab vastutav isik kinnitama mudeli, tooteversiooni, carrier’i tüübi, allika ja piirangu tähenduse. Demo võib kasutada allolevaid väärtusi selge märkega „Esialgsed andmed”.

## 2. Mudelite tehniline lähteandmestik

Järgmine tabel pärineb mudelite eraldi tootelehtedelt [S1–S3]. Massivahemikud ja võimsused kirjeldavad seal esitatud ekskavaatorite kasutust; neid ei laiendata automaatselt laaduritele.

| Näitaja | SC 400 [S1] | SC 600 [S2] | SC 850 Pro [S3] |
|---|---:|---:|---:|
| Ekskavaatori mass | 1,5–5 t | 6–12 t | 13–30 t |
| Mootori võimsusvahemik | 12–35 kW | 35–74 kW | 74–130 kW |
| Eraldi nimetatud minimaalne võimsus | 12 kW | 35 kW | 74 kW |
| Hüdrauliline vooluhulk | 30–130 l/min | 65–150 l/min | 110–230 l/min |
| Töörõhk | 110–250 bar | 150–250 bar | 180–350 bar |
| Tööseadme mass | 190 kg | 320 kg | 580 kg |
| Lõikeläbimõõt | 400 mm | 600 mm | 850 mm |
| Puurimissügavus | 590 mm | 700 mm | 900 mm |
| Esimese käigu pöördemoment | 13 700 Nm | 16 900 Nm | 43 000 Nm |

Võimsusvahemiku ülempiiri ei tohi ilma tootja kinnituseta tõlgendada absoluutse keeluna võimsama carrier’i kasutamiseks. Samuti vajab massivahemik klassifitseerimist: lubatud piir või soovituslik masinaklass.

Lõikeläbimõõt ja puurimissügavus on toote omadused, mitte carrier’i hüdraulilise sobivuse tõendid.

### SC 400 lisatingimused

Tootelehe [S1] järgi on võimalikud ka järgmised kasutused, kui hüdraulika ja kinnitus sobivad:

| Carrier’i tüüp | Lehel nimetatud tüüpiline massiklass | Rakenduse käsitlus |
|---|---:|---|
| Ekskavaatorlaadur | 3–6 t | Tingimuslik kandidaat; vajab tüübipõhiseid kinnitatud nõudeid |
| Kompaktlaadur | 1–2,5 t | Tingimuslik kandidaat; vajab tüübipõhiseid kinnitatud nõudeid |
| Väikelaadur / skid steer | 1–2,5 t | Tingimuslik kandidaat; vajab tüübipõhiseid kinnitatud nõudeid |

Nende masinatüüpide võimsusnõuet ei tuletata ekskavaatori 12–35 kW vahemikust. Kiirliitmiku ning tiltrootori sobivus vajab konkreetse konfiguratsiooni kontrolli [S1].

### SC 600 lisatingimused

SC 600 võrdluskirjeldus nimetab ka väikelaadurit ja ekskavaatorlaadurit [S4], kuid käesolevasse dokumenti kogutud allikad ei määra neile eraldi täielikke tehnilisi piire. Neid saab näidata võimalike kasutusviisidena, mitte automaatselt kinnitatud vastetena.

### SC 850 Pro lisatingimused

Tooteleht käsitleb eeskätt ekskavaatoreid. Muud carrier’i tüübid vajavad eraldi hinnangut. Pika noolega ekskavaatoril tuleb kontrollida stabiilsust konkreetses tööasendis; masina mass üksi seda ei tõenda [S3].

## 3. Allikate vastuolud

| Väli | Mudeli tooteleht | Muu ametlik veebileht | Vajalik tegevus |
|---|---|---|---|
| SC 400 mass | 1,5–5 t [S1] | 1–5 t [S5, S6] | Kinnitada carrier’i tüüp ja tegelik alampiir |
| SC 400 minimaalne võimsus | 12 kW [S1] | 35 kW [S5, S6] | Kinnitada tüübipõhine nõue |
| SC 600 mass | 6–12 t [S2] | 2–14 t avalehel [S6] | Selgitada, kas laiem vahemik hõlmab erinevaid carrier’i tüüpe |
| SC 850 Pro mass | 13–30 t [S3] | 14–30 t avalehel [S6] | Kinnitada alampiir ja tooteversioon |

Rakenduse reeglid vastuolu korral:

1. Säilita mõlemad väärtused koos allikaga.
2. Ära moodusta neist keskmist ega uut ühendatud vahemikku.
3. Ära lahenda vastuolu automaatselt lehe värskuse või rangema piiri valimisega.
4. Märgi seotud nõue olekuga `conflicting`.
5. Kuni kinnitamiseni ära anna sellest nõudest sõltuvat lõplikku positiivset ega negatiivset otsust. Näita „Ebapiisav info — tootenõue vajab kinnitamist”.

## 4. Carrier’i kohustuslikud lähteandmed

Rakendus peab küsima või kontrollitud andmebaasist leidma:

- Masina tüübi, tootja, mudeli ning teadaoleva aastakäigu ja hüdraulikapaketi.
- Tegeliku töökonfiguratsiooni massi ja mootori võimsuse.
- Lisaseadme ühenduses koormuse all kättesaadava vooluhulga ja töörõhu.
- Seadistatavad vahemikud ning tõendi, et sobiv rõhk ja vool on samal ajal saavutatavad.
- Kinnituse või kiirliitmiku tüübi ja vajalikud mõõdud.
- Tagasivoolu ning vajaduse korral lekkeõluliini andmed.
- Adapteri, tiltrootori või muu vaheosa olemasolu.
- Carrier’i tootja piirangud tööseadme massile, koormusele ja stabiilsusele.

Andmete allikas ja konfiguratsioon peavad olema jälgitavad. Carrier’i mudelinimi üksi ei tõenda hüdraulikapaketi sobivust.

## 5. Hüdraulika ja ühenduste kontroll

Tootja võrdlusartikkel rõhutab tööseadmeni jõudvat voolu ja rõhku koormuse all ning kinnituse, tagasivoolu ja võimaliku lekkeõluliini kontrolli [S4].

Rakenduse hindamisreeglid:

- Ära kasuta kogu pumba tootlikkust automaatselt lisaseadmele kättesaadava vooluna.
- Ära kasuta süsteemi maksimaalset rõhku automaatselt tööseadme tegeliku töörõhuna.
- Vahemike kattumine annab ainult võimaliku seadistuspunkti; see ei kinnita kogu süsteemi sobivust.
- Kui carrier’i maksimum ületab tööseadme piiri, kontrolli dokumenteeritud piiramisvõimalust ja tegelikku seadistust.
- Kui vajalik seadistus on võimalik, kuid kinnitamata, näita tingimuslikku tulemust.
- Kui kinnitatud konfiguratsioon ei suuda täita kohustuslikku miinimumi või vältida lubatud maksimumi ületamist, märgi vastav kontroll ebaõnnestunuks.
- Ära järelda mootori võimsuse põhjal tegelikku hüdraulilist suutlikkust.

Siin ei ole kinnitatud mudelipõhiseid ühenduskeermeid, voolikumõõte, tagasivoolu vasturõhu piire, lekkeõluliini nõudeid ega ühendusskeeme. Nende väärtus on `unknown`, kuni saadakse sobiva tooteversiooni paigaldusjuhend või tootja kinnitus. Ära kasuta teadmata väärtuse asemel nulli ega eelda, et liini pole vaja.

## 6. Sobivusotsuse reeglid

Need on rakenduse kavandatud otsustusreeglid, mitte tootja väljastatud sertifitseerimiskord.

| Olek | Tingimus |
|---|---|
| `compatible` — sobib kontrollitud andmete põhjal | Kõik kohustuslikud kontrollid läbivad; tootenõuded on heaks kiidetud ja carrier’i tegelik konfiguratsioon kontrollitud |
| `conditional` — võib sobida seadistamise järel | Dokumenteeritud lahendus on olemas, kuid seadistus, adapter või paigaldus vajab veel kinnitamist |
| `insufficient_data` — ebapiisav info | Mõni kohustuslik väärtus puudub, pole kontrollitud või on vastuoluline |
| `incompatible` — ei sobi | Vähemalt üks kinnitatud kohustuslik piirang ebaõnnestub ning puudub kinnitatud lahendus |

Koondotsuse järjekord: kinnitatud ebaõnnestumine → puuduvad või vastuolulised andmed → kinnitamist vajav seadistus → kõik kontrollid läbitud.

Vastuolulist nõuet ennast ei tohi lugeda kinnitatud ebaõnnestumiseks. Muu sõltumatu kinnitatud piirangu ebaõnnestumine võib siiski anda tulemuse `incompatible`.

Kinnitatud arvuliste piiride võrdlus peab hõlmama täpset piirväärtust, kui allikas ei sätesta teisiti. Ära lisa automaatset tolerantsi. Erista ranget piiri ja soovituslikku vahemikku.

## 7. Tööülesandest tulenev soovitus

Tööülesande sobivus on tehnilisest sobivusest eraldi hinnang.

- SC 400: piiratud ligipääsuga väiksemad haljastusobjektid [S1].
- SC 600: keskmise mahuga haljastus ja alade ettevalmistamine [S2].
- SC 850 Pro: suuremahuline metsandus ja taristualade puhastamine [S3].

Lõikeläbimõõt ei ole kännu maksimaalse läbimõõdu piir: suuremat kändu saab töödelda kattuvate puurimistega [S4]. Rakendus ei tohi ainuüksi suurema kännu tõttu mudelit välistada ega lubada kindlat tootlikkust ilma töötingimuste ja tõendatud arvutusmudelita.

## 8. Andmete struktuur ja kinnitamine

Iga nõude juures säilita vähemalt:

| Väli | Sisu |
|---|---|
| `model_id` | `sc400`, `sc600` või `sc850pro` |
| `product_revision` | Tooteversioon; teadmata korral `null` |
| `carrier_type` | Konkreetne masinatüüp; üldistamist ei eeldata |
| `parameter` | Näiteks `aux_flow_l_min` või `carrier_weight_t` |
| `min`, `max`, `value` | Vajalikud arvulised väärtused; teadmata väärtus `null` |
| `rule_kind` | `hard_limit`, `recommended_range` või `unclassified` |
| `unit` | Üheselt määratud ühik |
| `source_url`, `source_revision` | Päritolu ja dokumendi versioon |
| `checked_at` | Allika kontrollimise kuupäev |
| `status` | `draft`, `conflicting`, `approved` või `superseded` |
| `approved_by`, `approved_at` | Kinnitaja ja kinnitamise aeg |

Rakenda lõplikus automaatses otsuses ainult `approved` nõudeid. Puuduv kohustuslik heakskiidetud nõue annab `insufficient_data`, mitte vaikimisi läbitud kontrolli. Salvesta hinnangu juurde reeglistiku versioon ja carrier’i sisendite hetkeseis.

Sisemised ühikud: t ehk 1000 kg, kW, l/min, bar ja mm. Imperiaalühikutes erista US gallonit ning US short ton’i. Võrdle ümardamata normaliseeritud väärtusi.

## 9. Enne tootmiskasutust kinnitatavad punktid

- Kõigi kolme mudeli kehtivad tehnilised ja paigaldusdokumendid ning versioonid.
- Tabelis toodud massi- ja võimsusvahemike tähendus ning carrier’i tüüpide erisused.
- Vastuolude lahendused peatükis 3.
- Kinnitused, adapterid, ühendused, tagasivool ja lekkeõluliin.
- Tööseadme mass koos adapterite ja vaheosadega ning carrier’i koormus- ja stabiilsuspiirangud.
- Kes tootenõuded kinnitab ja millal tuleb neid uuesti kontrollida.

## 10. Allikad

Allikad loetud 29.10.2026. See kuupäev tähistab kontrolli aega, mitte tootja tehnilist heakskiitu. Veebilehed võivad muutuda; kinnitamisel tuleb säilitada kasutatud dokumendi versioon või väljavõte.

- **S1:** [SC 400 mudeli tooteleht](https://www.dipperfox.com/stump-grinder-sc400).
- **S2:** [SC 600 mudeli tooteleht](https://www.dipperfox.com/stump-grinder-sc600).
- **S3:** [SC 850 Pro mudeli tooteleht](https://www.dipperfox.com/stump-grinder-sc850-pro).
- **S4:** [Dipperfoxi mudelite võrdlus](https://dipperfox.com/blog/case-studies-1/dipperfox-sc400-sc600-sc850-pro-comparison-305), avaldatud 30.09.2026.
- **S5:** [Toodete koondleht](https://www.dipperfox.com/products).
- **S6:** [Dipperfoxi avaleht](https://www.dipperfox.com/).

Varasemas vestluses viidatud SC 400 PDF-aadress andis koostamise ajal vastuse 404. Selle dokumendi ajaloolisi näitajaid siin kinnitatud andmetena ei kasutata.
