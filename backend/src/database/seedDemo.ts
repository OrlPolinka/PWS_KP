import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

type IdRow = { id: string };
type ScheduleRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  trainer_id: string;
};

const password = 'dance123!';
const mediaRoot = '/uploads/demo';

const styleData = [
  { name: 'Hip Hop', difficulty: 'beginner', description: 'Грув, базовые шаги и музыкальность. Подходит для знакомства с уличными танцами.', benefits: ['Координация', 'Ритм', 'Уверенность'], slug: 'hip-hop' },
  { name: 'Contemporary', difficulty: 'intermediate', description: 'Пластика, работа с полом и выразительное движение на стыке техник.', benefits: ['Гибкость', 'Баланс', 'Выразительность'], slug: 'contemporary' },
  { name: 'Jazz Funk', difficulty: 'intermediate', description: 'Энергичная хореография, акценты и сценическая подача под современную музыку.', benefits: ['Артистизм', 'Координация', 'Выносливость'], slug: 'jazz-funk' },
  { name: 'Бачата', difficulty: 'beginner', description: 'Парный социальный танец с мягкой работой корпуса и понятной базой.', benefits: ['Партнёрство', 'Осанка', 'Музыкальность'], slug: 'bachata' },
  { name: 'Сальса', difficulty: 'intermediate', description: 'Ритмичный парный танец с поворотами, шагами и активным взаимодействием.', benefits: ['Ритм', 'Координация', 'Общение'], slug: 'salsa' },
  { name: 'Балет', difficulty: 'beginner', description: 'Основы классического танца: позиции, постановка корпуса и мягкая растяжка.', benefits: ['Осанка', 'Сила', 'Гибкость'], slug: 'ballet' },
  { name: 'K-Pop', difficulty: 'beginner', description: 'Точная групповая хореография по мотивам популярных K-Pop клипов.', benefits: ['Память', 'Командная работа', 'Энергия'], slug: 'k-pop' },
  { name: 'Dancehall', difficulty: 'advanced', description: 'Самобытная ямайская культура движения, грув и работа с музыкальными акцентами.', benefits: ['Грув', 'Выносливость', 'Свобода движения'], slug: 'dancehall' },
  { name: 'Стретчинг', difficulty: 'beginner', description: 'Безопасная работа над мобильностью и гибкостью для танцоров любого уровня.', benefits: ['Мобильность', 'Восстановление', 'Гибкость'], slug: 'stretching' },
] as const;

const trainerData = [
  { name: 'Анна Ковалёва', email: 'trainer01@studio.demo', phone: '+375 29 111-20-01', style: 'Hip Hop', years: 9, bio: 'Танцую и преподаю hip hop больше девяти лет. На занятиях соединяем технику, музыкальность и удовольствие от движения.', education: 'Минская школа современного танца, курс педагогики хореографии', achievement: 'Финалистка городского battle-фестиваля 2024', slug: 'anna-kovaleva' },
  { name: 'Марк Соколов', email: 'trainer02@studio.demo', phone: '+375 29 111-20-02', style: 'Contemporary', years: 12, bio: 'Помогаю раскрыть собственный язык движения и уверенно чувствовать себя в импровизации.', education: 'Белорусский государственный университет культуры и искусств', achievement: 'Хореограф-постановщик студенческого театра', slug: 'mark-sokolov' },
  { name: 'Полина Орлова', email: 'trainer03@studio.demo', phone: '+375 29 111-20-03', style: 'Jazz Funk', years: 7, bio: 'Собираю яркие постановки и объясняю, как сделать каждое движение точным и выразительным.', education: 'Курсы сценического движения и jazz dance', achievement: 'Постановщик танцевальных номеров для городских мероприятий', slug: 'polina-orlova' },
  { name: 'Елена Миронова', email: 'trainer04@studio.demo', phone: '+375 29 111-20-04', style: 'Бачата', years: 8, bio: 'Учу комфортно танцевать в паре, слышать музыку и бережно выстраивать контакт.', education: 'Сертифицированный инструктор по social dance', achievement: 'Участница международных bachata-конгрессов', slug: 'elena-mironova' },
  { name: 'Денис Левченко', email: 'trainer05@studio.demo', phone: '+375 29 111-20-05', style: 'Сальса', years: 11, bio: 'На занятиях разбираем базу, повороты и ведение, постепенно переходя к свободному танцу.', education: 'Профессиональная подготовка по латиноамериканским танцам', achievement: 'Призёр республиканского конкурса социальных танцев', slug: 'denis-levchenko' },
  { name: 'Виктория Белова', email: 'trainer06@studio.demo', phone: '+375 29 111-20-06', style: 'Балет', years: 14, bio: 'Бережно знакомлю взрослых и детей с классическим танцем и основами грамотной техники.', education: 'Хореографическое училище, классический танец', achievement: 'Более 10 лет педагогической практики', slug: 'victoria-belova' },
  { name: 'София Черныш', email: 'trainer07@studio.demo', phone: '+375 29 111-20-07', style: 'K-Pop', years: 5, bio: 'Разучиваем любимые хореографии по частям, уделяя внимание синхронности и деталям.', education: 'Преподавательские интенсивы по K-Pop choreography', achievement: 'Руководитель двух танцевальных cover-команд', slug: 'sofia-chernysh' },
  { name: 'Артём Гончар', email: 'trainer08@studio.demo', phone: '+375 29 111-20-08', style: 'Dancehall', years: 10, bio: 'Знакомлю с dancehall-культурой и помогаю найти уверенный, свободный грув.', education: 'Dancehall workshops, Kingston and Warsaw', achievement: 'Участник международных танцевальных обменов', slug: 'artem-gonchar' },
  { name: 'Мария Фомина', email: 'trainer09@studio.demo', phone: '+375 29 111-20-09', style: 'Стретчинг', years: 6, bio: 'Провожу занятия по мобильности с вниманием к ощущениям и безопасной нагрузке.', education: 'Сертифицированный инструктор по stretching и mobility', achievement: 'Автор курса восстановления для танцоров', slug: 'maria-fomina' },
  { name: 'Илья Романов', email: 'trainer10@studio.demo', phone: '+375 29 111-20-10', style: 'Hip Hop', years: 6, bio: 'Помогаю новичкам освоиться в hip hop и продолжающим — увереннее импровизировать.', education: 'Школа уличных танцев, программа по freestyle', achievement: 'Участник Minsk Dance Weekend', slug: 'ilya-romanov' },
  { name: 'Ксения Павлова', email: 'trainer11@studio.demo', phone: '+375 29 111-20-11', style: 'Contemporary', years: 8, bio: 'Соединяю современную хореографию, дыхание и осознанную работу с телом.', education: 'Интенсивы по contemporary и контактной импровизации', achievement: 'Постановка вошла в программу молодёжного фестиваля', slug: 'ksenia-pavlova' },
  { name: 'Роман Васильев', email: 'trainer12@studio.demo', phone: '+375 29 111-20-12', style: 'Jazz Funk', years: 5, bio: 'Делаю хореографию понятной: сначала разбираем детали, затем собираем их в цельный номер.', education: 'Педагогическая практика по jazz funk', achievement: 'Финалист открытого танцевального чемпионата', slug: 'roman-vasiliev' },
] as const;

