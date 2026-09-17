-- Migration: Add prayer illustrations to Lesson 25 (Drugi islamski šart: Propisane namaze klanjati)
-- Updates public.lessons and public.lesson_translations with BlockNote image blocks

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

create or replace function pg_temp.bn_image(p_url text, p_caption text default '') returns jsonb language sql as $$
  select jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', 'image',
    'props', jsonb_build_object(
      'backgroundColor', 'default',
      'textAlignment', 'center',
      'name', split_part(p_url, '/', -1),
      'url', p_url,
      'caption', p_caption,
      'showPreview', true,
      'previewWidth', 512
    ),
    'children', '[]'::jsonb
  );
$$;

do $$
declare
  r_mosque record;
  v_bs_body jsonb;
  v_de_body jsonb;
  v_lesson_id uuid;
begin
  v_bs_body := jsonb_build_array(
    pg_temp.bn_h('Drugi islamski šart', 2),
    pg_temp.bn_h('PROPISANE NAMAZE KLANJATI', 3),
    pg_temp.bn_p('Namaz je stroga islamska dužnost naređena u Kur''anu i potvrđena praksom Muhammeda, a.s. Klanjanjem namaza iskazujemo pokornost i poštovanje Allahu, dž.š., na najuzvišeniji način.'),
    pg_temp.bn_image('/lessons/prayers/00_daily_prayers.jpg', 'Pet dnevnih namaza u toku dana: Sabah, Podne, Ikindija, Akšam i Jacija'),
    pg_temp.bn_h('U toku jednog dana, klanjamo pet namaza:', 3),
    pg_temp.bn_bullet('SABAH: Sabah se klanja prije izlaska sunca.'),
    pg_temp.bn_bullet('PODNE: Podne se klanja kada je sunce iza polovine neba.'),
    pg_temp.bn_bullet('IKINDIJA: Ikindija se klanja kada sunce krene ka zapadu.'),
    pg_temp.bn_bullet('AKŠAM: Akšam se klanja kada sunce zađe.'),
    pg_temp.bn_bullet('JACIJA: Jacija se klanja kad padne potpuni mrak.'),
    pg_temp.bn_h('Osim pet dnevnih namaza, klanjamo i sljedeće namaze:', 3),
    pg_temp.bn_bullet('DŽUMA: Klanja se petkom u vrijeme podne namaza.'),
    pg_temp.bn_bullet('TERAVIJA: Klanja se tokom ramazana, u vrijeme jacije namaza.'),
    pg_temp.bn_bullet('BAJRAM: Klanja se prvi dan Bajrama, dva puta godišnje.'),
    pg_temp.bn_bullet('DŽENAZA: Klanja se umrlim muslimanima i muslimankama.'),
    pg_temp.bn_h('Glavni položaji u namazu (Namaski ruknovi):', 3),
    pg_temp.bn_image('/lessons/prayers/01_takbir.jpg', '1. Iftitahi-tekbir: Donošenje tekbira uz dizanje ruku u visini ušiju i izgovaranje »Allāhu ekber«'),
    pg_temp.bn_p('1. Iftitahi-tekbir: Namaz počinjemo izgovaranjem riječi »Allāhu ekber« (Allah je najveći), podižući ruke tako da palčevi dodiruju mehkote ušiju.'),
    pg_temp.bn_image('/lessons/prayers/02_qiyam.jpg', '2. Kijam: Mirno stajanje u namazu s vezanim rukama'),
    pg_temp.bn_p('2. Kijam: Stojimo mirno i skrušeno na sedžadi, s pogledom usmjerenim na mjesto sedžde. Desnu ruku stavljamo preko lijeve preko prsa ili pupka, te učimo Subhaneke, Fatihu i suru.'),
    pg_temp.bn_image('/lessons/prayers/03_ruku.jpg', '3. Ruku'': Pregibanje u namazu s pravim leđima i rukama na koljenima'),
    pg_temp.bn_p('3. Ruku'': Pregibamo se u pojasu tako da leđa budu ravna, obuhvatimo koljena dlanovima i tri puta izgovorimo »Subhāne Rabbijel-''azīm«.'),
    pg_temp.bn_image('/lessons/prayers/04_itidal.jpg', '4. I''tidal: Uspravljanje nakon ruku''a'),
    pg_temp.bn_p('4. I''tidal: Vraćamo se s pregiba u uspravan položaj govoreći »Semiallāhu limen hamideh«, a zatim »Rabbena lekel-hamd«.'),
    pg_temp.bn_image('/lessons/prayers/05_sajdah.jpg', '5. Sedžda: Spuštanje lica na tlo pred Uzvišenim Allahom'),
    pg_temp.bn_p('5. Sedžda: Spuštamo se na koljena, dlanove, čelo i nos na sedžadu u znak najveće pokornosti Allahu, dž.š., i tri puta izgovorimo »Subhāne Rabbijel-e''alā«. Činimo po dvije sedžde na svakom rekijatu.'),
    pg_temp.bn_image('/lessons/prayers/06_tashahhud.jpg', '6. Ka''de-i ehire: Sjedenje u namazu i učenje Et-Tehijata'),
    pg_temp.bn_p('6. Ka''de-i ehire: Sjedimo smireno na nogama, učimo Et-Tehijjatu, Salavate i Dove, te podižemo kažiprst pri izgovaranju Kelime-i-šehadeta.'),
    pg_temp.bn_p('Klanjati učimo kad pođemo u školu, a dužni smo redovno klanjati od desete godine života.')
  );

  v_de_body := jsonb_build_array(
    pg_temp.bn_h('Die zweite Säule des Islam', 2),
    pg_temp.bn_h('DIE VORGESCHRIEBENEN GEBETE VERRICHTEN', 3),
    pg_temp.bn_p('Das Gebet ist eine grundlegende Pflicht im Islam, die im Koran geboten und durch die Praxis des Propheten vorgelebt wurde. Durch das Gebet erweisen wir Allah demütige Dankbarkeit und Anbetung.'),
    pg_temp.bn_image('/lessons/prayers/00_daily_prayers.jpg', 'Die fünf täglichen Pflichtgebete im Tagesverlauf: Fadschr, Dhuhr, Asr, Maghrib und Ischa'),
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
    pg_temp.bn_h('Die wichtigsten Gebetshaltungen (Gebetssäulen):', 3),
    pg_temp.bn_image('/lessons/prayers/01_takbir.jpg', '1. Takbir (Eröffnungstakbir): Hände auf Ohrhöhe erheben und »Allāhu Akbar« sprechen'),
    pg_temp.bn_p('1. Takbir (Iftitāh at-Takbīr): Das Gebet beginnt mit dem Heben der Hände auf Ohrhöhe und dem Sprechen von »Allāhu Akbar« (Allah ist der Größte).'),
    pg_temp.bn_image('/lessons/prayers/02_qiyam.jpg', '2. Qiyam: Aufrechtes Stehen mit gefalteten Händen'),
    pg_temp.bn_p('2. Qiyam: Ruhiges, ehrfürchtiges Stehen auf dem Gebetsteppich mit Blick zum Gebetsplatz. Die rechte Hand liegt über dem linken Handgelenk auf Brust oder Bauch.'),
    pg_temp.bn_image('/lessons/prayers/03_ruku.jpg', '3. Ruku'': Verbeugung mit geradem Rücken und Händen auf den Knien'),
    pg_temp.bn_p('3. Ruku'': Verbeugung nach vorne mit geradem Rücken, Hände umfassen die Knie, dreimal »Subhāna Rabbiyal-''Azīm« sprechen.'),
    pg_temp.bn_image('/lessons/prayers/04_itidal.jpg', '4. I''tidal: Aufrichten aus der Verbeugung'),
    pg_temp.bn_p('4. I''tidal: Wieder aufrecht stehen und dabei »Sami'' Allāhu liman hamidah« und »Rabbanā lakal-hamd« sprechen.'),
    pg_temp.bn_image('/lessons/prayers/05_sajdah.jpg', '5. Sajdah: Niederwerfung vor Allah auf Stirn, Nase, Handflächen, Knie und Zehen'),
    pg_temp.bn_p('5. Sajdah (Sedschda): Vollständige Niederwerfung auf dem Teppich in tiefer Demut vor Allah, dreimal »Subhāna Rabbiyal-A''lā« sprechen. Zwei Niederwerfungen pro Gebetsabschnitt (Raka''ah).'),
    pg_temp.bn_image('/lessons/prayers/06_tashahhud.jpg', '6. Qa''da Akhira: Sitzen und Bezeugung des Glaubens (Tashahhud)'),
    pg_temp.bn_p('6. Qa''da Akhira: Ruhiges Sitzen auf den Beinen, Rezitation des At-Tahiyyat, Segenswünsche auf den Propheten (Salawat) und Bittgebete, mit erhobenem Zeigefinger beim Glaubensbekenntnis.'),
    pg_temp.bn_p('Kinder lernen das Beten mit Beginn des Schulalters und sind ab dem 10. Lebensjahr zum regelmäßigen Gebet angehalten.')
  );

  for r_mosque in select id from public.mosques loop
    -- Update Bosnian lesson
    update public.lessons
    set body = v_bs_body,
        updated_at = now()
    where mosque_id = r_mosque.id
      and title = 'Drugi islamski šart: Propisane namaze klanjati'
    returning id into v_lesson_id;

    -- Update German translation if present
    if v_lesson_id is not null then
      update public.lesson_translations
      set body = v_de_body,
          updated_at = now()
      where lesson_id = v_lesson_id
        and locale = 'de';
    end if;
  end loop;
end;
$$;
