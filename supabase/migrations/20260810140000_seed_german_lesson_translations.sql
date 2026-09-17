-- Migration: German translations for all 29 Bosnian Ilmihal lessons
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

    -- Translation: E'ūzubillāh und Bismillāh (Lesson 1)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'E''uzubila i Bismila',
      'E''ūzubillāh und Bismillāh',
      jsonb_build_array(
        pg_temp.bn_h('E''ūzubillāh', 2),
        pg_temp.bn_p('Die ersten Worte, die wir lernen, lauten:'),
        pg_temp.bn_h('E''ŪZUBILLĀHI MINEŠ-ŠEJTĀNIR-RADŽĪM', 3),
        pg_temp.bn_p('Diese Worte bedeuten: „Ich nehme Zuflucht bei Allah vor dem verfluchten Schaytan (Teufel).”'),
        pg_temp.bn_p('Wir sprechen diese Worte:'),
        pg_temp.bn_bullet('damit wir in Sicherheit und geschützt sind'),
        pg_temp.bn_bullet('damit wir leicht und gut lernen'),
        pg_temp.bn_bullet('damit wir fröhlich und sicher spielen'),
        pg_temp.bn_bullet('damit wir ruhig schlafen und schöne Träume haben'),
        pg_temp.bn_h('Bismillāh', 2),
        pg_temp.bn_p('Mit welchen Worten beginnen wir jede gute Tat? Es sind die Worte, die jeder Muslim und jede Muslima kennen sollte:'),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p('Lernen wir die Bedeutung dieser Worte: „Im Namen Allahs, des Allerbarmers, des Barmherzigen!”'),
        pg_temp.bn_h('Wann sprechen wir E''ūzubillāh und Bismillāh?', 2),
        pg_temp.bn_bullet('Wenn wir essen und trinken'),
        pg_temp.bn_bullet('Wenn wir lernen und lesen'),
        pg_temp.bn_bullet('Wenn wir Fahrrad fahren'),
        pg_temp.bn_bullet('Wenn wir ins Auto einsteigen'),
        pg_temp.bn_bullet('Wenn wir das Haus betreten'),
        pg_temp.bn_bullet('Wenn wir schlafen gehen'),
        pg_temp.bn_bullet('Vor dem Spielen'),
        pg_temp.bn_bullet('Wenn wir unsere Kleidung anziehen'),
        pg_temp.bn_p('Darüber hinaus sprechen wir E''ūzubillāh und Bismillāh in vielen weiteren Lebenslagen. Frage deinen Muallim (Lehrer), wann man sie noch spricht.')
      ),
      v_admin_id
    );

    -- Translation: Der Mensch ist Allahs schönste Schöpfung (Lesson 2)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Čovjek je najljepše Allahovo stvorenje',
      'Der Mensch ist Allahs schönste Schöpfung',
      jsonb_build_array(
        pg_temp.bn_h('Der Mensch ist Allahs schönste Schöpfung', 2),
        pg_temp.bn_p('Allah, der Erhabene, hat die gesamte Welt erschaffen:'),
        pg_temp.bn_bullet('Den Menschen'),
        pg_temp.bn_bullet('Die Pflanzen'),
        pg_temp.bn_bullet('Die Tiere'),
        pg_temp.bn_bullet('Die Erde'),
        pg_temp.bn_bullet('Den Himmel'),
        pg_temp.bn_bullet('Das Weltall'),
        pg_temp.bn_p('Im Heiligen Koran spricht Allah der Erhabene:'),
        pg_temp.bn_h('„Wahrlich, Wir haben den Menschen in schönster Gestalt erschaffen.”', 3),
        pg_temp.bn_p('(Koran, Sure At-Tin, Vers 4)')
      ),
      v_admin_id
    );

    -- Translation: Ich gehe in die Mekteb & Bittgebete zum Anfang (Lesson 3)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Ja u mekteb idem i dove za početak',
      'Ich gehe in die Mekteb & Bittgebete zum Anfang',
      jsonb_build_array(
        pg_temp.bn_h('Ich gehe in die Mekteb', 2),
        pg_temp.bn_p('Die Mekteb ist eine kleine Schule bei oder in der Moschee. In der Mekteb spielen wir und lernen:'),
        pg_temp.bn_bullet('über den islamischen Glauben'),
        pg_temp.bn_bullet('über die islamischen Pflichten'),
        pg_temp.bn_bullet('über das islamische Verhalten und Benehmen'),
        pg_temp.bn_h('Was wir in die Mekteb mitbringen:', 3),
        pg_temp.bn_bullet('Ilmihal (Lehrbuch)'),
        pg_temp.bn_bullet('Heft'),
        pg_temp.bn_bullet('Bleistift'),
        pg_temp.bn_bullet('Radiergummi'),
        pg_temp.bn_bullet('Rucksack / Schultasche'),
        pg_temp.bn_h('Bittgebete für einen gesegneten Anfang', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_h('RABBI JESSIR VE LĀ TUASSIR, RABBI TEMMIM BIL-HAJR. ĀMĪN.', 3),
        pg_temp.bn_p('O mein Herr, schenke Erleichterung und erschwere nicht. O mein Herr, vollende es mit dem Guten. Amin!'),
        pg_temp.bn_h('RABBI ZIDNĪ ILMĀ', 3),
        pg_temp.bn_p('Mein Herr, vermehre mein Wissen!'),
        pg_temp.bn_h('Gedicht: Mirza eilt zum Unterricht', 3),
        pg_temp.bn_p(E'Ein glücklicher Tag ist erwacht,\nMirza geht freudig und lacht.\nEr hüpft vergnügt – jeder kann es seh''n,\nzur Mekteb sieht man Mirza geh''n.\n\nIn seiner Hand die kleine Tasche,\ndarin das Heft und die Mappe,\nund das Lehrbuch Ilmihal,\nsein erstes Wort: Bismillāh.\n\n(R. Kadić)')
      ),
      v_admin_id
    );

    -- Translation: Die Religion Islam und das Glaubensbekenntnis (Shahada) (Lesson 4)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Vjera islam i Kelime-i-šehadet',
      'Die Religion Islam und das Glaubensbekenntnis (Shahada)',
      jsonb_build_array(
        pg_temp.bn_h('Die Religion Islam', 2),
        pg_temp.bn_p('Unsere Religion heißt Islam.'),
        pg_temp.bn_h('Was ist der Islam?', 3),
        pg_temp.bn_p('Der Islam ist die Religion, die Allah, der Erhabene, durch Seinen Gesandten Muhammad, Friede sei mit ihm, der gesamten Menschheit offenbart hat.'),
        pg_temp.bn_h('Was bedeutet Islam?', 3),
        pg_temp.bn_p('Islam bedeutet Ergebung und Hingabe an Allah, den Erhabenen.'),
        pg_temp.bn_h('Worin besteht die Hingabe an Allah?', 3),
        pg_temp.bn_p('Muslime glauben an Allah, erfüllen die religiösen Pflichten und Gebote und tun das Gute. Sie verhalten sich vorbildlich, sprechen die Wahrheit und helfen ihren Mitmenschen.'),
        pg_temp.bn_p(E'„Der Islam ist wie das Sonnenlicht,\nwenn er einmal dein Herz berührt,\nliebst du die ganze Welt,\nund Hass in dir verfällt.”\n(R. Kadić)'),
        pg_temp.bn_h('Kalima ash-Shahada (Das Glaubensbekenntnis)', 2),
        pg_temp.bn_p('Mit der Shahada bezeugen wir, dass wir Muslime sind.'),
        pg_temp.bn_h('Wie lautet das Glaubensbekenntnis?', 3),
        pg_temp.bn_h('EŠHEDU EN LĀ ILĀHE ILLALLĀH, VE EŠHEDU ENNE MUHAMMEDEN ''ABDUHŪ VE RESŪLUHŪ.', 3),
        pg_temp.bn_p('Übersetzung: „Ich bezeuge, dass es keinen Gott gibt außer Allah, und ich bezeuge, dass Muhammad Sein Diener und Gesandter ist!”')
      ),
      v_admin_id
    );

    -- Translation: Salam — Der islamische Friedensgruß (Lesson 5)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Selam — Islamski pozdrav',
      'Salam — Der islamische Friedensgruß',
      jsonb_build_array(
        pg_temp.bn_h('Salam — Der islamische Friedensgruß', 2),
        pg_temp.bn_p('Der Salam ist der gegenseitige Gruß der Muslime.'),
        pg_temp.bn_h('Wie grüßt und erwidert man den Salam?', 3),
        pg_temp.bn_p(E'Gruß: As-salāmu ''alejkum!\nAntwort: Ve ''alejkumus-selām!'),
        pg_temp.bn_p('Bedeutung: Friede und Heil sei mit euch!'),
        pg_temp.bn_p(E'„As-salāmu ''alejkum erschallt von allen Seiten,\nSalam, Friedensgruß möge uns stets begleiten.”'),
        pg_temp.bn_h('Wann und wem entbieten wir den Salam?', 3),
        pg_temp.bn_bullet('Beim Betreten und Verlassen des Hauses'),
        pg_temp.bn_bullet('Wenn wir Muslime auf der Straße treffen'),
        pg_temp.bn_bullet('Jüngere grüßen ältere Personen zuerst'),
        pg_temp.bn_bullet('Männer entbieten zuerst den Gruß'),
        pg_temp.bn_bullet('Beim Hinzukommen zu einer Gruppe oder beim Verabschieden'),
        pg_temp.bn_p('Übe mit deinem Muallim spielerisch den Friedensgruß in verschiedenen Alltagssituationen!')
      ),
      v_admin_id
    );

    -- Translation: Reinheit und Hygiene im Islam (Lesson 6)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Čistoća u islamu',
      'Reinheit und Hygiene im Islam',
      jsonb_build_array(
        pg_temp.bn_h('Reinheit (Taharah)', 2),
        pg_temp.bn_p('Reinheit ist die halbe Gesundheit. Deshalb achten wir stets auf die Hygiene unseres Körpers und unserer Kleidung.'),
        pg_temp.bn_p('Wasser ist eine große Gabe Allahs an die Menschen, die wir zum Trinken, Kochen, Waschen des Körpers und der Kleidung nutzen.'),
        pg_temp.bn_p('Allah liebt Ordnung und Reinlichkeit, und Muslime sollten stets sauber und gepflegt sein.'),
        pg_temp.bn_p('Der Prophet Muhammad, Friede sei mit ihm, sagte: „Die Reinheit ist ein Teil des Glaubens.”'),
        pg_temp.bn_h('Zur persönlichen Hygiene gehört:', 3),
        pg_temp.bn_bullet('Händewaschen vor und nach dem Essen'),
        pg_temp.bn_bullet('Regelmäßiges Baden und Duschen'),
        pg_temp.bn_bullet('Regelmäßiges Zähneputzen'),
        pg_temp.bn_bullet('Regelmäßiges Schneiden der Fingernägel')
      ),
      v_admin_id
    );

    -- Translation: Das Wasser ist eine Gabe Allahs (Lesson 7)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Voda je Allahov dar',
      'Das Wasser ist eine Gabe Allahs',
      jsonb_build_array(
        pg_temp.bn_h('Das Wasser ist eine Gabe Allahs', 2),
        pg_temp.bn_p('Ein gewöhnlicher Sommertag. Sejid spielte mit anderen Kindern im Hof der Moschee. Er unterbrach das Spiel und rannte ins Haus:'),
        pg_temp.bn_p('„Mutter, ich habe Durst, kann ich ein Glas Wasser bekommen?”'),
        pg_temp.bn_p('Nachdem er getrunken und gedankt hatte, fragte er:'),
        pg_temp.bn_p('„Schenkt uns Allah auch das Wasser? Wie herrlich es ist, wenn der Durst gestillt ist. So fühlen sich doch sicher alle?”'),
        pg_temp.bn_p('„Ja, Sejid. Damit der Mensch seine Bedürfnisse stillen kann, schenkt Allah ihm das Wasser, welches der Ursprung allen Lebens ist.”'),
        pg_temp.bn_p('„Gibt Er auch meinem Kätzchen Wasser?”, fragte er. Die Mutter nickte bejahend.'),
        pg_temp.bn_p('„Und den Vögeln, Hasen, Lämmern und anderen Tieren?”'),
        pg_temp.bn_p('„Ja, Sejid. Allah hat allen Geschöpfen Wasser geschenkt, um ihren Durst zu stillen: den Pflanzen, den Bäumen und allem Lebendigen. Allem, was auf Wasser angewiesen ist, gibt Er Wasser.”'),
        pg_temp.bn_p('„Regnet es deshalb?”, fragte Sejid. „Wenn es regnet, kann ich zwar nicht draußen spielen, aber jetzt weiß ich, dass sich die Erde und die Pflanzen über den Regen freuen.”'),
        pg_temp.bn_p('Die Mutter streichelte ihm über den Kopf und sagte:'),
        pg_temp.bn_p('„Ja, mein Sohn, du hast recht, sie lieben den Regen. Schau in den Himmel: Siehst du die dichten Wolken? Sie bringen den Regen. Schau, schon fallen die ersten Tropfen. Hilfst du mir, die Fenster zu schließen?”'),
        pg_temp.bn_p('Der Junge half fröhlich und sagte:'),
        pg_temp.bn_p('„Mutter, der Regen wird lange fallen und alle Pflanzen trinken. Und was geschieht mit dem Wasser auf der Erde?”'),
        pg_temp.bn_p('„Ein Teil sammelt sich in Quellen. Von dort wird das saubere Wasser in die Wasserleitungen geführt, die es in unsere Häuser bringen.”'),
        pg_temp.bn_p('Da rief Sejid:'),
        pg_temp.bn_p('„Ohne Wasser könnte ich mich gar nicht waschen! Mutter, wie wichtig das Wasser für alle ist! Allah, unser Herr, ist wahrhaft großzügig, dass Er uns Wasser schenkt!”'),
        pg_temp.bn_p('Wasser ist eine wunderbare Gabe Allahs!')
      ),
      v_admin_id
    );

    -- Translation: Der Vorzug der rechten Seite im Islam (Lesson 8)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Desna strana u islamu',
      'Der Vorzug der rechten Seite im Islam',
      jsonb_build_array(
        pg_temp.bn_h('Die rechte Seite', 2),
        pg_temp.bn_p('Der Islam gibt der rechten Seite den Vorzug. Deshalb verrichten wir alle schönen und guten Dinge mit der rechten Hand und dem rechten Fuß:'),
        pg_temp.bn_bullet('Mit der rechten Hand essen und trinken'),
        pg_temp.bn_bullet('Zuerst den rechten Ärmel anziehen'),
        pg_temp.bn_bullet('Zuerst den rechten Schuh anziehen'),
        pg_temp.bn_bullet('Auf der rechten Seite schlafen'),
        pg_temp.bn_bullet('Mit dem rechten Fuß ins Haus und in die Moschee eintreten'),
        pg_temp.bn_bullet('Mit dem linken Fuß aus dem Haus hinaustreten')
      ),
      v_admin_id
    );

    -- Translation: Essen und Trinken — Halal und Haram (Lesson 9)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Hrana i piće — Halal i haram',
      'Essen und Trinken — Halal und Haram',
      jsonb_build_array(
        pg_temp.bn_h('Essen und Trinken', 2),
        pg_temp.bn_p('Allah, der Erhabene, hat den Menschen erschaffen und ihm Nahrung geschenkt. Er hat ihm alle guten, reinen Speisen und Getränke erlaubt (Halal) und schädliche Dinge verboten (Haram).'),
        pg_temp.bn_h('Was HALAL (erlaubt) ist:', 3),
        pg_temp.bn_bullet('Hase, Schaf, Rind, Huhn, Fisch'),
        pg_temp.bn_bullet('Obst, Gemüse, Getreide und Milchprodukte'),
        pg_temp.bn_h('Was HARAM (verboten) ist:', 3),
        pg_temp.bn_bullet('Schweinefleisch und Schweineerzeugnisse'),
        pg_temp.bn_bullet('Hund, Raubvögel, Frösche und Fleisch von Raubtieren'),
        pg_temp.bn_bullet('Alkohol und berauschende Getränke'),
        pg_temp.bn_h('Verhaltensregeln beim Essen und Trinken:', 3),
        pg_temp.bn_bullet('Vor und nach dem Essen die Hände waschen'),
        pg_temp.bn_bullet('Vor dem Essen Bismillāh sagen und mit der rechten Hand essen'),
        pg_temp.bn_bullet('Keine zu heißen Speisen essen'),
        pg_temp.bn_bullet('Gemeinsam mit der Familie speisen'),
        pg_temp.bn_bullet('Nach dem Essen Allah mit „Al-hamdu lillāh” danken'),
        pg_temp.bn_bullet('Nach der Mahlzeit den Tisch abräumen'),
        pg_temp.bn_bullet('Nach dem Essen die Zähne putzen')
      ),
      v_admin_id
    );

    -- Translation: Subhanaka-Gebet und Dankbarkeit gegenüber Allah (Lesson 10)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Subhaneke i zahvalnost Allahu',
      'Subhanaka-Gebet und Dankbarkeit gegenüber Allah',
      jsonb_build_array(
        pg_temp.bn_h('Das Subhanaka-Gebet', 2),
        pg_temp.bn_p('Wir lobpreisen und danken Allah mit dem Subhanaka-Bittgebet:'),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_h('SUBHĀNEKE ALLĀHUMME VE BI HAMDIKE, VE TEBĀREKESMUKE, VE TE''ĀLĀ DŽEDDUKE, VE LĀ ILĀHE GAJRUKE.', 3),
        pg_temp.bn_p('Übersetzung: „Gepriesen seist Du, o Allah, und Dein ist das Lob, gesegnet ist Dein Name, erhaben ist Deine Majestät, und es gibt keinen Gott außer Dir.”'),
        pg_temp.bn_h('Wir sollten Allah stets dankbar sein', 2),
        pg_temp.bn_p('Sejid machte mit seinem Vater einen Spaziergang. Als sie zurückkamen, rannte er ins Haus und umarmte seine Mutter:'),
        pg_temp.bn_p('„Mutter, was ich alles gesehen habe: kleine Vögel, Kätzchen, Küken und so vieles mehr!”'),
        pg_temp.bn_p('„Mein Sohn, ich freue mich, dass es dir so gefallen hat.”'),
        pg_temp.bn_p('„Ich hatte noch nie so viel Freude.”'),
        pg_temp.bn_p('„Dein Gesicht strahlt vor Glück”, sagte die Mutter.'),
        pg_temp.bn_p('Der Junge setzte sich neben sie: „Mutter, welch eine schöne Welt Allah uns geschenkt hat!”'),
        pg_temp.bn_p('„Ja, mein Sohn, Allah hat wahrhaftig eine wunderschöne Welt erschaffen.”'),
        pg_temp.bn_p('„Dann müssen wir auch zu jenen gehören, die auf dem rechten Weg sind, und so unsere Dankbarkeit zeigen!”'),
        pg_temp.bn_p('„Sejid, ich stimme dir vollkommen zu. Wir sind beauftragt, diese Schönheit zu bewahren, die Allah uns anvertraut hat. Durch unsere guten Taten müssen wir zeigen, dass wir gute Diener unseres Schöpfers sind.”'),
        pg_temp.bn_p('„Wenn ihr dankbar seid, so werde Ich euch gewiss noch mehr geben; seid ihr aber undankbar, so ist Meine Strafe wahrlich streng.” (Koran, Sure Ibrahim, Vers 7)')
      ),
      v_admin_id
    );

    -- Translation: Sure Al-Fatiha (Die Eröffnende) (Lesson 11)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Sura El-Fatiha',
      'Sure Al-Fatiha (Die Eröffnende)',
      jsonb_build_array(
        pg_temp.bn_h('Sure Al-Fatiha', 2),
        pg_temp.bn_p('Al-Fatiha ist die erste Sure im Heiligen Koran.'),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'EL-HAMDU LILLĀHI RABBIL-''ĀLEMĪN.\nER-RAHMĀNIR-RAHĪM.\nMĀLIKI JEVMID-DĪN.\nIJJĀKE N''ABUDU VE IJJĀKE NESTE''ĪN.\nIHDINES-SIRĀTAL-MUSTEKĪM.\nSIRĀTALLEZĪNE EN''AMTE ''ALEJHIM,\nGAJRIL-MAGDŪBI ''ALEJHIM VE LED-DĀLLĪN. ĀMĪN!'),
        pg_temp.bn_h('Bedeutung:', 3),
        pg_temp.bn_p(E'Alles Lob gebührt Allah, dem Herrn der Welten,\ndem Allerbarmer, dem Barmherzigen,\ndem Herrscher am Tage des Gerichts.\nDir allein dienen wir, und Dich allein bitten wir um Hilfe.\nFühre uns den geraden Weg,\nden Weg derer, denen Du Gnade erwiesen hast,\nnicht derer, die Deinen Zorn erregt haben, und nicht der Irregehenden. Amin!'),
        pg_temp.bn_p(E'„Al-Fatiha ist die erste Sure des Korans,\nsie nährt die Seele des gläubigen Muslims,\njeder Gläubige möge diese Sure lernen\nund sich Allahs Rechtleitung zuwenden.”')
      ),
      v_admin_id
    );

    -- Translation: Wiederholung — Einführungsteil (Lesson 12)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Ponavljanje gradiva — Uvodni dio',
      'Wiederholung — Einführungsteil',
      jsonb_build_array(
        pg_temp.bn_h('Wiederholung ist die Mutter des Wissens', 2),
        pg_temp.bn_p('Bisher haben wir gelernt: E''ūzubillāh, Bismillāh, Rabbi yassir, Shahada, Subhanaka und Al-Fatiha. Überprüfe dein Wissen:'),
        pg_temp.bn_num('Rezitierte E''ūzubillāh!'),
        pg_temp.bn_num('Rezitierte Bismillāh!'),
        pg_temp.bn_num('Womit beginnen wir jede gute Handlung?'),
        pg_temp.bn_num('Wer ist Allahs schönste Schöpfung?'),
        pg_temp.bn_num('Was lernen wir in der Mekteb?'),
        pg_temp.bn_num('Rezitierte das Bittgebet Rabbi yassir!'),
        pg_temp.bn_num('Wie heißt unsere Religion?'),
        pg_temp.bn_num('Was bedeutet Islam?'),
        pg_temp.bn_num('Womit bezeugen wir unsere Zugehörigkeit zum Islam?'),
        pg_temp.bn_num('Wie lautet das Glaubensbekenntnis (Kalima ash-Shahada)?'),
        pg_temp.bn_num('Wie heißt der islamische Friedensgruß?'),
        pg_temp.bn_num('Wie grüßt man und wie erwidert man den Friedensgruß?'),
        pg_temp.bn_num('Wem gebührt unser Dank?'),
        pg_temp.bn_num('Wie danken wir Allah, dem Erhabenen?'),
        pg_temp.bn_num('Wie lautet die erste Sure im Koran?')
      ),
      v_admin_id
    );

    -- Translation: Übersicht der 33 Pflichtbedingungen im Islam (Lesson 13)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Pregled 33 šarta — Uvjeta u islamu',
      'Übersicht der 33 Pflichtbedingungen im Islam',
      jsonb_build_array(
        pg_temp.bn_h('Übersicht der 33 Pflichtbedingungen im Islam', 2),
        pg_temp.bn_p('Es gibt nur einen einzigen Gott. Er ist der Schöpfer und Erhalter aller Welten. Er hat den Menschen in bester Gestalt erschaffen und ihm den Verstand geschenkt. Der Verstand folgt der göttlichen Rechtleitung und fügt sich Seinem Willen.'),
        pg_temp.bn_p('Das Fundament des Islam ist das Glaubensbekenntnis (Shahada). Es genügt jedoch nicht nur zu glauben, sondern die Pflichten müssen auch in die Tat umgesetzt werden.'),
        pg_temp.bn_h('Der Islam ruht auf 33 Bedingungen:', 3),
        pg_temp.bn_h('Glaubensartikel (6 Iman-Bedingungen):', 3),
        pg_temp.bn_num('Āmantu billāhi (Ich glaube an Allah)'),
        pg_temp.bn_num('Wa malā''ikatihī (Ich glaube an Seine Engel)'),
        pg_temp.bn_num('Wa kutubihī (Ich glaube an Seine Bücher / Offenbarungen)'),
        pg_temp.bn_num('Wa rusulihī (Ich glaube an Seine Gesandten)'),
        pg_temp.bn_num('Wal-yawmil-ākhiri (Ich glaube an den Jüngsten Tag)'),
        pg_temp.bn_num('Wa bil-qadari khayrihī wa šarrihī minallāhi ta''ālā (Ich glaube an die göttliche Vorherbestimmung – dass alles Gute und Schwere durch Allahs Willen geschieht)'),
        pg_temp.bn_h('Säulen des Islam (5 Pflichten):', 3),
        pg_temp.bn_num('Kalima ash-Shahada (Bezeugung des Glaubens)'),
        pg_temp.bn_num('Das tägliche Gebet (Salah) verrichten'),
        pg_temp.bn_num('Im Monat Ramadan fasten (Sawm)'),
        pg_temp.bn_num('Die Zakat-Abgabe entrichten'),
        pg_temp.bn_num('Die Pilgerfahrt (Hadsch) vollziehen'),
        pg_temp.bn_h('Wudhu-Pflichten (4 Waschungsbedingungen):', 3),
        pg_temp.bn_num('Das Gesicht waschen'),
        pg_temp.bn_num('Beide Arme bis einschließlich der Ellbogen waschen'),
        pg_temp.bn_num('Über ein Viertel des Kopfes mit feuchten Händen streichen (Masah)'),
        pg_temp.bn_num('Beide Füße bis einschließlich der Knöchel waschen'),
        pg_temp.bn_h('Ghusl-Pflichten (3 Ganzwaschungsbedingungen):', 3),
        pg_temp.bn_num('Den Mund gründlich ausspülen'),
        pg_temp.bn_num('Die Nase gründlich ausspülen'),
        pg_temp.bn_num('Den gesamten Körper vollständig waschen'),
        pg_temp.bn_h('Tayammum-Bedingungen (2 Schritte der Trockenreinigung):', 3),
        pg_temp.bn_num('Die Absicht (Niyyah) fassen'),
        pg_temp.bn_num('Mit den Handflächen auf reine Erde schlagen und das Gesicht abstreichen; erneut aufschlagen und beide Arme bis zu den Ellbogen abstreichen'),
        pg_temp.bn_h('Gebetsbedingungen vor dem Gebet (6 Voraussetzungen):', 3),
        pg_temp.bn_num('Reinheit des Körpers, der Kleidung und des Gebetsplatzes'),
        pg_temp.bn_num('Die rituelle Gebetswaschung (Wudhu) vollziehen'),
        pg_temp.bn_num('Vorschriftsmäßige Kleidung tragen (die Blöße bedecken)'),
        pg_temp.bn_num('Zur vorgeschriebenen Gebetszeit beten'),
        pg_temp.bn_num('Sich in Richtung der Qibla (Mekka) wenden'),
        pg_temp.bn_num('Die Absicht (Niyyah) für das jeweilige Gebet fassen'),
        pg_temp.bn_h('Gebetssäulen während des Gebets (6 Pfeiler):', 3),
        pg_temp.bn_num('Iftitah-Takbir (Eröffnungs-Takbir: Allāhu Akbar)'),
        pg_temp.bn_num('Qiyam (Stehen im Gebet)'),
        pg_temp.bn_num('Qira''at (Rezitieren aus dem Koran)'),
        pg_temp.bn_num('Ruku'' (Die Verbeugung)'),
        pg_temp.bn_num('Sadschda (Die Niederwerfung)'),
        pg_temp.bn_num('Qa''da Akhira (Das abschließende Sitzen im Gebet)')
      ),
      v_admin_id
    );

    -- Translation: Die Glaubensartikel (Iman) — Das islamische Glaubensbekenntnis (Lesson 14)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Imanski šarti — Islamsko vjerovanje',
      'Die Glaubensartikel (Iman) — Das islamische Glaubensbekenntnis',
      jsonb_build_array(
        pg_temp.bn_h('Die Glaubensartikel des Islam', 2),
        pg_temp.bn_p('Der islamische Glaube (Iman) besteht aus sechs grundlegenden Glaubensartikeln:'),
        pg_temp.bn_num('ĀMANTU BILLĀHI — Ich glaube an Allah'),
        pg_temp.bn_num('WA MALĀ''IKATIHĪ — Und ich glaube an Seine Engel'),
        pg_temp.bn_num('WA KUTUBIHĪ — Und ich glaube an Seine Bücher'),
        pg_temp.bn_num('WA RUSULIHĪ — Und ich glaube an Seine Gesandten'),
        pg_temp.bn_num('WAL-YAWMIL-ĀKHIRI — Und ich glaube an den Jüngsten Tag'),
        pg_temp.bn_num('WA BIL-QADARI KHAYRIHĪ WA ŠARRIHĪ MINALLĀHI TA''ĀLĀ — Und ich glaube an die Vorherbestimmung, dass alles Gute und Übel nach Allahs Willen und Bestimmung geschieht'),
        pg_temp.bn_h('Verse über die Glaubensartikel', 3),
        pg_temp.bn_p(E'ĀMANTU BILLĀHI:\nIch glaube an den einen Gott,\nder jeden Diener erschaffen hat.\nEr schuf das gesamte Universum,\ndass es Ihn allein preist.\n\nWA MALĀ''IKATIHĪ:\nUnd ich glaube an alle Engel,\nohne Sünde und ohne Makel,\nso hat Gott sie erschaffen,\naus reinem Licht gewoben.\n\nWA KUTUBIHĪ:\nUnd ich glaube an die heiligen Bücher,\nes sind die Worte des Erhabenen.\nVier wurden auserwählt,\nim Koran bestätigt und bewahrt.\n\nWA RUSULIHĪ:\nUnd ich glaube an die Propheten,\nAllahs auserwählte Gesandte.\nSie brachten uns den Glauben,\nund lehrten uns jedes Gute.\n\nWAL-YAWMIL-ĀKHIRI:\nUnd ich glaube an den Jüngsten Tag,\nwenn die Taten auf der Waage wiegen.\nVor dem Feuer gilt es sich zu retten,\nund im Paradies Geborgenheit zu finden.\n\nWA BIL-QADARI KHAYRIHĪ WA ŠARRIHĪ MINALLĀHI TA''ĀLĀ:\nUnd ich glaube, dass alles was geschieht,\nwas stirbt und was geboren wird,\nwas die Nacht birgt und der Tag enthüllt,\ndurch Allahs Willen geschieht.\n\n(E. Nurović)'),
        pg_temp.bn_p('Jeder Muslim muss die Glaubensartikel kennen und von ganzem Herzen daran glauben.')
      ),
      v_admin_id
    );

    -- Translation: Der 1. Glaubensartikel: Glaube an Allah & Sure Al-Ikhlas (Lesson 15)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Prvi imanski šart: Āmentu billāhi i Sura Ihlas',
      'Der 1. Glaubensartikel: Glaube an Allah & Sure Al-Ikhlas',
      jsonb_build_array(
        pg_temp.bn_h('Der erste Glaubensartikel', 2),
        pg_temp.bn_h('ĀMANTU BILLĀHI — ICH GLAUBE AN ALLAH, DEN ERHABENEN', 3),
        pg_temp.bn_p('Wenn wir über die Welt um uns herum nachdenken, führt uns der Verstand zu der Gewissheit, dass es einen vollkommenen, allmächtigen Schöpfer geben muss, der alles erschaffen hat und alles lenkt. Das ist Allah, der Erhabene. Allah ist der Schöpfer und Herr über alles, was wir sehen und was wir nicht sehen.'),
        pg_temp.bn_p('Allah hat die Erde und den Himmel, die Pflanzen und die Tiere erschaffen. Und Er hat den Menschen in schönster Gestalt geschaffen.'),
        pg_temp.bn_p('Wenn wir Seinen Namen aussprechen, fügen wir hinzu: jalla shanuhu (dž.š.) – Erhaben ist Seine Majestät.'),
        pg_temp.bn_h('Sure Al-Ikhlas (Die Aufrichtigkeit)', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'KUL HUVALLĀHU EHAD.\nALLĀHUS-SAMED.\nLEM JELID VE LEM JŪLED\nVE LEM JEKUN LEHŪ KUFUVEN EHAD.'),
        pg_temp.bn_h('Übersetzung:', 3),
        pg_temp.bn_p(E'Sprich: „Er ist Allah, ein Einziger.\nAllah, der Absolute (von dem alles abhängt).\nEr zeugt nicht und ist nicht gezeugt worden,\nund niemand ist Ihm ebenbürtig.”')
      ),
      v_admin_id
    );

    -- Translation: Der 2. Glaubensartikel: Glaube an die Engel (Mala'ika) (Lesson 16)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Drugi imanski šart: Ve melāiketihī (Meleki)',
      'Der 2. Glaubensartikel: Glaube an die Engel (Mala''ika)',
      jsonb_build_array(
        pg_temp.bn_h('Der zweite Glaubensartikel', 2),
        pg_temp.bn_h('WA MALĀ''IKATIHĪ — ICH GLAUBE AN ALLAHS ENGEL', 3),
        pg_temp.bn_p('Engel sind vernunftbegabte, geistige, unsichtbare Wesen. Sie wurden aus Licht (Nur) erschaffen. Engel sündigen nicht; sie preisen und verherrlichen Allah unablässig. Sie dienen Allah ständig und haben feste Aufgaben. Sie sind weder männlich noch weiblich, sie essen und trinken nicht. Es gibt unzählige Engel, deren genaue Zahl nur Allah kennt.'),
        pg_temp.bn_h('Die bekanntesten Engel und ihre Aufgaben:', 3),
        pg_temp.bn_bullet('DŽIBRIL (GABRIEL): Überbrachte den Propheten die göttlichen Offenbarungen'),
        pg_temp.bn_bullet('AZRAIL (TODESENGEL): Trennt im Augenblick des Todes die Seele vom Körper'),
        pg_temp.bn_bullet('MIKAIL (MICHAEL): Verwaltet die Naturerscheinungen (Wind, Regen, Pflanzenwachstum)'),
        pg_temp.bn_bullet('ISRAFIL (RAPHAEL): Wird mit dem Stoß ins Horn den Weltuntergang und die Auferstehung ankündigen'),
        pg_temp.bn_bullet('KIRAMEN KATIBIN: Begleiten die Menschen und schreiben ihre guten und schlechten Taten auf'),
        pg_temp.bn_bullet('MUNKIR UND NEKIR: Befragen jeden Menschen im Grab'),
        pg_temp.bn_p('Außer den Engeln hat Allah auch andere unsichtbare Wesen erschaffen: die Dschinn und die Schayatine (Teufel). Der Schaytan bringt schlechte Gedanken und verleitet zum Bösen.'),
        pg_temp.bn_p('Zuflucht vor dem verfluchten Schaytan suchen wir bei Allah mit den Worten:'),
        pg_temp.bn_h('E''ŪZUBILLĀHI MINEŠ-ŠEJTĀNIR-RADŽĪM', 3),
        pg_temp.bn_p('Ich nehme Zuflucht bei Allah vor dem verfluchten Schaytan.')
      ),
      v_admin_id
    );

    -- Translation: Der 3. Glaubensartikel: Glaube an die göttlichen Bücher (Lesson 17)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Treći imanski šart: Ve kutubihī (Božije knjige)',
      'Der 3. Glaubensartikel: Glaube an die göttlichen Bücher',
      jsonb_build_array(
        pg_temp.bn_h('Der dritte Glaubensartikel', 2),
        pg_temp.bn_h('WA KUTUBIHĪ — ICH GLAUBE AN ALLAHS BÜCHER UND OFFENBARUNGEN', 3),
        pg_temp.bn_p('Allahs Bücher sind göttliche Offenbarungen, die der Engel Dschibril den Gesandten überbrachte, damit diese sie den Menschen verkünden und erklären. Die erste Offenbarung erging an den ersten Menschen, Adam (a.s.).'),
        pg_temp.bn_p('Alle Offenbarungen riefen die Menschen dazu auf, an den einen Gott zu glauben und Ihm zu dienen. Es wurden vier große Bücher sowie kleinere Schriftrollen (Suhuf) herabgesandt.'),
        pg_temp.bn_h('Die vier großen Offenbarungsbücher sind:', 3),
        pg_temp.bn_bullet('TEVRAT (THORA): Offenbart an Musa (Moses), Friede sei mit ihm'),
        pg_temp.bn_bullet('ZEBUR (PSALMEN): Offenbart an Davud (David), Friede sei mit ihm'),
        pg_temp.bn_bullet('INDŽIL (EVANGELIUM): Offenbart an Isa (Jesus), Friede sei mit ihm'),
        pg_temp.bn_bullet('KUR''AN (KORAN): Offenbart an Muhammed, Friede sei mit ihm'),
        pg_temp.bn_h('Der Heilige Koran (Kur''an-i Kerim)', 3),
        pg_temp.bn_p('Der Koran ist das letzte Buch Allahs, das durch den Propheten Muhammad (a.s.) der gesamten Menschheit offenbart wurde. Er enthält Wegweisungen, Ratschläge, Gebete und Lebensregeln. Er wurde auf Arabisch über einen Zeitraum von 23 Jahren herabgesandt und besteht aus 114 Suren.'),
        pg_temp.bn_p(E'„Es gibt kein besseres Buch als den Koran und keine schönere Religion als den Islam.\nIn ihm liegen weise Worte, die zu wahrem Glück führen.”')
      ),
      v_admin_id
    );

    -- Translation: Der 4. Glaubensartikel: Glaube an die Propheten und Gesandten (Lesson 18)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Četvrti imanski šart: Ve rusulihī (Božiji poslanici)',
      'Der 4. Glaubensartikel: Glaube an die Propheten und Gesandten',
      jsonb_build_array(
        pg_temp.bn_h('Der vierte Glaubensartikel', 2),
        pg_temp.bn_h('WA RUSULIHĪ — ICH GLAUBE AN ALLAHS GESANDTE', 3),
        pg_temp.bn_p('Propheten sind auserwählte Menschen, die Allah aus Seiner Barmherzigkeit zu den Menschen sandte, um ihnen Seine Offenbarung und Rechtleitung zu überbringen. Allah sandte jedem Volk Gesandte. Im Koran werden 25 Propheten namentlich erwähnt.'),
        pg_temp.bn_p('Der erste Mensch auf Erden war Adam (a.s.), der zugleich der erste Prophet war. Der letzte Prophet ist Muhammad (a.s.), nach dem bis zum Jüngsten Tag kein weiterer Prophet kommen wird.'),
        pg_temp.bn_h('Besonders herausragende Propheten sind:', 3),
        pg_temp.bn_num('Ādem / Adam (a.s.)'),
        pg_temp.bn_num('Nūh / Noah (a.s.)'),
        pg_temp.bn_num('Ibrāhīm / Abraham (a.s.)'),
        pg_temp.bn_num('Mūsā / Moses (a.s.)'),
        pg_temp.bn_num('Īsā / Jesus (a.s.)'),
        pg_temp.bn_num('Muhammed / Muhammad (a.s.)'),
        pg_temp.bn_p('Nach dem Namen eines Propheten sagen wir: ''alejhis-selām (a.s.) – Friede sei auf ihm.')
      ),
      v_admin_id
    );

    -- Translation: Muhammad (a.s.) — Der letzte Gesandte Allahs (Lesson 19)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Muhammed, a.s. — Posljednji Božiji poslanik',
      'Muhammad (a.s.) — Der letzte Gesandte Allahs',
      jsonb_build_array(
        pg_temp.bn_h('Muhammad, Friede sei mit ihm', 2),
        pg_temp.bn_p('Muhammed (a.s.) ist der letzte Gesandte Allahs. Er wurde im Jahr 571 n. Chr. in Mekka im Stamm Quraisch geboren. Sein Vater hieß Abdullah und seine Mutter Amina. Er verlor früh seine Eltern. Ab seinem sechsten Lebensjahr sorgte sein Großvater Abdulmuttalib für ihn, danach sein Onkel Ebu Talib.'),
        pg_temp.bn_p('Allah hat ihn zu Seinem Gesandten erwählt. Im Alter von vierzig Jahren empfing er in der Höhle Hira die erste Offenbarung und wurde zum Propheten berufen. Nach dreizehn Jahren wanderte er mit den Muslimen von Mekka nach Medina aus (Hidschra). Er verstarb im Alter von 63 Jahren in Medina (Medinetun-Nebijj).'),
        pg_temp.bn_p('Muhammed (a.s.) ist das beste Vorbild für die Menschen, wie man wahrhaftig glaubt und lebt.'),
        pg_temp.bn_h('Kasida: Ahmede Muhammede', 3),
        pg_temp.bn_p(E'Mein Herz empfindet Sehnsucht,\ndass es nicht die Ehre hatte,\nan deiner Seite zu verweilen,\no Ahmed, o Muhammed.\n\nDu bist Barmherzigkeit des Erbarmers,\nFreude meines Herzens,\nHeilung für jede Wunde,\no Ahmed, o Muhammed.\n\nMein Herz brennt voller Liebe,\nsehnt sich danach dich zu erblicken,\nunser geliebter Prophet,\no Ahmed, o Muhammed.\n\nMeiner Seele ist es ein Labsal,\nwenn sie dir Segenswünsche sendet,\nwenn sie deinen Namen nennt,\no Ahmed, o Muhammed.')
      ),
      v_admin_id
    );

    -- Translation: Der 5. Glaubensartikel: Glaube an den Jüngsten Tag & Sure Al-Kawthar (Lesson 20)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Peti imanski šart: Vel-jevmil-āhiri i Sura Kevser',
      'Der 5. Glaubensartikel: Glaube an den Jüngsten Tag & Sure Al-Kawthar',
      jsonb_build_array(
        pg_temp.bn_h('Der fünfte Glaubensartikel', 2),
        pg_temp.bn_h('WAL-JEVMIL-ĀHIRI — ICH GLAUBE AN DEN JÜNGSTEN TAG', 3),
        pg_temp.bn_p('Nach dem vergänglichen irdischen Leben werden alle Menschen für das ewige Jenseits (Ahirat) auferweckt. Am Jüngsten Tag werden alle Menschen über ihre Taten Rechenschaft ablegen.'),
        pg_temp.bn_p('Jedem Menschen wird sein Buch der guten und schlechten Taten vorgelegt, das von den Engeln Kiramen Katibin verfasst wurde.'),
        pg_temp.bn_p('Wer an Allah glaubte und Gutes tat, wird durch Seine Barmherzigkeit ins Paradies (Džennet) eingehen. Wann der Jüngste Tag eintrifft, weiß allein Allah.'),
        pg_temp.bn_h('Das Paradies (Džennet)', 3),
        pg_temp.bn_p('Das Paradies ist die ewige Wohnstätte im Jenseits, in der die Gläubigen in vollkommenem Glück und Frieden weilen.'),
        pg_temp.bn_h('Die Hölle (Džehennem)', 3),
        pg_temp.bn_p('Die Hölle ist die Stätte der Strafe im Jenseits für jene, die ungläubig und ungerecht waren, es sei denn, Allah erbarmt sich ihrer.'),
        pg_temp.bn_h('Sure Al-Kawthar (Die Fülle)', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'INNĀ E''ATAJNĀKEL-KEVSER,\nFE SALLI LI RABBIKE VEN-HAR,\nINNE ŠĀNI''EKE HUVEL-EBTER.'),
        pg_temp.bn_h('Übersetzung:', 3),
        pg_temp.bn_p(E'Wahrlich, Wir haben dir die Fülle (an Gutem) gegeben.\nSo bete zu deinem Herrn und opfere.\nGewiss, derjenige, der dich hasst, ist vom Guten abgeschnitten.')
      ),
      v_admin_id
    );

    -- Translation: Der 6. Glaubensartikel: Die göttliche Vorherbestimmung (Kader) (Lesson 21)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Šesti imanski šart: Ve bil-kaderi (Kader) i pjesma',
      'Der 6. Glaubensartikel: Die göttliche Vorherbestimmung (Kader)',
      jsonb_build_array(
        pg_temp.bn_h('Der sechste Glaubensartikel', 2),
        pg_temp.bn_h('VE BIL-KADERI HAJRIHĪ VE ŠERRIHĪ MINELLĀHI TE''ĀLA', 3),
        pg_temp.bn_p('Ich glaube, dass alles, was geschieht – Gutes wie Schweres –, nach Allahs Willen und göttlicher Vorherbestimmung geschieht.'),
        pg_temp.bn_p('Allah ist der Schöpfer aller Dinge. Was Allah will, geschieht, und was Er nicht will, kann niemals geschehen.'),
        pg_temp.bn_p('Allah hat dem Menschen Verstand und freien Willen verliehen, damit er sich für das Gute entscheidet. Im Unglück soll der Gläubige geduldig und standhaft bleiben. Allah weiß alles, was war, was ist und was sein wird.'),
        pg_temp.bn_h('Gedicht: Suche deinen Herrn', 3),
        pg_temp.bn_p(E'Allāh, Allāh, huve Rabbunā, Lā ilāhe illallāh.\n\nSuche deinen Herrn im Gebet,\nSein Gedenken dir Kraft verleiht,\nwirst immer stärker Tag für Tag,\nLā ilāhe illallāh.\n\nLass das Gebet niemals vergeh''n,\nden Pfeiler des Glaubens aufrecht steh''n,\nalles Gute und Schwere ein Ende hat,\nLā ilāhe illallāh.\n\nAllah ist Einer, Er ist die Wahrheit,\ndies bezeugt jeder in Klarheit,\nLā ilāhe illallāh.\n\nO Muslim, sei wachsam und rein,\nlies den Koran und präg ihn dir ein,\nversäume das Morgengebet nicht,\nLā ilāhe illallāh.')
      ),
      v_admin_id
    );

    -- Translation: Wiederholung — Die Glaubensartikel (Iman) (Lesson 22)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Ponavljanje gradiva — Imanski šarti',
      'Wiederholung — Die Glaubensartikel (Iman)',
      jsonb_build_array(
        pg_temp.bn_h('Wiederholung ist die Mutter des Wissens', 2),
        pg_temp.bn_p('Überprüfe dein Wissen über die Glaubensartikel:'),
        pg_temp.bn_num('Wie viele Pflichtbedingungen (Schurut) gibt es insgesamt im Islam?'),
        pg_temp.bn_num('Wie lautet der erste Glaubensartikel?'),
        pg_temp.bn_num('Was bedeutet Āmantu billāh?'),
        pg_temp.bn_num('Was bedeutet Ve rusulihī?'),
        pg_temp.bn_num('Rezitierte Sure Al-Ikhlas!'),
        pg_temp.bn_num('Welche sind die bekanntesten Engel?'),
        pg_temp.bn_num('Wie heißt der Engel, der die göttlichen Offenbarungen überbrachte?'),
        pg_temp.bn_num('Was ist die Aufgabe der Engel Kiramen Katibin?'),
        pg_temp.bn_num('Nenne die vier großen Offenbarungsbücher!'),
        pg_temp.bn_num('Welches Buch wurde dem Propheten Isa (Jesus) offenbart?'),
        pg_temp.bn_num('Was bedeutet ''alejhis-selām (a.s.)?'),
        pg_temp.bn_num('Welches ist das letzte Buch Allahs?'),
        pg_temp.bn_num('Wie viele Suren hat der Koran?'),
        pg_temp.bn_num('Wie viele Propheten werden im Koran namentlich genannt?'),
        pg_temp.bn_num('Wer war der erste Mensch und der erste Prophet?'),
        pg_temp.bn_num('Wer ist der letzte Gesandte Allahs?'),
        pg_temp.bn_num('Wann wurde der Prophet Muhammed (a.s.) geboren?'),
        pg_temp.bn_num('In welchem Lebensjahr erhielt der Prophet die erste Offenbarung?'),
        pg_temp.bn_num('Rezitierte das Gedicht / Nasheed über den Propheten!'),
        pg_temp.bn_num('Wann wird der Jüngste Tag eintreffen?'),
        pg_temp.bn_num('Was ist der Lohn für die Gläubigen im Jenseits?'),
        pg_temp.bn_num('Rezitierte Sure Al-Kawthar!'),
        pg_temp.bn_num('Wer bestimmt das Schicksal und die Schöpfung?')
      ),
      v_admin_id
    );

    -- Translation: Die Säulen des Islam & Sure Al-Falaq (Lesson 23)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Islamski šarti i Sura Felek',
      'Die Säulen des Islam & Sure Al-Falaq',
      jsonb_build_array(
        pg_temp.bn_h('Die Säulen des Islam (Die fünf Hauptpflichten)', 2),
        pg_temp.bn_p('Die Säulen des Islam sind die grundlegenden praktischen Pflichten jedes Muslims. Sie sind im Koran vorgeschrieben. Neben dem Glauben im Herzen ist jeder Gläubige verpflichtet, diese Taten zu verrichten.'),
        pg_temp.bn_h('Es gibt fünf Hauptpflichten im Islam:', 3),
        pg_temp.bn_num('KELIME-I-ŠEHADET (Das Glaubensbekenntnis sprechen)'),
        pg_temp.bn_num('NAMAZE KLANJATI (Die fünf täglichen Gebete verrichten)'),
        pg_temp.bn_num('RAMAZAN POSTITI (Im Monat Ramadan fasten)'),
        pg_temp.bn_num('ZEKAT DAVATI (Die Armenabgabe entrichten)'),
        pg_temp.bn_num('HADŽ OBAVITI (Die Pilgerfahrt nach Mekka vollziehen)'),
        pg_temp.bn_p('Wer diese Pflichten gewissenhaft erfüllt, darf auf Allahs reiche Belohnung und Barmherzigkeit hoffen.'),
        pg_temp.bn_h('Sure Al-Falaq (Das Frühlicht)', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'KUL E''ŪZU BI RABBIL-FELEK,\nMIN ŠERRI MĀ HALEK,\nVE MIN ŠERRI GĀSIKIN IZĀ VEKAB,\nVE MIN ŠERRIN-NEFFĀSĀTI FIL-''UKAD,\nVE MIN ŠERRI HĀSIDIN IZĀ HASED.'),
        pg_temp.bn_h('Übersetzung:', 3),
        pg_temp.bn_p(E'Sprich: „Ich nehme Zuflucht beim Herrn des Frühlichts\nvor dem Übel dessen, was Er erschaffen hat,\nund vor dem Übel der Dunkelheit, wenn sie hereinbricht,\nund vor dem Übel der Zauberer, die in Knoten blasen,\nund vor dem Übel des Neiders, wenn er neidet!”')
      ),
      v_admin_id
    );

    -- Translation: Die 1. Säule des Islam: Shahada & Sure An-Nas (Lesson 24)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Prvi islamski šart: Kelime-i-šehadet i Sura Nas',
      'Die 1. Säule des Islam: Shahada & Sure An-Nas',
      jsonb_build_array(
        pg_temp.bn_h('Die erste Säule des Islam', 2),
        pg_temp.bn_h('KELIME-I-ŠEHADET — DAS GLAUBENSBEKENNTNIS', 3),
        pg_temp.bn_p('Shahada bedeutet: mit dem Herzen fest zu glauben und mit der Zunge zu bezeugen, dass es nur einen einzigen Gott gibt und dass Muhammad Sein Diener und Gesandter ist.'),
        pg_temp.bn_h('Wiederholen wir das Glaubensbekenntnis:', 3),
        pg_temp.bn_h('EŠHEDU EN LĀ ILĀHE ILLALLĀH, VE EŠHEDU ENNE MUHAMMEDEN ''ABDUHŪ VE RESŪLUHŪ.', 3),
        pg_temp.bn_p('Übersetzung: „Ich bezeuge, dass es keine Gottheit gibt außer Allah, und ich bezeuge, dass Muhammad Allahs Diener und Gesandter ist!”'),
        pg_temp.bn_p('Mit der Shahada treten wir bewusst in den Islam ein und bekräftigen unsere Hingabe an Allah und die Befolgung Seines Gesandten.'),
        pg_temp.bn_h('Sure An-Nas (Die Menschen)', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'KUL E''ŪZU BI RABBIN-NĀS,\nMELIKIN-NĀS,\nILĀHIN-NĀS,\nMIN ŠERRIL-VESVĀSIL-HANNĀS,\nELLEZĪ JUVESVISU FĪ SUDŪRIN-NĀS,\nMINEL-DŽINNETI VEN-NĀS.'),
        pg_temp.bn_h('Übersetzung:', 3),
        pg_temp.bn_p(E'Sprich: „Ich nehme Zuflucht beim Herrn der Menschen,\ndem Herrscher der Menschen,\ndem Gott der Menschen,\nvor dem Übel des einflüsternden Schaytans,\nder böse Gedanken in die Herzen der Menschen einflüstert –\nvon den Dschinn und den Menschen!”')
      ),
      v_admin_id
    );

    -- Translation: Die 2. Säule des Islam: Das Gebet (Salah) (Lesson 25)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Drugi islamski šart: Propisane namaze klanjati',
      'Die 2. Säule des Islam: Das Gebet (Salah)',
      jsonb_build_array(
        pg_temp.bn_h('Die zweite Säule des Islam', 2),
        pg_temp.bn_h('DIE VORGESCHRIEBENEN GEBETE VERRICHTEN', 3),
        pg_temp.bn_p('Das Gebet ist eine grundlegende Pflicht im Islam, die im Koran geboten und durch die Praxis des Propheten vorgelebt wurde. Durch das Gebet erweisen wir Allah demütige Dankbarkeit und Anbetung.'),
        pg_temp.bn_h('Im Laufe eines Tages verrichten wir fünf Pflichtgebete:', 3),
        pg_temp.bn_bullet('SABAH (FADSCHR): Vor Sonnenaufgang.'),
        pg_temp.bn_bullet('PODNE (DHUHR): Am Mittag, wenn die Sonne ihren Höchststand überschritten hat.'),
        pg_temp.bn_bullet('IKINDIJA (ASR): Am Nachmittag.'),
        pg_temp.bn_bullet('AKŠAM (MAGHRIB): Direkt nach Sonnenuntergang.'),
        pg_temp.bn_bullet('JACIJA (ISHA): Bei vollkommener Nacht.'),
        pg_temp.bn_h('Weitere wichtige Gebete:', 3),
        pg_temp.bn_bullet('DŽUMA (FREITAGSGEBET): Wird freitags zur Mittagszeit in der Moschee verrichtet.'),
        pg_temp.bn_bullet('TERAVIJA (TARAWEEH): Wird während des Monats Ramadan nach dem Ischa-Gebet verrichtet.'),
        pg_temp.bn_bullet('BAJRAM (FESTTAGSGEBET): Wird am ersten Tag des Festes zweimal im Jahr verrichtet.'),
        pg_temp.bn_bullet('DŽENAZA (TOTENGEBET): Wird für verstorbene Muslime verrichtet.'),
        pg_temp.bn_p('Kinder lernen das Beten mit Beginn des Schulalters und sind ab dem 10. Lebensjahr zum regelmäßigen Gebet angehalten.')
      ),
      v_admin_id
    );

    -- Translation: Die 3. Säule des Islam: Das Fasten im Ramadan (Sawm) (Lesson 26)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Treći islamski šart: Postiti mjesec ramazan',
      'Die 3. Säule des Islam: Das Fasten im Ramadan (Sawm)',
      jsonb_build_array(
        pg_temp.bn_h('Die dritte Säule des Islam', 2),
        pg_temp.bn_h('IM MONAT RAMADAN FASTEN', 3),
        pg_temp.bn_p('Das Fasten ist eine koranische Pflicht. Ramadan-Fasten bedeutet, sich von der Morgendämmerung bis zum Sonnenuntergang des Essens, Trinkens und aller schlechten Taten und Worte zu enthalten.'),
        pg_temp.bn_p('Ramadan ist der heiligste Monat des Jahres, in dem die Herabsendung des Korans begann. Wir fasten, spenden Zakat und Sadekatul-Fitr, beten Taraweeh, laden zu gemeinsamen Iftaren ein und lesen den Koran.'),
        pg_temp.bn_h('Die Absicht (Nijet) für das Fasten:', 3),
        pg_temp.bn_h('NEVEJTU EN ESŪME GADEN LILLĀHI TE''ĀLA FERĪDATEN MIN ŠEHRI RAMADĀNE.', 3),
        pg_temp.bn_p('Bedeutung: „Ich beabsichtige, um Allahs willen am morgigen Tag des Monats Ramadan die Fastenpflicht zu erfüllen!”'),
        pg_temp.bn_h('Das Bittgebet zum Fastenbrechen (Iftar):', 3),
        pg_temp.bn_h('ALLĀHUMME INNĪ LEKE SUMTU, VE BIKE ĀMENTU, VE ''ALEJKE TEVEKKELTU VE ''ALĀ RIZKIKE EFTARTU.', 3),
        pg_temp.bn_p('Bedeutung: „O mein Allah, für Dich habe ich gefastet, an Dich glaube ich, auf Dich vertraue ich und mit Deiner Versorgung breche ich mein Fasten!”'),
        pg_temp.bn_p('Zum Fasten sind alle erwachsenen, gesunden und zurechnungsfähigen Muslime verpflichtet. Der Ramadan endet mit dem freudigen Ramadan-Fest (Ramazanski bajram).')
      ),
      v_admin_id
    );

    -- Translation: Die 4. Säule des Islam: Zakat geben & Sure Al-Lahab (Lesson 27)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Četvrti islamski šart: Zekat davati i Sura Leheb',
      'Die 4. Säule des Islam: Zakat geben & Sure Al-Lahab',
      jsonb_build_array(
        pg_temp.bn_h('Die vierte Säule des Islam', 2),
        pg_temp.bn_h('DIE ZAKAT-PFLICHTABGABE ENTRICHTEN', 3),
        pg_temp.bn_p('Die Zakat ist eine im Koran vorgeschriebene Pflichtabgabe für vermögende Muslime, einen festgelegten Teil ihres überschüssigen Vermögens an Bedürftige und Bildungseinrichtungen zu spenden.'),
        pg_temp.bn_p('Die Zakat reinigt das Vermögen, schützt das Herz vor Geiz und stärkt die soziale Solidarität in der Gemeinschaft. Zakat wird meist im Ramadan entrichtet, kann aber das ganze Jahr über gegeben werden.'),
        pg_temp.bn_h('Vermögenswerte, auf die Zakat anfällt:', 3),
        pg_temp.bn_bullet('Ernte- und Landwirtschaftserzeugnisse'),
        pg_temp.bn_bullet('Gold, Silber und Geldvermögen'),
        pg_temp.bn_bullet('Handelswaren'),
        pg_temp.bn_bullet('Viehbestände'),
        pg_temp.bn_p('Die Organisation und Verteilung der Zakat obliegt der islamischen Gemeinschaft.'),
        pg_temp.bn_h('Sure Al-Lahab (Die Flammen)', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'TEBBET JEDĀ EBĪ LEHEBIN VE TEBB,\nMĀ AGNĀ ''ANHU MĀLUHŪ VE MĀ KESEB,\nSE JASLĀ NĀREN ZĀTE LEHEB,\nVEMRE-''ETUHŪ HAMMĀLETEL-HATAB,\nFĪ DŽĪDIHĀ HABLUN MIN MESED.'),
        pg_temp.bn_h('Übersetzung:', 3),
        pg_temp.bn_p(E'Zugrunde gehen sollen die Hände Abu Lahabs, und zugrunde gegangen ist er!\nNicht nützen wird ihm sein Vermögen und was er erworben hat.\nEr wird in einem lodernden Feuer brennen,\nund auch seine Frau, die Holzträgerin (die Zwietracht sät);\num ihren Hals ein Strick aus Palmfasern!')
      ),
      v_admin_id
    );

    -- Translation: Die 5. Säule des Islam: Die Pilgerfahrt (Hadsch) & Talbiya (Lesson 28)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Peti islamski šart: Hadž obaviti i Telbija',
      'Die 5. Säule des Islam: Die Pilgerfahrt (Hadsch) & Talbiya',
      jsonb_build_array(
        pg_temp.bn_h('Die fünfte Säule des Islam', 2),
        pg_temp.bn_h('DIE PILGERFAHRT (HADSCH) VOLLZIEHEN', 3),
        pg_temp.bn_p('Der Hadsch ist die fünfte Säule des Islam und ein göttliches Gebot für jeden volljährigen, gesunden und finanziell fähigen Muslim, ihn einmal im Leben zu vollziehen. Der Hadsch ist der Besuch der Kaaba und der heiligen Stätten in Mekka.'),
        pg_temp.bn_p('Vor der Abreise begleicht der Pilger alle Schulden und sichert den Unterhalt seiner Familie ab.'),
        pg_temp.bn_h('Das Talbiya-Gebet des Pilgers:', 3),
        pg_temp.bn_p(E'Lebbejkellāhumme, lebbejk,\nlebbejkallāhu!\nlebbejkellāhumme, lebbejk,\nlebbejkellāh!\n\nHier bin ich, o Allah, zu Deinem Dienst bereit! Du hast keinen Teilhaber, hier bin ich! Alles Lob, alle Gnade und alle Herrschaft gehören Dir! Du hast keinen Teilhaber!'),
        pg_temp.bn_h('Gedicht: An der Kaaba stand ich', 3),
        pg_temp.bn_p(E'An der Kaaba stand ich still,\nerfüllte, was mein Schöpfer will,\nmeine Sünden wusch ich rein,\nwollte nah bei Allah sein!\n\nIch rief zu meinem Herrn:\nLebbejkellāhumme lebbejk!\n\nIm Tawaf zog ich umher,\nwie ein Stern im Himmelsmeer,\nvoller Ehrfurcht und Gebet,\ndas zum Himmel aufwärts weht.\n\nBeim Brunnen Zamzam rein und klar,\nwo die Hoffnung lebendig war,\nfließt der Glaube voller Kraft,\nder uns ew''ges Leben schafft.')
      ),
      v_admin_id
    );

    -- Translation: Wiederholung — Die Säulen des Islam (Lesson 29)
    perform pg_temp.upsert_lesson_translation(
      r_mosque.id,
      'Ponavljanje gradiva — Islamski šarti',
      'Wiederholung — Die Säulen des Islam',
      jsonb_build_array(
        pg_temp.bn_h('Wiederholung ist die Mutter des Wissens', 2),
        pg_temp.bn_p('Überprüfe dein Wissen über die Pflichten im Islam:'),
        pg_temp.bn_num('Wie viele Hauptpflichten (Säulen) gibt es im Islam?'),
        pg_temp.bn_num('Wie lautet die erste Säule des Islam?'),
        pg_temp.bn_num('Was bezeugen wir mit der Shahada?'),
        pg_temp.bn_num('Welche ist die zweite Säule des Islam?'),
        pg_temp.bn_num('Wie viele tägliche Gebete verrichten wir?'),
        pg_temp.bn_num('Wann verrichten wir das Fadschr-Gebet (Sabah)?'),
        pg_temp.bn_num('Wann wird das Freitagsgebet (Dschuma) verrichtet?'),
        pg_temp.bn_num('Wie lautet die dritte Säule des Islam?'),
        pg_temp.bn_num('Wie lautet die Absicht (Nijet) für das Fasten?'),
        pg_temp.bn_num('Rezitierte das Bittgebet zum Fastenbrechen (Iftar)!'),
        pg_temp.bn_num('Wovon enthalten wir uns während des Fastens?'),
        pg_temp.bn_num('Wer ist zum Fasten verpflichtet?'),
        pg_temp.bn_num('Wie lautet die vierte Säule des Islam?'),
        pg_temp.bn_num('Auf welche Vermögenswerte entrichten wir die Zakat?'),
        pg_temp.bn_num('Was ist der Hadsch?'),
        pg_temp.bn_num('Wer ist verpflichtet, den Hadsch zu vollziehen?'),
        pg_temp.bn_num('Rezitierte Sure Al-Falaq!'),
        pg_temp.bn_num('Wie lautet Sure An-Nas?'),
        pg_temp.bn_num('Rezitierte Sure Al-Lahab!')
      ),
      v_admin_id
    );

  end loop;
end;
$migration$;