const clientNames = [
  'Алина Морозова', 'Максим Волков', 'Дарья Климова', 'Никита Фёдоров', 'Екатерина Савицкая',
  'Алексей Бондарь', 'Полина Громова', 'Иван Козлов', 'Софья Васильева', 'Михаил Жуков',
  'Валерия Соколова', 'Дмитрий Новик', 'Анастасия Лебедева', 'Кирилл Орехов', 'Мария Данилова',
  'Артём Кравцов', 'Елизавета Павлова', 'Роман Миронов', 'Виктория Захарова', 'Егор Смирнов',
  'Ксения Белова', 'Тимур Гусев', 'Ольга Филиппова', 'Станислав Романов', 'Юлия Антонова',
  'Денис Мельник', 'Наталья Зайцева', 'Андрей Петров', 'Кристина Баранова', 'Павел Воронов',
  'Вероника Лис', 'Матвей Королёв', 'Арина Кузнецова', 'Владислав Егоров', 'Татьяна Сидорова',
  'Глеб Никитин', 'Эмилия Фролова', 'Семён Павлов', 'Лилия Котова', 'Ярослав Киселёв',
  'Диана Шевченко', 'Богдан Титов', 'Алиса Макарова', 'Фёдор Григорьев', 'Кира Медведева',
  'Лев Осипов', 'Милана Захарова', 'Олег Беляев', 'Инна Крылова', 'Степан Тарасов',
  'Ангелина Волкова', 'Вадим Чернов', 'Светлана Руденко', 'Игорь Назаров', 'Таисия Емельянова',
  'Марк Алексеев', 'Карина Романова', 'Данила Семёнов', 'Алёна Колесникова', 'Вера Литвинова',
] as const;

