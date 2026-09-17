export type DemoRole = "admin" | "teacher" | "parent" | "student" | "examiner" | "platform-admin";

export type DemoView =
  | { page: "overview" }
  | { page: "groups" }
  | { page: "group-detail"; id: string }
  | { page: "students" }
  | { page: "student-detail"; id: string }
  | { page: "teachers" }
  | { page: "teacher-detail"; id: string }
  | { page: "parents" }
  | { page: "parent-detail"; id: string }
  | { page: "lessons" }
  | { page: "notes" }
  | { page: "announcements" }
  | { page: "messages" }
  | { page: "notifications" }
  | { page: "audit" }
  | { page: "settings" }
  | { page: "calendar" }
  | { page: "exams" }
  | { page: "report" }
  | { page: "gdpr" }
  | { page: "security" }
  | { page: "written-tests" }
  | { page: "teacher-lessons" }
  | { page: "teacher-exams" }
  | { page: "parent-calendar" }
  | { page: "student-lessons" }
  | { page: "student-notifications" }
  | { page: "examiner-written-tests" }
  | { page: "platform-admin-mosques" }
  | { page: "platform-admin-billing" }
  | { page: "platform-admin-gdpr" }
  | { page: "children" }
  | { page: "child-detail"; id: string }
  | { page: "homework" }
  | { page: "attendance" }
  | { page: "student-exams" }
  | { page: "student-calendar" }
  | { page: "student-quran" }
  | { page: "student-quran-surah"; id: string }
  | { page: "parent-quran" }
  | { page: "teacher-quran" }
  | { page: "admin-quran" };

export const DEMO_MOSQUE_NAME = "Demo-Moschee";

/** A curated subset of surahs shown in the demo Quran reader. */
export const demoSurahs = [
  { number: 1, englishName: "Al-Fatiha", arabicName: "الفاتحة", numberOfAyahs: 7, revelationType: "Meccan" },
  { number: 2, englishName: "Al-Baqarah", arabicName: "البقرة", numberOfAyahs: 286, revelationType: "Medinan" },
  { number: 3, englishName: "Aal-E-Imran", arabicName: "آل عمران", numberOfAyahs: 200, revelationType: "Medinan" },
  { number: 4, englishName: "An-Nisa", arabicName: "النساء", numberOfAyahs: 176, revelationType: "Medinan" },
  { number: 5, englishName: "Al-Ma'idah", arabicName: "المائدة", numberOfAyahs: 120, revelationType: "Medinan" },
  { number: 6, englishName: "Al-An'am", arabicName: "الأنعام", numberOfAyahs: 165, revelationType: "Meccan" },
  { number: 18, englishName: "Al-Kahf", arabicName: "الكهف", numberOfAyahs: 110, revelationType: "Meccan" },
  { number: 36, englishName: "Ya-Sin", arabicName: "يس", numberOfAyahs: 83, revelationType: "Meccan" },
  { number: 55, englishName: "Ar-Rahman", arabicName: "الرحمن", numberOfAyahs: 78, revelationType: "Medinan" },
  { number: 67, englishName: "Al-Mulk", arabicName: "الملك", numberOfAyahs: 77, revelationType: "Meccan" },
  { number: 78, englishName: "An-Naba", arabicName: "النبأ", numberOfAyahs: 40, revelationType: "Meccan" },
  { number: 112, englishName: "Al-Ikhlas", arabicName: "الإخلاص", numberOfAyahs: 4, revelationType: "Meccan" },
  { number: 113, englishName: "Al-Falaq", arabicName: "الفلق", numberOfAyahs: 5, revelationType: "Meccan" },
  { number: 114, englishName: "An-Nas", arabicName: "الناس", numberOfAyahs: 6, revelationType: "Meccan" },
];

export type DemoSurah = (typeof demoSurahs)[number];

/** Al-Fatiha with Arabic text and German translation — shown in the demo reader. */
export const demoSurahContent: Record<
  number,
  { ayahs: { number: number; arabic: string; translation: string }[] }
