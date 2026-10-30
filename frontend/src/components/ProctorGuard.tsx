import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { activeAttemptId, reportProctorEvent, type ProctorEventType } from '../api/proctor';

const GUARDED: { dom: 'copy' | 'cut' | 'contextmenu'; type: ProctorEventType; message: string }[] = [
  { dom: 'copy', type: 'copy_attempt', message: 'Копирование на странице теста отключено' },
  { dom: 'cut', type: 'cut_attempt', message: 'Вырезание на странице теста отключено' },
  { dom: 'contextmenu', type: 'context_menu', message: 'Контекстное меню на странице теста отключено' },
];

const THROTTLE_MS = 2000;

// запрет выделения и копирования
// и сообщение серверу о попытках, но скриншоты и DevTools остаются
export default function ProctorGuard({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const testId = Number(id);
  console.log('ProctorGuard смонтировался', testId);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 2500);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    const lastSent: Partial<Record<ProctorEventType, number>> = {};

    const cleanups = GUARDED.map(({ dom, type, message }) => {
      const handler = (event: Event) => {
        console.log('ProctorGuard handler', dom, event.target);
        // и ввостанут поля ввода! копирование не трогаем, чтоб пользователь работал со своим текстом
        const target = event.target;
        if (target instanceof HTMLElement && target.closest('input[type="text"], textarea, [contenteditable="true"]')) {
          return;
        }
        event.preventDefault();
        showNotice(message);

        const attemptId = activeAttemptId(testId);
        if (attemptId === null) return;
        const now = Date.now();
        if (now - (lastSent[type] ?? 0) < THROTTLE_MS) return;
        lastSent[type] = now;

        const details: Record<string, unknown> =
          dom === 'contextmenu' ? {} : { selected_text: (window.getSelection()?.toString() ?? '').slice(0, 200) };
        void reportProctorEvent(attemptId, type, details);
      };
      document.addEventListener(dom, handler);
      return () => document.removeEventListener(dom, handler);
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [testId, showNotice]);

  return (
    <div style={{ userSelect: 'none', WebkitUserSelect: 'none' }} onDragStart={(e) => e.preventDefault()}>
      {children}
      {notice && (
        <div
          role="status"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-gray-900 text-white text-sm px-5 py-3 shadow-lg"
        >
          {notice}
        </div>
      )}
    </div>
  );
}