const faqs = [
  ['Как записаться на занятие?', 'Откройте «Расписание», выберите занятие и нажмите кнопку записи. Проверьте, что абонемент действует на дату занятия и подходит по направлению.', 'запись расписание забронировать тренировка'],
  ['Где посмотреть расписание занятий?', 'Полное расписание на неделю находится в разделе «Расписание». В карточке занятия есть направление, тренер, зал, время и свободные места.', 'время занятий график расписание'],
  ['Как отменить запись?', 'Откройте раздел «Бронирования» и отмените занятие заранее. Если кнопка недоступна, напишите администратору в чате.', 'отменить бронь бронирование запись'],
  ['Как купить абонемент?', 'В каталоге «Абонементы» выберите подходящий вариант и завершите оплату. После подтверждения абонемент появится в вашем профиле.', 'оплата стоимость купить цена абонемент'],
  ['Как узнать остаток занятий?', 'Откройте раздел «Абонементы»: там отображаются оставшиеся посещения и срок действия каждого абонемента.', 'остаток посещений срок абонемент'],
  ['Какой уровень выбрать новичку?', 'Начните с занятий с пометкой «Начальный». Если сомневаетесь, расскажите администратору о своём опыте — поможем выбрать группу.', 'новичок начинающий уровень первый раз'],
  ['Можно ли прийти без партнёра на бачату?', 'Да. Для групповых занятий по бачате партнёр не обязателен: тренер меняет пары по ходу занятия.', 'бачата партнер одному пара'],
  ['Что взять на первое занятие?', 'Удобную спортивную одежду, чистую сменную обувь и бутылку воды. Для стретчинга пригодится коврик, но на первом занятии можно обойтись без него.', 'одежда обувь вода взять первое занятие'],
  ['Нужно ли покупать специальную обувь?', 'Для первого занятия достаточно чистой обуви с гибкой подошвой. Для отдельных направлений тренер заранее подскажет подходящую обувь.', 'обувь кроссовки форма'],
  ['Где находится студия?', 'Адрес и схему прохода можно уточнить у администратора в чате. При записи на занятие проверьте название зала в карточке расписания.', 'адрес локация как добраться зал'],
  ['Что делать, если опоздал?', 'Постарайтесь прийти за 5–10 минут до начала. Если задерживаетесь, предупредите тренера или администратора сообщением.', 'опоздал задерживаюсь начало'],
  ['Как показать QR-код?', 'Откройте раздел «Мой QR-код» и покажите его тренеру для отметки посещения.', 'qr код отметка посещение чек ин'],
  ['Можно ли заморозить абонемент?', 'Возможность паузы зависит от условий конкретного абонемента. Напишите администратору в чате, указав тип абонемента и желаемые даты.', 'заморозка пауза перерыв'],
  ['Абонемент скоро закончится — что делать?', 'Проверьте срок действия и остаток занятий в разделе «Абонементы». Если доступен запрос продления, отправьте его из карточки абонемента.', 'продлить заканчивается срок закончился'],
  ['Как запросить продление абонемента?', 'Откройте абонемент и отправьте запрос на продление. Администратор рассмотрит обращение; результат появится в уведомлениях.', 'продление запрос добавить дни посещения'],
  ['Как связаться с тренером?', 'Откройте раздел «Чат», найдите тренера и отправьте сообщение. Также можно написать администратору.', 'контакты поддержка помощь тренер написать'],
  ['Как изменить телефон или фото?', 'Откройте «Профиль», внесите изменения и сохраните. Фото можно загрузить в формате JPEG, PNG или WebP.', 'телефон фото имя личные данные профиль'],
  ['Есть ли пробное занятие?', 'В расписании можно выбрать подходящую группу. Условия первого визита уточните у администратора до записи.', 'пробное первое бесплатно знакомство'],
  ['Как узнать, сколько мест осталось?', 'Количество свободных мест отображается в карточке занятия в расписании. Если группа заполнена, выберите другое время или напишите администратору.', 'места свободно запись заполнено'],
  ['Что означает отметка «неявка»?', 'Неявка означает, что запись была активна, но посещение не отметили. Если данные внесены ошибочно, обратитесь к тренеру или администратору.', 'не пришел неявка пропуск'],
  ['Можно ли заниматься по одному абонементу на разных направлениях?', 'Это зависит от выбранного тарифа. Универсальные абонементы подходят для нескольких направлений, а некоторые действуют только на один стиль.', 'направления стиль универсальный абонемент'],
  ['Как выбрать между hip hop и jazz funk?', 'Hip Hop больше опирается на грув и уличную базу, Jazz Funk — на яркую постановочную хореографию. Посмотрите описания и уровни в каталоге стилей.', 'hip hop jazz funk стиль выбрать'],
  ['Нужно ли заранее бронировать место?', 'Да, запись через расписание помогает тренеру подготовить группу и сохранить за вами место.', 'бронь заранее место запись'],
  ['Где посмотреть новости студии?', 'Новости и объявления публикуются в разделе «Новости». Там появятся даты мероприятий, наборы в группы и изменения в работе студии.', 'новости мероприятие объявление'],
  ['К кому обратиться, если оплата не прошла?', 'Не повторяйте оплату, пока не проверили её статус. Напишите администратору в чате и приложите время попытки и название абонемента.', 'оплата ошибка платеж карта'],
  ['Можно ли отменить занятие в день тренировки?', 'Правила отмены зависят от времени до занятия. Откройте карточку бронирования; если отмена недоступна, обратитесь к администратору.', 'отмена сегодня опоздал отменить занятие'],
  ['Проводятся ли занятия для детей?', 'Актуальные возрастные группы уточняйте у администратора: состав и возрастные ограничения указаны в описании конкретной группы.', 'дети ребенок возраст детская группа'],
  ['Как подготовиться к стретчингу?', 'Наденьте удобную одежду, возьмите воду и не выполняйте резких растяжек до занятия. Тренер подберёт безопасную нагрузку.', 'стретчинг растяжка подготовка гибкость'],
  ['Можно ли заниматься при травме?', 'Сообщите тренеру о травме до начала занятия и следуйте рекомендациям медицинского специалиста. При сомнениях пропустите тренировку.', 'травма здоровье боль ограничение'],
  ['Как оставить отзыв о занятии?', 'Напишите администратору в чате: укажите направление, дату и что именно понравилось или что стоит улучшить.', 'отзыв предложение впечатление качество'],
  ['Как узнать, кто ведёт занятие?', 'Имя тренера указано в карточке каждого занятия. Откройте профиль тренера, чтобы посмотреть направления и описание опыта.', 'тренер кто ведет преподаватель'],
  ['Что происходит с посещением при отмене?', 'Отменённая запись сохраняется в истории, но не отмечается как посещённое занятие. Условия возврата посещения зависят от абонемента и времени отмены.', 'возврат посещение отмена списание'],
];

