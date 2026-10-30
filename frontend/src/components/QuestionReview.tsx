import { verdictOf, type ReviewQuestion, type Verdict } from '../api/review';

const VERDICT: Record<Verdict, { label: string; bar: string; badge: string }> = {
  correct: { label: 'Верно', bar: 'border-l-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  partial: { label: 'Частично верно', bar: 'border-l-amber-400', badge: 'bg-amber-50 text-amber-700' },
  wrong: { label: 'Неверно', bar: 'border-l-red-500', badge: 'bg-red-50 text-red-700' },
  unanswered: { label: 'Без ответа', bar: 'border-l-gray-300', badge: 'bg-gray-100 text-gray-600' },
  unknown: { label: 'Нет данных', bar: 'border-l-gray-300', badge: 'bg-gray-100 text-gray-600' },
};

type OptionState = 'right' | 'wrong' | 'missed' | 'plain';

interface OptionStyle {
  box: string;
  mark: string;
  // подпись только для скринридеров оставим, а на экране цвет и рамка говорят сами за себя
  srLabel: string;
}

interface Props {
  question: ReviewQuestion;
  index: number;
}

export default function QuestionReview({ question, index }: Props) {
  const verdict = verdictOf(question);
  const v = VERDICT[verdict];
  const multiple = question.type === 'multiple';

  const stateOf = (id: number): OptionState => {
    if (!question.known) return 'plain';
    const selected = question.selectedIds.includes(id);
    const correct = question.correctIds.includes(id);
    if (selected && correct) return 'right';
    if (selected) return 'wrong';
    if (correct) return 'missed';
    return 'plain';
  };

  // пропущенный правильный вариант: жёлтый в частично верном вопросе, иначе зелёный пунктиром
  const styleOf = (state: OptionState): OptionStyle => {
    switch (state) {
      case 'right':
        return { box: 'border-emerald-500 bg-emerald-50', mark: 'text-emerald-600', srLabel: 'Верно' };
      case 'wrong':
        return { box: 'border-red-400 bg-red-50', mark: 'text-red-600', srLabel: 'Неверно' };
      case 'missed':
        return verdict === 'partial'
          ? { box: 'border-amber-400 border-dashed bg-amber-50', mark: 'text-amber-500', srLabel: 'Правильный ответ' }
          : { box: 'border-emerald-500 border-dashed bg-emerald-50', mark: 'text-emerald-600', srLabel: 'Правильный ответ' };
      default:
        return { box: 'border-gray-200 bg-white', mark: 'text-gray-400', srLabel: '' };
    }
  };

  const shape = multiple ? 'rounded-md' : 'rounded-full';

  return (
    <section
      className={`bg-white rounded-3xl shadow-sm border border-gray-100 border-l-4 p-6 sm:p-8 ${v.bar}`}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 leading-snug">{question.text}</h2>
            {multiple && <p className="text-sm text-gray-500 mt-1">Несколько правильных ответов</p>}
          </div>
        </div>
        {(verdict === 'unanswered' || verdict === 'unknown') && (
          <span className={`shrink-0 text-sm font-medium px-3 py-1 rounded-full ${v.badge}`}>{v.label}</span>
        )}
      </div>

      <div className="space-y-3">
        {question.options.map((option) => {
          const selected = question.selectedIds.includes(option.id);
          const style = styleOf(stateOf(option.id));
          return (
            <div
              key={option.id}
              className={`flex items-start gap-4 rounded-2xl border p-4 ${style.box}`}
            >
              <span
                className={`mt-0.5 h-5 w-5 shrink-0 border-2 border-current flex items-center justify-center ${shape} ${
                  selected ? style.mark : 'text-gray-300'
                }`}
                aria-hidden
              >
                {selected && <span className={`h-2.5 w-2.5 bg-current ${multiple ? 'rounded-sm' : 'rounded-full'}`} />}
              </span>
              <span className="flex-1 text-gray-800 leading-relaxed">{option.text}</span>
              {style.srLabel && <span className="sr-only">{style.srLabel}</span>}
            </div>
          );
        })}
      </div>

      {verdict === 'unknown' && (
        <p className="text-sm text-gray-500 mt-4">Подробности по этому вопросу пока недоступны.</p>
      )}
    </section>
  );
}