> = {
  1: {
    ayahs: [
      { number: 1, arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translation: "Im Namen Gottes, des Allerbarmers, des Barmherzigen." },
      { number: 2, arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", translation: "Alles Lob gebührt Gott, dem Herrn der Welten." },
      { number: 3, arabic: "الرَّحْمَٰنِ الرَّحِيمِ", translation: "dem Allerbarmer, dem Barmherzigen," },
      { number: 4, arabic: "مَالِكِ يَوْمِ الدِّينِ", translation: "dem Herrscher am Tage des Gerichts." },
      { number: 5, arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", translation: "Dir allein dienen wir, und Dich allein bitten wir um Hilfe." },
      { number: 6, arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", translation: "Führe uns den geraden Weg," },
      { number: 7, arabic: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", translation: "den Weg derer, die Du begnadet hast, nicht derer, die Zorn erregt haben, und nicht der Irrenden." },
    ],
  },
};

export const demoSavedAyahs = [
  { id: "sa1", surahNumber: 1, surahName: "Al-Fatiha", ayahNumber: 1, arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translation: "Im Namen Gottes, des Allerbarmers, des Barmherzigen.", savedAt: "2026-05-18T14:20:00Z" },
  { id: "sa2", surahNumber: 2, surahName: "Al-Baqarah", ayahNumber: 255, arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ", translation: "Gott — es gibt keinen Gott außer Ihm, dem Lebendigen, dem Beständigen.", savedAt: "2026-05-20T09:10:00Z" },
  { id: "sa3", surahNumber: 112, surahName: "Al-Ikhlas", ayahNumber: 1, arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ", translation: "Sprich: Er ist Gott, der Einzige,", savedAt: "2026-05-21T18:05:00Z" },
];

export const demoReciters = [
  { id: "ar.alafasy", name: "Mishary Rashid Alafasy" },
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit (Murattal)" },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary" },
  { id: "ar.minshawi", name: "Mohamed Siddiq El-Minshawi" },
];

/** Demo student Amina's memorisation — 40 of 604 pages, i.e. 2 Juz. */
export const demoHifzStudent = { pagesMemorized: 40, totalPages: 604 };

/** Per-student hifz progress inside the demo hifz groups (g1, g3). */
export const demoClassHifz = [
  { studentId: "s1", fullName: "Amina Demirovic", groupName: "Koran Anfänger", pagesMemorized: 40 },
  { studentId: "s2", fullName: "Yusuf Hadzic", groupName: "Koran Anfänger", pagesMemorized: 25 },
  { studentId: "s3", fullName: "Layla Begic", groupName: "Koran Anfänger", pagesMemorized: 58 },
  { studentId: "s8", fullName: "Harun Omerovic", groupName: "Koran Anfänger", pagesMemorized: 12 },
  { studentId: "s11", fullName: "Sara Karic", groupName: "Koran Anfänger", pagesMemorized: 33 },
  { studentId: "s3", fullName: "Layla Begic", groupName: "Tadschwid Fortgeschritten", pagesMemorized: 58 },
  { studentId: "s6", fullName: "Dino Spahic", groupName: "Tadschwid Fortgeschritten", pagesMemorized: 20 },
  { studentId: "s7", fullName: "Medina Talic", groupName: "Tadschwid Fortgeschritten", pagesMemorized: 45 },
];

export const teachers = [
  { id: "t1", fullName: "Haris Ademovic", displayName: "Haris", bio: "Koran- und Tadschwid-Lehrer mit 10 Jahren Erfahrung.", phone: "+49 30 111 111", isActive: true, groups: ["Koran Anfänger", "Tadschwid Fortgeschritten"] },
  { id: "t2", fullName: "Lejla Kadic", displayName: "Lejla", bio: "Fachgebiet Arabische Sprache.", phone: "+49 30 222 222", isActive: true, groups: ["Arabische Buchstaben"] },
  { id: "t3", fullName: "Emir Cerovic", displayName: "Emir", bio: "Fortgeschrittener Tadschwid und Koranauswendiglernen.", phone: "+49 30 333 333", isActive: true, groups: ["Tadschwid Fortgeschritten"] },
  { id: "t4", fullName: "Sania Delic", displayName: "Sania", bio: "Islamische Studien und Aqida.", phone: "+49 30 444 444", isActive: true, groups: ["Islamische Studien"] },
  { id: "t5", fullName: "Tarik Hadzic", displayName: "Tarik", bio: "Fiqh und Sira-Lehrer.", phone: null, isActive: false, groups: [] },
];

export const parents = [
  { id: "p1", fullName: "Elvir Demirovic", relation: "Vater", isActive: true, children: ["Amina Demirovic"] },
  { id: "p2", fullName: "Mirza Hadzic", relation: "Vater", isActive: true, children: ["Yusuf Hadzic"] },
  { id: "p3", fullName: "Amela Begic", relation: "Mutter", isActive: true, children: ["Layla Begic"] },
  { id: "p4", fullName: "Selma Husic", relation: "Mutter", isActive: true, children: ["Ema Husic"] },
  { id: "p5", fullName: "Edin Kulenovic", relation: "Vater", isActive: true, children: ["Amar Kulenovic"] },
  { id: "p6", fullName: "Amina Spahic", relation: "Mutter", isActive: true, children: ["Dino Spahic"] },
  { id: "p7", fullName: "Hasan Talic", relation: "Vater", isActive: true, children: ["Medina Talic"] },
  { id: "p8", fullName: "Fatima Omerovic", relation: "Mutter", isActive: false, children: ["Harun Omerovic"] },
];

export const students = [
  { id: "s1", fullName: "Amina Demirovic", dob: "2015-03-12", isActive: true, parentIds: ["p1"], groups: ["g1", "g2"] },
  { id: "s2", fullName: "Yusuf Hadzic", dob: "2014-07-22", isActive: true, parentIds: ["p2"], groups: ["g1"] },
  { id: "s3", fullName: "Layla Begic", dob: "2016-01-05", isActive: true, parentIds: ["p3"], groups: ["g1", "g3"] },
  { id: "s4", fullName: "Amar Kulenovic", dob: "2015-11-18", isActive: true, parentIds: ["p5"], groups: ["g2"] },
  { id: "s5", fullName: "Ema Husic", dob: "2016-05-30", isActive: true, parentIds: ["p4"], groups: ["g2", "g4"] },
  { id: "s6", fullName: "Dino Spahic", dob: "2014-09-14", isActive: true, parentIds: ["p6"], groups: ["g3"] },
  { id: "s7", fullName: "Medina Talic", dob: "2015-06-08", isActive: true, parentIds: ["p7"], groups: ["g3", "g4"] },
  { id: "s8", fullName: "Harun Omerovic", dob: "2013-12-25", isActive: true, parentIds: ["p8"], groups: ["g1"] },
  { id: "s9", fullName: "Lejla Zunic", dob: "2016-04-11", isActive: true, parentIds: [], groups: ["g2"] },
  { id: "s10", fullName: "Hamza Masic", dob: "2015-08-19", isActive: true, parentIds: [], groups: ["g4"] },
  { id: "s11", fullName: "Sara Karic", dob: "2014-02-28", isActive: true, parentIds: [], groups: ["g1", "g4"] },
  { id: "s12", fullName: "Ibrahim Fazlic", dob: "2015-10-03", isActive: true, parentIds: [], groups: ["g2"] },
  { id: "s13", fullName: "Hana Nuhic", dob: "2016-07-15", isActive: false, parentIds: [], groups: [] },
];

export const groups = [
  { id: "g1", name: "Koran Anfänger", description: "Koranlesen von Grund auf erlernen", teacherIds: ["t1"], studentIds: ["s1", "s2", "s3", "s8", "s11"] },
  { id: "g2", name: "Arabische Buchstaben", description: "Arabische Buchstabenerkennung und Aussprache meistern", teacherIds: ["t2"], studentIds: ["s1", "s4", "s5", "s9", "s12"] },
  { id: "g3", name: "Tadschwid Fortgeschritten", description: "Fortgeschrittene Tadschwid-Regeln und Anwendung", teacherIds: ["t1", "t3"], studentIds: ["s3", "s6", "s7"] },
  { id: "g4", name: "Islamische Studien", description: "Grundlagen des islamischen Wissens, Aqida und Fiqh", teacherIds: ["t4"], studentIds: ["s5", "s7", "s10", "s11"] },
];

export const topics = [
  { id: "tp1", title: "Tadschwid Grundlagen", sortOrder: 1 },
  { id: "tp2", title: "Arabisches Alphabet", sortOrder: 2 },
  { id: "tp3", title: "Islamisches Glaubensbekenntnis", sortOrder: 3 },
];

export const lessons = [
  { id: "l1", title: "Izhar-Buchstaben", topicId: "tp1", topicTitle: "Tadschwid Grundlagen", body: "Die sechs Izhar-Buchstaben lernen: ء ه ع ح غ خ" },
  { id: "l2", title: "Idgham-Buchstaben", topicId: "tp1", topicTitle: "Tadschwid Grundlagen", body: "Die sechs Idgham-Buchstaben lernen: ي ن م و ل ر" },
  { id: "l3", title: "Alif, Ba, Ta", topicId: "tp2", topicTitle: "Arabisches Alphabet", body: "Erkennen und Schreiben der ersten drei arabischen Buchstaben." },
  { id: "l4", title: "Tha, Jim, Cha", topicId: "tp2", topicTitle: "Arabisches Alphabet", body: "Erkennen und Schreiben von Tha, Jim und Cha." },
  { id: "l5", title: "Säulen des Islam", topicId: "tp3", topicTitle: "Islamisches Glaubensbekenntnis", body: "Die fünf Säulen: Schahada, Salat, Zakat, Saum, Hadsch." },
  { id: "l6", title: "Säulen des Iman", topicId: "tp3", topicTitle: "Islamisches Glaubensbekenntnis", body: "Die sechs Säulen des Glaubens." },
];

export const homeworkAssignments = [
  { id: "h1", title: "Surah Al-Fatiha üben", groupId: "g1", groupName: "Koran Anfänger", lessonId: "l1", audience: "group" as const, dueDate: "2026-05-24", body: "Surah Al-Fatiha mit korrektem Izhar rezitieren üben." },
  { id: "h2", title: "Arabisches Alphabet 3x schreiben", groupId: "g2", groupName: "Arabische Buchstaben", lessonId: "l3", audience: "group" as const, dueDate: "2026-05-25", body: "Jeden Buchstaben von Alif bis Ta dreimal schreiben." },
  { id: "h3", title: "Tadschwid-Anwendung aufnehmen", groupId: "g3", groupName: "Tadschwid Fortgeschritten", lessonId: null, audience: "group" as const, dueDate: "2026-05-26", body: "Nimm dich auf, wie du die Idgham-Regeln anwendest." },
  { id: "h4", title: "Ayat 1-5 auswendig lernen", groupId: "g1", groupName: "Koran Anfänger", lessonId: "l2", audience: "individual" as const, dueDate: "2026-05-27", body: "Die ersten 5 Ayat von Al-Baqarah auswendig lernen.", targetStudents: ["s1", "s3"] },
  { id: "h5", title: "Arbeitsblatt Säulen des Islam", groupId: "g4", groupName: "Islamische Studien", lessonId: "l5", audience: "group" as const, dueDate: "2026-05-28", body: "Das Arbeitsblatt zu den fünf Säulen vervollständigen." },
  { id: "h6", title: "Reflexion zum Koranlesen schreiben", groupId: "g1", groupName: "Koran Anfänger", lessonId: null, audience: "group" as const, dueDate: "2026-05-20", body: "Eine kurze Reflexion über deine Koranlese-Praxis diese Woche schreiben." },
  { id: "h7", title: "Idgham-Übungsblatt", groupId: "g3", groupName: "Tadschwid Fortgeschritten", lessonId: "l2", audience: "group" as const, dueDate: "2026-05-30", body: "Die Idgham-Erkennungsübung vervollständigen." },
];

export const attendanceSessions = [
  {
    id: "as1", date: "2026-05-20", groupId: "g1", groupName: "Koran Anfänger",
    records: [
      { studentId: "s1", studentName: "Amina Demirovic", status: "present" },
      { studentId: "s2", studentName: "Yusuf Hadzic", status: "present" },
      { studentId: "s3", studentName: "Layla Begic", status: "late" },
      { studentId: "s8", studentName: "Harun Omerovic", status: "absent" },
      { studentId: "s11", studentName: "Sara Karic", status: "present" },
    ],
  },
  {
    id: "as2", date: "2026-05-19", groupId: "g2", groupName: "Arabische Buchstaben",
    records: [
      { studentId: "s1", studentName: "Amina Demirovic", status: "present" },
      { studentId: "s4", studentName: "Amar Kulenovic", status: "excused" },
      { studentId: "s5", studentName: "Ema Husic", status: "present" },
      { studentId: "s9", studentName: "Lejla Zunic", status: "present" },
      { studentId: "s12", studentName: "Ibrahim Fazlic", status: "absent" },
    ],
  },
  {
    id: "as3", date: "2026-05-18", groupId: "g3", groupName: "Tadschwid Fortgeschritten",
    records: [
      { studentId: "s3", studentName: "Layla Begic", status: "present" },
      { studentId: "s6", studentName: "Dino Spahic", status: "present" },
      { studentId: "s7", studentName: "Medina Talic", status: "late" },
    ],
  },
  {
    id: "as4", date: "2026-05-16", groupId: "g1", groupName: "Koran Anfänger",
    records: [
      { studentId: "s1", studentName: "Amina Demirovic", status: "present" },
      { studentId: "s2", studentName: "Yusuf Hadzic", status: "absent" },
      { studentId: "s3", studentName: "Layla Begic", status: "present" },
      { studentId: "s8", studentName: "Harun Omerovic", status: "present" },
      { studentId: "s11", studentName: "Sara Karic", status: "excused" },
    ],
  },
  {
    id: "as5", date: "2026-05-15", groupId: "g4", groupName: "Islamische Studien",
    records: [
      { studentId: "s5", studentName: "Ema Husic", status: "present" },
      { studentId: "s7", studentName: "Medina Talic", status: "present" },
      { studentId: "s10", studentName: "Hamza Masic", status: "late" },
      { studentId: "s11", studentName: "Sara Karic", status: "present" },
    ],
  },
];

export const progressNotes = [
  { id: "n1", studentId: "s1", studentName: "Amina Demirovic", groupId: "g1", groupName: "Koran Anfänger", body: "Amina hat hervorragende Fortschritte bei ihrer Koranrezitation gezeigt. Sie liest jetzt flüssig mit minimalen Fehlern.", visibleToParents: true, createdAt: "2026-05-19" },
  { id: "n2", studentId: "s2", studentName: "Yusuf Hadzic", groupId: "g1", groupName: "Koran Anfänger", body: "Yusuf braucht mehr Übung bei der Buchstabenerkennung. Zusätzliche Übungen zu Hause werden empfohlen.", visibleToParents: true, createdAt: "2026-05-18" },
  { id: "n3", studentId: "s3", studentName: "Layla Begic", groupId: "g3", groupName: "Tadschwid Fortgeschritten", body: "Layla hat die Izhar-Regeln gemeistert und ist bereit für Idgham.", visibleToParents: true, createdAt: "2026-05-17" },
  { id: "n4", studentId: "s8", studentName: "Harun Omerovic", groupId: "g1", groupName: "Koran Anfänger", body: "Harun war häufig abwesend. Ein Gespräch mit den Eltern wird empfohlen.", visibleToParents: false, createdAt: "2026-05-16" },
  { id: "n5", studentId: "s5", studentName: "Ema Husic", groupId: "g2", groupName: "Arabische Buchstaben", body: "Emas Handschrift hat sich deutlich verbessert. Gute Leistung bei den Buchstabenerkennungsübungen.", visibleToParents: true, createdAt: "2026-05-15" },
];

export const weeklyNotes = [
  { id: "wn1", groupId: "g1", groupName: "Koran Anfänger", weekStart: "2026-05-19", body: "Diese Woche haben wir uns auf die Rezitation von Surah Al-Fatiha konzentriert. Die meisten Schülerinnen und Schüler haben sich verbessert. Nächste Woche fahren wir mit Al-Ikhlas fort.", isPublished: true },
  { id: "wn2", groupId: "g2", groupName: "Arabische Buchstaben", weekStart: "2026-05-19", body: "Buchstaben von Alif bis Cha abgeschlossen. Die Schülerinnen und Schüler haben Schreiben und Erkennen geübt. Hausaufgabe zur Vertiefung erteilt.", isPublished: true },
  { id: "wn3", groupId: "g1", groupName: "Koran Anfänger", weekStart: "2026-05-12", body: "Einführung in die Tadschwid-Grundlagen. Die Schülerinnen und Schüler haben die Izhar-Buchstaben kennengelernt. Insgesamt gute Beteiligung im Unterricht.", isPublished: true },
  { id: "wn4", groupId: "g3", groupName: "Tadschwid Fortgeschritten", weekStart: "2026-05-19", body: "Entwurf für diese Woche im Fortgeschrittenenkurs...", isPublished: false },
];

export const announcements = [
  { id: "a1", title: "Ramadan-Zeitplanänderung", body: "Während des Ramadan werden alle Kurse auf nach dem Dhuhr-Gebet verschoben. Bitte den aktualisierten Zeitplan bei der Lehrkraft Ihres Kindes erfragen.", audience: "mosque" as const, groupName: null, publishedAt: "2026-05-18" },
  { id: "a2", title: "Eltern-Lehrer-Gespräch", body: "Wir laden alle Eltern zum vierteljährlichen Eltern-Lehrer-Gespräch am Samstag, den 30. Mai um 10:00 Uhr ein. Wir werden die Schülerfortschritte und anstehende Veranstaltungen besprechen.", audience: "mosque" as const, groupName: null, publishedAt: "2026-05-16" },
  { id: "a3", title: "Hausaufgaben-Frist verlängert", body: "Die Frist für das Arbeitsblatt Arabische Buchstaben wurde bis Freitag verlängert. Bitte stellen Sie sicher, dass Ihr Kind die Übungen fertigstellt.", audience: "group" as const, groupName: "Arabische Buchstaben", publishedAt: "2026-05-15" },
  { id: "a4", title: "Anmeldung Koran-Wettbewerb", body: "Die Anmeldung für den jährlichen Koranrezitations-Wettbewerb ist jetzt offen. Bitte wenden Sie sich an Ihre Lehrkraft für weitere Informationen.", audience: "mosque" as const, groupName: null, publishedAt: "2026-05-10" },
];

export const messageThreads = [
  {
    id: "mt1", subject: "Aminas Fortschritt",
    participants: [
      { profileId: "admin", name: "Admin" },
      { profileId: "p1", name: "Elvir Demirovic" },
    ],
    updatedAt: "2026-05-20T14:30:00Z",
    messages: [
      { id: "m1", authorProfileId: "p1", authorName: "Elvir Demirovic", body: "Salam, ich wollte nach Aminas Fortschritt im Koran-Anfänger-Kurs fragen. Sie übt zu Hause und scheint sich zu verbessern.", createdAt: "2026-05-19T09:00:00Z" },
      { id: "m2", authorProfileId: "admin", authorName: "Admin", body: "Wa alaikum salam! Ja, Amina macht das sehr gut. Sie hat hervorragende Fortschritte gezeigt und ist eine der besten Schülerinnen in ihrer Klasse. Ich werde bald einen ausführlichen Fortschrittsbericht teilen.", createdAt: "2026-05-20T14:30:00Z" },
    ],
  },
  {
    id: "mt2", subject: "Anstehende Veranstaltungen",
    participants: [
      { profileId: "admin", name: "Admin" },
      { profileId: "t1", name: "Haris Ademovic" },
    ],
    updatedAt: "2026-05-18T11:00:00Z",
    messages: [
      { id: "m3", authorProfileId: "admin", authorName: "Admin", body: "Salam Haris, bist du am 5. Juni verfügbar, um bei der Jury des Koran-Wettbewerbs zu helfen?", createdAt: "2026-05-18T10:00:00Z" },
      { id: "m4", authorProfileId: "t1", authorName: "Haris Ademovic", body: "Wa alaikum salam. Ja, sehr gerne. Um welche Uhrzeit soll ich da sein?", createdAt: "2026-05-18T11:00:00Z" },
    ],
  },
  {
    id: "mt3", subject: null,
    participants: [
      { profileId: "admin", name: "Admin" },
      { profileId: "p3", name: "Amela Begic" },
      { profileId: "t1", name: "Haris Ademovic" },
    ],
    updatedAt: "2026-05-17T16:00:00Z",
    messages: [
      { id: "m5", authorProfileId: "p3", authorName: "Amela Begic", body: "Meine Tochter Layla hat erwähnt, dass sie vielleicht zusätzliche Hilfe bei Tadschwid braucht. Könnten wir etwas organisieren?", createdAt: "2026-05-17T15:00:00Z" },
      { id: "m6", authorProfileId: "t1", authorName: "Haris Ademovic", body: "Natürlich! Ich kann samstags zusätzliche Sitzungen anbieten. Lass mich den Zeitplan prüfen.", createdAt: "2026-05-17T15:30:00Z" },
      { id: "m7", authorProfileId: "admin", authorName: "Admin", body: "Gute Idee. Ich helfe bei der Koordination der Terminplanung. Lassen Sie uns weiterbesprechen.", createdAt: "2026-05-17T16:00:00Z" },
    ],
  },
];

export const notifications = [
  { id: "nt1", subject: "Neue Ankündigung", body: "Ramadan-Zeitplanänderung — Bitte überprüfen Sie die aktualisierten Kurszeiten.", status: "sent", channel: "in_app", createdAt: "2026-05-18T08:00:00Z" },
  { id: "nt2", subject: "Hausaufgabe fällig morgen", body: "Surah Al-Fatiha üben ist morgen für Koran Anfänger fällig.", status: "sent", channel: "in_app", createdAt: "2026-05-17T09:00:00Z" },
  { id: "nt3", subject: "Neue Nachricht", body: "Elvir Demirovic hat Ihnen eine Nachricht über Aminas Fortschritt gesendet.", status: "sent", channel: "in_app", createdAt: "2026-05-19T09:05:00Z" },
  { id: "nt4", subject: "Anwesenheitserinnerung", body: "Bitte die Anwesenheit für die heutige Koran-Anfänger-Sitzung eintragen.", status: "pending", channel: "in_app", createdAt: "2026-05-20T07:00:00Z" },
  { id: "nt5", subject: "Wochenzusammenfassung bereit", body: "Die Wochenzusammenfassung für Koran Anfänger wurde veröffentlicht.", status: "sent", channel: "in_app", createdAt: "2026-05-16T17:00:00Z" },
  { id: "nt6", subject: "Neue Ankündigung", body: "Eltern-Lehrer-Gespräch — Samstag, 30. Mai um 10:00 Uhr.", status: "failed", channel: "email", createdAt: "2026-05-16T08:00:00Z" },
];

export const auditLogs = [
  { id: "al1", action: "student.enrolled", actor: "Admin", target: "Amina Demirovic", targetTable: "group_enrollments", metadata: "Eingeschrieben in Koran Anfänger", createdAt: "2026-05-20T10:00:00Z" },
  { id: "al2", action: "homework.published", actor: "Haris Ademovic", target: "Surah Al-Fatiha üben", targetTable: "homework_assignments", metadata: "Gruppe: Koran Anfänger", createdAt: "2026-05-19T14:00:00Z" },
  { id: "al3", action: "attendance.saved", actor: "Lejla Kadic", target: "Arabische Buchstaben", targetTable: "attendance_sessions", metadata: "5 Schüler, 4 anwesend", createdAt: "2026-05-19T11:30:00Z" },
  { id: "al4", action: "announcement.posted", actor: "Admin", target: "Ramadan-Zeitplanänderung", targetTable: "announcements", metadata: "Moscheeweit", createdAt: "2026-05-18T08:00:00Z" },
  { id: "al5", action: "teacher.created", actor: "Admin", target: "Sania Delic", targetTable: "teacher_profiles", metadata: "Temporäres Passwort generiert", createdAt: "2026-05-17T09:00:00Z" },
  { id: "al6", action: "parent.created", actor: "Admin", target: "Edin Kulenovic", targetTable: "parent_profiles", metadata: "Verknüpft mit Amar Kulenovic", createdAt: "2026-05-16T15:00:00Z" },
  { id: "al7", action: "note.added", actor: "Haris Ademovic", target: "Amina Demirovic", targetTable: "progress_notes", metadata: "Sichtbar für Eltern", createdAt: "2026-05-15T12:00:00Z" },
  { id: "al8", action: "settings.updated", actor: "Admin", target: "Moschee-Info", targetTable: "mosques", metadata: "Zeitzone und Sprache aktualisiert", createdAt: "2026-05-14T10:00:00Z" },
];

export const examSessions = [
  { id: "es1", studentName: "Amina Demirovic", groupName: "Koran Anfänger", examinerName: "Haris Ademovic", status: "passed", examDate: "2026-05-10", summary: "Hervorragende Leistung. Amina hat alle Izhar- und Idgham-Regeln korrekt angewendet." },
  { id: "es2", studentName: "Yusuf Hadzic", groupName: "Koran Anfänger", examinerName: "Haris Ademovic", status: "scheduled", examDate: "2026-05-28", summary: null },
  { id: "es3", studentName: "Layla Begic", groupName: "Tadschwid Fortgeschritten", examinerName: "Emir Cerovic", status: "in_progress", examDate: "2026-05-22", summary: null },
  { id: "es4", studentName: "Ema Husic", groupName: "Arabische Buchstaben", examinerName: "Lejla Kadic", status: "failed", examDate: "2026-05-05", summary: "Muss die Buchstabenerkennung weiter üben. Erneute Prüfung empfohlen." },
  { id: "es5", studentName: "Medina Talic", groupName: "Islamische Studien", examinerName: "Sania Delic", status: "passed", examDate: "2026-04-28", summary: "Sehr gutes Verständnis der Säulen des Islam und Iman." },
  { id: "es6", studentName: "Dino Spahic", groupName: "Tadschwid Fortgeschritten", examinerName: "Emir Cerovic", status: "passed", examDate: "2026-04-20", summary: "Gute Anwendung der Tadschwid-Regeln." },
];

export const examRequests = [
  { id: "er1", studentName: "Sara Karic", groupName: "Koran Anfänger", teacherName: "Haris Ademovic", notes: "Bereit für die Abschlussprüfung.", createdAt: "2026-05-20" },
  { id: "er2", studentName: "Amar Kulenovic", groupName: "Arabische Buchstaben", teacherName: "Lejla Kadic", notes: null, createdAt: "2026-05-19" },
];

export const gdprRequests = [
  { id: "gr1", email: "fatima.omerovic@example.com", type: "deletion", status: "pending", reason: "Account nicht mehr benötigt.", requestedAt: "2026-05-18", processedAt: null },
  { id: "gr2", email: "tarik.hadzic@example.com", type: "export", status: "completed", reason: "Datenauskunft beantragt.", requestedAt: "2026-05-10", processedAt: "2026-05-12" },
  { id: "gr3", email: "unknown@example.com", type: "deletion", status: "rejected", reason: "Verdacht auf unbefugten Zugriff.", requestedAt: "2026-05-15", processedAt: "2026-05-16" },
];

export const loginAuditLogs = [
  { id: "la1", email: "admin@demo-mosque.de", status: "success", ip: "192.168.1.10", createdAt: "2026-05-20T09:15:00Z" },
  { id: "la2", email: "haris@example.com", status: "success", ip: "10.0.0.42", createdAt: "2026-05-20T08:30:00Z" },
  { id: "la3", email: "lejla@example.com", status: "failed", ip: "203.0.113.5", createdAt: "2026-05-19T22:10:00Z" },
  { id: "la4", email: "lejla@example.com", status: "success", ip: "10.0.0.43", createdAt: "2026-05-19T22:12:00Z" },
  { id: "la5", email: "unknown@suspicious.com", status: "failed", ip: "198.51.100.7", createdAt: "2026-05-19T14:00:00Z" },
  { id: "la6", email: "admin@demo-mosque.de", status: "success", ip: "192.168.1.10", createdAt: "2026-05-18T07:45:00Z" },
  { id: "la7", email: "elvir@example.com", status: "success", ip: "172.16.0.5", createdAt: "2026-05-17T18:30:00Z" },
  { id: "la8", email: "elvir@example.com", status: "failed", ip: "172.16.0.5", createdAt: "2026-05-17T18:28:00Z" },
];

export const otpIssues = [
  { id: "ot1", userId: "t5", status: "expired", expiry: "2026-05-17T12:00:00Z", createdAt: "2026-05-17T10:00:00Z" },
  { id: "ot2", userId: "p8", status: "activated", expiry: "2026-05-16T12:00:00Z", createdAt: "2026-05-16T10:00:00Z" },
  { id: "ot3", userId: "p2", status: "activated", expiry: "2026-05-15T12:00:00Z", createdAt: "2026-05-15T09:00:00Z" },
];

export const passwordResets = [
  { id: "pr1", userId: "lejla@example.com", reason: "Forgot password", createdAt: "2026-05-19T22:05:00Z" },
  { id: "pr2", userId: "tarik@example.com", reason: "Account locked", createdAt: "2026-05-14T11:00:00Z" },
];

export const examQuestions = [
  { id: "q1", text: "What are the six Izhar letters?", difficulty: "easy" as const, topicId: "tp1" },
  { id: "q2", text: "Explain the rules of Idgham with examples from the Quran.", difficulty: "medium" as const, topicId: "tp1" },
  { id: "q3", text: "Write the first three Arabic letters and their phonetic equivalents.", difficulty: "easy" as const, topicId: "tp2" },
  { id: "q4", text: "Differentiate between Tha, Jim, and Cha in written form.", difficulty: "medium" as const, topicId: "tp2" },
  { id: "q5", text: "List and explain the five pillars of Islam.", difficulty: "easy" as const, topicId: "tp3" },
  { id: "q6", text: "Describe the six pillars of Iman and their significance in daily life.", difficulty: "hard" as const, topicId: "tp3" },
  { id: "q7", text: "Identify the Idgham letters in a given Quranic verse.", difficulty: "hard" as const, topicId: "tp1" },
  { id: "q8", text: "Transliterate a short passage from Arabic to Latin script.", difficulty: "medium" as const, topicId: "tp2" },
];

export const platformMosques = [
  { id: "pm1", name: "Demo-Moschee", slug: "demo-moschee", plan: "professional", status: "active", totalStudents: 12, trialEnd: null, createdAt: "2025-08-01" },
  { id: "pm2", name: "Al-Nur Moschee", slug: "al-nur", plan: "starter", status: "trialing", totalStudents: 8, trialEnd: "2026-06-15", createdAt: "2026-05-01" },
  { id: "pm3", name: "Sultan-Ahmed Moschee", slug: "sultan-ahmed", plan: "professional", status: "active", totalStudents: 45, trialEnd: null, createdAt: "2025-03-15" },
  { id: "pm4", name: "Mevlana Zentrum", slug: "mevlana", plan: "starter", status: "canceled", totalStudents: 3, trialEnd: null, createdAt: "2025-11-20" },
  { id: "pm5", name: "Bosna Dzamija", slug: "bosna-dzamija", plan: "community", status: "active", totalStudents: 22, trialEnd: null, createdAt: "2024-12-01" },
];

export const platformBilling = [
  { id: "pb1", mosqueName: "Demo-Moschee", planId: "professional", status: "active", trialEnd: null, stripeCustomer: "cus_abc123" },
  { id: "pb2", mosqueName: "Al-Nur Moschee", planId: "starter", status: "trialing", trialEnd: "2026-06-15", stripeCustomer: "cus_def456" },
  { id: "pb3", mosqueName: "Sultan-Ahmed Moschee", planId: "professional", status: "active", trialEnd: null, stripeCustomer: "cus_ghi789" },
  { id: "pb4", mosqueName: "Mevlana Zentrum", planId: "starter", status: "canceled", trialEnd: null, stripeCustomer: "cus_jkl012" },
  { id: "pb5", mosqueName: "Bosna Dzamija", planId: "community", status: "active", trialEnd: null, stripeCustomer: "cus_mno345" },
];

export const platformGdprLogs = [
  { id: "pg1", mosqueName: "Test-Moschee", mosqueSlug: "test-moschee", requestedBy: "admin@test-moschee.de", deletionStarted: "2026-04-10T08:00:00Z", deletionCompleted: "2026-04-10T08:45:00Z", stripeDeleted: true, storageFiles: 12 },
  { id: "pg2", mosqueName: "Al-Salam Zentrum", mosqueSlug: "al-salam", requestedBy: "info@al-salam.de", deletionStarted: "2026-03-20T10:00:00Z", deletionCompleted: null, stripeDeleted: false, storageFiles: 0 },
];

export const calendarSchedules = [
  { groupName: "Koran Anfänger", dayOfWeek: 1, startTime: "16:00", endTime: "17:30" },
  { groupName: "Koran Anfänger", dayOfWeek: 4, startTime: "16:00", endTime: "17:30" },
  { groupName: "Arabische Buchstaben", dayOfWeek: 2, startTime: "15:00", endTime: "16:00" },
  { groupName: "Arabische Buchstaben", dayOfWeek: 5, startTime: "15:00", endTime: "16:00" },
  { groupName: "Tadschwid Fortgeschritten", dayOfWeek: 3, startTime: "17:00", endTime: "18:30" },
  { groupName: "Islamische Studien", dayOfWeek: 6, startTime: "10:00", endTime: "11:30" },
];

/**
 * Mosque-wide events for the week calendar demo — `dayOfWeek` uses the JS
 * convention (0 = Sunday). These render as the Megaphone rows the real
 * calendar shows for mosque events.
 */
export const calendarEvents = [
  { title: "Dschuma-Predigt", description: "Freitagspredigt in der Moschee", dayOfWeek: 5, startTime: "13:15", endTime: "14:00" },
  { title: "Elternabend", description: "Jahresplanung für alle Gruppen", dayOfWeek: 6, startTime: "17:00", endTime: "18:30" },
];

export const reportData = {
  totalStudents: 12,
  totalGroups: 4,
  totalTeachers: 4,
  studentsAttendedOverHalf: 10,
  overallAttendanceRate: 87,
  overallAttPresent: 20,
  overallAttTotal: 23,
  overallExamPassRate: 75,
  examPassed: 3,
  examFailed: 1,
  overallLessonRate: 62,
  periodStart: "2025-08-01",
  groups: [
    { id: "g1", name: "Koran Anfänger", studentCount: 5, attendanceRate: 88, lessonRate: 70, examPassRate: 100, examPassed: 1, examFailed: 0 },
    { id: "g3", name: "Tadschwid Fortgeschritten", studentCount: 3, attendanceRate: 92, lessonRate: 65, examPassRate: 100, examPassed: 1, examFailed: 0 },
    { id: "g2", name: "Arabische Buchstaben", studentCount: 5, attendanceRate: 80, lessonRate: 55, examPassRate: 0, examPassed: 0, examFailed: 1 },
    { id: "g4", name: "Islamische Studien", studentCount: 4, attendanceRate: 85, lessonRate: 60, examPassRate: 100, examPassed: 1, examFailed: 0 },
  ],
  topStudents: [
    { id: "s3", fullName: "Layla Begic", attendanceRate: 95, lessonCompletionRate: 83, examsPassed: 1, examsFailed: 0 },
    { id: "s1", fullName: "Amina Demirovic", attendanceRate: 90, lessonCompletionRate: 67, examsPassed: 1, examsFailed: 0 },
    { id: "s7", fullName: "Medina Talic", attendanceRate: 88, lessonCompletionRate: 50, examsPassed: 1, examsFailed: 0 },
    { id: "s6", fullName: "Dino Spahic", attendanceRate: 85, lessonCompletionRate: 0, examsPassed: 1, examsFailed: 0 },
  ],
};

export const lessonCompletions: Record<string, string[]> = {
  s1: ["l1", "l2", "l3", "l5"],
  s2: ["l1", "l3"],
  s3: ["l1", "l2", "l3", "l4", "l5"],
  s5: ["l3", "l4", "l5", "l6"],
};

export const homeworkSubmissions: Record<string, string[]> = {
  s1: ["h1", "h6"],
  s2: ["h1"],
  s3: ["h1", "h6"],
};

export function getStudentsInGroup(groupId: string) {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return [];
  return group.studentIds.map((sid) => students.find((s) => s.id === sid)!).filter(Boolean);
}

export function getGroupsForStudent(studentId: string) {
  return groups.filter((g) => g.studentIds.includes(studentId));
}

export function getGroupsForTeacher(teacherId: string) {
  return groups.filter((g) => g.teacherIds.includes(teacherId));
}

export function getParentsForStudent(studentId: string) {
  const student = students.find((s) => s.id === studentId);
  if (!student) return [];
  return student.parentIds.map((pid) => parents.find((p) => p.id === pid)!).filter(Boolean);
}

export function getAttendanceForGroup(groupId: string) {
  return attendanceSessions.filter((s) => s.groupId === groupId);
}

export function getAttendanceForStudent(studentId: string) {
  return attendanceSessions
    .map((s) => ({
      ...s,
      records: s.records.filter((r) => r.studentId === studentId),
    }))
    .filter((s) => s.records.length > 0);
}

export function getHomeworkForGroup(groupId: string) {
  return homeworkAssignments.filter((h) => h.groupId === groupId);
}

export function getHomeworkForStudent(studentId: string) {
  const studentGroups = getGroupsForStudent(studentId);
  const groupIds = studentGroups.map((g) => g.id);
  return homeworkAssignments.filter(
    (h) =>
      groupIds.includes(h.groupId) &&
      (h.audience === "group" || h.targetStudents?.includes(studentId)),
  );
}

export function getNotesForStudent(studentId: string) {
  return progressNotes.filter((n) => n.studentId === studentId);
}

export const roleNavItems: Record<DemoRole, { labelKey: string; iconType: string; page: string }[]> = {
  admin: [
    { labelKey: "overview", iconType: "LayoutDashboard", page: "overview" },
    { labelKey: "calendar", iconType: "Calendar", page: "calendar" },
    { labelKey: "groups", iconType: "Users", page: "groups" },
    { labelKey: "students", iconType: "GraduationCap", page: "students" },
    { labelKey: "teachers", iconType: "BookOpen", page: "teachers" },
    { labelKey: "parents", iconType: "Heart", page: "parents" },
    { labelKey: "lessons", iconType: "BookMarked", page: "lessons" },
    { labelKey: "quran", iconType: "BookOpen", page: "admin-quran" },
    { labelKey: "exams", iconType: "ClipboardCheck", page: "exams" },
    { labelKey: "writtenTests", iconType: "PenLine", page: "written-tests" },
    { labelKey: "announcements", iconType: "Megaphone", page: "announcements" },
    { labelKey: "messages", iconType: "MessageSquare", page: "messages" },
    { labelKey: "notifications", iconType: "Bell", page: "notifications" },
    { labelKey: "auditLog", iconType: "ClipboardList", page: "audit" },
    { labelKey: "annualReport", iconType: "FileText", page: "report" },
    { labelKey: "security", iconType: "Shield", page: "security" },
    { labelKey: "gdpr", iconType: "Shield", page: "gdpr" },
    { labelKey: "settings", iconType: "Settings", page: "settings" },
  ],
  teacher: [
    { labelKey: "overview", iconType: "LayoutDashboard", page: "overview" },
    { labelKey: "myGroups", iconType: "Users", page: "groups" },
    { labelKey: "lessonLibrary", iconType: "BookMarked", page: "teacher-lessons" },
    { labelKey: "quran", iconType: "BookOpen", page: "teacher-quran" },
    { labelKey: "recentExamResults", iconType: "ClipboardCheck", page: "teacher-exams" },
    { labelKey: "allNotes", iconType: "FileText", page: "notes" },
    { labelKey: "messages", iconType: "MessageSquare", page: "messages" },
    { labelKey: "notifications", iconType: "Bell", page: "notifications" },
    { labelKey: "announcements", iconType: "Megaphone", page: "announcements" },
  ],
  parent: [
    { labelKey: "overview", iconType: "LayoutDashboard", page: "overview" },
    { labelKey: "myChildren", iconType: "Heart", page: "children" },
    { labelKey: "calendar", iconType: "Calendar", page: "parent-calendar" },
    { labelKey: "lessonLibrary", iconType: "BookMarked", page: "lessons" },
    { labelKey: "quran", iconType: "BookOpen", page: "parent-quran" },
    { labelKey: "messages", iconType: "MessageSquare", page: "messages" },
    { labelKey: "notifications", iconType: "Bell", page: "notifications" },
    { labelKey: "announcements", iconType: "Megaphone", page: "announcements" },
  ],
  student: [
    { labelKey: "overview", iconType: "LayoutDashboard", page: "overview" },
    { labelKey: "homework", iconType: "BookOpen", page: "homework" },
    { labelKey: "attendance", iconType: "CalendarCheck", page: "attendance" },
    { labelKey: "calendar", iconType: "Calendar", page: "student-calendar" },
    { labelKey: "upcomingExams", iconType: "ClipboardCheck", page: "student-exams" },
    { labelKey: "lessonLibrary", iconType: "BookMarked", page: "student-lessons" },
    { labelKey: "quran", iconType: "BookOpen", page: "student-quran" },
    { labelKey: "announcements", iconType: "Megaphone", page: "announcements" },
    { labelKey: "notifications", iconType: "Bell", page: "student-notifications" },
  ],
  examiner: [
    { labelKey: "overview", iconType: "LayoutDashboard", page: "overview" },
    { labelKey: "recentExams", iconType: "ClipboardCheck", page: "exams" },
    { labelKey: "writtenTests", iconType: "PenLine", page: "examiner-written-tests" },
    { labelKey: "messages", iconType: "MessageSquare", page: "messages" },
    { labelKey: "notifications", iconType: "Bell", page: "notifications" },
  ],
  "platform-admin": [
    { labelKey: "overview", iconType: "LayoutDashboard", page: "overview" },
    { labelKey: "mosques", iconType: "Building2", page: "platform-admin-mosques" },
    { labelKey: "billing", iconType: "CreditCard", page: "platform-admin-billing" },
    { labelKey: "gdprLog", iconType: "Shield", page: "platform-admin-gdpr" },
  ],
};

const _attendanceRecords = attendanceSessions.flatMap((s) => s.records ?? []);
const _attendanceTotal = _attendanceRecords.length;
const _attendancePresent = _attendanceRecords.filter(
  (r) => r.status === "present",
).length;
const _homeworkTotal = homeworkAssignments.length;
const _homeworkAck = Object.values(homeworkSubmissions).reduce(
  (n, list) => n + list.length,
  0,
);

export const adminStats = {
  groups: groups.length,
  students: students.filter((s) => s.isActive).length,
  teachers: teachers.filter((t) => t.isActive).length,
  parents: parents.filter((p) => p.isActive).length,
  attendanceTotal: _attendanceTotal,
  attendancePresent: _attendancePresent,
  attendanceRate:
    _attendanceTotal === 0
      ? 0
      : Math.round((_attendancePresent / _attendanceTotal) * 100),
  homeworkTotal: _homeworkTotal,
  homeworkAck: _homeworkAck,
  homeworkAckRate:
    _homeworkTotal === 0
      ? 0
      : Math.min(100, Math.round((_homeworkAck / _homeworkTotal) * 100)),
};

const _demoTeacherId = "t1";
const _demoTeacherGroups = groups.filter((g) =>
  g.teacherIds.includes(_demoTeacherId),
);

export const teacherGroups = _demoTeacherGroups.map((g) => ({
  id: g.id,
  name: g.name,
  description: g.description,
  students: g.studentIds.length,
}));

export const teacherRecentSessions = attendanceSessions
  .filter((s) => _demoTeacherGroups.some((g) => g.id === s.groupId))
  .slice(0, 5)
  .map((s) => ({
    id: s.id,
    date: s.date,
    groupName:
      groups.find((g) => g.id === s.groupId)?.name ?? "Unbekannte Gruppe",
  }));

export const teacherUpcomingHomework = homeworkAssignments
  .filter((h) => _demoTeacherGroups.some((g) => g.id === h.groupId))
  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  .slice(0, 5)
  .map((h) => ({
    id: h.id,
    title: h.title,
    groupName: h.groupName,
    dueDate: h.dueDate,
  }));

const _demoParentId = "p1";
const _demoParentChildren = students.filter((s) =>
  s.parentIds.includes(_demoParentId),
);

function lastAttendanceFor(studentId: string): "present" | "absent" | "late" | "excused" {
  for (let i = attendanceSessions.length - 1; i >= 0; i--) {
    const r = (attendanceSessions[i].records ?? []).find(
      (x) => x.studentId === studentId,
    );
    if (r) return r.status as "present" | "absent" | "late" | "excused";
  }
  return "present";
}

export const parentChildren = _demoParentChildren.map((c) => ({
  id: c.id,
  fullName: c.fullName,
  groups: c.groups.length,
  lastAttendance: lastAttendanceFor(c.id),
}));

const _demoStudent = students.find((s) => s.id === "s1") ?? students[0];

const _studentRecords = attendanceSessions
  .flatMap((s) => (s.records ?? []).map((r) => ({ ...r, sessionId: s.id })))
  .filter((r) => r.studentId === _demoStudent.id);
const _studentPresent = _studentRecords.filter(
  (r) => r.status === "present",
).length;

export const studentInfo = {
  fullName: _demoStudent.fullName,
  sessionsCount: _studentRecords.length,
  attendanceRate:
    _studentRecords.length === 0
      ? 0
      : Math.round((_studentPresent / _studentRecords.length) * 100),
};

export const studentGroups = groups
  .filter((g) => _demoStudent.groups.includes(g.id))
  .map((g) => ({ id: g.id, name: g.name, description: g.description }));

const _today = new Date("2026-05-22").getTime();
export const studentHomework = homeworkAssignments
  .filter(
    (h) =>
      _demoStudent.groups.includes(h.groupId) &&
      (h.audience === "group" ||
        (h as { targetStudents?: string[] }).targetStudents?.includes(
          _demoStudent.id,
        )),
  )
  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  .map((h) => {
    const due = new Date(h.dueDate).getTime();
    const days = (due - _today) / (24 * 60 * 60 * 1000);
    let urgency: "overdue" | "soon" | null = null;
    if (days < 0) urgency = "overdue";
    else if (days <= 3) urgency = "soon";
    return {
      id: h.id,
      title: h.title,
      groupName: h.groupName,
      dueDate: h.dueDate,
      urgency,
    };
  });