const newsData = [
  ['Открываем новый танцевальный сезон', 'В расписании появились группы для начинающих и продолжающих. Посмотрите новые направления и выберите удобное время для первой тренировки.', 'season-kickoff.jpg'],
  ['День открытых дверей — знакомимся со студией', 'Приглашаем посмотреть залы, познакомиться с тренерами и задать вопросы о направлениях. Подробности и запись уточняйте у администратора.', 'open-day.jpg'],
  ['Новый курс: K-Pop choreography', 'София запускает новый курс с поэтапным разбором хореографии, синхронностью и работой над деталями. В расписании доступны занятия начального уровня.', 'k-pop-course.jpg'],
  ['Танцевальный вечер по бачате и сальсе', 'Встречаемся на дружеском практикуме: повторим базу, сменим партнёров и потанцуем под любимую музыку. Уровень — открытый.', 'social-dance-evening.jpg'],
  ['Сбор группы по contemporary', 'Марк и Ксения приглашают на серию занятий по импровизации и пластике. Можно присоединиться без опыта сценических постановок.', 'contemporary-workshop.jpg'],
  ['Новая утренняя группа по стретчингу', 'Добавили занятия в удобное утреннее время. Работаем над мобильностью постепенно, без соревнования и резких нагрузок.', 'morning-stretch.jpg'],
  ['Поздравляем участников студийного показа', 'Спасибо всем, кто выступал и поддерживал команды. Фото и видео с показа можно будет добавить в галерею профилей тренеров.', 'studio-showcase.jpg'],
  ['Расписание на праздничную неделю', 'Проверьте актуальные дни и время занятий в расписании. Если слот временно отменён, это будет отмечено в карточке класса.', 'holiday-schedule.jpg'],
  ['Мастер-класс по музыкальности в Hip Hop', 'Анна и Илья покажут, как слышать акценты и строить движение вокруг музыки. Подойдёт участникам с базовым опытом и новичкам.', 'hip-hop-musicality.jpg'],
  ['Обновили зал для групповых занятий', 'В большом зале стало больше пространства для командных постановок и тренировок. Обратите внимание на название зала в карточке записи.', 'renovated-studio.jpg'],
  ['Приглашаем на открытый урок Jazz Funk', 'Полина и Роман подготовили комбинацию, которую можно разобрать на открытом уроке. Возьмите сменную обувь и приходите немного заранее.', 'jazz-funk-open-class.jpg'],
  ['Полезные советы для первого занятия', 'Добавили памятки о подготовке к тренировке, выборе одежды и безопасной разминке. Откройте раздел рекомендаций перед визитом.', 'first-class-tips.jpg'],
];

const trainingInfo = [
  ['Как подготовиться к первому занятию', 'Приходите за 10 минут, чтобы спокойно переодеться и познакомиться с тренером. Не требуется заранее знать хореографию — занятие начинается с разминки и базы.', 'preparation', 'first-class.jpg'],
  ['Одежда для танцев', 'Выбирайте одежду, которая не сковывает движения и позволяет тренеру видеть положение корпуса и коленей. Возьмите чистую сменную обувь.', 'what_to_bring', 'dancewear.jpg'],
  ['Что взять с собой', 'Возьмите воду, небольшое полотенце и сменную обувь. Для стретчинга можно принести личный коврик.', 'what_to_bring', 'dance-bag.jpg'],
  ['Правила зала', 'Уважайте пространство группы, не оставляйте вещи на танцевальном покрытии и сообщайте тренеру о самочувствии или ограничениях.', 'rules', 'studio-rules.jpg'],
  ['Разминка и безопасность', 'Не пропускайте разминку и не выполняйте движения через боль. Если есть травма или ограничение, сообщите тренеру до начала занятия.', 'rules', 'warm-up.jpg'],
  ['Как выбрать первый стиль', 'Подумайте, что вам ближе: постановочная хореография, парный социальный танец, классическая база или спокойная работа над гибкостью. Описание каждого направления есть в каталоге.', 'tips', 'dance-styles.jpg'],
  ['Как быстрее запоминать связки', 'Разбивайте комбинацию на короткие части, проговаривайте счёт и сначала отрабатывайте движения медленно. Регулярность важнее скорости.', 'tips', 'choreography-practice.jpg'],
  ['Полезно знать о парных танцах', 'На занятиях пары меняются по желанию группы. Слушайте сигналы партнёра, держите комфортную дистанцию и задавайте вопросы тренеру.', 'preparation', 'partner-dance.jpg'],
  ['Как выбрать обувь', 'Для большинства занятий подойдёт чистая удобная обувь с гибкой подошвой. Не надевайте уличную обувь на танцевальное покрытие.', 'what_to_bring', 'dance-shoes.jpg'],
  ['Восстановление после тренировки', 'Пейте воду, дайте телу время на восстановление и выполняйте растяжку только в комфортном диапазоне. При необычной боли обратитесь к специалисту.', 'tips', 'recovery.jpg'],
  ['Комфорт на занятии', 'Можно попросить тренера повторить движение или показать вариант помедленнее. Уважительный темп и вопросы — нормальная часть обучения.', 'rules', 'class-comfort.jpg'],
  ['Как участвовать в студийном показе', 'Следите за новостями о наборах и сообщайте тренеру о желании выступить. Участие в показах не обязательно для посещения обычных занятий.', 'tips', 'stage-rehearsal.jpg'],
] as const;

const addDays = (date: Date, amount: number): Date => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
};

const dateString = (date: Date): string => date.toISOString().slice(0, 10);

