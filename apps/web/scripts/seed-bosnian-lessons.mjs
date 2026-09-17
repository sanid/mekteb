import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function heading(text, level = 2) {
  return {
    id: crypto.randomUUID(),
    type: 'heading',
    props: {
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
      level,
      isToggleable: false,
    },
    content: [{ type: 'text', text, styles: {} }],
    children: [],
  };
}

function paragraph(text) {
  return {
    id: crypto.randomUUID(),
    type: 'paragraph',
    props: {
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [{ type: 'text', text, styles: {} }],
    children: [],
  };
}

function bulletItem(text) {
  return {
    id: crypto.randomUUID(),
    type: 'bulletListItem',
    props: {
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [{ type: 'text', text, styles: {} }],
    children: [],
  };
}

function numberedItem(text) {
  return {
    id: crypto.randomUUID(),
    type: 'numberedListItem',
    props: {
      textColor: 'default',
      backgroundColor: 'default',
      textAlignment: 'left',
    },
    content: [{ type: 'text', text, styles: {} }],
    children: [],
  };
}

const topics = [
  {
    key: 'topic_1',
    id: '11111111-1111-1111-1111-000000000001',
    title: 'Ilmihal 1: Uvod u mekteb i islamsko ponašanje',
    description: 'Uvodne dove, čistoća, bonton, zahvalnost i prva sura El-Fatiha',
    sort_order: 1,
  },
  {
    key: 'topic_2',
    id: '11111111-1111-1111-1111-000000000002',
    title: 'Ilmihal 1: Imanski šarti (Islamsko vjerovanje)',
    description: 'Pregled 33 šarta, šest temelja imana, meleki, objave, poslanici, Muhammed a.s., Sudnji dan i Kader',
    sort_order: 2,
  },
  {
    key: 'topic_3',
    id: '11111111-1111-1111-1111-000000000003',
    title: 'Ilmihal 1: Islamski šarti (Islamske dužnosti)',
    description: 'Pet stubova islama: Šehadet, namaz, ramazanski post, zekat i hadž, te sure Felek, Nas i Leheb',
    sort_order: 3,
  },
];

const lessons = [
  // ── TOPIC 1: UVOD I PONAŠANJE ──
  {
    topic_key: 'topic_1',
    title: "E'uzubila i Bismila",
    sort_order: 1,
    blocks: [
      heading("E'uzubila", 2),
      paragraph("Prve riječi koje ćemo naučiti su:"),
      heading("E'ŪZUBILLĀHI MINEŠ-ŠEJTĀNIR-RADŽĪM", 3),
      paragraph("Ove riječi znače:"),
      paragraph("Tražim od Allaha da me zaštiti od prokletog šejtana."),
      paragraph("Ove riječi izgovaramo:"),
      bulletItem("da bismo bili sigurni"),
      bulletItem("da lahko i dobro učimo"),
      bulletItem("da se sretno igramo"),
      bulletItem("da mirno spavamo i lijepo sanjamo"),
      heading("Bismila", 2),
      paragraph("S kojim riječima počinjemo svaki dobar posao? To su riječi koje svaki musliman i muslimanka trebaju znati:"),
      heading("BISMILLĀHIR-RAHMĀNIR-RAHĪM", 3),
      paragraph("Naučimo značenje ovih riječi:"),
      paragraph("U ime Allaha, Milostivog, Samilosnog!"),
      heading("Kada se uče E'uzubila i Bismila?", 2),
      bulletItem("Kada jedemo i pijemo"),
      bulletItem("Kada učimo i čitamo"),
      bulletItem("Kada vozimo bicikl"),
      bulletItem("Kada ulazimo u auto"),
      bulletItem("Kada ulazimo u kuću"),
      bulletItem("Kada hoćemo spavati"),
      bulletItem("Prije igranja"),
      bulletItem("Kada oblačimo odjeću"),
      paragraph("Osim ovoga, E'uzubila i Bismila se izgovaraju i u mnogim drugim situacijama. Pitaj muallima kada se još izgovaraju E'uzubila i Bismila."),
    ],
  },
  {
    topic_key: 'topic_1',
    title: "Čovjek je najljepše Allahovo stvorenje",
    sort_order: 2,
    blocks: [
      heading("Čovjek je najljepše Allahovo stvorenje", 2),
      paragraph("Allah, dželle šanuhu, je stvorio cijeli svijet:"),
      bulletItem("Čovjeka"),
      bulletItem("Biljke"),
      bulletItem("Životinje"),
      bulletItem("Zemlju"),
      bulletItem("Nebo"),
      bulletItem("Kosmos"),
      paragraph("U Kur'anu Časnom Uzvišeni Allah poručuje:"),
      heading("„Čovjeka smo stvorili u najljepšem obliku”", 3),
      paragraph("(Kur'an, sura Et-Tin, 4)"),
    ],
  },
  {
    topic_key: 'topic_1',
    title: "Ja u mekteb idem i dove za početak",
    sort_order: 3,
    blocks: [
      heading("Ja u mekteb idem", 2),
      paragraph("Mekteb je mala škola kod džamije ili u džamiji. U mektebu se igramo i učimo:"),
      bulletItem("o islamskom vjerovanju"),
      bulletItem("o islamskim dužnostima"),
      bulletItem("o islamskom ponašanju"),
      heading("U mekteb nosimo:", 3),
      bulletItem("Ilmihal"),
      bulletItem("Svesku"),
      bulletItem("Olovku"),
      bulletItem("Gumicu"),
      bulletItem("Ranac"),
      heading("Dove za hairli početak", 2),
      heading("BISMILLĀHIR-RAHMĀNIR-RAHĪM", 3),
      heading("RABBI JESSIR VE LĀ TUASSIR, RABBI TEMMIM BIL-HAJR. ĀMĪN.", 3),
      paragraph("Bože, olakšaj a ne otežaj. Bože, završi s dobrim. Amin!"),
      heading("RABBI ZIDNĪ ILMĀ", 3),
      paragraph("Gospodaru moj, povećaj mi znanje."),
      heading("Žuri Mirza na pouku", 3),
      paragraph("Osvanuo sretan dan,\nide Mirza razdragan.\nPoskakuje — svi to vide,\nna pouku Mirza ide.\n\nU ruci mu torbica,\nu torbici sveščica,\ni udžbenik Ilmihal,\nprva riječ mu — Bismillah.\n\n(R. Kadić)"),
    ],
  },
  {
    topic_key: 'topic_1',
    title: "Vjera islam i Kelime-i-šehadet",
    sort_order: 4,
    blocks: [
      heading("Vjera islam", 2),
      paragraph("Naša vjera se zove islam."),
      heading("Šta je islam?", 3),
      paragraph("Islam je vjera koju je Uzvišeni Allah preko Svoga poslanika Muhammeda, alejhiselam, objavio cijelom čovječanstvu."),
      heading("Šta znači islam?", 3),
      paragraph("Islam znači pokornost Allahu, dželle šanuhu."),
      heading("U čemu se sastoji pokornost Uzvišenom Allahu?", 3),
      paragraph("Musliman i muslimanka vjeruju u Allaha, izvršavaju islamske propise i dužnosti i rade ono što je dobro. Lijepo se ponašaju, govore istinu i pomažu drugima."),
      paragraph("„Islam je kao sunce,\nkad ti jednom takne srce,\nčitav svijet zavoliš,\nnikog više ne mrziš.”\n(R. Kadić)"),
      heading("Kelime-i-šehadet", 2),
      paragraph("Kelime-i-šehadetom svjedočimo da smo muslimani."),
      heading("Kako glasi Kelime-i-šehadet?", 3),
      heading("EŠHEDU EN LĀ ILĀHE ILLALLĀH, VE EŠHEDU ENNE MUHAMMEDEN 'ABDUHŪ VE RESŪLUHŪ.", 3),
      paragraph("Prijevod: „Vjerujem i svjedočim da nema božanstva osim Allaha i vjerujem i svjedočim da je Muhammed, alejhiselam, Allahov rob i poslanik!”"),
    ],
  },
  {
    topic_key: 'topic_1',
    title: "Selam — Islamski pozdrav",
    sort_order: 5,
    blocks: [
      heading("Selam — Islamski pozdrav", 2),
      paragraph("Selam je međusobni pozdrav muslimana."),
      heading("Kako se naziva i odgovara selam?", 3),
      paragraph("Pozdrav: Es-selamu alejkum!\nOdgovor: Alejkumus-selam!"),
      paragraph("Značenje: Neka je na Vas Božiji mir i spas!"),
      paragraph("„Es-selamu alejkum nek se čuje sa svih strana,\nselam selam, mahsuz selam, glas je mira muslimana.”"),
      heading("Kada i kome nazivamo selam?", 3),
      bulletItem("Selam nazivamo pri ulasku i izlasku iz kuće"),
      bulletItem("Selamimo muslimane i muslimanke na ulici"),
      bulletItem("Selam prvi nazivamo starijim osobama"),
      bulletItem("Muškarci prvi nazivaju selam"),
      bulletItem("Selam nazivamo kada dolazimo u društvo ili odlazimo iz društva"),
      paragraph("Sa muallimom, kroz igru, uvježbajte selam u raznim prilikama!"),
    ],
  },
  {
    topic_key: 'topic_1',
    title: "Čistoća u islamu",
    sort_order: 6,
    blocks: [
      heading("Čistoća", 2),
      paragraph("Čistoća je pola zdravlja. Zato se trebamo brinuti o higijeni našeg tijela i odjeće."),
      paragraph("Voda je Allahov dar ljudima koji koristimo za piće, spremanje hrane, pranje tijela i odjeće."),
      paragraph("Allah voli urednost i čistoću i muslimani uvijek trebaju biti uredni i čisti."),
      paragraph("Muhammed, alejhiselam, je rekao: „Čistoća je dio vjere.”"),
      heading("U ličnu higijenu se ubraja:", 3),
      bulletItem("Pranje ruku prije i poslije jela"),
      bulletItem("Redovno kupanje"),
      bulletItem("Redovno pranje zuba"),
      bulletItem("Redovno skraćivanje noktiju"),
    ],
  },
  {
    topic_key: 'topic_1',
    title: "Voda je Allahov dar",
    sort_order: 7,
    blocks: [
      heading("Voda je Allahov dar", 2),
      paragraph("Uobičajen ljetni dan. Sejid se sa djecom igrao u dvorištu džamije. Napustivši igru, utrča u kuću:"),
      paragraph("„Majko, ožednio sam, mogu li dobiti čašu vode?”"),
      paragraph("Zahvalivši se, upita:"),
      paragraph("„Daje li nam i vodu Allah, dželle šanuhu? Kako je lijepo kada se ugasi žeđ. Sigurno se svi tako osjećaju?”"),
      paragraph("„Da, Sejide, da bi insan zadovoljio svoje potrebe, Allah, dž.š., mu daruje i vodu, koja je izvor svega.”"),
      paragraph("„On daje vodu i mome mačku?” — upita. Majka potvrdno klimnu glavom."),
      paragraph("„I pticama, zečevima, jagnjadima i drugim životinjama?”"),
      paragraph("„Da, Sejide. Allah, dž.š., je svim stvorenjima darovao vodu da bi ugasili žeđ i zadovoljili druge potrebe: i biljkama, i drveću, i svemu što je živo. Svemu što zavisi od nje, On daje vodu.”"),
      paragraph("„Pada li zbog toga kiša?” — upita Sejid — „Jer kad pada kiša, ja se ne mogu igrati u avliji, ali sada znam da se zemlja i biljke raduju kiši.”"),
      paragraph("Milujući ga po glavi, majka nastavi:"),
      paragraph("„Da, sine, u pravu si, oni vole kišu. Vidiš li nebo? Primjećuješ li guste oblake? Oni donose kišu, znaš li to? Vidi, već počinju padati prve kapi kiše. Možeš li mi pomoći da zatvorim prozore?”"),
      paragraph("Dječak pristade, veselo govoreći:"),
      paragraph("„Majko, kiša će padati veoma dugo i sve će se biljke napiti vode. A šta se događa sa onim dijelom koji ostaje na površini zemlje?”"),
      paragraph("„Šta se dešava sa svakom kapi kiše — ne znam, ali znam da se jedan dio skuplja u izvore. Iz tih izvora se voda crpi prečišćena, a zatim salijeva u vodovodne cijevi koje dovode u kuće vodu koju mi koristimo.”"),
      paragraph("Dječak prekide majku:"),
      paragraph("„Da nema vode, kako bih se kupao? Majko, kako je samo voda potrebna svima! Allah, dž.š., naš Gospodar, velikodušan je jer nam vodu daruje!”"),
      paragraph("Voda je Allahov dar!"),
    ],
  },
  {
    topic_key: 'topic_1',
    title: "Desna strana u islamu",
    sort_order: 8,
    blocks: [
      heading("Desna strana", 2),
      paragraph("Islam daje prednost desnoj strani i zato sve lijepe poslove radimo desnom rukom i nogom!"),
      bulletItem("Desnom rukom jedemo i pijemo"),
      bulletItem("Prvo oblačimo desni rukav"),
      bulletItem("Prvo obuvamo desnu cipelu"),
      bulletItem("Liježemo na desnu stranu"),
      bulletItem("Desnom nogom ulazimo u kuću i džamiju"),
      bulletItem("Lijevom nogom izlazimo iz kuće"),
    ],
  },
  {
    topic_key: 'topic_1',
    title: "Hrana i piće — Halal i haram",
    sort_order: 9,
    blocks: [
      heading("Hrana i piće", 2),
      paragraph("Allah, dž.š., je stvorio čovjeka i podario mu nafaku kojom će se hraniti. Dozvolio mu je sva lijepa, ukusna jela i pića, a zabranio ružna koja mu nanose štetu."),
      heading("Ono što je HALAL — DOZVOLJENO:", 3),
      bulletItem("Zec, ovca, krava, kokoška, riba"),
      bulletItem("Voće, povrće, žitarice i mliječni proizvodi"),
      heading("Ono što je HARAM — ZABRANJENO:", 3),
      bulletItem("Svinjsko meso i prerađevine"),
      bulletItem("Pas, orao, žaba i meso grabljivica"),
      bulletItem("Alkohol i opojna pića"),
      heading("Prilikom jela i pića treba voditi računa da:", 3),
      bulletItem("prije i poslije jela peremo ruke"),
      bulletItem("prije jela proučimo Bismilu i jedemo desnom rukom"),
      bulletItem("ne jedemo suviše vrelu hranu"),
      bulletItem("jedemo zajedno sa porodicom"),
      bulletItem("nakon jela, zahvalimo Allahu riječima El-hamdu lillāh"),
      bulletItem("raspremimo sofru poslije jela"),
      bulletItem("nakon jela peremo zube"),
    ],
  },
  {
    topic_key: 'topic_1',
    title: "Subhaneke i zahvalnost Allahu",
    sort_order: 10,
    blocks: [
      heading("Subhaneke", 2),
      paragraph("Uzvišenom Allahu zahvaljujemo učeći dovu Subhaneke:"),
      heading("BISMILLĀHIR-RAHMĀNIR-RAHĪM", 3),
      heading("SUBHĀNEKE ALLĀHUMME VE BI HAMDIKE, VE TEBĀREKESMUKE, VE TE'ĀLĀ DŽEDDUKE, VE LĀ ILĀHE GAJRUKE.", 3),
      paragraph("Prijevod: „Nek si slavljen samo Ti, moj Allahu, i Tebi hvala, Tvoje je ime blagoslovljeno, Tvoje je veličanstvo uzvišeno, Nema drugog boga, osim Tebe.”"),
      heading("Allahu uvijek trebamo biti zahvalni", 2),
      paragraph("Sejid je bio u šetnji sa svojim babom. Kada su se vratili, trčeći uđe u kuću i zagrli majku. Od sreće zavika: „Majko, šta sam sve vidio: male ptice, mačiće, piliće i ne mogu ti sve nabrojati!”"),
      paragraph("„Sine, drago mi je što ti se sve to dopalo.”"),
      paragraph("„Do sada se nisam nikada tako zabavljao.”"),
      paragraph("„Lice ti prosto sija od sreće.” — reče majka."),
      paragraph("Dječak sjede pored majke: „Majko, kako nam je Allah, dž.š., darovao lijep svijet!”"),
      paragraph("„Da sine, Allah, dž.š., je, doista, stvorio veoma lijep svijet.”"),
      paragraph("„Onda i mi moramo biti s onima koji su na Pravom putu i tako iskazati našu zahvalnost!”"),
      paragraph("„Sejide, slažem se sa tobom, jer mi smo zaduženi za očuvanje ove ljepote koju nam je Allah, dž.š., dao na povjerenje. Svojim djelima trebamo pokazati da smo dobri robovi svome Gospodaru i trebamo opravdati dato nam povjerenje.”"),
      paragraph("„Ako budete zahvalni, Ja ću vam, zacijelo, još više dati; budete li nezahvalni, kazna Moja doista će stroga biti.” (Kur'an, sura Ibrahim, 7)"),
    ],
  },
  {
    topic_key: 'topic_1',
    title: "Sura El-Fatiha",
    sort_order: 11,
    blocks: [
      heading("Sura El-Fatiha", 2),
      paragraph("Fatiha je prva sura u Kur'anu."),
      heading("BISMILLĀHIR-RAHMĀNIR-RAHĪM", 3),
      paragraph("EL-HAMDU LILLĀHI RABBIL-'ĀLEMĪN.\nER-RAHMĀNIR-RAHĪM.\nMĀLIKI JEVMID-DĪN.\nIJJĀKE N'ABUDU VE IJJĀKE NESTE'ĪN.\nIHDINES-SIRĀTAL-MUSTEKĪM.\nSIRĀTALLEZĪNE EN'AMTE 'ALEJHIM,\nGAJRIL-MAGDŪBI 'ALEJHIM VE LED-DĀLLĪN. ĀMĪN!"),
      heading("Prijevod:", 3),
      paragraph("Hvala Allahu, Gospodaru svjetova,\nMilostivom, Samilosnom, Vladaru Sudnjega dana.\nSamo Tebe obožavamo i samo od Tebe pomoć tražimo.\nUputi nas na Pravi put.\nNa Put onih kojima si dao svoje blagodati,\na ne na put onih koji su protiv sebe srdžbu izazvali,\nniti onih koji su zalutali. Amin!"),
      paragraph("„Fatiha je prva sura iz Kur'ana,\nduhovna je hrana svakog muslimana,\nsvaki vjernik i vjernica ovu suru neka uči\ni sa njom se Allahovoj uputi prikuči.”"),
    ],
  },
  {
    topic_key: 'topic_1',
    title: "Ponavljanje gradiva — Uvodni dio",
    sort_order: 12,
    blocks: [
      heading("Ponavljanje je majka znanja", 2),
      paragraph("Do sada smo naučili: E'uzubilu i Bismilu, Rabbi jessir, Kelime-i-šehadet, Subhaneke i Fatihu. Provjerite da li znate:"),
      numberedItem("Prouči E'uzubilu!"),
      numberedItem("Prouči Bismilu!"),
      numberedItem("Kako počinjemo svaki dobar posao?"),
      numberedItem("Ko je najljepše Allahovo stvorenje?"),
      numberedItem("O čemu učimo u mektebu?"),
      numberedItem("Prouči dovu Rabbi jessir!"),
      numberedItem("Kako se zove naša vjera?"),
      numberedItem("Šta je islam?"),
      numberedItem("Čime potvrđujemo našu pripadnost islamu?"),
      numberedItem("Kako glasi Kelime-i-šehadet?"),
      numberedItem("Kako se zove islamski pozdrav?"),
      numberedItem("Kako se pozdravljamo i kako otpozdravljamo?"),
      numberedItem("Kome se trebamo zahvaljivati?"),
      numberedItem("Kako zahvaljujemo Uzvišenom Allahu?"),
      numberedItem("Kako glasi prva sura u Kur'anu?"),
    ],
  },

  // ── TOPIC 2: IMANSKI ŠARTI ──
  {
    topic_key: 'topic_2',
    title: "Pregled 33 šarta — Uvjeta u islamu",
    sort_order: 13,
    blocks: [
      heading("Pregled 33 šarta — Uvjeta u islamu", 2),
      paragraph("Treba znati da ima samo jedan Bog. On je Stvoritelj i Gospodar svih svjetova. Stvorio je čovjeka u najljepšem obliku i darovao mu razum. Razum je taj koji slijedi Božiju uputu i pokorava se Božijoj volji."),
      paragraph("Temelj islama je Kelime-i-šehadet kojim svjedočimo našu vjeru. Međutim, nije dovoljno samo vjerovati, nego je potrebno islamske dužnosti izvršavati."),
      heading("Islam se temelji na 33 šarta:", 3),
      heading("Imanski šarti (6):", 3),
      numberedItem("Āmentu billāhi (Ja vjerujem u Allaha)"),
      numberedItem("Ve melāiketihī (I vjerujem u Njegove meleke)"),
      numberedItem("Ve kutubihī (I vjerujem u Njegove Knjige)"),
      numberedItem("Ve rusulihī (I vjerujem u Njegove poslanike)"),
      numberedItem("Vel-jevmil-āhiri (I vjerujem u Sudnji dan)"),
      numberedItem("Ve bil-kaderi hajrihī ve šerrihī minellāhi te'ālā (I vjerujem da sve što se događa, dobro i zlo, biva Allahovom voljom i određenjem)"),
      heading("Islamski šarti (5):", 3),
      numberedItem("Kelime-i-šehadet (Očitovanje pripadnosti islamu)"),
      numberedItem("Klanjati propisane namaze"),
      numberedItem("Ramazan postiti"),
      numberedItem("Zekat davati"),
      numberedItem("Hadž obaviti"),
      heading("Abdeski šarti (4):", 3),
      numberedItem("Oprati lice"),
      numberedItem("Oprati obje ruke do iza laktova"),
      numberedItem("Potrati mokrom rukom četvrtinu glave (mesh)"),
      numberedItem("Oprati noge do članaka"),
      heading("Gusulski šarti (3):", 3),
      numberedItem("Isprati usta"),
      numberedItem("Isprati nos"),
      numberedItem("Oprati cijelo tijelo"),
      heading("Tejemumski šarti (2):", 3),
      numberedItem("Izgovoriti nijet"),
      numberedItem("Dotaknuti dlanovima čistu suhu zemlju i potrati lice, zatim ponovo dotaknuti zemlju i potrati obje ruke do iza laktova"),
      heading("Namaski šarti — Prije namaza (6 uvjeta):", 3),
      numberedItem("Da bude čisto tijelo, odijelo i mjesto gdje se klanja"),
      numberedItem("Uzeti abdest"),
      numberedItem("Propisno se obući (pokriti avret)"),
      numberedItem("Na vrijeme klanjati"),
      numberedItem("Okrenuti se prema Kibli"),
      numberedItem("Zanijetiti (donijeti odluku za namaz)"),
      heading("Namaski šarti — U toku namaza (6 ruknova):", 3),
      numberedItem("Iftitahi-tekbir (Početni tekbir)"),
      numberedItem("Kijam (Stajanje u namazu)"),
      numberedItem("Kiraet (Učenje Kur'ana)"),
      numberedItem("Ruku' (Pregib u namazu)"),
      numberedItem("Sedžda"),
      numberedItem("Ka'dei-ehire (Zadnje sjedenje u namazu)"),
    ],
  },
  {
    topic_key: 'topic_2',
    title: "Imanski šarti — Islamsko vjerovanje",
    sort_order: 14,
    blocks: [
      heading("Imanski šarti (Islamsko vjerovanje)", 2),
      paragraph("Islamsko vjerovanje, iman, sastoji se od šest temeljnih istina vjere ili šest imanskih šarta:"),
      numberedItem("ĀMENTU BILLĀHI — Ja vjerujem u Allaha"),
      numberedItem("VE MELĀIKETIHĪ — I vjerujem u Njegove meleke"),
      numberedItem("VE KUTUBIHĪ — I vjerujem u Njegove Knjige"),
      numberedItem("VE RUSULIHĪ — I vjerujem u Njegove poslanike"),
      numberedItem("VEL-JEVMIL-ĀHIRI — I vjerujem u Sudnji dan"),
      numberedItem("VE BIL-KADERI HAJRIHĪ VE ŠERRIHĪ MINELLĀHI TE'ĀLA — I vjerujem da sve što se događa, dobro i zlo, biva Allahovom voljom i određenjem"),
      heading("Stihovi o imanskim šartima", 3),
      paragraph("AMENTU BILLAHI:\nJa vjerujem u jednog Boga,\nKoji stvori svakog roba.\nOn sazda svemir cijeli\nda se samo Njemu divi.\n\nVE MELAIKETIHI:\nI vjerujem sve meleke,\nBez grijeha i bez mane.\nTako ih Bog stvori,\nNurom obasjane.\n\nVE KUTUBIHI:\nI vjerujem u Kitabe,\nto su riječi Uzvišenog.\nČetiri su odabrane,\nKur'anom potvrđene.\n\nVE RUSULIHI:\nI vjerujem u poslanike,\nAllahove miljenike.\nVjeru su nam dostavili,\nsvakom dobru podučili.\n\nVEL-JEVMIL-AHIRI:\nI vjerujem u Sudnji dan,\nkad će djela na mizan.\nOd Vatre se treba spasiti\ni u Džennetu se skrasiti.\n\nVA BIL-KADERI HAJRIHI VE ŠERRIHI MINELLAHI TE'ALA:\nI vjerujem da sve što se događa,\nšto umire i što se rađa,\nšto noć krije a dan otkriva,\nAllahovom voljom biva.\n\n(E. Nurović)"),
      paragraph("Imanske šarte treba znati i u njih čvrsto vjerovati. Ko ih zna i vjeruje srcem i jezikom on je vjernik — musliman."),
    ],
  },
  {
    topic_key: 'topic_2',
    title: "Prvi imanski šart: Āmentu billāhi i Sura Ihlas",
    sort_order: 15,
    blocks: [
      heading("Prvi imanski šart", 2),
      heading("ĀMENTU BILLĀHI — JA VJERUJEM U ALLAHA, DŽELLE ŠANUHU", 3),
      paragraph("Razmišljanjem o onom što nas okružuje, razum nas dovodi do uvjerenja da mora postojati neko savršen i moćan ko je sve stvorio i ko svim vlada i upravlja. To je Svemogući Allah, dželle šanuhu. Allah je stvoritelj i Gospodar svega što vidimo i što ne vidimo."),
      paragraph("Allah je stvorio Zemlju i nebo, životinje i biljke. Stvorio je čovjeka u najljepšem obliku."),
      paragraph("Kada spomenemo Božije ime Allah, treba da kažemo: dželle šanuhu, što znači: Uzvišeni ili Svevišnji, a skraćeno se piše: dž.š."),
      heading("Suretul-Ihlas", 2),
      heading("BISMILLĀHIR-RAHMĀNIR-RAHĪM", 3),
      paragraph("KUL HUVALLĀHU EHAD.\nALLĀHUS-SAMED.\nLEM JELID VE LEM JŪLED\nVE LEM JEKUN LEHŪ KUFUVEN EHAD."),
      heading("Prijevod:", 3),
      paragraph("Reci: „Allah je jedan.\nAllah je utočište svemu.\nNije rodio i rođen nije,\ni niko Mu ravan nije.”"),
    ],
  },
  {
    topic_key: 'topic_2',
    title: "Drugi imanski šart: Ve melāiketihī (Meleki)",
    sort_order: 16,
    blocks: [
      heading("Drugi imanski šart", 2),
      heading("VE MELĀIKETIHĪ — VJERUJEM U ALLAHOVE MELEKE", 3),
      paragraph("Meleki su razumna, duhovna, nevidljiva bića. Stvoreni su od nura – svjetlosti. Meleki ne griješe, oni slave i veličaju Allaha. Stalno služe Allahu i imaju svoja zaduženja. Nisu muškog ni ženskog spola, ne jedu i ne piju. Meleka ima mnogo, a njihov broj zna samo Allah."),
      heading("Imena najpoznatijih meleka i njihove dužnosti su:", 3),
      bulletItem("DŽIBRIL: Prenosio je i dostavljao Božije objave poslanicima"),
      bulletItem("MELEK SMRTI (AZRAIL): Rastavlja duše od tijela u času smrti"),
      bulletItem("MIKAIL: Brine se o prirodnim pojavama (vjetru, kiši, rastu bilja)"),
      bulletItem("ISRAFIL: Puhanjem u sur najavit će Kijametski i Sudnji dan"),
      bulletItem("KIRAMEN KATIBIN: Prate ljude, pišu njihova djela i donose im dobre misli"),
      bulletItem("MUNKIR I NEKIR: Ispituju u mezaru svakog čovjeka"),
      paragraph("Osim meleka, Allah je stvorio i druga nevidljiva bića, a to su džini i šejtani. Šejtani donose ružne misli i navode na zlo."),
      paragraph("Zaštitu od prokletog šejtana tražimo od Allaha, dželle šanuhu, riječima:"),
      heading("E'ŪZUBILLĀHI MINEŠ-ŠEJTĀNIR-RADŽĪM", 3),
      paragraph("Utječem se Allahu od prokletog šejtana."),
    ],
  },
  {
    topic_key: 'topic_2',
    title: "Treći imanski šart: Ve kutubihī (Božije knjige)",
    sort_order: 17,
    blocks: [
      heading("Treći imanski šart", 2),
      heading("VE KUTUBIHĪ — VJERUJEM U ALLAHOVE KNJIGE — OBJAVE", 3),
      paragraph("Allahove Knjige su Objave koje je melek Džibril dostavljao poslanicima, s ciljem da ih prenesu i objasne ljudima. Prva objava dostavljena je prvom čovjeku, Ademu, a.s."),
      paragraph("Sve Objave pozivale su ljude da vjeruju u Jednog Boga i da se Njemu pokoravaju. Objavljene su četiri velike Knjige. Bilo je i manjih Objava koje se zovu Suhufi."),
      heading("Četiri velike Knjige — Objave su:", 3),
      bulletItem("TEVRAT: Objavljen Musau, alejhis-selam"),
      bulletItem("ZEBUR: Objavljen Davudu, alejhis-selam"),
      bulletItem("INDŽIL: Objavljen Isau, alejhis-selam"),
      bulletItem("KUR'AN: Objavljen Muhammedu, alejhis-selam"),
      heading("Kur'an-i Kerim", 3),
      paragraph("Kur'an je posljednja Allahova knjiga koja je preko Muhammeda, a.s., objavljena svim ljudima. U njemu su sadržane upute, savjeti, dove i propisi o islamskom načinu života. Kur'an je putokaz ljudima kako bi bili sretni na ovom i Budućem svijetu. Objavljen je na arapskom jeziku. Objava je trajala 23 godine. Sastoji se od 114 sura."),
      paragraph("„Nema bolje knjige od Kur'ana niti ljepše vjere od islama.\nU njemu su mudre riječi što nas vode pravoj sreći.”"),
    ],
  },
  {
    topic_key: 'topic_2',
    title: "Četvrti imanski šart: Ve rusulihī (Božiji poslanici)",
    sort_order: 18,
    blocks: [
      heading("Četvrti imanski šart", 2),
      heading("VE RUSULIHĪ — VJERUJEM U ALLAHOVE POSLANIKE", 3),
      paragraph("Božiji poslanici su odabrani ljudi, koje je Allah, dž.š., iz Svoje milosti slao ljudima, da im dostave i objasne Allahovu Objavu — Uputu. Allah je svakom narodu slao poslanika i zato ih je bilo više, a Kur'an imenom spominje 25."),
      paragraph("Prvi čovjek na Zemlji je bio Adem, a.s. On je bio i prvi Božiji poslanik. Posljednji poslanik je Muhammed, a.s., i poslije njega do Sudnjeg dana neće biti poslanika."),
      heading("Odabrani Božiji poslanici su:", 3),
      numberedItem("Ādem, a.s."),
      numberedItem("Nūh, a.s."),
      numberedItem("Ibrāhīm, a.s."),
      numberedItem("Mūsā, a.s."),
      numberedItem("Īsā, a.s."),
      numberedItem("Muhammed, a.s."),
      paragraph("Iza imena poslanika treba dodati: alejhis-selam, što znači: Neka je na njega mir, a skraćeno se piše a.s."),
    ],
  },
  {
    topic_key: 'topic_2',
    title: "Muhammed, a.s. — Posljednji Božiji poslanik",
    sort_order: 19,
    blocks: [
      heading("Muhammed, a.s.", 2),
      paragraph("Muhammed, a.s., je posljednji Božiji poslanik. Rođen je 571. godine u Mekki, u plemenu Kurejš. Njegov otac se zvao Abdullah, a majka Amina. Veoma rano ostao je bez roditelja. Od šeste godine brigu o njemu preuzima njegov djed Abdulmuttalib, a potom amidža Ebu Talib."),
      paragraph("Allah, dž.š., ga je odabrao za Svoga poslanika i prenosioca posljednje Božije Objave ljudima. U četrdesetoj godini života, primio je prvu Objavu u pećini Hira i postao Božiji poslanik. Nakon trinaest godina, sa muslimanima iz Mekke preseljava se u Medinu i tu ostaje do kraja života. Na Ahiret je preselio u 63. godini u Medini, koja je po njemu dobila ime Medinetun-Nebijj."),
      paragraph("Muhammed, a.s., je najodabraniji čovjek i najbolji primjer ljudima kako treba živjeti i vjerovati."),
      heading("Kasida: Ahmede Muhammede", 3),
      paragraph("Moje srce tužno je\nšto ne imade sreće te,\nda druguje uz tebe\nAhmede Muhammede.\n\nKao naj kad zaplače\nmoje oči zarose\nželjne tvoje blizine,\nAhmede Muhammede.\n\nTi si milost Milosnog\nTi si radost srca mog,\nTi si lijek za rane\nAhmede Muhammede.\n\nAškom srce mi gori\nželjno tebe da vidi,\nnaš dragi pejgambere\nAhmede Muhammede.\n\nMojoj duši mehlem je\nkad salavat donese,\nkad ti ime spomene\nAhmede Muhammede."),
    ],
  },
  {
    topic_key: 'topic_2',
    title: "Peti imanski šart: Vel-jevmil-āhiri i Sura Kevser",
    sort_order: 20,
    blocks: [
      heading("Peti imanski šart", 2),
      heading("VEL-JEVMIL-ĀHIRI — VJERUJEM U SUDNJI DAN", 3),
      paragraph("Nakon života na ovome svijetu, koji je prolazan, ljudi će biti proživljeni na Ahiretu, koji je vječan. Sudnji dan je vrijeme kada će ljudi poslije proživljenja na Drugom svijetu odgovarati za svoja djela."),
      paragraph("Svakom čovjeku bit će pokazana njegova dobra i loša djela, koja su pisali meleki kiramen katibin."),
      paragraph("Ko bude vjerovao u Allaha, dž.š., i činio dobra djela, Božijom milošću bit će uveden u Džennet. U koga bude više loših djela, bit će kažnjen Džehennemom, ako mu Allah, dž.š., ne oprosti. Kada će biti Sudnji dan zna samo Allah, dž.š."),
      heading("Džennet", 3),
      paragraph("Džennet je mjesto na Drugom svijetu u kome će vjernici vječno boraviti i uživati sve blagodati."),
      heading("Džehennem", 3),
      paragraph("Džehennem je mjesto na Drugom svijetu u kome će nevjernici i griješnici, koji su se ogriješili o Božije naredbe ispaštati za svoje grijehe, ukoliko im se Allah ne smiluje i ne oprosti im."),
      heading("Suretu-l-Kevser", 2),
      heading("BISMILLĀHIR-RAHMĀNIR-RAHĪM", 3),
      paragraph("INNĀ E'ATAJNĀKEL-KEVSER,\nFE SALLI LI RABBIKE VEN-HAR,\nINNE ŠĀNI'EKE HUVEL-EBTER."),
      heading("Prijevod:", 3),
      paragraph("Mi smo ti, uistinu, mnogo dobro dali,\nzato se Gospodaru svome moli i kurban kolji.\nOnaj koji tebe mrzi sigurno će on bez spomena ostati."),
    ],
  },
  {
    topic_key: 'topic_2',
    title: "Šesti imanski šart: Ve bil-kaderi (Kader) i pjesma",
    sort_order: 21,
    blocks: [
      heading("Šesti imanski šart", 2),
      heading("VE BIL-KADERI HAJRIHĪ VE ŠERRIHĪ MINELLĀHI TE'ĀLA", 3),
      paragraph("Vjerujem da sve što se događa, dobro i loše, biva s Allahovom voljom i Allahovim određenjem."),
      paragraph("Allah je stvoritelj svega. On određuje sva zbivanja. Sve što se dešava, biva sa Božijom voljom i određenjem. Ono što Allah hoće to će i biti, a što neće ne može ni biti."),
      paragraph("Allah je podario ljudima razum i dao slobodnu volju, mogućnost izbora, da biraju između dobrih i loših djela. Zato čovjek treba nastojati da radi dobra djela. Ako ga zadesi kakva nesreća, treba biti strpljiv. Allahu je poznato sve što je bilo i što će biti."),
      heading("Rabba traži i uči", 3),
      paragraph("Allah, Allah, huve rabbuna, La ilahe illallah.\n\nRabba traži i uči,\nzikrullah ti sve viči,\ndolazit ćeš sve jači,\nLa ilahe illallah.\n\nTi namaza ne puštaj,\ndinski direk sačuvaj,\ndobru i zlu ima kraj,\nLa ilahe illallah.\n\nAllah jedan On je Hakk.\nTo priznati mora svak,\nod zuluma On je pak,\nLa ilahe illallah.\n\nO muslime, ne spavaj,\nuči Kur'an i slušaj,\nsvog sabaha ne puštaj,\nLa ilahe illallah.\n\nKada dođe Zadnji čas,\nuzalud je tražit spas.\nNek sačuva Allah nas,\nLa ilahe illallah."),
    ],
  },
  {
    topic_key: 'topic_2',
    title: "Ponavljanje gradiva — Imanski šarti",
    sort_order: 22,
    blocks: [
      heading("Ponavljanje je majka znanja", 2),
      paragraph("Provjerite svoje znanje o imanskim šartima:"),
      numberedItem("Koliko ima šartova — uvjeta u islamu?"),
      numberedItem("Kako glasi prvi imanski šart?"),
      numberedItem("Šta znači Amentu billahi?"),
      numberedItem("Šta znači Ve rusulihi?"),
      numberedItem("Prouči suru Ihlas!"),
      numberedItem("Koji su najpoznatiji meleki?"),
      numberedItem("Kako se zove melek koji je dostavljao Božije Objave?"),
      numberedItem("Šta rade meleki zvani Kiramen katibin?"),
      numberedItem("Nabroj velike Božije Objave!"),
      numberedItem("Koja Božija Objava je objavljena Isa, alejhis-selamu?"),
      numberedItem("Šta znači alejhis-selam?"),
      numberedItem("Koja je posljednja Božija Objava?"),
      numberedItem("Koliko sura ima u Kur'anu?"),
      numberedItem("Koliko je u Kur'anu imenom spomenuto Božijih poslanika?"),
      numberedItem("Ko je prvi čovjek i prvi Božiji poslanik?"),
      numberedItem("Koji je posljednji Božiji poslanik?"),
      numberedItem("Kada je rođen Muhammed, a.s.?"),
      numberedItem("U kojoj godini života je Muhammed, a.s., primio prvu Objavu?"),
      numberedItem("Prouči kasidu Ahmede Muhammede!"),
      numberedItem("Kada će biti Sudnji dan?"),
      numberedItem("Šta je nagrada za vjernike na Ahiretu?"),
      numberedItem("Prouči suru El-Kevser!"),
      numberedItem("Ko određuje sudbinu ljudima?"),
    ],
  },

  // ── TOPIC 3: ISLAMSKI ŠARTI ──
  {
    topic_key: 'topic_3',
    title: "Islamski šarti i Sura Felek",
    sort_order: 23,
    blocks: [
      heading("Islamski šarti (Glavne islamske dužnosti)", 2),
      paragraph("Islamski šarti su glavne islamske dužnosti. Naređeni su u Kur'anu kao stroga obaveza. Vjernik i vjernica, osim vjerovanja, dužni su izvršavati islamske dužnosti."),
      heading("Glavnih islamskih dužnosti ima pet:", 3),
      numberedItem("KELIME-I-ŠEHADET"),
      numberedItem("NAMAZE KLANJATI"),
      numberedItem("RAMAZAN POSTITI"),
      numberedItem("ZEKAT DAVATI"),
      numberedItem("HADŽ OBAVITI"),
      paragraph("Oni koji izvršavaju glavne islamske dužnosti i druge Božije zapovijedi nadaju se Allahovoj, dželle šanuhu, nagradi."),
      heading("Suretul-Felek", 2),
      heading("BISMILLĀHIR-RAHMĀNIR-RAHĪM", 3),
      paragraph("KUL E'ŪZU BI RABBIL-FELEK,\nMIN ŠERRI MĀ HALEK,\nVE MIN ŠERRI GĀSIKIN IZĀ VEKAB,\nVE MIN ŠERRIN-NEFFĀSĀTI FIL-'UKAD,\nVE MIN ŠERRI HĀSIDIN IZĀ HASED."),
      heading("Prijevod:", 3),
      paragraph("Reci: „Utječem se Gospodaru svitanja\nod zla onoga što On stvara,\ni od zla mrkle noći kada razastre tmine,\ni od zla smutljivca kada smutnju sije,\ni od zla zavidljivca kada zavist ne krije!”"),
    ],
  },
  {
    topic_key: 'topic_3',
    title: "Prvi islamski šart: Kelime-i-šehadet i Sura Nas",
    sort_order: 24,
    blocks: [
      heading("Prvi islamski šart", 2),
      heading("KELIME-I-ŠEHADET — OČITOVANJE PRIPADNOSTI ISLAMU", 3),
      paragraph("Šehadet znači: srcem vjerovati i jezikom svjedočiti postojanje Jednog Boga, Stvoritelja i Vladara svih svjetova, Koji je preko Muhammeda, a.s., ukazao Svoju milost cijelom čovječanstvu."),
      heading("Ponovimo kako glasi Kelime-i-šehadet:", 3),
      heading("EŠHEDU EN LĀ ILĀHE ILLALLĀH, VE EŠHEDU ENNE MUHAMMEDEN 'ABDUHŪ VE RESŪLUHŪ.", 3),
      paragraph("Vjerujem i svjedočim da nema božanstva osim Allaha, i vjerujem i svjedočim da je Muhammed Allahov rob i poslanik!"),
      paragraph("Kelime-i-šehadetom iskazujemo i potvrđujemo svoju pripadnost islamu kroz pokornost i vjerovanje u Allaha, dž.š., i poslanstvo Muhammeda, a.s."),
      heading("Suretun-Nas", 2),
      heading("BISMILLĀHIR-RAHMĀNIR-RAHĪM", 3),
      paragraph("KUL E'ŪZU BI RABBIN-NĀS,\nMELIKIN-NĀS,\nILĀHIN-NĀS,\nMIN ŠERRIL-VESVĀSIL-HANNĀS,\nELLEZĪ JUVESVISU FĪ SUDŪRIN-NĀS,\nMINEL-DŽINNETI VEN-NĀS."),
      heading("Prijevod:", 3),
      paragraph("Reci: „Tražim zaštitu Gospodara ljudi,\nVladara ljudi, Boga ljudi,\nod zla šejtana — napasnika,\nkoji zle misli unosi u srca ljudi —\nod džina i od ljudi!”"),
    ],
  },
  {
    topic_key: 'topic_3',
    title: "Drugi islamski šart: Propisane namaze klanjati",
    sort_order: 25,
    blocks: [
      heading("Drugi islamski šart", 2),
      heading("PROPISANE NAMAZE KLANJATI", 3),
      paragraph("Namaz je stroga islamska dužnost naređena u Kur'anu i potvrđena praksom Muhammeda, a.s. Klanjanjem namaza iskazujemo pokornost i poštovanje Allahu, dž.š., na najuzvišeniji način."),
      heading("U toku jednog dana, klanjamo pet namaza:", 3),
      bulletItem("SABAH: Sabah se klanja prije izlaska sunca."),
      bulletItem("PODNE: Podne se klanja kada je sunce iza polovine neba."),
      bulletItem("IKINDIJA: Ikindija se klanja kada sunce krene ka zapadu."),
      bulletItem("AKŠAM: Akšam se klanja kada sunce zađe."),
      bulletItem("JACIJA: Jacija se klanja kad padne potpuni mrak."),
      heading("Osim pet dnevnih namaza, klanjamo i sljedeće namaze:", 3),
      bulletItem("DŽUMA: Klanja se petkom u vrijeme podne namaza."),
      bulletItem("TERAVIJA: Klanja se tokom ramazana, u vrijeme jacije namaza."),
      bulletItem("BAJRAM: Klanja se prvi dan Bajrama, dva puta godišnje."),
      bulletItem("DŽENAZA: Klanja se umrlim muslimanima i muslimankama."),
      paragraph("Klanjati učimo kad pođemo u školu, a dužni smo redovno klanjati od desete godine života."),
    ],
  },
  {
    topic_key: 'topic_3',
    title: "Treći islamski šart: Postiti mjesec ramazan",
    sort_order: 26,
    blocks: [
      heading("Treći islamski šart", 2),
      heading("POSTITI MJESEC RAMAZAN", 3),
      paragraph("Post je islamska dužnost naređena Kur'anom. Ramazanski post je čuvanje od jela, pića, drugih tjelesnih uživanja i ružnih djela od zore do zalaska sunca."),
      paragraph("Ramazan je najodabraniji mjesec u godini u kome je počela objava Kur'ana. U ramazanu postimo, dajemo zekat i sadekatul-fitr, klanjamo teraviju, spremamo iftare, učimo Kur'an i radimo druga dobra djela."),
      heading("Post počinjemo nijetom:", 3),
      heading("NEVEJTU EN ESŪME GADEN LILLĀHI TE'ĀLĀ FERĪDATEN MIN ŠEHRI RAMADĀNE.", 3),
      paragraph("Prijevod: „Odlučih, u ime Allaha, da postim ovaj dan mjeseca ramazana!”"),
      heading("Post prekidamo iftarom prije kojeg učimo dovu:", 3),
      heading("ALLĀHUMME INNĪ LEKE SUMTU, VE BIKE ĀMENTU, VE 'ALEJKE TEVEKKELTU VE 'ALĀ RIZKIKE EFTARTU.", 3),
      paragraph("Prijevod: „Allahu moj, radi Tebe postim, u Tebe vjerujem, u Tebe se uzdam, i Tvojom opskrbom se iftarim!”"),
      paragraph("Postom su zaduženi svi odrasli, pametni i zdravi muslimani i muslimanke. Ramazanski post završava se svečanim danima Ramazanskog bajrama."),
    ],
  },
  {
    topic_key: 'topic_3',
    title: "Četvrti islamski šart: Zekat davati i Sura Leheb",
    sort_order: 27,
    blocks: [
      heading("Četvrti islamski šart", 2),
      heading("ZEKAT DAVATI", 3),
      paragraph("Zekat je stroga islamska dužnost propisana Kur'anom svim imućnim muslimanima, da obavezno izdvoje i daju jedan dio imovine iz viška imetka, islamskim odgojno-obrazovnim ustanovama i siromašnim muslimanima."),
      paragraph("Davalac zekata postiže Božije zadovoljstvo i milost, čisti imetak od tuđeg prava, štiti ga od propadanja i čuva svoje srce od škrtosti. Zekat se obično daje uz ramazan, a može se dati i tokom cijele godine."),
      heading("Imovina na koju treba dati zekat:", 3),
      bulletItem("Poljoprivredni proizvodi"),
      bulletItem("Zlato, srebro i novac"),
      bulletItem("Trgovačka roba"),
      bulletItem("Stoka"),
      paragraph("Pravo i dužnost da sakuplja zekat isključivo pripada Islamskoj zajednici."),
      heading("Suretul-Leheb", 2),
      heading("BISMILLĀHIR-RAHMĀNIR-RAHĪM", 3),
      paragraph("TEBBET JEDĀ EBĪ LEHEBIN VE TEBB,\nMĀ AGNĀ 'ANHU MĀLUHŪ VE MĀ KESEB,\nSE JASLĀ NĀREN ZĀTE LEHEB,\nVEMRE-'ETUHŪ HAMMĀLETEL-HATAB,\nFĪ DŽĪDIHĀ HABLUN MIN MESED."),
      heading("Prijevod:", 3),
      paragraph("Neka propadne Ebu Leheb, i propao je!\nNeće mu biti od koristi blago njegovo,\na ni ono što je stekao.\nUći će on, sigurno, u vatru rasplamsalu,\ni žena njegova koja spletkari;\no vratu njenu bit će uže od ličine usukane!"),
    ],
  },
  {
    topic_key: 'topic_3',
    title: "Peti islamski šart: Hadž obaviti i Telbija",
    sort_order: 28,
    blocks: [
      heading("Peti islamski šart", 2),
      heading("HADŽ OBAVITI", 3),
      paragraph("Hadž je peta islamska dužnost i Božija naredba svakom punoljetnom, pametnom, imućnom i zdravom muslimanu i muslimanki da ga obavi jednom u životu kad bude u mogućnosti. Hadž je posjeta Kabi i drugim svetim mjestima u Mekki."),
      paragraph("Prije odlaska na hadž, dužnost hadžije je da izmiri dugove ako ih ima i obezbjedi porodicu dok se ne vrati."),
      heading("Kraj Kabe sam ja stajao", 3),
      paragraph("Kraj Kabe sam ja stajao,\nhej, aman, aman, ja stajao,\ncrne grijehe sapirao,\nhej, aman, aman, sapirao!\n\nSvom se Rabbu odzivao:\nLebbejkellāhumme, lebbejk,\nlebbejkallāhu!\nlebbejkellāhumme, lebbejk,\nlebbejkellāh!\n\nU tavafu hodao sam,\nhej, aman, aman, hodao sam,\nka'no zvijezda drhtao sam,\nhej, aman, aman, drhtao sam.\n\nKo Ibrahim vikao sam:\nLebbejkellāhumme, lebbejk,\nlebbejkallāhu!\nlebbejkellāhumme, lebbejk,\nlebbejkellāh!\n\nPokraj vrela Zemzemova\nhej, aman, aman, zemzemova,\nslegla jata labudova,\nhej, aman, aman, labudova!\n\nŽamor želja i glasova:\nLebbejkellāhumme, lebbejk,\nlebbejkallāhu!\nlebbejkellāhumme, lebbejk,\nlebbejkellāh!\n\nIz srdašca ašikane,\nhej, aman, aman, ašikane,\nte rijeke neprestane,\nhej, aman, aman, neprestane!\n\nTeče islam na sve strane:\nLebbejkellāhumme, lebbejk,\nlebbejkallāhu!\nlebbejkellāhumme, lebbejk,\nlebbejkellāh!"),
    ],
  },
  {
    topic_key: 'topic_3',
    title: "Ponavljanje gradiva — Islamski šarti",
    sort_order: 29,
    blocks: [
      heading("Ponavljanje je majka znanja", 2),
      paragraph("Provjerite svoje znanje o islamskim dužnostima:"),
      numberedItem("Koliko ima glavnih islamskih dužnosti?"),
      numberedItem("Kako glasi prvi islamski šart?"),
      numberedItem("Šta svjedočimo Kelime-i-šehadetom?"),
      numberedItem("Koji je drugi islamski šart?"),
      numberedItem("Koliko ima dnevnih namaza?"),
      numberedItem("Kada klanjamo sabah-namaz?"),
      numberedItem("U koje vrijeme se klanja džuma-namaz?"),
      numberedItem("Kako glasi treći islamski šart?"),
      numberedItem("Kako glasi nijet za post?"),
      numberedItem("Prouči dovu uz koju se iftarimo."),
      numberedItem("Od čega se čuvamo prilikom posta?"),
      numberedItem("Ko je dužan postiti?"),
      numberedItem("Koji je četvrti islamski šart?"),
      numberedItem("Na koju imovinu trebamo dati zekat?"),
      numberedItem("Šta je to hadž?"),
      numberedItem("Ko je dužan obaviti hadž?"),
      numberedItem("Prouči suru Felek."),
      numberedItem("Kako glasi Suretun-Nas?"),
      numberedItem("Prouči suru Leheb."),
    ],
  },
];

async function main() {
  const env = {};
  try {
    const envFile = await fs.readFile('.env.local', 'utf-8');
    envFile.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
  } catch (e) {
    console.warn('Warning: Could not read .env.local file directly.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment or .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  console.log(`Connecting to Supabase at ${supabaseUrl}...`);

  // Step 1: Delete all existing lesson-related rows across the database
  console.log('Clearing existing lesson completions, audio, translations, and resources...');
  await supabase.from('lesson_resources').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('lesson_completions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('lesson_audio').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('lesson_translations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('exam_lesson_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Clearing all existing lessons...');
  const { error: delLessonsErr } = await supabase.from('lessons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delLessonsErr) console.warn('Warning deleting lessons:', delLessonsErr.message);

  console.log('Clearing all existing topics...');
  const { error: delTopicsErr } = await supabase.from('topics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delTopicsErr) console.warn('Warning deleting topics:', delTopicsErr.message);

  // Step 2: Fetch all mosques
  const { data: mosques, error: mosquesErr } = await supabase.from('mosques').select('id, name');
  if (mosquesErr || !mosques || mosques.length === 0) {
    console.error('Error fetching mosques:', mosquesErr?.message || 'No mosques found');
    process.exit(1);
  }

  console.log(`Found ${mosques.length} mosque(s):`, mosques.map(m => `${m.name} (${m.id})`).join(', '));

  for (const mosque of mosques) {
    console.log(`\nSeeding curriculum for mosque: "${mosque.name}" (${mosque.id})...`);

    // Insert topics
    const topicIdMap = {};
    for (const t of topics) {
      const { data: topicData, error: topicErr } = await supabase
        .from('topics')
        .insert({
          mosque_id: mosque.id,
          title: t.title,
          description: t.description,
          sort_order: t.sort_order,
          is_published: true,
        })
        .select('id')
        .single();

      if (topicErr) {
        console.error(`Error inserting topic "${t.title}":`, topicErr.message);
      } else {
        topicIdMap[t.key] = topicData.id;
        console.log(`  ✓ Topic created: "${t.title}" (${topicData.id})`);
      }
    }

    // Insert lessons
    let count = 0;
    for (const l of lessons) {
      const topicId = topicIdMap[l.topic_key];
      const { error: lessonErr } = await supabase.from('lessons').insert({
        mosque_id: mosque.id,
        topic_id: topicId,
        title: l.title,
        body: l.blocks,
        sort_order: l.sort_order,
        is_published: true,
      });

      if (lessonErr) {
        console.error(`  ✗ Error inserting lesson "${l.title}":`, lessonErr.message);
      } else {
        count++;
      }
    }
    console.log(`  ✓ Successfully seeded ${count}/${lessons.length} lessons for ${mosque.name}!`);
  }

  console.log('\nAll topics and lessons have been cleanly refreshed in the database!');
}

main().catch(console.error);
