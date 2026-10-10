import { useState } from 'react';
import { Activity, Clock3, HeartPulse, Music2 } from 'lucide-react';

const sections = [
  {
    id: 'start',
    label: 'Первое занятие',
    icon: Activity,
    title: 'Начните в своём темпе',
    items: [
      ['Выберите уровень', 'Для первого занятия подойдут группы начального уровня. Если сомневаетесь, уточните у тренера, подходит ли вам нагрузка.'],
      ['Возьмите удобную одежду', 'Выбирайте одежду, в которой свободно двигаются плечи, таз и колени. Для большинства классов достаточно чистой обуви с нескользящей подошвой.'],
      ['Приходите заранее', 'Зал проще найти и освоиться, если прийти за 10 минут до начала. Сообщите тренеру о травмах или ограничениях до разминки.'],
    ],
  },
  {
    id: 'practice',
    label: 'Регулярность',
    icon: Clock3,
    title: 'Ритм важнее рывков',
    items: [
      ['Составьте устойчивый график', 'Начните с одного-двух занятий в неделю и добавляйте нагрузку постепенно, когда восстановление проходит комфортно.'],
      ['Повторяйте короткими подходами', 'Повторение связки по 10–15 минут между занятиями помогает закрепить движения и быстрее ориентироваться под музыку.'],
      ['Дайте телу восстановиться', 'Сон, вода и дни отдыха помогают поддерживать регулярность. При боли остановитесь и обсудите её со специалистом.'],
    ],
  },
  {
    id: 'style',
    label: 'Выбор стиля',
    icon: Music2,
    title: 'Найдите свой способ двигаться',
    items: [
      ['Попробуйте разные направления', 'Хип-хоп развивает музыкальность и координацию, contemporary исследует баланс и пластику, а парные направления добавляют работу с партнёром.'],
      ['Ориентируйтесь на ощущения', 'Выбирайте класс, после которого хочется вернуться. Темп и атмосфера группы не менее важны, чем название направления.'],
      ['Попросите совета тренера', 'Тренер подскажет подходящую группу по вашему опыту, целям и доступному расписанию.'],
    ],
  },
];

const RecommendationsPage = () => {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const section = sections.find((item) => item.id === activeSection) || sections[0];
  const Icon = section.icon;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary"><HeartPulse size={24} /></div>
        <div><h1 className="text-3xl font-bold">Рекомендации</h1><p className="mt-1 text-sm text-textSecondary">Как заниматься с удовольствием и прогрессом</p></div>
      </div>

      <div role="tablist" aria-label="Категории рекомендаций" className="mb-8 flex flex-wrap gap-2 border-b border-surface2 pb-3">
        {sections.map((item) => {
          const TabIcon = item.icon;
          return <button key={item.id} role="tab" aria-selected={activeSection === item.id} onClick={() => setActiveSection(item.id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${activeSection === item.id ? 'bg-primary text-white' : 'text-textSecondary hover:bg-surface2 hover:text-text'}`}><TabIcon size={16} />{item.label}</button>;
        })}
      </div>

      <section role="tabpanel" className="space-y-7">
        <h2 className="flex items-center gap-3 text-2xl font-bold"><Icon className="text-primary" size={24} />{section.title}</h2>
        <div className="divide-y divide-surface2 border-y border-surface2">
          {section.items.map(([title, body], index) => <article key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[3rem_minmax(0,1fr)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-sm font-semibold text-primary">{index + 1}</span>
            <div><h3 className="font-semibold">{title}</h3><p className="mt-1 leading-relaxed text-textSecondary">{body}</p></div>
          </article>)}
        </div>
      </section>
      <p className="mt-6 text-xs text-textSecondary">Рекомендации носят общий информационный характер и не заменяют консультацию врача или специалиста по физической активности.</p>
    </div>
  );
};

export default RecommendationsPage;