const currentWeekMonday = (today: Date): Date => {
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const day = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return monday;
};

const batchedInsert = async (
  client: Client,
  table: string,
  columns: string[],
  rows: unknown[][],
  returning = ''
): Promise<any[]> => {
  if (!rows.length) return [];
  const values: unknown[] = [];
  const placeholders = rows.map((row) => {
    const rowPlaceholders = row.map((value) => {
      values.push(value);
      return `$${values.length}`;
    });
    return `(${rowPlaceholders.join(', ')})`;
  });
  const result = await client.query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}${returning}`,
    values
  );
  return result.rows;
};

async function seedDemo(): Promise<void> {
  const expectedConfirmation = `--confirm-reset=${config.database.name}`;
  if (!process.argv.slice(2).includes(expectedConfirmation)) {
    throw new Error(
      `Refusing to erase database "${config.database.name}". Run this script explicitly with ${expectedConfirmation}.`
    );
  }

  for (const directory of ['admin', 'trainers', 'clients', 'styles', 'news', 'training']) {
    fs.mkdirSync(path.resolve(process.cwd(), 'uploads', 'demo', directory), { recursive: true });
  }

  const client = new Client({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
  });

  await client.connect();
  try {
    await client.query('BEGIN');
    console.log(`Resetting all Dance Studio data in database "${config.database.name}"...`);
    await client.query(`
      TRUNCATE TABLE
        membership_extension_requests,
        attendance,
        bookings,
        memberships,
        payments,
        membership_types,
        schedule,
        trainers,
        dance_styles,
        halls,
        messages,
        chatbot_faqs,
        notifications,
        training_info,
        news,
        users
      RESTART IDENTITY CASCADE
    `);

    const passwordHash = await bcrypt.hash(password, 10);
    const adminResult = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, photo_url, is_active, client_code)
       VALUES ($1, $2, 'admin', $3, $4, $5, TRUE, 'ADM-DEMO')
       RETURNING id`,
      ['admin@studio.demo', passwordHash, 'Александр Воронцов', '+375 29 100-00-01', `${mediaRoot}/admin/studio-admin.jpg`]
    );
    const adminId: string = adminResult.rows[0].id;

    const stylesByName = new Map<string, number>();
    for (const style of styleData) {
      const result = await client.query(
        `INSERT INTO dance_styles (name, description, difficulty, cover, gallery, benefits, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING id`,
        [
          style.name,
          style.description,
          style.difficulty,
          { url: `${mediaRoot}/styles/${style.slug}-cover.jpg`, type: 'image' },
          JSON.stringify([
            { url: `${mediaRoot}/styles/${style.slug}-class-01.jpg`, type: 'image' },
            { url: `${mediaRoot}/styles/${style.slug}-class-02.jpg`, type: 'image' },
          ]),
          JSON.stringify(style.benefits),
        ]
      );
      stylesByName.set(style.name, result.rows[0].id);
    }

    const halls: Array<{ id: number; capacity: number }> = [];
    for (const hall of [
      { name: 'Большой зал', capacity: 30, description: 'Просторный зал с зеркалами и звуковой системой для групповой хореографии.' },
      { name: 'Зал «Ритм»', capacity: 22, description: 'Уютный зал для парных направлений и небольших групп.' },
      { name: 'Зал «Сцена»', capacity: 26, description: 'Зал с площадкой для постановок, репетиций и открытых уроков.' },
      { name: 'Малая студия', capacity: 16, description: 'Камерное пространство для балета, растяжки и персональной работы.' },
    ]) {
      const result = await client.query(
        'INSERT INTO halls (name, capacity, description, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id, capacity',
        [hall.name, hall.capacity, hall.description]
      );
      halls.push(result.rows[0]);
    }

    const trainersByStyle = new Map<string, IdRow[]>();
    const trainerIds: string[] = [];
    for (let index = 0; index < trainerData.length; index += 1) {
      const trainer = trainerData[index];
      const photoUrl = `${mediaRoot}/trainers/${trainer.slug}.jpg`;
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone, photo_url, is_active, client_code)
         VALUES ($1, $2, 'trainer', $3, $4, $5, TRUE, $6)
         RETURNING id`,
        [trainer.email, passwordHash, trainer.name, trainer.phone, photoUrl, `TRN-DEMO-${String(index + 1).padStart(2, '0')}`]
      );
      const userId: string = userResult.rows[0].id;
      const gallery = [
        { url: `${mediaRoot}/trainers/${trainer.slug}-class.jpg`, type: 'image' },
        { url: `${mediaRoot}/trainers/${trainer.slug}-rehearsal.mp4`, type: 'video' },
      ];
      const profileResult = await client.query(
        `INSERT INTO trainers
          (user_id, specialization, bio, experience_years, education, achievements, photo_url, video_url,
           gallery, certificates, social_links, custom_page_title, custom_page_content, is_published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)
         RETURNING id`,
        [
          userId,
          trainer.style,
          trainer.bio,
          trainer.years,
          trainer.education,
          trainer.achievement,
          photoUrl,
          `${mediaRoot}/trainers/${trainer.slug}-rehearsal.mp4`,
          JSON.stringify(gallery),
          JSON.stringify([{ name: 'Сертификат инструктора', url: `${mediaRoot}/trainers/${trainer.slug}-certificate.jpg` }]),
          JSON.stringify([{ platform: 'Instagram', url: `https://instagram.com/${trainer.slug.replace(/-/g, '.')}` }]),
          `Танцы с ${trainer.name.split(' ')[0]}`,
          `${trainer.bio} Запишитесь на занятие в расписании студии.`,
        ]
      );
      const trainerId: string = profileResult.rows[0].id;
      trainerIds.push(trainerId);
      const group = trainersByStyle.get(trainer.style) || [];
      group.push({ id: trainerId });
      trainersByStyle.set(trainer.style, group);
    }

    const clients: IdRow[] = [];
    for (let index = 0; index < clientNames.length; index += 1) {
      const photoUrl = `${mediaRoot}/clients/client-${String(index + 1).padStart(2, '0')}.jpg`;
      const result = await client.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone, photo_url, is_active, client_code)
         VALUES ($1, $2, 'client', $3, $4, $5, TRUE, $6)
         RETURNING id`,
        [
          `client${String(index + 1).padStart(2, '0')}@studio.demo`,
          passwordHash,
          clientNames[index],
          `+375 29 200-${String(Math.floor(index / 100)).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
          photoUrl,
          `CLI-DEMO-${String(index + 1).padStart(3, '0')}`,
        ]
      );
      clients.push(result.rows[0]);
    }

    const membershipTypeByName = new Map<string, number>();
    const typeDefinitions = [
      { name: 'Универсальный · 30 занятий', description: '30 посещений любых активных направлений, срок действия — 90 дней.', price: 420, visits: 30, days: 90, styleId: null },
      { name: 'Безлимитный · 90 дней', description: 'Неограниченное посещение групповых занятий в течение 90 дней.', price: 720, visits: null, days: 90, styleId: null },
      { name: 'Стартовый · 8 занятий', description: '8 посещений любых направлений, срок действия — 45 дней.', price: 150, visits: 8, days: 45, styleId: null },
      { name: 'Детский · 12 занятий', description: '12 посещений занятий детских групп, срок действия — 60 дней.', price: 190, visits: 12, days: 60, styleId: null },
      ...styleData.map((style) => ({
        name: `${style.name} · 8 занятий`,
        description: `8 посещений направления «${style.name}», срок действия — 60 дней.`,
        price: 165,
        visits: 8,
        days: 60,
        styleId: stylesByName.get(style.name)!,
      })),
    ];
    for (const type of typeDefinitions) {
      const result = await client.query(
        `INSERT INTO membership_types (name, description, price, visit_count, duration_days, dance_style_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING id`,
        [type.name, type.description, type.price, type.visits, type.days, type.styleId]
      );
      membershipTypeByName.set(type.name, result.rows[0].id);
    }

    const slots = ['09:00:00', '11:00:00', '13:00:00', '15:00:00', '17:00:00', '19:00:00'];
    const schedules: ScheduleRow[] = [];
    for (let day = 1; day <= 7; day += 1) {
      for (let slot = 0; slot < slots.length; slot += 1) {
        const style = styleData[(day + slot - 1) % styleData.length];
        const candidates = trainersByStyle.get(style.name)!;
        const trainer = candidates[(day + slot) % candidates.length];
        const hall = halls[slot % halls.length];
        const endHour = Number(slots[slot].slice(0, 2)) + 1;
        const endTime = `${String(endHour).padStart(2, '0')}:30:00`;
        const result = await client.query(
          `INSERT INTO schedule
            (trainer_id, hall_id, dance_style_id, day_of_week, start_time, end_time, max_capacity, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8)
           RETURNING id, day_of_week, start_time, end_time, trainer_id`,
          [trainer.id, hall.id, stylesByName.get(style.name), day, slots[slot], endTime, hall.capacity - 2, adminId]
        );
        schedules.push(result.rows[0]);
      }
    }

    const today = new Date();
    const memberships = new Map<string, { id: string; clientId: string; remaining: number }>();
    const expiredMemberships: Array<{ id: string; clientId: string; index: number }> = [];
    const universalTypeId = membershipTypeByName.get('Универсальный · 30 занятий')!;

    for (let index = 0; index < clients.length; index += 1) {
      const clientId = clients[index].id;
      const activePayment = await client.query(
        `INSERT INTO payments (user_id, amount, currency, status, provider, description, metadata)
         VALUES ($1, $2, 'BYN', 'succeeded', 'demo', $3, $4)
         RETURNING id`,
        [clientId, index % 4 === 0 ? 720 : 420, 'Оплата демонстрационного абонемента', { demo: true, clientNumber: index + 1 }]
      );
      const currentMembershipResult = await client.query(
        `INSERT INTO memberships
          (client_id, membership_type_id, payment_id, purchase_date, start_date, end_date, remaining_visits, status, price_paid)
         VALUES ($1, $2, $3, NOW() - INTERVAL '65 days', $4, $5, $6, 'active', $7)
         RETURNING id`,
        [
          clientId,
          index % 4 === 0 ? membershipTypeByName.get('Безлимитный · 90 дней') : universalTypeId,
          activePayment.rows[0].id,
          dateString(addDays(today, -65)),
          dateString(addDays(today, 25)),
          index % 4 === 0 ? null : 30,
          index % 4 === 0 ? 720 : 420,
        ]
      );
      memberships.set(clientId, {
        id: currentMembershipResult.rows[0].id,
        clientId,
        remaining: index % 4 === 0 ? 0 : 30,
      });

      if (index % 5 === 0) {
        const style = styleData[index % styleData.length];
        const styleTypeId = membershipTypeByName.get(`${style.name} · 8 занятий`)!;
        const extraPayment = await client.query(
          `INSERT INTO payments (user_id, amount, currency, status, provider, description, metadata)
           VALUES ($1, 165, 'BYN', 'succeeded', 'demo', $2, $3)
           RETURNING id`,
          [clientId, `Дополнительный абонемент: ${style.name}`, { demo: true, extra: true }]
        );
        await client.query(
          `INSERT INTO memberships
            (client_id, membership_type_id, payment_id, purchase_date, start_date, end_date, remaining_visits, status, price_paid)
           VALUES ($1, $2, $3, NOW() - INTERVAL '12 days', $4, $5, 6, 'active', 165)`,
          [clientId, styleTypeId, extraPayment.rows[0].id, dateString(addDays(today, -12)), dateString(addDays(today, 48))]
        );
      }

      if (index % 3 === 0) {
        const expiredPayment = await client.query(
          `INSERT INTO payments (user_id, amount, currency, status, provider, description, metadata)
           VALUES ($1, 150, 'BYN', 'succeeded', 'demo', 'Исторический абонемент', $2)
           RETURNING id`,
          [clientId, { demo: true, historical: true }]
        );
        const expiredResult = await client.query(
          `INSERT INTO memberships
            (client_id, membership_type_id, payment_id, purchase_date, start_date, end_date, remaining_visits, status, price_paid)
           VALUES ($1, $2, $3, NOW() - INTERVAL '52 days', $4, $5, 0, 'expired', 150)
           RETURNING id`,
          [clientId, membershipTypeByName.get('Стартовый · 8 занятий'), expiredPayment.rows[0].id,           dateString(addDays(today, -52)), dateString(addDays(today, -7))]
        );
        expiredMemberships.push({ id: expiredResult.rows[0].id, clientId, index });
      }
    }

    const bookingRows: unknown[][] = [];
    const attendedByClient = new Map<string, number>();
    const monday = currentWeekMonday(today);

    for (let clientIndex = 0; clientIndex < clients.length; clientIndex += 1) {
      const clientId = clients[clientIndex].id;
      const membership = memberships.get(clientId)!;
      for (let weekOffset = -8; weekOffset <= 2; weekOffset += 1) {
        if (weekOffset === 0) continue;
        const bookingCount = 2;
        for (let bookingNumber = 0; bookingNumber < bookingCount; bookingNumber += 1) {
          const day = ((clientIndex + Math.abs(weekOffset) + bookingNumber * 3) % 7) + 1;
          const slot = (clientIndex * (bookingNumber + 1) + Math.abs(weekOffset) + bookingNumber) % slots.length;
          const schedule = schedules.find((item) => item.day_of_week === day && item.start_time === slots[slot])!;
          const classDate = dateString(addDays(monday, weekOffset * 7 + day - 1));
          const isPast = weekOffset < 0;
          const status = !isPast
            ? 'booked'
            : (clientIndex + Math.abs(weekOffset) + bookingNumber) % 6 < 4
              ? 'attended'
              : (clientIndex + Math.abs(weekOffset) + bookingNumber) % 6 === 4
                ? 'no_show'
                : 'cancelled';
          const classStart = `${classDate} ${schedule.start_time}`;
          const classEnd = `${classDate} ${schedule.end_time}`;
          const cancelledAt = status === 'cancelled' ? `${classDate} 08:00:00` : null;
          const cancelledBy = status === 'cancelled' ? (clientIndex % 2 === 0 ? clientId : adminId) : null;
          const checkedIn = status === 'attended';
          const checkedInAt = checkedIn ? classStart : null;
          const checkedInBy = checkedIn ? schedule.trainer_id : null;
          bookingRows.push([
            schedule.id, classDate, classStart, classEnd, clientId, membership.id,
            new Date(`${classDate}T08:00:00Z`), status, cancelledAt, cancelledBy, checkedIn, checkedInAt, checkedInBy,
          ]);
          if (status === 'attended' || status === 'no_show') {
            attendedByClient.set(clientId, (attendedByClient.get(clientId) || 0) + (status === 'attended' ? 1 : 0));
          }
        }
      }
    }

    const insertedBookings = await batchedInsert(
      client,
      'bookings',
      ['schedule_id', 'class_date', 'class_start', 'class_end', 'client_id', 'membership_id', 'booked_at', 'status', 'cancelled_at', 'cancelled_by', 'checked_in', 'checked_in_at', 'checked_in_by'],
      bookingRows,
      ' RETURNING id, status, schedule_id, class_date, client_id'
    );
    const attendanceData: unknown[][] = [];
    for (const booking of insertedBookings) {
      if (booking.status === 'attended' || booking.status === 'no_show') {
        const schedule = schedules.find((item) => item.id === booking.schedule_id)!;
        const attended = booking.status === 'attended';
        attendanceData.push([
          booking.id,
          schedule.trainer_id,
          attended,
          attended ? 'Демонстрационная отметка посещения.' : 'Клиент не пришёл на занятие.',
        ]);
      }
    }
    await batchedInsert(client, 'attendance', ['booking_id', 'trainer_id', 'is_present', 'notes'], attendanceData);

    for (const [clientId, membership] of memberships) {
      if (membership.remaining > 0) {
        const usedVisits = attendedByClient.get(clientId) || 0;
        await client.query(
          'UPDATE memberships SET remaining_visits = GREATEST(0, $2::integer - $3::integer) WHERE id = $1',
          [membership.id, membership.remaining, usedVisits]
        );
      }
    }

    for (const [index, expired] of expiredMemberships.entries()) {
      const status = index % 3 === 0 ? 'pending' : index % 3 === 1 ? 'approved' : 'rejected';
      await client.query(
        `INSERT INTO membership_extension_requests
          (membership_id, client_id, requested_days, requested_visits, requested_unit, reason, status, reviewed_by, reviewed_at, admin_comment)
         VALUES ($1, $2, NULL, 2, 'visits', $3, $4, $5, $6, $7)`,
        [
          expired.id,
          expired.clientId,
          ['Перерыв по состоянию здоровья.', 'Хочу завершить пропущенные занятия.', 'Не получилось посещать студию в прошлом месяце.'][expired.index % 3],
          status,
          status === 'pending' ? null : adminId,
          status === 'pending' ? null : new Date(),
          status === 'pending' ? null : status === 'approved' ? 'Продлено на 7 дней.' : 'Пожалуйста, обсудите новый абонемент с администратором.',
        ]
      );
      if (status === 'approved') {
        await client.query(
          `UPDATE memberships
           SET end_date = $2, remaining_visits = 2, status = 'active'
           WHERE id = $1`,
          [expired.id, dateString(addDays(today, 45))]
        );
      }
    }

    for (let index = 0; index < newsData.length; index += 1) {
      const [title, content, image] = newsData[index];
      await client.query(
        `INSERT INTO news (title, content, image_url, is_published, author_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - ($6::integer * INTERVAL '1 day'))`,
        [
          title,
          content,
          `${mediaRoot}/news/${image}`,
          index !== newsData.length - 1,
          adminId,
          (newsData.length - index) * 3,
        ]
      );
    }

    for (let index = 0; index < trainingInfo.length; index += 1) {
      const [title, content, category, image] = trainingInfo[index];
      await client.query(
        `INSERT INTO training_info (title, content, category, image_url, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [title, content, category, `${mediaRoot}/training/${image}`, index + 1]
      );
    }

    for (let index = 0; index < faqs.length; index += 1) {
      const [question, answer, keywords] = faqs[index];
      await client.query(
        `INSERT INTO chatbot_faqs (question, answer, keywords, is_active, sort_order, created_by)
         VALUES ($1, $2, $3, TRUE, $4, $5)`,
        [question, answer, keywords, (index + 1) * 10, adminId]
      );
    }

    const messageRows: unknown[][] = [];
    for (let index = 0; index < clients.length; index += 1) {
      const clientId = clients[index].id;
      const trainerId = trainerIds[index % trainerIds.length];
      const trainerUser = await client.query('SELECT user_id FROM trainers WHERE id = $1', [trainerId]);
      const trainerUserId: string = trainerUser.rows[0].user_id;
      const pairs = [
        [clientId, adminId, `Здравствуйте! Подскажите, пожалуйста, какой уровень выбрать для первого занятия?`],
        [adminId, clientId, `Добрый день! Посмотрите группы начального уровня в расписании. Если расскажете, какое направление интересно, подскажу точнее.`],
        [clientId, trainerUserId, `Добрый день! Можно ли на занятии повторить базовую связку помедленнее?`],
        [trainerUserId, clientId, `Конечно, разберём связку по частям и в удобном темпе.`],
      ];
      for (const [sender, receiver, content] of pairs) {
        messageRows.push([sender, receiver, content, messageRows.length % 3 === 0, false]);
      }
    }
    await batchedInsert(client, 'messages', ['sender_id', 'receiver_id', 'content', 'is_read', 'edited'], messageRows);

    const notificationRows: unknown[][] = [];
    for (let index = 0; index < clients.length; index += 1) {
      const clientId = clients[index].id;
      notificationRows.push([
        clientId,
        'membership_expiring',
        'Проверьте срок действия абонемента',
        'Ваш демонстрационный абонемент скоро закончится. Проверьте срок и остаток посещений в разделе «Абонементы».',
        { demo: true, membershipId: memberships.get(clientId)!.id },
        index % 4 === 0,
      ]);
      if (index % 4 === 0) {
        notificationRows.push([
          clientId,
          'news_published',
          'Новая новость студии',
          'В студии появились новости и новые занятия. Посмотрите раздел «Новости».',
          { demo: true },
          false,
        ]);
      }
    }
    await batchedInsert(client, 'notifications', ['user_id', 'type', 'title', 'message', 'data', 'is_read'], notificationRows);

    await client.query('COMMIT');
    console.log([
      'Demo data loaded successfully.',
      `Users: ${clients.length} clients, ${trainerData.length} trainers, 1 admin.`,
      `Styles: ${styleData.length}; halls: ${halls.length}; weekly class slots: ${schedules.length}.`,
      `Bookings: ${insertedBookings.length}; attendance records: ${attendanceData.length}.`,
      `News: ${newsData.length}; chatbot FAQs: ${faqs.length}; training guides: ${trainingInfo.length}.`,
      `All demo account passwords: ${password}`,
    ].join('\n'));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  void seedDemo().catch((error: unknown) => {
    console.error('Demo database seed failed:', error);
    process.exitCode = 1;
  });
}
