import { getAccessToken } from './auth';
import { http } from './http';

export type ProctorEventType = 'exit_attempt' | 'copy_attempt' | 'cut_attempt' | 'context_menu';

// отправка события проктора: "по возможности", сбой не должен мешать прохождению теста
export async function reportProctorEvent(
  attemptId: number,
  eventType: ProctorEventType,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await http.post('/proctor/event/', { attempt_id: attemptId, event_type: eventType, details });
  } catch {
    // намеренно игнорируем (∪.∪ )...zzz
  }
}

// номер текущей попытки лежит в sessionStorage, куда его кладёт features/test-passing (session.ts)
// ключ и формат повторяют session.ts: если там что-то поменяется, события перестанут отправляться,
// а блокировка копирования продолжит работать. но мб надёжнее отдавать attemptId из usePassingAttempt?..
export function activeAttemptId(testId: number): number | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const userId = payload.user_id ?? payload.sub;
    if (userId === undefined) return null;
    const saved = JSON.parse(sessionStorage.getItem(`test-passing:${String(userId)}:${testId}`) ?? 'null');
    const id = saved?.timing?.attemptId;
    return saved && saved.closed !== true && Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}