// Script to generate complete SQL for German lesson translations
// and write to migration and seed files

import fs from 'fs';
import path from 'path';

function bnHeading(text, level = 2) {
  return {
    id: "gen_random_uuid()::text",
    type: "heading",
    props: {
      level,
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left",
      isToggleable: false
    },
    content: [{ type: "text", text, styles: {} }],
    children: []
  };
}

function bnParagraph(text) {
  return {
    id: "gen_random_uuid()::text",
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left"
    },
    content: [{ type: "text", text, styles: {} }],
    children: []
  };
}

function bnBullet(text) {
  return {
    id: "gen_random_uuid()::text",
    type: "bulletListItem",
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left"
    },
    content: [{ type: "text", text, styles: {} }],
    children: []
  };
}

function bnNumber(text) {
  return {
    id: "gen_random_uuid()::text",
    type: "numberedListItem",
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left"
    },
    content: [{ type: "text", text, styles: {} }],
    children: []
  };
}

export const GERMAN_LESSONS = [
  // TOPIC 1
  {
    bosnianTitle: "E'uzubila i Bismila",
    germanTitle: "E'ūzubillāh und Bismillāh",
    sortOrder: 1,
    blocks: [
      { type: 'h', level: 2, text: "E'ūzubillāh" },
      { type: 'p', text: "Die ersten Worte, die wir lernen, lauten:" },
      { type: 'h', level: 3, text: "E'ŪZUBILLĀHI MINEŠ-ŠEJTĀNIR-RADŽĪM" },
      { type: 'p', text: "Diese Worte bedeuten: „Ich nehme Zuflucht bei Allah vor dem verfluchten Schaytan (Teufel).”" },
      { type: 'p', text: "Wir sprechen diese Worte:" },
      { type: 'b', text: "damit wir in Sicherheit und geschützt sind" },
      { type: 'b', text: "damit wir leicht und gut lernen" },
      { type: 'b', text: "damit wir fröhlich und sicher spielen" },
      { type: 'b', text: "damit wir ruhig schlafen und schöne Träume haben" },
      { type: 'h', level: 2, text: "Bismillāh" },
      { type: 'p', text: "Mit welchen Worten beginnen wir jede gute Tat? Es sind die Worte, die jeder Muslim und jede Muslima kennen sollte:" },
      { type: 'h', level: 3, text: "BISMILLĀHIR-RAHMĀNIR-RAHĪM" },
      { type: 'p', text: "Lernen wir die Bedeutung dieser Worte: „Im Namen Allahs, des Allerbarmers, des Barmherzigen!”" },
      { type: 'h', level: 2, text: "Wann sprechen wir E'ūzubillāh und Bismillāh?" },
      { type: 'b', text: "Wenn wir essen und trinken" },
      { type: 'b', text: "Wenn wir lernen und lesen" },
      { type: 'b', text: "Wenn wir Fahrrad fahren" },
      { type: 'b', text: "Wenn wir ins Auto einsteigen" },
      { type: 'b', text: "Wenn wir das Haus betreten" },
      { type: 'b', text: "Wenn wir schlafen gehen" },
      { type: 'b', text: "Vor dem Spielen" },
      { type: 'b', text: "Wenn wir unsere Kleidung anziehen" },
      { type: 'p', text: "Darüber hinaus sprechen wir E'ūzubillāh und Bismillāh in vielen weiteren Lebenslagen. Frage deinen Muallim (Lehrer), wann man sie noch spricht." }
    ]
  },
  {
    bosnianTitle: "Čovjek je najljepše Allahovo stvorenje",
    germanTitle: "Der Mensch ist Allahs schönste Schöpfung",
    sortOrder: 2,
    blocks: [
      { type: 'h', level: 2, text: "Der Mensch ist Allahs schönste Schöpfung" },
      { type: 'p', text: "Allah, der Erhabene, hat die gesamte Welt erschaffen:" },
      { type: 'b', text: "Den Menschen" },
      { type: 'b', text: "Die Pflanzen" },
      { type: 'b', text: "Die Tiere" },
      { type: 'b', text: "Die Erde" },
      { type: 'b', text: "Den Himmel" },
      { type: 'b', text: "Das Weltall" },
      { type: 'p', text: "Im Heiligen Koran spricht Allah der Erhabene:" },
      { type: 'h', level: 3, text: "„Wahrlich, Wir haben den Menschen in schönster Gestalt erschaffen.”" },
      { type: 'p', text: "(Koran, Sure At-Tin, Vers 4)" }
    ]
  },
  {
    bosnianTitle: "Ja u mekteb idem i dove za početak",
    germanTitle: "Ich gehe in die Mekteb & Bittgebete zum Anfang",
    sortOrder: 3,
    blocks: [
      { type: 'h', level: 2, text: "Ich gehe in die Mekteb" },
      { type: 'p', text: "Die Mekteb ist eine kleine Schule bei oder in der Moschee. In der Mekteb spielen wir und lernen:" },
      { type: 'b', text: "über den islamischen Glauben" },
      { type: 'b', text: "über die islamischen Pflichten" },
      { type: 'b', text: "über das islamische Verhalten und Benehmen" },
      { type: 'h', level: 3, text: "Was wir in die Mekteb mitbringen:" },
      { type: 'b', text: "Ilmihal (Lehrbuch)" },
      { type: 'b', text: "Heft" },
      { type: 'b', text: "Bleistift" },
      { type: 'b', text: "Radiergummi" },
      { type: 'b', text: "Rucksack / Schultasche" },
      { type: 'h', level: 2, text: "Bittgebete für einen gesegneten Anfang" },
      { type: 'h', level: 3, text: "BISMILLĀHIR-RAHMĀNIR-RAHĪM" },
      { type: 'h', level: 3, text: "RABBI JESSIR VE LĀ TUASSIR, RABBI TEMMIM BIL-HAJR. ĀMĪN." },
      { type: 'p', text: "O mein Herr, schenke Erleichterung und erschwere nicht. O mein Herr, vollende es mit dem Guten. Amin!" },
      { type: 'h', level: 3, text: "RABBI ZIDNĪ ILMĀ" },
      { type: 'p', text: "Mein Herr, vermehre mein Wissen!" },
      { type: 'h', level: 3, text: "Gedicht: Mirza eilt zum Unterricht" },
      { type: 'p', text: "Ein glücklicher Tag ist erwacht,\nMirza geht freudig und lacht.\nEr hüpft vergnügt – jeder kann es seh'n,\nzur Mekteb sieht man Mirza geh'n.\n\nIn seiner Hand die kleine Tasche,\ndarin das Heft und die Mappe,\nund das Lehrbuch Ilmihal,\nsein erstes Wort: Bismillāh.\n\n(R. Kadić)" }
    ]
  },
  {
    bosnianTitle: "Vjera islam i Kelime-i-šehadet",
    germanTitle: "Die Religion Islam und das Glaubensbekenntnis (Shahada)",
    sortOrder: 4,
    blocks: [
      { type: 'h', level: 2, text: "Die Religion Islam" },
      { type: 'p', text: "Unsere Religion heißt Islam." },
      { type: 'h', level: 3, text: "Was ist der Islam?" },
      { type: 'p', text: "Der Islam ist die Religion, die Allah, der Erhabene, durch Seinen Gesandten Muhammad, Friede sei mit ihm, der gesamten Menschheit offenbart hat." },
      { type: 'h', level: 3, text: "Was bedeutet Islam?" },
      { type: 'p', text: "Islam bedeutet Ergebung und Hingabe an Allah, den Erhabenen." },
      { type: 'h', level: 3, text: "Worin besteht die Hingabe an Allah?" },
      { type: 'p', text: "Muslime glauben an Allah, erfüllen die religiösen Pflichten und Gebote und tun das Gute. Sie verhalten sich vorbildlich, sprechen die Wahrheit und helfen ihren Mitmenschen." },
      { type: 'p', text: "„Der Islam ist wie das Sonnenlicht,\nwenn er einmal dein Herz berührt,\nliebst du die ganze Welt,\nund Hass in dir verfällt.”\n(R. Kadić)" },
      { type: 'h', level: 2, text: "Kalima ash-Shahada (Das Glaubensbekenntnis)" },
      { type: 'p', text: "Mit der Shahada bezeugen wir, dass wir Muslime sind." },
      { type: 'h', level: 3, text: "Wie lautet das Glaubensbekenntnis?" },
      { type: 'h', level: 3, text: "EŠHEDU EN LĀ ILĀHE ILLALLĀH, VE EŠHEDU ENNE MUHAMMEDEN 'ABDUHŪ VE RESŪLUHŪ." },
      { type: 'p', text: "Übersetzung: „Ich bezeuge, dass es keinen Gott gibt außer Allah, und ich bezeuge, dass Muhammad Sein Diener und Gesandter ist!”" }
    ]
  },
  {
    bosnianTitle: "Selam — Islamski pozdrav",
    germanTitle: "Salam — Der islamische Friedensgruß",
    sortOrder: 5,
    blocks: [
      { type: 'h', level: 2, text: "Salam — Der islamische Friedensgruß" },
      { type: 'p', text: "Der Salam ist der gegenseitige Gruß der Muslime." },
      { type: 'h', level: 3, text: "Wie grüßt und erwidert man den Salam?" },
      { type: 'p', text: "Gruß: As-salāmu 'alejkum!\nAntwort: Ve 'alejkumus-selām!" },
      { type: 'p', text: "Bedeutung: Friede und Heil sei mit euch!" },
      { type: 'p', text: "„As-salāmu 'alejkum erschallt von allen Seiten,\nSalam, Friedensgruß möge uns stets begleiten.”" },
      { type: 'h', level: 3, text: "Wann und wem entbieten wir den Salam?" },
      { type: 'b', text: "Beim Betreten und Verlassen des Hauses" },
      { type: 'b', text: "Wenn wir Muslime auf der Straße treffen" },
      { type: 'b', text: "Jüngere grüßen ältere Personen zuerst" },
      { type: 'b', text: "Männer entbieten zuerst den Gruß" },
      { type: 'b', text: "Beim Hinzukommen zu einer Gruppe oder beim Verabschieden" },
      { type: 'p', text: "Übe mit deinem Muallim spielerisch den Friedensgruß in verschiedenen Alltagssituationen!" }
    ]
  },
  {
    bosnianTitle: "Čistoća u islamu",
    germanTitle: "Reinheit und Hygiene im Islam",
    sortOrder: 6,
    blocks: [
      { type: 'h', level: 2, text: "Reinheit (Taharah)" },
      { type: 'p', text: "Reinheit ist die halbe Gesundheit. Deshalb achten wir stets auf die Hygiene unseres Körpers und unserer Kleidung." },
      { type: 'p', text: "Wasser ist eine große Gabe Allahs an die Menschen, die wir zum Trinken, Kochen, Waschen des Körpers und der Kleidung nutzen." },
      { type: 'p', text: "Allah liebt Ordnung und Reinlichkeit, und Muslime sollten stets sauber und gepflegt sein." },
      { type: 'p', text: "Der Prophet Muhammad, Friede sei mit ihm, sagte: „Die Reinheit ist ein Teil des Glaubens.”" },
      { type: 'h', level: 3, text: "Zur persönlichen Hygiene gehört:" },
      { type: 'b', text: "Händewaschen vor und nach dem Essen" },
      { type: 'b', text: "Regelmäßiges Baden und Duschen" },
      { type: 'b', text: "Regelmäßiges Zähneputzen" },
      { type: 'b', text: "Regelmäßiges Schneiden der Fingernägel" }
    ]
  },
  {
    bosnianTitle: "Voda je Allahov dar",
    germanTitle: "Das Wasser ist eine Gabe Allahs",
    sortOrder: 7,
    blocks: [
      { type: 'h', level: 2, text: "Das Wasser ist eine Gabe Allahs" },
      { type: 'p', text: "Ein gewöhnlicher Sommertag. Sejid spielte mit anderen Kindern im Hof der Moschee. Er unterbrach das Spiel und rannte ins Haus:" },
      { type: 'p', text: "„Mutter, ich habe Durst, kann ich ein Glas Wasser bekommen?”" },
      { type: 'p', text: "Nachdem er getrunken und gedankt hatte, fragte er:" },
      { type: 'p', text: "„Schenkt uns Allah auch das Wasser? Wie herrlich es ist, wenn der Durst gestillt ist. So fühlen sich doch sicher alle?”" },
      { type: 'p', text: "„Ja, Sejid. Damit der Mensch seine Bedürfnisse stillen kann, schenkt Allah ihm das Wasser, welches der Ursprung allen Lebens ist.”" },
      { type: 'p', text: "„Gibt Er auch meinem Kätzchen Wasser?”, fragte er. Die Mutter nickte bejahend." },
      { type: 'p', text: "„Und den Vögeln, Hasen, Lämmern und anderen Tieren?”" },
      { type: 'p', text: "„Ja, Sejid. Allah hat allen Geschöpfen Wasser geschenkt, um ihren Durst zu stillen: den Pflanzen, den Bäumen und allem Lebendigen. Allem, was auf Wasser angewiesen ist, gibt Er Wasser.”" },
      { type: 'p', text: "„Regnet es deshalb?”, fragte Sejid. „Wenn es regnet, kann ich zwar nicht draußen spielen, aber jetzt weiß ich, dass sich die Erde und die Pflanzen über den Regen freuen.”" },
      { type: 'p', text: "Die Mutter streichelte ihm über den Kopf und sagte:" },
      { type: 'p', text: "„Ja, mein Sohn, du hast recht, sie lieben den Regen. Schau in den Himmel: Siehst du die dichten Wolken? Sie bringen den Regen. Schau, schon fallen die ersten Tropfen. Hilfst du mir, die Fenster zu schließen?”" },
      { type: 'p', text: "Der Junge half fröhlich und sagte:" },
      { type: 'p', text: "„Mutter, der Regen wird lange fallen und alle Pflanzen trinken. Und was geschieht mit dem Wasser auf der Erde?”" },
      { type: 'p', text: "„Ein Teil sammelt sich in Quellen. Von dort wird das saubere Wasser in die Wasserleitungen geführt, die es in unsere Häuser bringen.”" },
      { type: 'p', text: "Da rief Sejid:" },
      { type: 'p', text: "„Ohne Wasser könnte ich mich gar nicht waschen! Mutter, wie wichtig das Wasser für alle ist! Allah, unser Herr, ist wahrhaft großzügig, dass Er uns Wasser schenkt!”" },
      { type: 'p', text: "Wasser ist eine wunderbare Gabe Allahs!" }
    ]
  },
  {
    bosnianTitle: "Desna strana u islamu",
    germanTitle: "Der Vorzug der rechten Seite im Islam",
    sortOrder: 8,
    blocks: [
      { type: 'h', level: 2, text: "Die rechte Seite" },
      { type: 'p', text: "Der Islam gibt der rechten Seite den Vorzug. Deshalb verrichten wir alle schönen und guten Dinge mit der rechten Hand und dem rechten Fuß:" },
      { type: 'b', text: "Mit der rechten Hand essen und trinken" },
      { type: 'b', text: "Zuerst den rechten Ärmel anziehen" },
      { type: 'b', text: "Zuerst den rechten Schuh anziehen" },
      { type: 'b', text: "Auf der rechten Seite schlafen" },
      { type: 'b', text: "Mit dem rechten Fuß ins Haus und in die Moschee eintreten" },
      { type: 'b', text: "Mit dem linken Fuß aus dem Haus hinaustreten" }
    ]
  },
  {
    bosnianTitle: "Hrana i piće — Halal i haram",
    germanTitle: "Essen und Trinken — Halal und Haram",
    sortOrder: 9,
    blocks: [
      { type: 'h', level: 2, text: "Essen und Trinken" },
      { type: 'p', text: "Allah, der Erhabene, hat den Menschen erschaffen und ihm Nahrung geschenkt. Er hat ihm alle guten, reinen Speisen und Getränke erlaubt (Halal) und schädliche Dinge verboten (Haram)." },
      { type: 'h', level: 3, text: "Was HALAL (erlaubt) ist:" },
      { type: 'b', text: "Hase, Schaf, Rind, Huhn, Fisch" },
      { type: 'b', text: "Obst, Gemüse, Getreide und Milchprodukte" },
      { type: 'h', level: 3, text: "Was HARAM (verboten) ist:" },
      { type: 'b', text: "Schweinefleisch und Schweineerzeugnisse" },
      { type: 'b', text: "Hund, Raubvögel, Frösche und Fleisch von Raubtieren" },
      { type: 'b', text: "Alkohol und berauschende Getränke" },
      { type: 'h', level: 3, text: "Verhaltensregeln beim Essen und Trinken:" },
      { type: 'b', text: "Vor und nach dem Essen die Hände waschen" },
      { type: 'b', text: "Vor dem Essen Bismillāh sagen und mit der rechten Hand essen" },
      { type: 'b', text: "Keine zu heißen Speisen essen" },
      { type: 'b', text: "Gemeinsam mit der Familie speisen" },
      { type: 'b', text: "Nach dem Essen Allah mit „Al-hamdu lillāh” danken" },
      { type: 'b', text: "Nach der Mahlzeit den Tisch abräumen" },
      { type: 'b', text: "Nach dem Essen die Zähne putzen" }
    ]
  },
  {
    bosnianTitle: "Subhaneke i zahvalnost Allahu",
    germanTitle: "Subhanaka-Gebet und Dankbarkeit gegenüber Allah",
    sortOrder: 10,
    blocks: [
      { type: 'h', level: 2, text: "Das Subhanaka-Gebet" },
      { type: 'p', text: "Wir lobpreisen und danken Allah mit dem Subhanaka-Bittgebet:" },
      { type: 'h', level: 3, text: "BISMILLĀHIR-RAHMĀNIR-RAHĪM" },
      { type: 'h', level: 3, text: "SUBHĀNEKE ALLĀHUMME VE BI HAMDIKE, VE TEBĀREKESMUKE, VE TE'ĀLĀ DŽEDDUKE, VE LĀ ILĀHE GAJRUKE." },
      { type: 'p', text: "Übersetzung: „Gepriesen seist Du, o Allah, und Dein ist das Lob, gesegnet ist Dein Name, erhaben ist Deine Majestät, und es gibt keinen Gott außer Dir.”" },
      { type: 'h', level: 2, text: "Wir sollten Allah stets dankbar sein" },
      { type: 'p', text: "Sejid machte mit seinem Vater einen Spaziergang. Als sie zurückkamen, rannte er ins Haus und umarmte seine Mutter:" },
      { type: 'p', text: "„Mutter, was ich alles gesehen habe: kleine Vögel, Kätzchen, Küken und so vieles mehr!”" },
      { type: 'p', text: "„Mein Sohn, ich freue mich, dass es dir so gefallen hat.”" },
      { type: 'p', text: "„Ich hatte noch nie so viel Freude.”" },
      { type: 'p', text: "„Dein Gesicht strahlt vor Glück”, sagte die Mutter." },
      { type: 'p', text: "Der Junge setzte sich neben sie: „Mutter, welch eine schöne Welt Allah uns geschenkt hat!”" },
      { type: 'p', text: "„Ja, mein Sohn, Allah hat wahrhaftig eine wunderschöne Welt erschaffen.”" },
      { type: 'p', text: "„Dann müssen wir auch zu jenen gehören, die auf dem rechten Weg sind, und so unsere Dankbarkeit zeigen!”" },
      { type: 'p', text: "„Sejid, ich stimme dir vollkommen zu. Wir sind beauftragt, diese Schönheit zu bewahren, die Allah uns anvertraut hat. Durch unsere guten Taten müssen wir zeigen, dass wir gute Diener unseres Schöpfers sind.”" },
      { type: 'p', text: "„Wenn ihr dankbar seid, so werde Ich euch gewiss noch mehr geben; seid ihr aber undankbar, so ist Meine Strafe wahrlich streng.” (Koran, Sure Ibrahim, Vers 7)" }
    ]
  },
  {
    bosnianTitle: "Sura El-Fatiha",
    germanTitle: "Sure Al-Fatiha (Die Eröffnende)",
    sortOrder: 11,
    blocks: [
      { type: 'h', level: 2, text: "Sure Al-Fatiha" },
      { type: 'p', text: "Al-Fatiha ist die erste Sure im Heiligen Koran." },
      { type: 'h', level: 3, text: "BISMILLĀHIR-RAHMĀNIR-RAHĪM" },
      { type: 'p', text: "EL-HAMDU LILLĀHI RABBIL-'ĀLEMĪN.\nER-RAHMĀNIR-RAHĪM.\nMĀLIKI JEVMID-DĪN.\nIJJĀKE N'ABUDU VE IJJĀKE NESTE'ĪN.\nIHDINES-SIRĀTAL-MUSTEKĪM.\nSIRĀTALLEZĪNE EN'AMTE 'ALEJHIM,\nGAJRIL-MAGDŪBI 'ALEJHIM VE LED-DĀLLĪN. ĀMĪN!" },
      { type: 'h', level: 3, text: "Bedeutung:" },
      { type: 'p', text: "Alles Lob gebührt Allah, dem Herrn der Welten,\ndem Allerbarmer, dem Barmherzigen,\ndem Herrscher am Tage des Gerichts.\nDir allein dienen wir, und Dich allein bitten wir um Hilfe.\nFühre uns den geraden Weg,\nden Weg derer, denen Du Gnade erwiesen hast,\nnicht derer, die Deinen Zorn erregt haben, und nicht der Irregehenden. Amin!" },
      { type: 'p', text: "„Al-Fatiha ist die erste Sure des Korans,\nsie nährt die Seele des gläubigen Muslims,\njeder Gläubige möge diese Sure lernen\nund sich Allahs Rechtleitung zuwenden.”" }
    ]
  },
  {
    bosnianTitle: "Ponavljanje gradiva — Uvodni dio",
    germanTitle: "Wiederholung — Einführungsteil",
    sortOrder: 12,
    blocks: [
      { type: 'h', level: 2, text: "Wiederholung ist die Mutter des Wissens" },
      { type: 'p', text: "Bisher haben wir gelernt: E'ūzubillāh, Bismillāh, Rabbi yassir, Shahada, Subhanaka und Al-Fatiha. Überprüfe dein Wissen:" },
      { type: 'num', text: "Rezitierte E'ūzubillāh!" },
      { type: 'num', text: "Rezitierte Bismillāh!" },
      { type: 'num', text: "Womit beginnen wir jede gute Handlung?" },
      { type: 'num', text: "Wer ist Allahs schönste Schöpfung?" },
      { type: 'num', text: "Was lernen wir in der Mekteb?" },
      { type: 'num', text: "Rezitierte das Bittgebet Rabbi yassir!" },
      { type: 'num', text: "Wie heißt unsere Religion?" },
      { type: 'num', text: "Was bedeutet Islam?" },
      { type: 'num', text: "Womit bezeugen wir unsere Zugehörigkeit zum Islam?" },
      { type: 'num', text: "Wie lautet das Glaubensbekenntnis (Kalima ash-Shahada)?" },
      { type: 'num', text: "Wie heißt der islamische Friedensgruß?" },
      { type: 'num', text: "Wie grüßt man und wie erwidert man den Friedensgruß?" },
      { type: 'num', text: "Wem gebührt unser Dank?" },
      { type: 'num', text: "Wie danken wir Allah, dem Erhabenen?" },
      { type: 'num', text: "Wie lautet die erste Sure im Koran?" }
    ]
  },

  // TOPIC 2
  {
    bosnianTitle: "Pregled 33 šarta — Uvjeta u islamu",
    germanTitle: "Übersicht der 33 Pflichtbedingungen im Islam",
    sortOrder: 13,
    blocks: [
      { type: 'h', level: 2, text: "Übersicht der 33 Pflichtbedingungen im Islam" },
      { type: 'p', text: "Es gibt nur einen einzigen Gott. Er ist der Schöpfer und Erhalter aller Welten. Er hat den Menschen in bester Gestalt erschaffen und ihm den Verstand geschenkt. Der Verstand folgt der göttlichen Rechtleitung und fügt sich Seinem Willen." },
      { type: 'p', text: "Das Fundament des Islam ist das Glaubensbekenntnis (Shahada). Es genügt jedoch nicht nur zu glauben, sondern die Pflichten müssen auch in die Tat umgesetzt werden." },
      { type: 'h', level: 3, text: "Der Islam ruht auf 33 Bedingungen:" },
      { type: 'h', level: 3, text: "Glaubensartikel (6 Iman-Bedingungen):" },
      { type: 'num', text: "Āmantu billāhi (Ich glaube an Allah)" },
      { type: 'num', text: "Wa malā'ikatihī (Ich glaube an Seine Engel)" },
      { type: 'num', text: "Wa kutubihī (Ich glaube an Seine Bücher / Offenbarungen)" },
      { type: 'num', text: "Wa rusulihī (Ich glaube an Seine Gesandten)" },
      { type: 'num', text: "Wal-yawmil-ākhiri (Ich glaube an den Jüngsten Tag)" },
      { type: 'num', text: "Wa bil-qadari khayrihī wa šarrihī minallāhi ta'ālā (Ich glaube an die göttliche Vorherbestimmung – dass alles Gute und Schwere durch Allahs Willen geschieht)" },
      { type: 'h', level: 3, text: "Säulen des Islam (5 Pflichten):" },
      { type: 'num', text: "Kalima ash-Shahada (Bezeugung des Glaubens)" },
      { type: 'num', text: "Das tägliche Gebet (Salah) verrichten" },
      { type: 'num', text: "Im Monat Ramadan fasten (Sawm)" },
      { type: 'num', text: "Die Zakat-Abgabe entrichten" },
      { type: 'num', text: "Die Pilgerfahrt (Hadsch) vollziehen" },
      { type: 'h', level: 3, text: "Wudhu-Pflichten (4 Waschungsbedingungen):" },
      { type: 'num', text: "Das Gesicht waschen" },
      { type: 'num', text: "Beide Arme bis einschließlich der Ellbogen waschen" },
      { type: 'num', text: "Über ein Viertel des Kopfes mit feuchten Händen streichen (Masah)" },
      { type: 'num', text: "Beide Füße bis einschließlich der Knöchel waschen" },
      { type: 'h', level: 3, text: "Ghusl-Pflichten (3 Ganzwaschungsbedingungen):" },
      { type: 'num', text: "Den Mund gründlich ausspülen" },
      { type: 'num', text: "Die Nase gründlich ausspülen" },
      { type: 'num', text: "Den gesamten Körper vollständig waschen" },
      { type: 'h', level: 3, text: "Tayammum-Bedingungen (2 Schritte der Trockenreinigung):" },
      { type: 'num', text: "Die Absicht (Niyyah) fassen" },
      { type: 'num', text: "Mit den Handflächen auf reine Erde schlagen und das Gesicht abstreichen; erneut aufschlagen und beide Arme bis zu den Ellbogen abstreichen" },
      { type: 'h', level: 3, text: "Gebetsbedingungen vor dem Gebet (6 Voraussetzungen):" },
      { type: 'num', text: "Reinheit des Körpers, der Kleidung und des Gebetsplatzes" },
      { type: 'num', text: "Die rituelle Gebetswaschung (Wudhu) vollziehen" },
      { type: 'num', text: "Vorschriftsmäßige Kleidung tragen (die Blöße bedecken)" },
      { type: 'num', text: "Zur vorgeschriebenen Gebetszeit beten" },
      { type: 'num', text: "Sich in Richtung der Qibla (Mekka) wenden" },
      { type: 'num', text: "Die Absicht (Niyyah) für das jeweilige Gebet fassen" },
      { type: 'h', level: 3, text: "Gebetssäulen während des Gebets (6 Pfeiler):" },
      { type: 'num', text: "Iftitah-Takbir (Eröffnungs-Takbir: Allāhu Akbar)" },
      { type: 'num', text: "Qiyam (Stehen im Gebet)" },
      { type: 'num', text: "Qira'at (Rezitieren aus dem Koran)" },
      { type: 'num', text: "Ruku' (Die Verbeugung)" },
      { type: 'num', text: "Sadschda (Die Niederwerfung)" },
      { type: 'num', text: "Qa'da Akhira (Das abschließende Sitzen im Gebet)" }
    ]
  },
  {
    bosnianTitle: "Imanski šarti — Islamsko vjerovanje",
    germanTitle: "Die Glaubensartikel (Iman) — Das islamische Glaubensbekenntnis",
    sortOrder: 14,
    blocks: [
      { type: 'h', level: 2, text: "Die Glaubensartikel des Islam" },
      { type: 'p', text: "Der islamische Glaube (Iman) besteht aus sechs grundlegenden Glaubensartikeln:" },
      { type: 'num', text: "ĀMANTU BILLĀHI — Ich glaube an Allah" },
      { type: 'num', text: "WA MALĀ'IKATIHĪ — Und ich glaube an Seine Engel" },
      { type: 'num', text: "WA KUTUBIHĪ — Und ich glaube an Seine Bücher" },
      { type: 'num', text: "WA RUSULIHĪ — Und ich glaube an Seine Gesandten" },
      { type: 'num', text: "WAL-YAWMIL-ĀKHIRI — Und ich glaube an den Jüngsten Tag" },
      { type: 'num', text: "WA BIL-QADARI KHAYRIHĪ WA ŠARRIHĪ MINALLĀHI TA'ĀLĀ — Und ich glaube an die Vorherbestimmung, dass alles Gute und Übel nach Allahs Willen und Bestimmung geschieht" },
      { type: 'h', level: 3, text: "Verse über die Glaubensartikel" },
      { type: 'p', text: "ĀMANTU BILLĀHI:\nIch glaube an den einen Gott,\nder jeden Diener erschaffen hat.\nEr schuf das gesamte Universum,\ndass es Ihn allein preist.\n\nWA MALĀ'IKATIHĪ:\nUnd ich glaube an alle Engel,\nohne Sünde und ohne Makel,\nso hat Gott sie erschaffen,\naus reinem Licht gewoben.\n\nWA KUTUBIHĪ:\nUnd ich glaube an die heiligen Bücher,\nes sind die Worte des Erhabenen.\nVier wurden auserwählt,\nim Koran bestätigt und bewahrt.\n\nWA RUSULIHĪ:\nUnd ich glaube an die Propheten,\nAllahs auserwählte Gesandte.\nSie brachten uns den Glauben,\nund lehrten uns jedes Gute.\n\nWAL-YAWMIL-ĀKHIRI:\nUnd ich glaube an den Jüngsten Tag,\nwenn die Taten auf der Waage wiegen.\nVor dem Feuer gilt es sich zu retten,\nund im Paradies Geborgenheit zu finden.\n\nWA BIL-QADARI KHAYRIHĪ WA ŠARRIHĪ MINALLĀHI TA'ĀLĀ:\nUnd ich glaube, dass alles was geschieht,\nwas stirbt und was geboren wird,\nwas die Nacht birgt und der Tag enthüllt,\ndurch Allahs Willen geschieht.\n\n(E. Nurović)" },
      { type: 'p', text: "Jeder Muslim muss die Glaubensartikel kennen und von ganzem Herzen daran glauben." }
    ]
  },
  {
    bosnianTitle: "Prvi imanski šart: Āmentu billāhi i Sura Ihlas",
    germanTitle: "Der 1. Glaubensartikel: Glaube an Allah & Sure Al-Ikhlas",
    sortOrder: 15,
    blocks: [
      { type: 'h', level: 2, text: "Der erste Glaubensartikel" },
      { type: 'h', level: 3, text: "ĀMANTU BILLĀHI — ICH GLAUBE AN ALLAH, DEN ERHABENEN" },
      { type: 'p', text: "Wenn wir über die Welt um uns herum nachdenken, führt uns der Verstand zu der Gewissheit, dass es einen vollkommenen, allmächtigen Schöpfer geben muss, der alles erschaffen hat und alles lenkt. Das ist Allah, der Erhabene. Allah ist der Schöpfer und Herr über alles, was wir sehen und was wir nicht sehen." },
      { type: 'p', text: "Allah hat die Erde und den Himmel, die Pflanzen und die Tiere erschaffen. Und Er hat den Menschen in schönster Gestalt geschaffen." },
      { type: 'p', text: "Wenn wir Seinen Namen aussprechen, fügen wir hinzu: jalla shanuhu (dž.š.) – Erhaben ist Seine Majestät." },
      { type: 'h', level: 2, text: "Sure Al-Ikhlas (Die Aufrichtigkeit)" },
      { type: 'h', level: 3, text: "BISMILLĀHIR-RAHMĀNIR-RAHĪM" },
      { type: 'p', text: "KUL HUVALLĀHU EHAD.\nALLĀHUS-SAMED.\nLEM JELID VE LEM JŪLED\nVE LEM JEKUN LEHŪ KUFUVEN EHAD." },
      { type: 'h', level: 3, text: "Übersetzung:" },
      { type: 'p', text: "Sprich: „Er ist Allah, ein Einziger.\nAllah, der Absolute (von dem alles abhängt).\nEr zeugt nicht und ist nicht gezeugt worden,\nund niemand ist Ihm ebenbürtig.”" }
    ]
  },
  {
    bosnianTitle: "Drugi imanski šart: Ve melāiketihī (Meleki)",
    germanTitle: "Der 2. Glaubensartikel: Glaube an die Engel (Mala'ika)",
    sortOrder: 16,
    blocks: [
      { type: 'h', level: 2, text: "Der zweite Glaubensartikel" },
      { type: 'h', level: 3, text: "WA MALĀ'IKATIHĪ — ICH GLAUBE AN ALLAHS ENGEL" },
      { type: 'p', text: "Engel sind vernunftbegabte, geistige, unsichtbare Wesen. Sie wurden aus Licht (Nur) erschaffen. Engel sündigen nicht; sie preisen und verherrlichen Allah unablässig. Sie dienen Allah ständig und haben feste Aufgaben. Sie sind weder männlich noch weiblich, sie essen und trinken nicht. Es gibt unzählige Engel, deren genaue Zahl nur Allah kennt." },
      { type: 'h', level: 3, text: "Die bekanntesten Engel und ihre Aufgaben:" },
      { type: 'b', text: "DŽIBRIL (GABRIEL): Überbrachte den Propheten die göttlichen Offenbarungen" },
      { type: 'b', text: "AZRAIL (TODESENGEL): Trennt im Augenblick des Todes die Seele vom Körper" },
      { type: 'b', text: "MIKAIL (MICHAEL): Verwaltet die Naturerscheinungen (Wind, Regen, Pflanzenwachstum)" },
      { type: 'b', text: "ISRAFIL (RAPHAEL): Wird mit dem Stoß ins Horn den Weltuntergang und die Auferstehung ankündigen" },
      { type: 'b', text: "KIRAMEN KATIBIN: Begleiten die Menschen und schreiben ihre guten und schlechten Taten auf" },
      { type: 'b', text: "MUNKIR UND NEKIR: Befragen jeden Menschen im Grab" },
      { type: 'p', text: "Außer den Engeln hat Allah auch andere unsichtbare Wesen erschaffen: die Dschinn und die Schayatine (Teufel). Der Schaytan bringt schlechte Gedanken und verleitet zum Bösen." },
      { type: 'p', text: "Zuflucht vor dem verfluchten Schaytan suchen wir bei Allah mit den Worten:" },
      { type: 'h', level: 3, text: "E'ŪZUBILLĀHI MINEŠ-ŠEJTĀNIR-RADŽĪM" },
      { type: 'p', text: "Ich nehme Zuflucht bei Allah vor dem verfluchten Schaytan." }
    ]
  },
  {
    bosnianTitle: "Treći imanski šart: Ve kutubihī (Božije knjige)",
    germanTitle: "Der 3. Glaubensartikel: Glaube an die göttlichen Bücher",
    sortOrder: 17,
    blocks: [
      { type: 'h', level: 2, text: "Der dritte Glaubensartikel" },
      { type: 'h', level: 3, text: "WA KUTUBIHĪ — ICH GLAUBE AN ALLAHS BÜCHER UND OFFENBARUNGEN" },
      { type: 'p', text: "Allahs Bücher sind göttliche Offenbarungen, die der Engel Dschibril den Gesandten überbrachte, damit diese sie den Menschen verkünden und erklären. Die erste Offenbarung erging an den ersten Menschen, Adam (a.s.)." },
      { type: 'p', text: "Alle Offenbarungen riefen die Menschen dazu auf, an den einen Gott zu glauben und Ihm zu dienen. Es wurden vier große Bücher sowie kleinere Schriftrollen (Suhuf) herabgesandt." },
      { type: 'h', level: 3, text: "Die vier großen Offenbarungsbücher sind:" },
      { type: 'b', text: "TEVRAT (THORA): Offenbart an Musa (Moses), Friede sei mit ihm" },
      { type: 'b', text: "ZEBUR (PSALMEN): Offenbart an Davud (David), Friede sei mit ihm" },
      { type: 'b', text: "INDŽIL (EVANGELIUM): Offenbart an Isa (Jesus), Friede sei mit ihm" },
      { type: 'b', text: "KUR'AN (KORAN): Offenbart an Muhammed, Friede sei mit ihm" },
      { type: 'h', level: 3, text: "Der Heilige Koran (Kur'an-i Kerim)" },
      { type: 'p', text: "Der Koran ist das letzte Buch Allahs, das durch den Propheten Muhammad (a.s.) der gesamten Menschheit offenbart wurde. Er enthält Wegweisungen, Ratschläge, Gebete und Lebensregeln. Er wurde auf Arabisch über einen Zeitraum von 23 Jahren herabgesandt und besteht aus 114 Suren." },
      { type: 'p', text: "„Es gibt kein besseres Buch als den Koran und keine schönere Religion als den Islam.\nIn ihm liegen weise Worte, die zu wahrem Glück führen.”" }
    ]
  },
  {
    bosnianTitle: "Četvrti imanski šart: Ve rusulihī (Božiji poslanici)",
    germanTitle: "Der 4. Glaubensartikel: Glaube an die Propheten und Gesandten",
    sortOrder: 18,
    blocks: [
      { type: 'h', level: 2, text: "Der vierte Glaubensartikel" },
      { type: 'h', level: 3, text: "WA RUSULIHĪ — ICH GLAUBE AN ALLAHS GESANDTE" },
      { type: 'p', text: "Propheten sind auserwählte Menschen, die Allah aus Seiner Barmherzigkeit zu den Menschen sandte, um ihnen Seine Offenbarung und Rechtleitung zu überbringen. Allah sandte jedem Volk Gesandte. Im Koran werden 25 Propheten namentlich erwähnt." },
      { type: 'p', text: "Der erste Mensch auf Erden war Adam (a.s.), der zugleich der erste Prophet war. Der letzte Prophet ist Muhammad (a.s.), nach dem bis zum Jüngsten Tag kein weiterer Prophet kommen wird." },
      { type: 'h', level: 3, text: "Besonders herausragende Propheten sind:" },
      { type: 'num', text: "Ādem / Adam (a.s.)" },
      { type: 'num', text: "Nūh / Noah (a.s.)" },
      { type: 'num', text: "Ibrāhīm / Abraham (a.s.)" },
      { type: 'num', text: "Mūsā / Moses (a.s.)" },
      { type: 'num', text: "Īsā / Jesus (a.s.)" },
      { type: 'num', text: "Muhammed / Muhammad (a.s.)" },
      { type: 'p', text: "Nach dem Namen eines Propheten sagen wir: 'alejhis-selām (a.s.) – Friede sei auf ihm." }
    ]
  },
  {
    bosnianTitle: "Muhammed, a.s. — Posljednji Božiji poslanik",
    germanTitle: "Muhammad (a.s.) — Der letzte Gesandte Allahs",
    sortOrder: 19,
    blocks: [
      { type: 'h', level: 2, text: "Muhammad, Friede sei mit ihm" },
      { type: 'p', text: "Muhammed (a.s.) ist der letzte Gesandte Allahs. Er wurde im Jahr 571 n. Chr. in Mekka im Stamm Quraisch geboren. Sein Vater hieß Abdullah und seine Mutter Amina. Er verlor früh seine Eltern. Ab seinem sechsten Lebensjahr sorgte sein Großvater Abdulmuttalib für ihn, danach sein Onkel Ebu Talib." },
      { type: 'p', text: "Allah hat ihn zu Seinem Gesandten erwählt. Im Alter von vierzig Jahren empfing er in der Höhle Hira die erste Offenbarung und wurde zum Propheten berufen. Nach dreizehn Jahren wanderte er mit den Muslimen von Mekka nach Medina aus (Hidschra). Er verstarb im Alter von 63 Jahren in Medina (Medinetun-Nebijj)." },
      { type: 'p', text: "Muhammed (a.s.) ist das beste Vorbild für die Menschen, wie man wahrhaftig glaubt und lebt." },
      { type: 'h', level: 3, text: "Kasida: Ahmede Muhammede" },
      { type: 'p', text: "Mein Herz empfindet Sehnsucht,\ndass es nicht die Ehre hatte,\nan deiner Seite zu verweilen,\no Ahmed, o Muhammed.\n\nDu bist Barmherzigkeit des Erbarmers,\nFreude meines Herzens,\nHeilung für jede Wunde,\no Ahmed, o Muhammed.\n\nMein Herz brennt voller Liebe,\nsehnt sich danach dich zu erblicken,\nunser geliebter Prophet,\no Ahmed, o Muhammed.\n\nMeiner Seele ist es ein Labsal,\nwenn sie dir Segenswünsche sendet,\nwenn sie deinen Namen nennt,\no Ahmed, o Muhammed." }
    ]
  },
  {
    bosnianTitle: "Peti imanski šart: Vel-jevmil-āhiri i Sura Kevser",
    germanTitle: "Der 5. Glaubensartikel: Glaube an den Jüngsten Tag & Sure Al-Kawthar",
    sortOrder: 20,
    blocks: [
      { type: 'h', level: 2, text: "Der fünfte Glaubensartikel" },
      { type: 'h', level: 3, text: "WAL-JEVMIL-ĀHIRI — ICH GLAUBE AN DEN JÜNGSTEN TAG" },
      { type: 'p', text: "Nach dem vergänglichen irdischen Leben werden alle Menschen für das ewige Jenseits (Ahirat) auferweckt. Am Jüngsten Tag werden alle Menschen über ihre Taten Rechenschaft ablegen." },
      { type: 'p', text: "Jedem Menschen wird sein Buch der guten und schlechten Taten vorgelegt, das von den Engeln Kiramen Katibin verfasst wurde." },
      { type: 'p', text: "Wer an Allah glaubte und Gutes tat, wird durch Seine Barmherzigkeit ins Paradies (Džennet) eingehen. Wann der Jüngste Tag eintrifft, weiß allein Allah." },
      { type: 'h', level: 3, text: "Das Paradies (Džennet)" },
      { type: 'p', text: "Das Paradies ist die ewige Wohnstätte im Jenseits, in der die Gläubigen in vollkommenem Glück und Frieden weilen." },
      { type: 'h', level: 3, text: "Die Hölle (Džehennem)" },
      { type: 'p', text: "Die Hölle ist die Stätte der Strafe im Jenseits für jene, die ungläubig und ungerecht waren, es sei denn, Allah erbarmt sich ihrer." },
      { type: 'h', level: 2, text: "Sure Al-Kawthar (Die Fülle)" },
      { type: 'h', level: 3, text: "BISMILLĀHIR-RAHMĀNIR-RAHĪM" },
      { type: 'p', text: "INNĀ E'ATAJNĀKEL-KEVSER,\nFE SALLI LI RABBIKE VEN-HAR,\nINNE ŠĀNI'EKE HUVEL-EBTER." },
      { type: 'h', level: 3, text: "Übersetzung:" },
      { type: 'p', text: "Wahrlich, Wir haben dir die Fülle (an Gutem) gegeben.\nSo bete zu deinem Herrn und opfere.\nGewiss, derjenige, der dich hasst, ist vom Guten abgeschnitten." }
    ]
  },
  {
    bosnianTitle: "Šesti imanski šart: Ve bil-kaderi (Kader) i pjesma",
    germanTitle: "Der 6. Glaubensartikel: Die göttliche Vorherbestimmung (Kader)",
    sortOrder: 21,
    blocks: [
      { type: 'h', level: 2, text: "Der sechste Glaubensartikel" },
      { type: 'h', level: 3, text: "VE BIL-KADERI HAJRIHĪ VE ŠERRIHĪ MINELLĀHI TE'ĀLA" },
      { type: 'p', text: "Ich glaube, dass alles, was geschieht – Gutes wie Schweres –, nach Allahs Willen und göttlicher Vorherbestimmung geschieht." },
      { type: 'p', text: "Allah ist der Schöpfer aller Dinge. Was Allah will, geschieht, und was Er nicht will, kann niemals geschehen." },
      { type: 'p', text: "Allah hat dem Menschen Verstand und freien Willen verliehen, damit er sich für das Gute entscheidet. Im Unglück soll der Gläubige geduldig und standhaft bleiben. Allah weiß alles, was war, was ist und was sein wird." },
      { type: 'h', level: 3, text: "Gedicht: Suche deinen Herrn" },
      { type: 'p', text: "Allāh, Allāh, huve Rabbunā, Lā ilāhe illallāh.\n\nSuche deinen Herrn im Gebet,\nSein Gedenken dir Kraft verleiht,\nwirst immer stärker Tag für Tag,\nLā ilāhe illallāh.\n\nLass das Gebet niemals vergeh'n,\nden Pfeiler des Glaubens aufrecht steh'n,\nalles Gute und Schwere ein Ende hat,\nLā ilāhe illallāh.\n\nAllah ist Einer, Er ist die Wahrheit,\ndies bezeugt jeder in Klarheit,\nLā ilāhe illallāh.\n\nO Muslim, sei wachsam und rein,\nlies den Koran und präg ihn dir ein,\nversäume das Morgengebet nicht,\nLā ilāhe illallāh." }
    ]
  },
  {
    bosnianTitle: "Ponavljanje gradiva — Imanski šarti",
    germanTitle: "Wiederholung — Die Glaubensartikel (Iman)",
    sortOrder: 22,
    blocks: [
      { type: 'h', level: 2, text: "Wiederholung ist die Mutter des Wissens" },
      { type: 'p', text: "Überprüfe dein Wissen über die Glaubensartikel:" },
      { type: 'num', text: "Wie viele Pflichtbedingungen (Schurut) gibt es insgesamt im Islam?" },
      { type: 'num', text: "Wie lautet der erste Glaubensartikel?" },
      { type: 'num', text: "Was bedeutet Āmantu billāh?" },
      { type: 'num', text: "Was bedeutet Ve rusulihī?" },
      { type: 'num', text: "Rezitierte Sure Al-Ikhlas!" },
      { type: 'num', text: "Welche sind die bekanntesten Engel?" },
      { type: 'num', text: "Wie heißt der Engel, der die göttlichen Offenbarungen überbrachte?" },
      { type: 'num', text: "Was ist die Aufgabe der Engel Kiramen Katibin?" },
      { type: 'num', text: "Nenne die vier großen Offenbarungsbücher!" },
      { type: 'num', text: "Welches Buch wurde dem Propheten Isa (Jesus) offenbart?" },
      { type: 'num', text: "Was bedeutet 'alejhis-selām (a.s.)?" },
      { type: 'num', text: "Welches ist das letzte Buch Allahs?" },
      { type: 'num', text: "Wie viele Suren hat der Koran?" },
      { type: 'num', text: "Wie viele Propheten werden im Koran namentlich genannt?" },
      { type: 'num', text: "Wer war der erste Mensch und der erste Prophet?" },
      { type: 'num', text: "Wer ist der letzte Gesandte Allahs?" },
      { type: 'num', text: "Wann wurde der Prophet Muhammed (a.s.) geboren?" },
      { type: 'num', text: "In welchem Lebensjahr erhielt der Prophet die erste Offenbarung?" },
      { type: 'num', text: "Rezitierte das Gedicht / Nasheed über den Propheten!" },
      { type: 'num', text: "Wann wird der Jüngste Tag eintreffen?" },
      { type: 'num', text: "Was ist der Lohn für die Gläubigen im Jenseits?" },
      { type: 'num', text: "Rezitierte Sure Al-Kawthar!" },
      { type: 'num', text: "Wer bestimmt das Schicksal und die Schöpfung?" }
    ]
  },

  // TOPIC 3
  {
    bosnianTitle: "Islamski šarti i Sura Felek",
    germanTitle: "Die Säulen des Islam & Sure Al-Falaq",
    sortOrder: 23,
    blocks: [
      { type: 'h', level: 2, text: "Die Säulen des Islam (Die fünf Hauptpflichten)" },
      { type: 'p', text: "Die Säulen des Islam sind die grundlegenden praktischen Pflichten jedes Muslims. Sie sind im Koran vorgeschrieben. Neben dem Glauben im Herzen ist jeder Gläubige verpflichtet, diese Taten zu verrichten." },
      { type: 'h', level: 3, text: "Es gibt fünf Hauptpflichten im Islam:" },
      { type: 'num', text: "KELIME-I-ŠEHADET (Das Glaubensbekenntnis sprechen)" },
      { type: 'num', text: "NAMAZE KLANJATI (Die fünf täglichen Gebete verrichten)" },
      { type: 'num', text: "RAMAZAN POSTITI (Im Monat Ramadan fasten)" },
      { type: 'num', text: "ZEKAT DAVATI (Die Armenabgabe entrichten)" },
      { type: 'num', text: "HADŽ OBAVITI (Die Pilgerfahrt nach Mekka vollziehen)" },
      { type: 'p', text: "Wer diese Pflichten gewissenhaft erfüllt, darf auf Allahs reiche Belohnung und Barmherzigkeit hoffen." },
      { type: 'h', level: 2, text: "Sure Al-Falaq (Das Frühlicht)" },
      { type: 'h', level: 3, text: "BISMILLĀHIR-RAHMĀNIR-RAHĪM" },
      { type: 'p', text: "KUL E'ŪZU BI RABBIL-FELEK,\nMIN ŠERRI MĀ HALEK,\nVE MIN ŠERRI GĀSIKIN IZĀ VEKAB,\nVE MIN ŠERRIN-NEFFĀSĀTI FIL-'UKAD,\nVE MIN ŠERRI HĀSIDIN IZĀ HASED." },
      { type: 'h', level: 3, text: "Übersetzung:" },
      { type: 'p', text: "Sprich: „Ich nehme Zuflucht beim Herrn des Frühlichts\nvor dem Übel dessen, was Er erschaffen hat,\nund vor dem Übel der Dunkelheit, wenn sie hereinbricht,\nund vor dem Übel der Zauberer, die in Knoten blasen,\nund vor dem Übel des Neiders, wenn er neidet!”" }
    ]
  },
  {
    bosnianTitle: "Prvi islamski šart: Kelime-i-šehadet i Sura Nas",
    germanTitle: "Die 1. Säule des Islam: Shahada & Sure An-Nas",
    sortOrder: 24,
    blocks: [
      { type: 'h', level: 2, text: "Die erste Säule des Islam" },
      { type: 'h', level: 3, text: "KELIME-I-ŠEHADET — DAS GLAUBENSBEKENNTNIS" },
      { type: 'p', text: "Shahada bedeutet: mit dem Herzen fest zu glauben und mit der Zunge zu bezeugen, dass es nur einen einzigen Gott gibt und dass Muhammad Sein Diener und Gesandter ist." },
      { type: 'h', level: 3, text: "Wiederholen wir das Glaubensbekenntnis:" },
      { type: 'h', level: 3, text: "EŠHEDU EN LĀ ILĀHE ILLALLĀH, VE EŠHEDU ENNE MUHAMMEDEN 'ABDUHŪ VE RESŪLUHŪ." },
      { type: 'p', text: "Übersetzung: „Ich bezeuge, dass es keine Gottheit gibt außer Allah, und ich bezeuge, dass Muhammad Allahs Diener und Gesandter ist!”" },
      { type: 'p', text: "Mit der Shahada treten wir bewusst in den Islam ein und bekräftigen unsere Hingabe an Allah und die Befolgung Seines Gesandten." },
      { type: 'h', level: 2, text: "Sure An-Nas (Die Menschen)" },
      { type: 'h', level: 3, text: "BISMILLĀHIR-RAHMĀNIR-RAHĪM" },
      { type: 'p', text: "KUL E'ŪZU BI RABBIN-NĀS,\nMELIKIN-NĀS,\nILĀHIN-NĀS,\nMIN ŠERRIL-VESVĀSIL-HANNĀS,\nELLEZĪ JUVESVISU FĪ SUDŪRIN-NĀS,\nMINEL-DŽINNETI VEN-NĀS." },
      { type: 'h', level: 3, text: "Übersetzung:" },
      { type: 'p', text: "Sprich: „Ich nehme Zuflucht beim Herrn der Menschen,\ndem Herrscher der Menschen,\ndem Gott der Menschen,\nvor dem Übel des einflüsternden Schaytans,\nder böse Gedanken in die Herzen der Menschen einflüstert –\nvon den Dschinn und den Menschen!”" }
    ]
  },
  {
    bosnianTitle: "Drugi islamski šart: Propisane namaze klanjati",
    germanTitle: "Die 2. Säule des Islam: Das Gebet (Salah)",
    sortOrder: 25,
    blocks: [
      { type: 'h', level: 2, text: "Die zweite Säule des Islam" },
      { type: 'h', level: 3, text: "DIE VORGESCHRIEBENEN GEBETE VERRICHTEN" },
      { type: 'p', text: "Das Gebet ist eine grundlegende Pflicht im Islam, die im Koran geboten und durch die Praxis des Propheten vorgelebt wurde. Durch das Gebet erweisen wir Allah demütige Dankbarkeit und Anbetung." },
      { type: 'h', level: 3, text: "Im Laufe eines Tages verrichten wir fünf Pflichtgebete:" },
      { type: 'b', text: "SABAH (FADSCHR): Vor Sonnenaufgang." },
      { type: 'b', text: "PODNE (DHUHR): Am Mittag, wenn die Sonne ihren Höchststand überschritten hat." },
      { type: 'b', text: "IKINDIJA (ASR): Am Nachmittag." },
      { type: 'b', text: "AKŠAM (MAGHRIB): Direkt nach Sonnenuntergang." },
      { type: 'b', text: "JACIJA (ISHA): Bei vollkommener Nacht." },
      { type: 'h', level: 3, text: "Weitere wichtige Gebete:" },
      { type: 'b', text: "DŽUMA (FREITAGSGEBET): Wird freitags zur Mittagszeit in der Moschee verrichtet." },
      { type: 'b', text: "TERAVIJA (TARAWEEH): Wird während des Monats Ramadan nach dem Ischa-Gebet verrichtet." },
      { type: 'b', text: "BAJRAM (FESTTAGSGEBET): Wird am ersten Tag des Festes zweimal im Jahr verrichtet." },
      { type: 'b', text: "DŽENAZA (TOTENGEBET): Wird für verstorbene Muslime verrichtet." },
      { type: 'p', text: "Kinder lernen das Beten mit Beginn des Schulalters und sind ab dem 10. Lebensjahr zum regelmäßigen Gebet angehalten." }
    ]
  },
  {
    bosnianTitle: "Treći islamski šart: Postiti mjesec ramazan",
    germanTitle: "Die 3. Säule des Islam: Das Fasten im Ramadan (Sawm)",
    sortOrder: 26,
    blocks: [
      { type: 'h', level: 2, text: "Die dritte Säule des Islam" },
      { type: 'h', level: 3, text: "IM MONAT RAMADAN FASTEN" },
      { type: 'p', text: "Das Fasten ist eine koranische Pflicht. Ramadan-Fasten bedeutet, sich von der Morgendämmerung bis zum Sonnenuntergang des Essens, Trinkens und aller schlechten Taten und Worte zu enthalten." },
      { type: 'p', text: "Ramadan ist der heiligste Monat des Jahres, in dem die Herabsendung des Korans begann. Wir fasten, spenden Zakat und Sadekatul-Fitr, beten Taraweeh, laden zu gemeinsamen Iftaren ein und lesen den Koran." },
      { type: 'h', level: 3, text: "Die Absicht (Nijet) für das Fasten:" },
      { type: 'h', level: 3, text: "NEVEJTU EN ESŪME GADEN LILLĀHI TE'ĀLA FERĪDATEN MIN ŠEHRI RAMADĀNE." },
      { type: 'p', text: "Bedeutung: „Ich beabsichtige, um Allahs willen am morgigen Tag des Monats Ramadan die Fastenpflicht zu erfüllen!”" },
      { type: 'h', level: 3, text: "Das Bittgebet zum Fastenbrechen (Iftar):" },
      { type: 'h', level: 3, text: "ALLĀHUMME INNĪ LEKE SUMTU, VE BIKE ĀMENTU, VE 'ALEJKE TEVEKKELTU VE 'ALĀ RIZKIKE EFTARTU." },
      { type: 'p', text: "Bedeutung: „O mein Allah, für Dich habe ich gefastet, an Dich glaube ich, auf Dich vertraue ich und mit Deiner Versorgung breche ich mein Fasten!”" },
      { type: 'p', text: "Zum Fasten sind alle erwachsenen, gesunden und zurechnungsfähigen Muslime verpflichtet. Der Ramadan endet mit dem freudigen Ramadan-Fest (Ramazanski bajram)." }
    ]
  },
  {
    bosnianTitle: "Četvrti islamski šart: Zekat davati i Sura Leheb",
    germanTitle: "Die 4. Säule des Islam: Zakat geben & Sure Al-Lahab",
    sortOrder: 27,
    blocks: [
      { type: 'h', level: 2, text: "Die vierte Säule des Islam" },
      { type: 'h', level: 3, text: "DIE ZAKAT-PFLICHTABGABE ENTRICHTEN" },
      { type: 'p', text: "Die Zakat ist eine im Koran vorgeschriebene Pflichtabgabe für vermögende Muslime, einen festgelegten Teil ihres überschüssigen Vermögens an Bedürftige und Bildungseinrichtungen zu spenden." },
      { type: 'p', text: "Die Zakat reinigt das Vermögen, schützt das Herz vor Geiz und stärkt die soziale Solidarität in der Gemeinschaft. Zakat wird meist im Ramadan entrichtet, kann aber das ganze Jahr über gegeben werden." },
      { type: 'h', level: 3, text: "Vermögenswerte, auf die Zakat anfällt:" },
      { type: 'b', text: "Ernte- und Landwirtschaftserzeugnisse" },
      { type: 'b', text: "Gold, Silber und Geldvermögen" },
      { type: 'b', text: "Handelswaren" },
      { type: 'b', text: "Viehbestände" },
      { type: 'p', text: "Die Organisation und Verteilung der Zakat obliegt der islamischen Gemeinschaft." },
      { type: 'h', level: 2, text: "Sure Al-Lahab (Die Flammen)" },
      { type: 'h', level: 3, text: "BISMILLĀHIR-RAHMĀNIR-RAHĪM" },
      { type: 'p', text: "TEBBET JEDĀ EBĪ LEHEBIN VE TEBB,\nMĀ AGNĀ 'ANHU MĀLUHŪ VE MĀ KESEB,\nSE JASLĀ NĀREN ZĀTE LEHEB,\nVEMRE-'ETUHŪ HAMMĀLETEL-HATAB,\nFĪ DŽĪDIHĀ HABLUN MIN MESED." },
      { type: 'h', level: 3, text: "Übersetzung:" },
      { type: 'p', text: "Zugrunde gehen sollen die Hände Abu Lahabs, und zugrunde gegangen ist er!\nNicht nützen wird ihm sein Vermögen und was er erworben hat.\nEr wird in einem lodernden Feuer brennen,\nund auch seine Frau, die Holzträgerin (die Zwietracht sät);\num ihren Hals ein Strick aus Palmfasern!" }
    ]
  },
  {
    bosnianTitle: "Peti islamski šart: Hadž obaviti i Telbija",
    germanTitle: "Die 5. Säule des Islam: Die Pilgerfahrt (Hadsch) & Talbiya",
    sortOrder: 28,
    blocks: [
      { type: 'h', level: 2, text: "Die fünfte Säule des Islam" },
      { type: 'h', level: 3, text: "DIE PILGERFAHRT (HADSCH) VOLLZIEHEN" },
      { type: 'p', text: "Der Hadsch ist die fünfte Säule des Islam und ein göttliches Gebot für jeden volljährigen, gesunden und finanziell fähigen Muslim, ihn einmal im Leben zu vollziehen. Der Hadsch ist der Besuch der Kaaba und der heiligen Stätten in Mekka." },
      { type: 'p', text: "Vor der Abreise begleicht der Pilger alle Schulden und sichert den Unterhalt seiner Familie ab." },
      { type: 'h', level: 3, text: "Das Talbiya-Gebet des Pilgers:" },
      { type: 'p', text: "Lebbejkellāhumme, lebbejk,\nlebbejkallāhu!\nlebbejkellāhumme, lebbejk,\nlebbejkellāh!\n\nHier bin ich, o Allah, zu Deinem Dienst bereit! Du hast keinen Teilhaber, hier bin ich! Alles Lob, alle Gnade und alle Herrschaft gehören Dir! Du hast keinen Teilhaber!" },
      { type: 'h', level: 3, text: "Gedicht: An der Kaaba stand ich" },
      { type: 'p', text: "An der Kaaba stand ich still,\nerfüllte, was mein Schöpfer will,\nmeine Sünden wusch ich rein,\nwollte nah bei Allah sein!\n\nIch rief zu meinem Herrn:\nLebbejkellāhumme lebbejk!\n\nIm Tawaf zog ich umher,\nwie ein Stern im Himmelsmeer,\nvoller Ehrfurcht und Gebet,\ndas zum Himmel aufwärts weht.\n\nBeim Brunnen Zamzam rein und klar,\nwo die Hoffnung lebendig war,\nfließt der Glaube voller Kraft,\nder uns ew'ges Leben schafft." }
    ]
  },
  {
    bosnianTitle: "Ponavljanje gradiva — Islamski šarti",
    germanTitle: "Wiederholung — Die Säulen des Islam",
    sortOrder: 29,
    blocks: [
      { type: 'h', level: 2, text: "Wiederholung ist die Mutter des Wissens" },
      { type: 'p', text: "Überprüfe dein Wissen über die Pflichten im Islam:" },
      { type: 'num', text: "Wie viele Hauptpflichten (Säulen) gibt es im Islam?" },
      { type: 'num', text: "Wie lautet die erste Säule des Islam?" },
      { type: 'num', text: "Was bezeugen wir mit der Shahada?" },
      { type: 'num', text: "Welche ist die zweite Säule des Islam?" },
      { type: 'num', text: "Wie viele tägliche Gebete verrichten wir?" },
      { type: 'num', text: "Wann verrichten wir das Fadschr-Gebet (Sabah)?" },
      { type: 'num', text: "Wann wird das Freitagsgebet (Dschuma) verrichtet?" },
      { type: 'num', text: "Wie lautet die dritte Säule des Islam?" },
      { type: 'num', text: "Wie lautet die Absicht (Nijet) für das Fasten?" },
      { type: 'num', text: "Rezitierte das Bittgebet zum Fastenbrechen (Iftar)!" },
      { type: 'num', text: "Wovon enthalten wir uns während des Fastens?" },
      { type: 'num', text: "Wer ist zum Fasten verpflichtet?" },
      { type: 'num', text: "Wie lautet die vierte Säule des Islam?" },
      { type: 'num', text: "Auf welche Vermögenswerte entrichten wir die Zakat?" },
      { type: 'num', text: "Was ist der Hadsch?" },
      { type: 'num', text: "Wer ist verpflichtet, den Hadsch zu vollziehen?" },
      { type: 'num', text: "Rezitierte Sure Al-Falaq!" },
      { type: 'num', text: "Wie lautet Sure An-Nas?" },
      { type: 'num', text: "Rezitierte Sure Al-Lahab!" }
    ]
  }
];

