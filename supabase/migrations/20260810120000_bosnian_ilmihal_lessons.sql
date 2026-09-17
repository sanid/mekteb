-- Migration: Bosnian Ilmihal 1 curriculum lessons extracted from book images
-- Inserts 3 structured topics and 29 lessons with rich BlockNote JSON bodies
-- across all mosques in the system in an idempotent manner.

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

create or replace function pg_temp.upsert_lesson(
  p_mosque_id uuid,
  p_topic_id uuid,
  p_title text,
  p_body jsonb,
  p_sort_order int,
  p_admin_id uuid
) returns void language plpgsql as $$
declare
  v_lesson_id uuid;
begin
  select id into v_lesson_id
  from public.lessons
  where mosque_id = p_mosque_id and title = p_title;

  if v_lesson_id is not null then
    update public.lessons
    set topic_id = p_topic_id,
        body = p_body,
        sort_order = p_sort_order,
        is_published = true
    where id = v_lesson_id;
  else
    insert into public.lessons (mosque_id, topic_id, title, body, sort_order, is_published, created_by)
    values (p_mosque_id, p_topic_id, p_title, p_body, p_sort_order, true, p_admin_id);
  end if;
end;
$$;

do $migration$
declare
  r_mosque record;
  v_topic1_id uuid;
  v_topic2_id uuid;
  v_topic3_id uuid;
  v_admin_id uuid;