function generateMigrationSql() {
  let sql = `-- Migration: German translations for all 29 Bosnian Ilmihal lessons
-- Inserts/updates German translation records in public.lesson_translations for locale = 'de'

create or replace function pg_temp.bn_h(p_text text, p_level int default 2) returns jsonb language sql as $$
  select jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', 'heading',
    'props', jsonb_build_object('level', p_level, 'textColor', 'default', 'backgroundColor', 'default', 'textAlignment', 'left', 'isToggleable', false),
    'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_text, 'styles', '{}'::jsonb)),
    'children', '[]'::jsonb
  );
$$;

create or replace function pg_temp.bn_p(p_text text) returns jsonb language sql as $$
  select jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', 'paragraph',
    'props', jsonb_build_object('textColor', 'default', 'backgroundColor', 'default', 'textAlignment', 'left'),
    'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_text, 'styles', '{}'::jsonb)),
    'children', '[]'::jsonb
  );
$$;

create or replace function pg_temp.bn_bullet(p_text text) returns jsonb language sql as $$
  select jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', 'bulletListItem',
    'props', jsonb_build_object('textColor', 'default', 'backgroundColor', 'default', 'textAlignment', 'left'),
    'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_text, 'styles', '{}'::jsonb)),
    'children', '[]'::jsonb
  );
$$;

create or replace function pg_temp.bn_num(p_text text) returns jsonb language sql as $$
  select jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', 'numberedListItem',
    'props', jsonb_build_object('textColor', 'default', 'backgroundColor', 'default', 'textAlignment', 'left'),
    'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_text, 'styles', '{}'::jsonb)),
    'children', '[]'::jsonb
  );
$$;

create or replace function pg_temp.upsert_lesson_translation(
  p_mosque_id uuid,
  p_bosnian_title text,
  p_de_title text,
  p_de_body jsonb,
  p_admin_id uuid
) returns void language plpgsql as $$
declare
  v_lesson_id uuid;
  v_trans_id uuid;
begin
  select id into v_lesson_id
  from public.lessons
  where mosque_id = p_mosque_id and title = p_bosnian_title
  limit 1;

  if v_lesson_id is null then
    return;
  end if;

  select id into v_trans_id
  from public.lesson_translations
  where lesson_id = v_lesson_id and locale = 'de';

  if v_trans_id is not null then
    update public.lesson_translations
    set title = p_de_title,
        body = p_de_body,
        updated_at = now()
    where id = v_trans_id;
  else
    insert into public.lesson_translations (mosque_id, lesson_id, locale, title, body, created_by)
    values (p_mosque_id, v_lesson_id, 'de', p_de_title, p_de_body, p_admin_id);
  end if;
end;
$$;

do $migration$
declare
  r_mosque record;
  v_admin_id uuid;
begin
  for r_mosque in select id from public.mosques loop
    -- Resolve admin user id if available
    select user_id into v_admin_id
    from public.memberships
    where mosque_id = r_mosque.id and role = 'mosque_admin'
    limit 1;

`;

  for (const lesson of GERMAN_LESSONS) {
    const escapedBsTitle = lesson.bosnianTitle.replace(/'/g, "''");
    const escapedDeTitle = lesson.germanTitle.replace(/'/g, "''");

    const blockExprs = lesson.blocks.map(b => {
      const escapedText = b.text.replace(/'/g, "''");
      if (b.type === 'h') {
        return `pg_temp.bn_h('${escapedText}', ${b.level})`;
      } else if (b.type === 'p') {
        if (escapedText.includes('\n')) {
          return `pg_temp.bn_p(E'${escapedText.replace(/\\/g, '\\\\')}')`;
        }
        return `pg_temp.bn_p('${escapedText}')`;
      } else if (b.type === 'b') {
        return `pg_temp.bn_bullet('${escapedText}')`;
      } else if (b.type === 'num') {
        return `pg_temp.bn_num('${escapedText}')`;
      }
    });

    sql += `    -- Translation: ${lesson.germanTitle} (Lesson ${lesson.sortOrder})\n`;
    sql += `    perform pg_temp.upsert_lesson_translation(\n`;
    sql += `      r_mosque.id,\n`;
    sql += `      '${escapedBsTitle}',\n`;
    sql += `      '${escapedDeTitle}',\n`;
    sql += `      jsonb_build_array(\n        ${blockExprs.join(',\n        ')}\n      ),\n`;
    sql += `      v_admin_id\n`;
    sql += `    );\n\n`;
  }

  sql += `  end loop;\nend;\n$migration$;\n`;
  return sql;
}

const migrationSql = generateMigrationSql();
fs.writeFileSync('/Users/sanid/Documents/mekteb-claude/supabase/migrations/20260810140000_seed_german_lesson_translations.sql', migrationSql, 'utf-8');
console.log("Written 20260810140000_seed_german_lesson_translations.sql");