begin
  -- Reset only THIS curriculum's rows (idempotent re-run), never other
  -- mosques' own lessons/topics: an unguarded `delete from lessons` would
  -- wipe real teaching content on every environment this migration touches.
  delete from public.lessons
  where title in (
    'E''uzubila i Bismila',
    'Čovjek je najljepše Allahovo stvorenje',
    'Ja u mekteb idem i dove za početak',
    'Vjera islam i Kelime-i-šehadet',
    'Selam — Islamski pozdrav',
    'Čistoća u islamu',
    'Voda je Allahov dar',
    'Desna strana u islamu',
    'Hrana i piće — Halal i haram',
    'Subhaneke i zahvalnost Allahu',
    'Sura El-Fatiha',
    'Ponavljanje gradiva — Uvodni dio',
    'Pregled 33 šarta — Uvjeta u islamu',
    'Imanski šarti — Islamsko vjerovanje',
    'Prvi imanski šart: Āmentu billāhi i Sura Ihlas',
    'Drugi imanski šart: Ve melāiketihī (Meleki)',
    'Treći imanski šart: Ve kutubihī (Božije knjige)',
    'Četvrti imanski šart: Ve rusulihī (Božiji poslanici)',
    'Muhammed, a.s. — Posljednji Božiji poslanik',
    'Peti imanski šart: Vel-jevmil-āhiri i Sura Kevser',
    'Šesti imanski šart: Ve bil-kaderi (Kader) i pjesma',
    'Ponavljanje gradiva — Imanski šarti',
    'Islamski šarti i Sura Felek',
    'Prvi islamski šart: Kelime-i-šehadet i Sura Nas',
    'Drugi islamski šart: Propisane namaze klanjati',
    'Treći islamski šart: Postiti mjesec ramazan',
    'Četvrti islamski šart: Zekat davati i Sura Leheb',
    'Peti islamski šart: Hadž obaviti i Telbija',
    'Ponavljanje gradiva — Islamski šarti'
  );

  delete from public.topics
  where title in (
    'Ilmihal 1: Uvod u mekteb i islamsko ponašanje',
    'Ilmihal 1: Imanski šarti (Islamsko vjerovanje)',
    'Ilmihal 1: Islamski šarti (Islamske dužnosti)'
  );

  for r_mosque in select id from public.mosques loop
    -- Resolve admin user id if available
    select user_id into v_admin_id
    from public.memberships
    where mosque_id = r_mosque.id and role = 'mosque_admin'
    limit 1;

    -- ─────────────────────────────────────────────────────────────────
    -- TOPICS
    -- ─────────────────────────────────────────────────────────────────
    -- 1. Uvod u mekteb i islamsko ponašanje
    select id into v_topic1_id from public.topics
    where mosque_id = r_mosque.id and title = 'Ilmihal 1: Uvod u mekteb i islamsko ponašanje';

    if v_topic1_id is null then
      insert into public.topics (mosque_id, title, description, sort_order, is_published, created_by)
      values (
        r_mosque.id,
        'Ilmihal 1: Uvod u mekteb i islamsko ponašanje',
        'Uvodne dove, čistoća, bonton, zahvalnost i prva sura El-Fatiha',
        1, true, v_admin_id
      ) returning id into v_topic1_id;
    else
      update public.topics
      set description = 'Uvodne dove, čistoća, bonton, zahvalnost i prva sura El-Fatiha',
          sort_order = 1, is_published = true
      where id = v_topic1_id;
    end if;

    -- 2. Imanski šarti (Islamsko vjerovanje)
    select id into v_topic2_id from public.topics
    where mosque_id = r_mosque.id and title = 'Ilmihal 1: Imanski šarti (Islamsko vjerovanje)';

    if v_topic2_id is null then
      insert into public.topics (mosque_id, title, description, sort_order, is_published, created_by)
      values (
        r_mosque.id,
        'Ilmihal 1: Imanski šarti (Islamsko vjerovanje)',
        'Pregled 33 šarta, šest temelja imana, meleki, objave, poslanici, Muhammed a.s., Sudnji dan i Kader',
        2, true, v_admin_id
      ) returning id into v_topic2_id;
    else
      update public.topics
      set description = 'Pregled 33 šarta, šest temelja imana, meleki, objave, poslanici, Muhammed a.s., Sudnji dan i Kader',
          sort_order = 2, is_published = true
      where id = v_topic2_id;
    end if;

    -- 3. Islamski šarti (Islamske dužnosti)
    select id into v_topic3_id from public.topics
    where mosque_id = r_mosque.id and title = 'Ilmihal 1: Islamski šarti (Islamske dužnosti)';

    if v_topic3_id is null then
      insert into public.topics (mosque_id, title, description, sort_order, is_published, created_by)
      values (
        r_mosque.id,
        'Ilmihal 1: Islamski šarti (Islamske dužnosti)',
        'Pet stubova islama: Šehadet, namaz, ramazanski post, zekat i hadž, te sure Felek, Nas i Leheb',
        3, true, v_admin_id
      ) returning id into v_topic3_id;
    else
      update public.topics
      set description = 'Pet stubova islama: Šehadet, namaz, ramazanski post, zekat i hadž, te sure Felek, Nas i Leheb',
          sort_order = 3, is_published = true
      where id = v_topic3_id;
    end if;

    -- ─────────────────────────────────────────────────────────────────
    -- LESSONS: TOPIC 1 (Uvod u mekteb i islamsko ponašanje)
    -- ─────────────────────────────────────────────────────────────────

    -- Lesson 1: E'uzubila i Bismila
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'E''uzubila i Bismila',
      jsonb_build_array(
        pg_temp.bn_h('E''uzubila', 2),
        pg_temp.bn_p('Prve riječi koje ćemo naučiti su:'),
        pg_temp.bn_h('E''ŪZUBILLĀHI MINEŠ-ŠEJTĀNIR-RADŽĪM', 3),
        pg_temp.bn_p('Ove riječi znače: „Tražim od Allaha da me zaštiti od prokletog šejtana.”'),
        pg_temp.bn_p('Ove riječi izgovaramo:'),
        pg_temp.bn_bullet('da bismo bili sigurni'),
        pg_temp.bn_bullet('da lahko i dobro učimo'),
        pg_temp.bn_bullet('da se sretno igramo'),
        pg_temp.bn_bullet('da mirno spavamo i lijepo sanjamo'),
        pg_temp.bn_h('Bismila', 2),
        pg_temp.bn_p('S kojim riječima počinjemo svaki dobar posao? To su riječi koje svaki musliman i muslimanka trebaju znati:'),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p('Naučimo značenje ovih riječi: „U ime Allaha, Milostivog, Samilosnog!”'),
        pg_temp.bn_h('Kada se uče E''uzubila i Bismila?', 2),
        pg_temp.bn_bullet('Kada jedemo i pijemo'),
        pg_temp.bn_bullet('Kada učimo i čitamo'),
        pg_temp.bn_bullet('Kada vozimo bicikl'),
        pg_temp.bn_bullet('Kada ulazimo u auto'),
        pg_temp.bn_bullet('Kada ulazimo u kuću'),
        pg_temp.bn_bullet('Kada hoćemo spavati'),
        pg_temp.bn_bullet('Prije igranja'),
        pg_temp.bn_bullet('Kada oblačimo odjeću'),
        pg_temp.bn_p('Osim ovoga, E''uzubila i Bismila se izgovaraju i u mnogim drugim situacijama. Pitaj muallima kada se još izgovaraju E''uzubila i Bismila.')
      ),
      1, v_admin_id
    );

    -- Lesson 2: Čovjek je najljepše Allahovo stvorenje
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'Čovjek je najljepše Allahovo stvorenje',
      jsonb_build_array(
        pg_temp.bn_h('Čovjek je najljepše Allahovo stvorenje', 2),
        pg_temp.bn_p('Allah, dželle šanuhu, je stvorio cijeli svijet:'),
        pg_temp.bn_bullet('Čovjeka'),
        pg_temp.bn_bullet('Biljke'),
        pg_temp.bn_bullet('Životinje'),
        pg_temp.bn_bullet('Zemlju'),
        pg_temp.bn_bullet('Nebo'),
        pg_temp.bn_bullet('Kosmos'),
        pg_temp.bn_p('U Kur''anu Časnom Uzvišeni Allah poručuje:'),
        pg_temp.bn_h('„Čovjeka smo stvorili u najljepšem obliku”', 3),
        pg_temp.bn_p('(Kur''an, sura Et-Tin, 4)')
      ),
      2, v_admin_id
    );

    -- Lesson 3: Ja u mekteb idem i dove za početak
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'Ja u mekteb idem i dove za početak',
      jsonb_build_array(
        pg_temp.bn_h('Ja u mekteb idem', 2),
        pg_temp.bn_p('Mekteb je mala škola kod džamije ili u džamiji. U mektebu se igramo i učimo:'),
        pg_temp.bn_bullet('o islamskom vjerovanju'),
        pg_temp.bn_bullet('o islamskim dužnostima'),
        pg_temp.bn_bullet('o islamskom ponašanju'),
        pg_temp.bn_h('U mekteb nosimo:', 3),
        pg_temp.bn_bullet('Ilmihal'),
        pg_temp.bn_bullet('Svesku'),
        pg_temp.bn_bullet('Olovku'),
        pg_temp.bn_bullet('Gumicu'),
        pg_temp.bn_bullet('Ranac'),
        pg_temp.bn_h('Dove za hairli početak', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_h('RABBI JESSIR VE LĀ TUASSIR, RABBI TEMMIM BIL-HAJR. ĀMĪN.', 3),
        pg_temp.bn_p('Bože, olakšaj a ne otežaj. Bože, završi s dobrim. Amin!'),
        pg_temp.bn_h('RABBI ZIDNĪ ILMĀ', 3),
        pg_temp.bn_p('Gospodaru moj, povećaj mi znanje.'),
        pg_temp.bn_h('Žuri Mirza na pouku', 3),
        pg_temp.bn_p(E'Osvanuo sretan dan,\nide Mirza razdragan.\nPoskakuje — svi to vide,\nna pouku Mirza ide.\n\nU ruci mu torbica,\nu torbici sveščica,\ni udžbenik Ilmihal,\nprva riječ mu — Bismillah.\n\n(R. Kadić)')
      ),
      3, v_admin_id
    );

    -- Lesson 4: Vjera islam i Kelime-i-šehadet
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'Vjera islam i Kelime-i-šehadet',
      jsonb_build_array(
        pg_temp.bn_h('Vjera islam', 2),
        pg_temp.bn_p('Naša vjera se zove islam.'),
        pg_temp.bn_h('Šta je islam?', 3),
        pg_temp.bn_p('Islam je vjera koju je Uzvišeni Allah preko Svoga poslanika Muhammeda, alejhiselam, objavio cijelom čovječanstvu.'),
        pg_temp.bn_h('Šta znači islam?', 3),
        pg_temp.bn_p('Islam znači pokornost Allahu, dželle šanuhu.'),
        pg_temp.bn_h('U čemu se sastoji pokornost Uzvišenom Allahu?', 3),
        pg_temp.bn_p('Musliman i muslimanka vjeruju u Allaha, izvršavaju islamske propise i dužnosti i rade ono što je dobro. Lijepo se ponašaju, govore istinu i pomažu drugima.'),
        pg_temp.bn_p(E'„Islam je kao sunce,\nkad ti jednom takne srce,\nčitav svijet zavoliš,\nnikog više ne mrziš.”\n(R. Kadić)'),
        pg_temp.bn_h('Kelime-i-šehadet', 2),
        pg_temp.bn_p('Kelime-i-šehadetom svjedočimo da smo muslimani.'),
        pg_temp.bn_h('Kako glasi Kelime-i-šehadet?', 3),
        pg_temp.bn_h('EŠHEDU EN LĀ ILĀHE ILLALLĀH, VE EŠHEDU ENNE MUHAMMEDEN ''ABDUHŪ VE RESŪLUHŪ.', 3),
        pg_temp.bn_p('Prijevod: „Vjerujem i svjedočim da nema božanstva osim Allaha i vjerujem i svjedočim da je Muhammed, alejhiselam, Allahov rob i poslanik!”')
      ),
      4, v_admin_id
    );

    -- Lesson 5: Selam — Islamski pozdrav
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'Selam — Islamski pozdrav',
      jsonb_build_array(
        pg_temp.bn_h('Selam — Islamski pozdrav', 2),
        pg_temp.bn_p('Selam je međusobni pozdrav muslimana.'),
        pg_temp.bn_h('Kako se naziva i odgovara selam?', 3),
        pg_temp.bn_p(E'Pozdrav: Es-selamu alejkum!\nOdgovor: Alejkumus-selam!'),
        pg_temp.bn_p('Značenje: Neka je na Vas Božiji mir i spas!'),
        pg_temp.bn_p(E'„Es-selamu alejkum nek se čuje sa svih strana,\nselam selam, mahsuz selam, glas je mira muslimana.”'),
        pg_temp.bn_h('Kada i kome nazivamo selam?', 3),
        pg_temp.bn_bullet('Selam nazivamo pri ulasku i izlasku iz kuće'),
        pg_temp.bn_bullet('Selamimo muslimane i muslimanke na ulici'),
        pg_temp.bn_bullet('Selam prvi nazivamo starijim osobama'),
        pg_temp.bn_bullet('Muškarci prvi nazivaju selam'),
        pg_temp.bn_bullet('Selam nazivamo kada dolazimo u društvo ili odlazimo iz društva'),
        pg_temp.bn_p('Sa muallimom, kroz igru, uvježbajte selam u raznim prilikama!')
      ),
      5, v_admin_id
    );

    -- Lesson 6: Čistoća u islamu
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'Čistoća u islamu',
      jsonb_build_array(
        pg_temp.bn_h('Čistoća', 2),
        pg_temp.bn_p('Čistoća je pola zdravlja. Zato se trebamo brinuti o higijeni našeg tijela i odjeće.'),
        pg_temp.bn_p('Voda je Allahov dar ljudima koji koristimo za piće, spremanje hrane, pranje tijela i odjeće.'),
        pg_temp.bn_p('Allah voli urednost i čistoću i muslimani uvijek trebaju biti uredni i čisti.'),
        pg_temp.bn_p('Muhammed, alejhiselam, je rekao: „Čistoća je dio vjere.”'),
        pg_temp.bn_h('U ličnu higijenu se ubraja:', 3),
        pg_temp.bn_bullet('Pranje ruku prije i poslije jela'),
        pg_temp.bn_bullet('Redovno kupanje'),
        pg_temp.bn_bullet('Redovno pranje zuba'),
        pg_temp.bn_bullet('Redovno skraćivanje noktiju')
      ),
      6, v_admin_id
    );

    -- Lesson 7: Voda je Allahov dar
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'Voda je Allahov dar',
      jsonb_build_array(
        pg_temp.bn_h('Voda je Allahov dar', 2),
        pg_temp.bn_p('Uobičajen ljetni dan. Sejid se sa djecom igrao u dvorištu džamije. Napustivši igru, utrča u kuću:'),
        pg_temp.bn_p('„Majko, ožednio sam, mogu li dobiti čašu vode?”'),
        pg_temp.bn_p('Zahvalivši se, upita:'),
        pg_temp.bn_p('„Daje li nam i vodu Allah, dželle šanuhu? Kako je lijepo kada se ugasi žeđ. Sigurno se svi tako osjećaju?”'),
        pg_temp.bn_p('„Da, Sejide, da bi insan zadovoljio svoje potrebe, Allah, dž.š., mu daruje i vodu, koja je izvor svega.”'),
        pg_temp.bn_p('„On daje vodu i mome mačku?” — upita. Majka potvrdno klimnu glavom.'),
        pg_temp.bn_p('„I pticama, zečevima, jagnjadima i drugim životinjama?”'),
        pg_temp.bn_p('„Da, Sejide. Allah, dž.š., je svim stvorenjima darovao vodu da bi ugasili žeđ i zadovoljili druge potrebe: i biljkama, i drveću, i svemu što je živo. Svemu što zavisi od nje, On daje vodu.”'),
        pg_temp.bn_p('„Pada li zbog toga kiša?” — upita Sejid — „Jer kad pada kiša, ja se ne mogu igrati u avliji, ali sada znam da se zemlja i biljke raduju kiši.”'),
        pg_temp.bn_p('Milujući ga po glavi, majka nastavi:'),
        pg_temp.bn_p('„Da, sine, u pravu si, oni vole kišu. Vidiš li nebo? Primjećuješ li guste oblake? Oni donose kišu, znaš li to? Vidi, već počinju padati prve kapi kiše. Možeš li mi pomoći da zatvorim prozore?”'),
        pg_temp.bn_p('Dječak pristade, veselo govoreći:'),
        pg_temp.bn_p('„Majko, kiša će padati veoma dugo i sve će se biljke napiti vode. A šta se događa sa onim dijelom koji ostaje na površini zemlje?”'),
        pg_temp.bn_p('„Šta se dešava sa svakom kapi kiše — ne znam, ali znam da se jedan dio skuplja u izvore. Iz tih izvora se voda crpi prečišćena, a zatim salijeva u vodovodne cijevi koje dovode u kuće vodu koju mi koristimo.”'),
        pg_temp.bn_p('Dječak prekide majku:'),
        pg_temp.bn_p('„Da nema vode, kako bih se kupao? Majko, kako je samo voda potrebna svima! Allah, dž.š., naš Gospodar, velikodušan je jer nam vodu daruje!”'),
        pg_temp.bn_p('Voda je Allahov dar!')
      ),
      7, v_admin_id
    );

    -- Lesson 8: Desna strana u islamu
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'Desna strana u islamu',
      jsonb_build_array(
        pg_temp.bn_h('Desna strana', 2),
        pg_temp.bn_p('Islam daje prednost desnoj strani i zato sve lijepe poslove radimo desnom rukom i nogom!'),
        pg_temp.bn_bullet('Desnom rukom jedemo i pijemo'),
        pg_temp.bn_bullet('Prvo oblačimo desni rukav'),
        pg_temp.bn_bullet('Prvo obuvamo desnu cipelu'),
        pg_temp.bn_bullet('Liježemo na desnu stranu'),
        pg_temp.bn_bullet('Desnom nogom ulazimo u kuću i džamiju'),
        pg_temp.bn_bullet('Lijevom nogom izlazimo iz kuće')
      ),
      8, v_admin_id
    );

    -- Lesson 9: Hrana i piće — Halal i haram
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'Hrana i piće — Halal i haram',
      jsonb_build_array(
        pg_temp.bn_h('Hrana i piće', 2),
        pg_temp.bn_p('Allah, dž.š., je stvorio čovjeka i podario mu nafaku kojom će se hraniti. Dozvolio mu je sva lijepa, ukusna jela i pića, a zabranio ružna koja mu nanose štetu.'),
        pg_temp.bn_h('Ono što je HALAL — DOZVOLJENO:', 3),
        pg_temp.bn_bullet('Zec, ovca, krava, kokoška, riba'),
        pg_temp.bn_bullet('Voće, povrće, žitarice i mliječni proizvodi'),
        pg_temp.bn_h('Ono što je HARAM — ZABRANJENO:', 3),
        pg_temp.bn_bullet('Svinjsko meso i prerađevine'),
        pg_temp.bn_bullet('Pas, orao, žaba i meso grabljivica'),
        pg_temp.bn_bullet('Alkohol i opojna pića'),
        pg_temp.bn_h('Prilikom jela i pića treba voditi računa da:', 3),
        pg_temp.bn_bullet('prije i poslije jela peremo ruke'),
        pg_temp.bn_bullet('prije jela proučimo Bismilu i jedemo desnom rukom'),
        pg_temp.bn_bullet('ne jedemo suviše vrelu hranu'),
        pg_temp.bn_bullet('jedemo zajedno sa porodicom'),
        pg_temp.bn_bullet('nakon jela, zahvalimo Allahu riječima El-hamdu lillāh'),
        pg_temp.bn_bullet('raspremimo sofru poslije jela'),
        pg_temp.bn_bullet('nakon jela peremo zube')
      ),
      9, v_admin_id
    );

    -- Lesson 10: Subhaneke i zahvalnost Allahu
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'Subhaneke i zahvalnost Allahu',
      jsonb_build_array(
        pg_temp.bn_h('Subhaneke', 2),
        pg_temp.bn_p('Uzvišenom Allahu zahvaljujemo učeći dovu Subhaneke:'),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_h('SUBHĀNEKE ALLĀHUMME VE BI HAMDIKE, VE TEBĀREKESMUKE, VE TE''ĀLĀ DŽEDDUKE, VE LĀ ILĀHE GAJRUKE.', 3),
        pg_temp.bn_p('Prijevod: „Nek si slavljen samo Ti, moj Allahu, i Tebi hvala, Tvoje je ime blagoslovljeno, Tvoje je veličanstvo uzvišeno, Nema drugog boga, osim Tebe.”'),
        pg_temp.bn_h('Allahu uvijek trebamo biti zahvalni', 2),
        pg_temp.bn_p('Sejid je bio u šetnji sa svojim babom. Kada su se vratili, trčeći uđe u kuću i zagrli majku. Od sreće zavika: „Majko, šta sam sve vidio: male ptice, mačiće, piliće i ne mogu ti sve nabrojati!”'),
        pg_temp.bn_p('„Sine, drago mi je što ti se sve to dopalo.”'),
        pg_temp.bn_p('„Do sada se nisam nikada tako zabavljao.”'),
        pg_temp.bn_p('„Lice ti prosto sija od sreće.” — reče majka.'),
        pg_temp.bn_p('Dječak sjede pored majke: „Majko, kako nam je Allah, dž.š., darovao lijep svijet!”'),
        pg_temp.bn_p('„Da sine, Allah, dž.š., je, doista, stvorio veoma lijep svijet.”'),
        pg_temp.bn_p('„Onda i mi moramo biti s onima koji su na Pravom putu i tako iskazati našu zahvalnost!”'),
        pg_temp.bn_p('„Sejide, slažem se sa tobom, jer mi smo zaduženi za očuvanje ove ljepote koju nam je Allah, dž.š., dao na povjerenje. Svojim djelima trebamo pokazati da smo dobri robovi svome Gospodaru i trebamo opravdati dato nam povjerenje.”'),
        pg_temp.bn_p('„Ako budete zahvalni, Ja ću vam, zacijelo, još više dati; budete li nezahvalni, kazna Moja doista će stroga biti.” (Kur''an, sura Ibrahim, 7)')
      ),
      10, v_admin_id
    );

    -- Lesson 11: Sura El-Fatiha
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'Sura El-Fatiha',
      jsonb_build_array(
        pg_temp.bn_h('Sura El-Fatiha', 2),
        pg_temp.bn_p('Fatiha je prva sura u Kur''anu.'),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'EL-HAMDU LILLĀHI RABBIL-''ĀLEMĪN.\nER-RAHMĀNIR-RAHĪM.\nMĀLIKI JEVMID-DĪN.\nIJJĀKE N''ABUDU VE IJJĀKE NESTE''ĪN.\nIHDINES-SIRĀTAL-MUSTEKĪM.\nSIRĀTALLEZĪNE EN''AMTE ''ALEJHIM,\nGAJRIL-MAGDŪBI ''ALEJHIM VE LED-DĀLLĪN. ĀMĪN!'),
        pg_temp.bn_h('Prijevod:', 3),
        pg_temp.bn_p(E'Hvala Allahu, Gospodaru svjetova,\nMilostivom, Samilosnom, Vladaru Sudnjega dana.\nSamo Tebe obožavamo i samo od Tebe pomoć tražimo.\nUputi nas na Pravi put.\nNa Put onih kojima si dao svoje blagodati,\na ne na put onih koji su protiv sebe srdžbu izazvali,\nniti onih koji su zalutali. Amin!'),
        pg_temp.bn_p(E'„Fatiha je prva sura iz Kur''ana,\nduhovna je hrana svakog muslimana,\nsvaki vjernik i vjernica ovu suru neka uči\ni sa njom se Allahovoj uputi prikuči.”')
      ),
      11, v_admin_id
    );

    -- Lesson 12: Ponavljanje gradiva — Uvodni dio
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic1_id, 'Ponavljanje gradiva — Uvodni dio',
      jsonb_build_array(
        pg_temp.bn_h('Ponavljanje je majka znanja', 2),
        pg_temp.bn_p('Do sada smo naučili: E''uzubilu i Bismilu, Rabbi jessir, Kelime-i-šehadet, Subhaneke i Fatihu. Provjerite da li znate:'),
        pg_temp.bn_num('Prouči E''uzubilu!'),
        pg_temp.bn_num('Prouči Bismilu!'),
        pg_temp.bn_num('Kako počinjemo svaki dobar posao?'),
        pg_temp.bn_num('Ko je najljepše Allahovo stvorenje?'),
        pg_temp.bn_num('O čemu učimo u mektebu?'),
        pg_temp.bn_num('Prouči dovu Rabbi jessir!'),
        pg_temp.bn_num('Kako se zove naša vjera?'),
        pg_temp.bn_num('Šta je islam?'),
        pg_temp.bn_num('Čime potvrđujemo našu pripadnost islamu?'),
        pg_temp.bn_num('Kako glasi Kelime-i-šehadet?'),
        pg_temp.bn_num('Kako se zove islamski pozdrav?'),
        pg_temp.bn_num('Kako se pozdravljamo i kako otpozdravljamo?'),
        pg_temp.bn_num('Kome se trebamo zahvaljivati?'),
        pg_temp.bn_num('Kako zahvaljujemo Uzvišenom Allahu?'),
        pg_temp.bn_num('Kako glasi prva sura u Kur''anu?')
      ),
      12, v_admin_id
    );

    -- ─────────────────────────────────────────────────────────────────
    -- LESSONS: TOPIC 2 (Imanski šarti — Islamsko vjerovanje)
    -- ─────────────────────────────────────────────────────────────────

    -- Lesson 13: Pregled 33 šarta — Uvjeta u islamu
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic2_id, 'Pregled 33 šarta — Uvjeta u islamu',
      jsonb_build_array(
        pg_temp.bn_h('Pregled 33 šarta — Uvjeta u islamu', 2),
        pg_temp.bn_p('Treba znati da ima samo jedan Bog. On je Stvoritelj i Gospodar svih svjetova. Stvorio je čovjeka u najljepšem obliku i darovao mu razum. Razum je taj koji slijedi Božiju uputu i pokorava se Božijoj volji.'),
        pg_temp.bn_p('Temelj islama je Kelime-i-šehadet kojim svjedočimo našu vjeru. Međutim, nije dovoljno samo vjerovati, nego je potrebno islamske dužnosti izvršavati.'),
        pg_temp.bn_h('Islam se temelji na 33 šarta:', 3),
        pg_temp.bn_h('Imanski šarti (6):', 3),
        pg_temp.bn_num('Āmentu billāhi (Ja vjerujem u Allaha)'),
        pg_temp.bn_num('Ve melāiketihī (I vjerujem u Njegove meleke)'),
        pg_temp.bn_num('Ve kutubihī (I vjerujem u Njegove Knjige)'),
        pg_temp.bn_num('Ve rusulihī (I vjerujem u Njegove poslanike)'),
        pg_temp.bn_num('Vel-jevmil-āhiri (I vjerujem u Sudnji dan)'),
        pg_temp.bn_num('Ve bil-kaderi hajrihī ve šerrihī minellāhi te''ālā (I vjerujem da sve što se događa, dobro i zlo, biva Allahovom voljom i određenjem)'),
        pg_temp.bn_h('Islamski šarti (5):', 3),
        pg_temp.bn_num('Kelime-i-šehadet (Očitovanje pripadnosti islamu)'),
        pg_temp.bn_num('Klanjati propisane namaze'),
        pg_temp.bn_num('Ramazan postiti'),
        pg_temp.bn_num('Zekat davati'),
        pg_temp.bn_num('Hadž obaviti'),
        pg_temp.bn_h('Abdeski šarti (4):', 3),
        pg_temp.bn_num('Oprati lice'),
        pg_temp.bn_num('Oprati obje ruke do iza laktova'),
        pg_temp.bn_num('Potrati mokrom rukom četvrtinu glave (mesh)'),
        pg_temp.bn_num('Oprati noge do članaka'),
        pg_temp.bn_h('Gusulski šarti (3):', 3),
        pg_temp.bn_num('Isprati usta'),
        pg_temp.bn_num('Isprati nos'),
        pg_temp.bn_num('Oprati cijelo tijelo'),
        pg_temp.bn_h('Tejemumski šarti (2):', 3),
        pg_temp.bn_num('Izgovoriti nijet'),
        pg_temp.bn_num('Dotaknuti dlanovima čistu suhu zemlju i potrati lice, zatim ponovo dotaknuti zemlju i potrati obje ruke do iza laktova'),
        pg_temp.bn_h('Namaski šarti — Prije namaza (6 uvjeta):', 3),
        pg_temp.bn_num('Da bude čisto tijelo, odijelo i mjesto gdje se klanja'),
        pg_temp.bn_num('Uzeti abdest'),
        pg_temp.bn_num('Propisno se obući (pokriti avret)'),
        pg_temp.bn_num('Na vrijeme klanjati'),
        pg_temp.bn_num('Okrenuti se prema Kibli'),
        pg_temp.bn_num('Zanijetiti (donijeti odluku za namaz)'),
        pg_temp.bn_h('Namaski šarti — U toku namaza (6 ruknova):', 3),
        pg_temp.bn_num('Iftitahi-tekbir (Početni tekbir)'),
        pg_temp.bn_num('Kijam (Stajanje u namazu)'),
        pg_temp.bn_num('Kiraet (Učenje Kur''ana)'),
        pg_temp.bn_num('Ruku'' (Pregib u namazu)'),
        pg_temp.bn_num('Sedžda'),
        pg_temp.bn_num('Ka''dei-ehire (Zadnje sjedenje u namazu)')
      ),
      13, v_admin_id
    );

    -- Lesson 14: Imanski šarti — Islamsko vjerovanje
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic2_id, 'Imanski šarti — Islamsko vjerovanje',
      jsonb_build_array(
        pg_temp.bn_h('Imanski šarti (Islamsko vjerovanje)', 2),
        pg_temp.bn_p('Islamsko vjerovanje, iman, sastoji se od šest temeljnih istina vjere ili šest imanskih šarta:'),
        pg_temp.bn_num('ĀMENTU BILLĀHI — Ja vjerujem u Allaha'),
        pg_temp.bn_num('VE MELĀIKETIHĪ — I vjerujem u Njegove meleke'),
        pg_temp.bn_num('VE KUTUBIHĪ — I vjerujem u Njegove Knjige'),
        pg_temp.bn_num('VE RUSULIHĪ — I vjerujem u Njegove poslanike'),
        pg_temp.bn_num('VEL-JEVMIL-ĀHIRI — I vjerujem u Sudnji dan'),
        pg_temp.bn_num('VE BIL-KADERI HAJRIHĪ VE ŠERRIHĪ MINELLĀHI TE''ĀLA — I vjerujem da sve što se događa, dobro i zlo, biva Allahovom voljom i određenjem'),
        pg_temp.bn_h('Stihovi o imanskim šartima', 3),
        pg_temp.bn_p(E'AMENTU BILLAHI:\nJa vjerujem u jednog Boga,\nKoji stvori svakog roba.\nOn sazda svemir cijeli\nda se samo Njemu divi.\n\nVE MELAIKETIHI:\nI vjerujem sve meleke,\nBez grijeha i bez mane.\nTako ih Bog stvori,\nNurom obasjane.\n\nVE KUTUBIHI:\nI vjerujem u Kitabe,\nto su riječi Uzvišenog.\nČetiri su odabrane,\nKur''anom potvrđene.\n\nVE RUSULIHI:\nI vjerujem u poslanike,\nAllahove miljenike.\nVjeru su nam dostavili,\nsvakom dobru podučili.\n\nVEL-JEVMIL-AHIRI:\nI vjerujem u Sudnji dan,\nkad će djela na mizan.\nOd Vatre se treba spasiti\ni u Džennetu se skrasiti.\n\nVA BIL-KADERI HAJRIHI VE ŠERRIHI MINELLAHI TE''ALA:\nI vjerujem da sve što se događa,\nšto umire i što se rađa,\nšto noć krije a dan otkriva,\nAllahovom voljom biva.\n\n(E. Nurović)'),
        pg_temp.bn_p('Imanske šarte treba znati i u njih čvrsto vjerovati. Ko ih zna i vjeruje srcem i jezikom on je vjernik — musliman.')
      ),
      14, v_admin_id
    );

    -- Lesson 15: Prvi imanski šart: Āmentu billāhi i Sura Ihlas
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic2_id, 'Prvi imanski šart: Āmentu billāhi i Sura Ihlas',
      jsonb_build_array(
        pg_temp.bn_h('Prvi imanski šart', 2),
        pg_temp.bn_h('ĀMENTU BILLĀHI — JA VJERUJEM U ALLAHA, DŽELLE ŠANUHU', 3),
        pg_temp.bn_p('Razmišljanjem o onom što nas okružuje, razum nas dovodi do uvjerenja da mora postojati neko savršen i moćan ko je sve stvorio i ko svim vlada i upravlja. To je Svemogući Allah, dželle šanuhu. Allah je stvoritelj i Gospodar svega što vidimo i što ne vidimo.'),
        pg_temp.bn_p('Allah je stvorio Zemlju i nebo, životinje i biljke. Stvorio je čovjeka u najljepšem obliku.'),
        pg_temp.bn_p('Kada spomenemo Božije ime Allah, treba da kažemo: dželle šanuhu, što znači: Uzvišeni ili Svevišnji, a skraćeno se piše: dž.š.'),
        pg_temp.bn_h('Suretul-Ihlas', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'KUL HUVALLĀHU EHAD.\nALLĀHUS-SAMED.\nLEM JELID VE LEM JŪLED\nVE LEM JEKUN LEHŪ KUFUVEN EHAD.'),
        pg_temp.bn_h('Prijevod:', 3),
        pg_temp.bn_p(E'Reci: „Allah je jedan.\nAllah je utočište svemu.\nNije rodio i rođen nije,\ni niko Mu ravan nije.”')
      ),
      15, v_admin_id
    );

    -- Lesson 16: Drugi imanski šart: Ve melāiketihī (Meleki)
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic2_id, 'Drugi imanski šart: Ve melāiketihī (Meleki)',
      jsonb_build_array(
        pg_temp.bn_h('Drugi imanski šart', 2),
        pg_temp.bn_h('VE MELĀIKETIHĪ — VJERUJEM U ALLAHOVE MELEKE', 3),
        pg_temp.bn_p('Meleki su razumna, duhovna, nevidljiva bića. Stvoreni su od nura – svjetlosti. Meleki ne griješe, oni slave i veličaju Allaha. Stalno služe Allahu i imaju svoja zaduženja. Nisu muškog ni ženskog spola, ne jedu i ne piju. Meleka ima mnogo, a njihov broj zna samo Allah.'),
        pg_temp.bn_h('Imena najpoznatijih meleka i njihove dužnosti su:', 3),
        pg_temp.bn_bullet('DŽIBRIL: Prenosio je i dostavljao Božije objave poslanicima'),
        pg_temp.bn_bullet('MELEK SMRTI (AZRAIL): Rastavlja duše od tijela u času smrti'),
        pg_temp.bn_bullet('MIKAIL: Brine se o prirodnim pojavama (vjetru, kiši, rastu bilja)'),
        pg_temp.bn_bullet('ISRAFIL: Puhanjem u sur najavit će Kijametski i Sudnji dan'),
        pg_temp.bn_bullet('KIRAMEN KATIBIN: Prate ljude, pišu njihova djela i donose im dobre misli'),
        pg_temp.bn_bullet('MUNKIR I NEKIR: Ispituju u mezaru svakog čovjeka'),
        pg_temp.bn_p('Osim meleka, Allah je stvorio i druga nevidljiva bića, a to su džini i šejtani. Šejtani donose ružne misli i navode na zlo.'),
        pg_temp.bn_p('Zaštitu od prokletog šejtana tražimo od Allaha, dželle šanuhu, riječima:'),
        pg_temp.bn_h('E''ŪZUBILLĀHI MINEŠ-ŠEJTĀNIR-RADŽĪM', 3),
        pg_temp.bn_p('Utječem se Allahu od prokletog šejtana.')
      ),
      16, v_admin_id
    );

    -- Lesson 17: Treći imanski šart: Ve kutubihī (Božije knjige)
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic2_id, 'Treći imanski šart: Ve kutubihī (Božije knjige)',
      jsonb_build_array(
        pg_temp.bn_h('Treći imanski šart', 2),
        pg_temp.bn_h('VE KUTUBIHĪ — VJERUJEM U ALLAHOVE KNJIGE — OBJAVE', 3),
        pg_temp.bn_p('Allahove Knjige su Objave koje je melek Džibril dostavljao poslanicima, s ciljem da ih prenesu i objasne ljudima. Prva objava dostavljena je prvom čovjeku, Ademu, a.s.'),
        pg_temp.bn_p('Sve Objave pozivale su ljude da vjeruju u Jednog Boga i da se Njemu pokoravaju. Objavljene su četiri velike Knjige. Bilo je i manjih Objava koje se zovu Suhufi.'),
        pg_temp.bn_h('Četiri velike Knjige — Objave su:', 3),
        pg_temp.bn_bullet('TEVRAT: Objavljen Musau, alejhis-selam'),
        pg_temp.bn_bullet('ZEBUR: Objavljen Davudu, alejhis-selam'),
        pg_temp.bn_bullet('INDŽIL: Objavljen Isau, alejhis-selam'),
        pg_temp.bn_bullet('KUR''AN: Objavljen Muhammedu, alejhis-selam'),
        pg_temp.bn_h('Kur''an-i Kerim', 3),
        pg_temp.bn_p('Kur''an je posljednja Allahova knjiga koja je preko Muhammeda, a.s., objavljena svim ljudima. U njemu su sadržane upute, savjeti, dove i propisi o islamskom načinu života. Kur''an je putokaz ljudima kako bi bili sretni na ovom i Budućem svijetu. Objavljen je na arapskom jeziku. Objava je trajala 23 godine. Sastoji se od 114 sura.'),
        pg_temp.bn_p(E'„Nema bolje knjige od Kur''ana niti ljepše vjere od islama.\nU njemu su mudre riječi što nas vode pravoj sreći.”')
      ),
      17, v_admin_id
    );

    -- Lesson 18: Četvrti imanski šart: Ve rusulihī (Božiji poslanici)
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic2_id, 'Četvrti imanski šart: Ve rusulihī (Božiji poslanici)',
      jsonb_build_array(
        pg_temp.bn_h('Četvrti imanski šart', 2),
        pg_temp.bn_h('VE RUSULIHĪ — VJERUJEM U ALLAHOVE POSLANIKE', 3),
        pg_temp.bn_p('Božiji poslanici su odabrani ljudi, koje je Allah, dž.š., iz Svoje milosti slao ljudima, da im dostave i objasne Allahovu Objavu — Uputu. Allah je svakom narodu slao poslanika i zato ih je bilo više, a Kur''an imenom spominje 25.'),
        pg_temp.bn_p('Prvi čovjek na Zemlji je bio Adem, a.s. On je bio i prvi Božiji poslanik. Posljednji poslanik je Muhammed, a.s., i poslije njega do Sudnjeg dana neće biti poslanika.'),
        pg_temp.bn_h('Odabrani Božiji poslanici su:', 3),
        pg_temp.bn_num('Ādem, a.s.'),
        pg_temp.bn_num('Nūh, a.s.'),
        pg_temp.bn_num('Ibrāhīm, a.s.'),
        pg_temp.bn_num('Mūsā, a.s.'),
        pg_temp.bn_num('Īsā, a.s.'),
        pg_temp.bn_num('Muhammed, a.s.'),
        pg_temp.bn_p('Iza imena poslanika treba dodati: alejhis-selam, što znači: Neka je na njega mir, a skraćeno se piše a.s.')
      ),
      18, v_admin_id
    );

    -- Lesson 19: Muhammed, a.s. — Posljednji Božiji poslanik
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic2_id, 'Muhammed, a.s. — Posljednji Božiji poslanik',
      jsonb_build_array(
        pg_temp.bn_h('Muhammed, a.s.', 2),
        pg_temp.bn_p('Muhammed, a.s., je posljednji Božiji poslanik. Rođen je 571. godine u Mekki, u plemenu Kurejš. Njegov otac se zvao Abdullah, a majka Amina. Veoma rano ostao je bez roditelja. Od šeste godine brigu o njemu preuzima njegov djed Abdulmuttalib, a potom amidža Ebu Talib.'),
        pg_temp.bn_p('Allah, dž.š., ga je odabrao za Svoga poslanika i prenosioca posljednje Božije Objave ljudima. U četrdesetoj godini života, primio je prvu Objavu u pećini Hira i postao Božiji poslanik. Nakon trinaest godina, sa muslimanima iz Mekke preseljava se u Medinu i tu ostaje do kraja života. Na Ahiret je preselio u 63. godini u Medini, koja je po njemu dobila ime Medinetun-Nebijj.'),
        pg_temp.bn_p('Muhammed, a.s., je najodabraniji čovjek i najbolji primjer ljudima kako treba živjeti i vjerovati.'),
        pg_temp.bn_h('Kasida: Ahmede Muhammede', 3),
        pg_temp.bn_p(E'Moje srce tužno je\nšto ne imade sreće te,\nda druguje uz tebe\nAhmede Muhammede.\n\nKao naj kad zaplače\nmoje oči zarose\nželjne tvoje blizine,\nAhmede Muhammede.\n\nTi si milost Milosnog\nTi si radost srca mog,\nTi si lijek za rane\nAhmede Muhammede.\n\nAškom srce mi gori\nželjno tebe da vidi,\nnaš dragi pejgambere\nAhmede Muhammede.\n\nMojoj duši mehlem je\nkad salavat donese,\nkad ti ime spomene\nAhmede Muhammede.')
      ),
      19, v_admin_id
    );

    -- Lesson 20: Peti imanski šart: Vel-jevmil-āhiri i Sura Kevser
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic2_id, 'Peti imanski šart: Vel-jevmil-āhiri i Sura Kevser',
      jsonb_build_array(
        pg_temp.bn_h('Peti imanski šart', 2),
        pg_temp.bn_h('VEL-JEVMIL-ĀHIRI — VJERUJEM U SUDNJI DAN', 3),
        pg_temp.bn_p('Nakon života na ovome svijetu, koji je prolazan, ljudi će biti proživljeni na Ahiretu, koji je vječan. Sudnji dan je vrijeme kada će ljudi poslije proživljenja na Drugom svijetu odgovarati za svoja djela.'),
        pg_temp.bn_p('Svakom čovjeku bit će pokazana njegova dobra i loša djela, koja su pisali meleki kiramen katibin.'),
        pg_temp.bn_p('Ko bude vjerovao u Allaha, dž.š., i činio dobra djela, Božijom milošću bit će uveden u Džennet. U koga bude više loših djela, bit će kažnjen Džehennemom, ako mu Allah, dž.š., ne oprosti. Kada će biti Sudnji dan zna samo Allah, dž.š.'),
        pg_temp.bn_h('Džennet', 3),
        pg_temp.bn_p('Džennet je mjesto na Drugom svijetu u kome će vjernici vječno boraviti i uživati sve blagodati.'),
        pg_temp.bn_h('Džehennem', 3),
        pg_temp.bn_p('Džehennem je mjesto na Drugom svijetu u kome će nevjernici i griješnici, koji su se ogriješili o Božije naredbe ispaštati za svoje grijehe, ukoliko im se Allah ne smiluje i ne oprosti im.'),
        pg_temp.bn_h('Suretu-l-Kevser', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'INNĀ E''ATAJNĀKEL-KEVSER,\nFE SALLI LI RABBIKE VEN-HAR,\nINNE ŠĀNI''EKE HUVEL-EBTER.'),
        pg_temp.bn_h('Prijevod:', 3),
        pg_temp.bn_p(E'Mi smo ti, uistinu, mnogo dobro dali,\nzato se Gospodaru svome moli i kurban kolji.\nOnaj koji tebe mrzi sigurno će on bez spomena ostati.')
      ),
      20, v_admin_id
    );

    -- Lesson 21: Šesti imanski šart: Ve bil-kaderi (Kader) i pjesma
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic2_id, 'Šesti imanski šart: Ve bil-kaderi (Kader) i pjesma',
      jsonb_build_array(
        pg_temp.bn_h('Šesti imanski šart', 2),
        pg_temp.bn_h('VE BIL-KADERI HAJRIHĪ VE ŠERRIHĪ MINELLĀHI TE''ĀLA', 3),
        pg_temp.bn_p('Vjerujem da sve što se događa, dobro i loše, biva s Allahovom voljom i Allahovim određenjem.'),
        pg_temp.bn_p('Allah je stvoritelj svega. On određuje sva zbivanja. Sve što se dešava, biva sa Božijom voljom i određenjem. Ono što Allah hoće to će i biti, a što neće ne može ni biti.'),
        pg_temp.bn_p('Allah je podario ljudima razum i dao slobodnu volju, mogućnost izbora, da biraju između dobrih i loših djela. Zato čovjek treba nastojati da radi dobra djela. Ako ga zadesi kakva nesreća, treba biti strpljiv. Allahu je poznato sve što je bilo i što će biti.'),
        pg_temp.bn_h('Rabba traži i uči', 3),
        pg_temp.bn_p(E'Allah, Allah, huve rabbuna, La ilahe illallah.\n\nRabba traži i uči,\nzikrullah ti sve viči,\ndolazit ćeš sve jači,\nLa ilahe illallah.\n\nTi namaza ne puštaj,\ndinski direk sačuvaj,\ndobru i zlu ima kraj,\nLa ilahe illallah.\n\nAllah jedan On je Hakk.\nTo priznati mora svak,\nod zuluma On je pak,\nLa ilahe illallah.\n\nO muslime, ne spavaj,\nuči Kur''an i slušaj,\nsvog sabaha ne puštaj,\nLa ilahe illallah.\n\nKada dođe Zadnji čas,\nuzalud je tražit spas.\nNek sačuva Allah nas,\nLa ilahe illallah.')
      ),
      21, v_admin_id
    );

    -- Lesson 22: Ponavljanje gradiva — Imanski šarti
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic2_id, 'Ponavljanje gradiva — Imanski šarti',
      jsonb_build_array(
        pg_temp.bn_h('Ponavljanje je majka znanja', 2),
        pg_temp.bn_p('Provjerite svoje znanje o imanskim šartima:'),
        pg_temp.bn_num('Koliko ima šartova — uvjeta u islamu?'),
        pg_temp.bn_num('Kako glasi prvi imanski šart?'),
        pg_temp.bn_num('Šta znači Amentu billahi?'),
        pg_temp.bn_num('Šta znači Ve rusulihi?'),
        pg_temp.bn_num('Prouči suru Ihlas!'),
        pg_temp.bn_num('Koji su najpoznatiji meleki?'),
        pg_temp.bn_num('Kako se zove melek koji je dostavljao Božije Objave?'),
        pg_temp.bn_num('Šta rade meleki zvani Kiramen katibin?'),
        pg_temp.bn_num('Nabroj velike Božije Objave!'),
        pg_temp.bn_num('Koja Božija Objava je objavljena Isa, alejhis-selamu?'),
        pg_temp.bn_num('Šta znači alejhis-selam?'),
        pg_temp.bn_num('Koja je posljednja Božija Objava?'),
        pg_temp.bn_num('Koliko sura ima u Kur''anu?'),
        pg_temp.bn_num('Koliko je u Kur''anu imenom spomenuto Božijih poslanika?'),
        pg_temp.bn_num('Ko je prvi čovjek i prvi Božiji poslanik?'),
        pg_temp.bn_num('Koji je posljednji Božiji poslanik?'),
        pg_temp.bn_num('Kada je rođen Muhammed, a.s.?'),
        pg_temp.bn_num('U kojoj godini života je Muhammed, a.s., primio prvu Objavu?'),
        pg_temp.bn_num('Prouči kasidu Ahmede Muhammede!'),
        pg_temp.bn_num('Kada će biti Sudnji dan?'),
        pg_temp.bn_num('Šta je nagrada za vjernike na Ahiretu?'),
        pg_temp.bn_num('Prouči suru El-Kevser!'),
        pg_temp.bn_num('Ko određuje sudbinu ljudima?')
      ),
      22, v_admin_id
    );

    -- ─────────────────────────────────────────────────────────────────
    -- LESSONS: TOPIC 3 (Islamski šarti — Islamske dužnosti)
    -- ─────────────────────────────────────────────────────────────────

    -- Lesson 23: Islamski šarti i Sura Felek
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic3_id, 'Islamski šarti i Sura Felek',
      jsonb_build_array(
        pg_temp.bn_h('Islamski šarti (Glavne islamske dužnosti)', 2),
        pg_temp.bn_p('Islamski šarti su glavne islamske dužnosti. Naređeni su u Kur''anu kao stroga obaveza. Vjernik i vjernica, osim vjerovanja, dužni su izvršavati islamske dužnosti.'),
        pg_temp.bn_h('Glavnih islamskih dužnosti ima pet:', 3),
        pg_temp.bn_num('KELIME-I-ŠEHADET'),
        pg_temp.bn_num('NAMAZE KLANJATI'),
        pg_temp.bn_num('RAMAZAN POSTITI'),
        pg_temp.bn_num('ZEKAT DAVATI'),
        pg_temp.bn_num('HADŽ OBAVITI'),
        pg_temp.bn_p('Oni koji izvršavaju glavne islamske dužnosti i druge Božije zapovijedi nadaju se Allahovoj, dželle šanuhu, nagradi.'),
        pg_temp.bn_h('Suretul-Felek', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'KUL E''ŪZU BI RABBIL-FELEK,\nMIN ŠERRI MĀ HALEK,\nVE MIN ŠERRI GĀSIKIN IZĀ VEKAB,\nVE MIN ŠERRIN-NEFFĀSĀTI FIL-''UKAD,\nVE MIN ŠERRI HĀSIDIN IZĀ HASED.'),
        pg_temp.bn_h('Prijevod:', 3),
        pg_temp.bn_p(E'Reci: „Utječem se Gospodaru svitanja\nod zla onoga što On stvara,\ni od zla mrkle noći kada razastre tmine,\ni od zla smutljivca kada smutnju sije,\ni od zla zavidljivca kada zavist ne krije!”')
      ),
      23, v_admin_id
    );

    -- Lesson 24: Prvi islamski šart: Kelime-i-šehadet i Sura Nas
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic3_id, 'Prvi islamski šart: Kelime-i-šehadet i Sura Nas',
      jsonb_build_array(
        pg_temp.bn_h('Prvi islamski šart', 2),
        pg_temp.bn_h('KELIME-I-ŠEHADET — OČITOVANJE PRIPADNOSTI ISLAMU', 3),
        pg_temp.bn_p('Šehadet znači: srcem vjerovati i jezikom svjedočiti postojanje Jednog Boga, Stvoritelja i Vladara svih svjetova, Koji je preko Muhammeda, a.s., ukazao Svoju milost cijelom čovječanstvu.'),
        pg_temp.bn_h('Ponovimo kako glasi Kelime-i-šehadet:', 3),
        pg_temp.bn_h('EŠHEDU EN LĀ ILĀHE ILLALLĀH, VE EŠHEDU ENNE MUHAMMEDEN ''ABDUHŪ VE RESŪLUHŪ.', 3),
        pg_temp.bn_p('Vjerujem i svjedočim da nema božanstva osim Allaha, i vjerujem i svjedočim da je Muhammed Allahov rob i poslanik!'),
        pg_temp.bn_p('Kelime-i-šehadetom iskazujemo i potvrđujemo svoju pripadnost islamu kroz pokornost i vjerovanje u Allaha, dž.š., i poslanstvo Muhammeda, a.s.'),
        pg_temp.bn_h('Suretun-Nas', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'KUL E''ŪZU BI RABBIN-NĀS,\nMELIKIN-NĀS,\nILĀHIN-NĀS,\nMIN ŠERRIL-VESVĀSIL-HANNĀS,\nELLEZĪ JUVESVISU FĪ SUDŪRIN-NĀS,\nMINEL-DŽINNETI VEN-NĀS.'),
        pg_temp.bn_h('Prijevod:', 3),
        pg_temp.bn_p(E'Reci: „Tražim zaštitu Gospodara ljudi,\nVladara ljudi, Boga ljudi,\nod zla šejtana — napasnika,\nkoji zle misli unosi u srca ljudi —\nod džina i od ljudi!”')
      ),
      24, v_admin_id
    );

    -- Lesson 25: Drugi islamski šart: Propisane namaze klanjati
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic3_id, 'Drugi islamski šart: Propisane namaze klanjati',
      jsonb_build_array(
        pg_temp.bn_h('Drugi islamski šart', 2),
        pg_temp.bn_h('PROPISANE NAMAZE KLANJATI', 3),
        pg_temp.bn_p('Namaz je stroga islamska dužnost naređena u Kur''anu i potvrđena praksom Muhammeda, a.s. Klanjanjem namaza iskazujemo pokornost i poštovanje Allahu, dž.š., na najuzvišeniji način.'),
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
        pg_temp.bn_p('Klanjati učimo kad pođemo u školu, a dužni smo redovno klanjati od desete godine života.')
      ),
      25, v_admin_id
    );

    -- Lesson 26: Treći islamski šart: Postiti mjesec ramazan
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic3_id, 'Treći islamski šart: Postiti mjesec ramazan',
      jsonb_build_array(
        pg_temp.bn_h('Treći islamski šart', 2),
        pg_temp.bn_h('POSTITI MJESEC RAMAZAN', 3),
        pg_temp.bn_p('Post je islamska dužnost naređena Kur''anom. Ramazanski post je čuvanje od jela, pića, drugih tjelesnih uživanja i ružnih djela od zore do zalaska sunca.'),
        pg_temp.bn_p('Ramazan je najodabraniji mjesec u godini u kome je počela objava Kur''ana. U ramazanu postimo, dajemo zekat i sadekatul-fitr, klanjamo teraviju, spremamo iftare, učimo Kur''an i radimo druga dobra djela.'),
        pg_temp.bn_h('Post počinjemo nijetom:', 3),
        pg_temp.bn_h('NEVEJTU EN ESŪME GADEN LILLĀHI TE''ĀLĀ FERĪDATEN MIN ŠEHRI RAMADĀNE.', 3),
        pg_temp.bn_p('Prijevod: „Odlučih, u ime Allaha, da postim ovaj dan mjeseca ramazana!”'),
        pg_temp.bn_h('Post prekidamo iftarom prije kojeg učimo dovu:', 3),
        pg_temp.bn_h('ALLĀHUMME INNĪ LEKE SUMTU, VE BIKE ĀMENTU, VE ''ALEJKE TEVEKKELTU VE ''ALĀ RIZKIKE EFTARTU.', 3),
        pg_temp.bn_p('Prijevod: „Allahu moj, radi Tebe postim, u Tebe vjerujem, u Tebe se uzdam, i Tvojom opskrbom se iftarim!”'),
        pg_temp.bn_p('Postom su zaduženi svi odrasli, pametni i zdravi muslimani i muslimanke. Ramazanski post završava se svečanim danima Ramazanskog bajrama.')
      ),
      26, v_admin_id
    );

    -- Lesson 27: Četvrti islamski šart: Zekat davati i Sura Leheb
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic3_id, 'Četvrti islamski šart: Zekat davati i Sura Leheb',
      jsonb_build_array(
        pg_temp.bn_h('Četvrti islamski šart', 2),
        pg_temp.bn_h('ZEKAT DAVATI', 3),
        pg_temp.bn_p('Zekat je stroga islamska dužnost propisana Kur''anom svim imućnim muslimanima, da obavezno izdvoje i daju jedan dio imovine iz viška imetka, islamskim odgojno-obrazovnim ustanovama i siromašnim muslimanima.'),
        pg_temp.bn_p('Davalac zekata postiže Božije zadovoljstvo i milost, čisti imetak od tuđeg prava, štiti ga od propadanja i čuva svoje srce od škrtosti. Zekat se obično daje uz ramazan, a može se dati i tokom cijele godine.'),
        pg_temp.bn_h('Imovina na koju treba dati zekat:', 3),
        pg_temp.bn_bullet('Poljoprivredni proizvodi'),
        pg_temp.bn_bullet('Zlato, srebro i novac'),
        pg_temp.bn_bullet('Trgovačka roba'),
        pg_temp.bn_bullet('Stoka'),
        pg_temp.bn_p('Pravo i dužnost da sakuplja zekat isključivo pripada Islamskoj zajednici.'),
        pg_temp.bn_h('Suretul-Leheb', 2),
        pg_temp.bn_h('BISMILLĀHIR-RAHMĀNIR-RAHĪM', 3),
        pg_temp.bn_p(E'TEBBET JEDĀ EBĪ LEHEBIN VE TEBB,\nMĀ AGNĀ ''ANHU MĀLUHŪ VE MĀ KESEB,\nSE JASLĀ NĀREN ZĀTE LEHEB,\nVEMRE-''ETUHŪ HAMMĀLETEL-HATAB,\nFĪ DŽĪDIHĀ HABLUN MIN MESED.'),
        pg_temp.bn_h('Prijevod:', 3),
        pg_temp.bn_p(E'Neka propadne Ebu Leheb, i propao je!\nNeće mu biti od koristi blago njegovo,\na ni ono što je stekao.\nUći će on, sigurno, u vatru rasplamsalu,\ni žena njegova koja spletkari;\no vratu njenu bit će uže od ličine usukane!')
      ),
      27, v_admin_id
    );

    -- Lesson 28: Peti islamski šart: Hadž obaviti i Telbija
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic3_id, 'Peti islamski šart: Hadž obaviti i Telbija',
      jsonb_build_array(
        pg_temp.bn_h('Peti islamski šart', 2),
        pg_temp.bn_h('HADŽ OBAVITI', 3),
        pg_temp.bn_p('Hadž je peta islamska dužnost i Božija naredba svakom punoljetnom, pametnom, imućnom i zdravom muslimanu i muslimanki da ga obavi jednom u životu kad bude u mogućnosti. Hadž je posjeta Kabi i drugim svetim mjestima u Mekki.'),
        pg_temp.bn_p('Prije odlaska na hadž, dužnost hadžije je da izmiri dugove ako ih ima i obezbjedi porodicu dok se ne vrati.'),
        pg_temp.bn_h('Kraj Kabe sam ja stajao', 3),
        pg_temp.bn_p(E'Kraj Kabe sam ja stajao,\nhej, aman, aman, ja stajao,\ncrne grijehe sapirao,\nhej, aman, aman, sapirao!\n\nSvom se Rabbu odzivao:\nLebbejkellāhumme, lebbejk,\nlebbejkallāhu!\nlebbejkellāhumme, lebbejk,\nlebbejkellāh!\n\nU tavafu hodao sam,\nhej, aman, aman, hodao sam,\nka''no zvijezda drhtao sam,\nhej, aman, aman, drhtao sam.\n\nKo Ibrahim vikao sam:\nLebbejkellāhumme, lebbejk,\nlebbejkallāhu!\nlebbejkellāhumme, lebbejk,\nlebbejkellāh!\n\nPokraj vrela Zemzemova\nhej, aman, aman, zemzemova,\nslegla jata labudova,\nhej, aman, aman, labudova!\n\nŽamor želja i glasova:\nLebbejkellāhumme, lebbejk,\nlebbejkallāhu!\nlebbejkellāhumme, lebbejk,\nlebbejkellāh!\n\nIz srdašca ašikane,\nhej, aman, aman, ašikane,\nte rijeke neprestane,\nhej, aman, aman, neprestane!\n\nTeče islam na sve strane:\nLebbejkellāhumme, lebbejk,\nlebbejkallāhu!\nlebbejkellāhumme, lebbejk,\nlebbejkellāh!')
      ),
      28, v_admin_id
    );

    -- Lesson 29: Ponavljanje gradiva — Islamski šarti
    perform pg_temp.upsert_lesson(
      r_mosque.id, v_topic3_id, 'Ponavljanje gradiva — Islamski šarti',
      jsonb_build_array(
        pg_temp.bn_h('Ponavljanje je majka znanja', 2),
        pg_temp.bn_p('Provjerite svoje znanje o islamskim dužnostima:'),
        pg_temp.bn_num('Koliko ima glavnih islamskih dužnosti?'),
        pg_temp.bn_num('Kako glasi prvi islamski šart?'),
        pg_temp.bn_num('Šta svjedočimo Kelime-i-šehadetom?'),
        pg_temp.bn_num('Koji je drugi islamski šart?'),
        pg_temp.bn_num('Koliko ima dnevnih namaza?'),
        pg_temp.bn_num('Kada klanjamo sabah-namaz?'),
        pg_temp.bn_num('U koje vrijeme se klanja džuma-namaz?'),
        pg_temp.bn_num('Kako glasi treći islamski šart?'),
        pg_temp.bn_num('Kako glasi nijet za post?'),
        pg_temp.bn_num('Prouči dovu uz koju se iftarimo.'),
        pg_temp.bn_num('Od čega se čuvamo prilikom posta?'),
        pg_temp.bn_num('Ko je dužan postiti?'),
        pg_temp.bn_num('Koji je četvrti islamski šart?'),
        pg_temp.bn_num('Na koju imovinu trebamo dati zekat?'),
        pg_temp.bn_num('Šta je to hadž?'),
        pg_temp.bn_num('Ko je dužan obaviti hadž?'),
        pg_temp.bn_num('Prouči suru Felek.'),
        pg_temp.bn_num('Kako glasi Suretun-Nas?'),
        pg_temp.bn_num('Prouči suru Leheb.')
      ),
      29, v_admin_id
    );

  end loop;
end;
$migration$;
