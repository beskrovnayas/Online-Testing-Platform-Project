import { useCallback, useEffect, useRef, useState } from 'react';
import { getPassingTest, startAttempt, submitPassingAnswers, type AttemptTiming, type PassingTest } from './api';
import { PassingError, remainingMilliseconds, type AttemptResult, type SelectedAnswers } from './protocol';
import { readAttempt, saveAttempt } from './session';

const failure = (reason: unknown) => reason instanceof PassingError
  ? reason : new PassingError('network', 'Не удалось связаться с сервером. Попробуйте снова.');

export default function usePassingAttempt(testId: number) {
  const [test, setTest] = useState<PassingTest | null>(null);
  const [timing, setTiming] = useState<AttemptTiming | null>(null);
  const [answers, setAnswers] = useState<SelectedAnswers>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<PassingError | null>(null);
  const [submitError, setSubmitError] = useState<PassingError | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [closed, setClosed] = useState(false);
  const [revision, setRevision] = useState(0);
  const inFlight = useRef(false);
  const autoSent = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!Number.isSafeInteger(testId) || testId <= 0) throw new PassingError('validation', 'Некорректный номер теста.');
        const data = await getPassingTest(testId);
        if (!current) return;
        const saved = readAttempt(data);
        const clock = saved?.timing ?? await startAttempt(data);
        if (!current) return;
        setTest(data);
        setTiming(clock);
        setAnswers(saved?.answers ?? {});
        setClosed(saved?.closed ?? false);
        setResult(saved?.result ?? null);
        setExpired(saved?.expired ?? false);
        autoSent.current = saved?.expired === true;
        const restoredFailure = saved?.failure?.kind === 'auth' ? undefined : saved?.failure;
        setSubmitError(restoredFailure ?? null);
        saveAttempt(testId, { timing: clock, answers: saved?.answers ?? {}, closed: saved?.closed ?? false,
          result: saved?.result, expired: saved?.expired, failure: restoredFailure });
      } catch (reason) {
        if (current) setError(failure(reason));
      } finally {
        if (current) setLoading(false);
      }
    };
    void load();
    return () => { current = false; };
  }, [testId, revision]);

  const selectAnswer = (questionId: number, value: number | number[]) => {
    if (closed || submitting || expired || result || submitError?.kind === 'auth' || !test || !timing
      || remainingMilliseconds(timing.expiresAt) === 0) return;
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    setValidationError(null);
    setSubmitError(null);
    saveAttempt(testId, { timing, answers: next, closed: false });
  };

  const submit = useCallback(async (dueToTimeout = false) => {
    if (!test || !timing || inFlight.current || closed || result) return;
    const timedOut = dueToTimeout || remainingMilliseconds(timing.expiresAt) === 0;
    const selectedQuestions = test.questions.filter((question) => {
      const value = answers[question.id];
      return Array.isArray(value) ? value.length > 0 : value !== undefined;
    });
    if (!timedOut && selectedQuestions.length !== test.questions.length) {
      setValidationError('Ответьте на все вопросы перед завершением теста');
      return;
    }
    if (timedOut) {
      setExpired(true);
      setValidationError(null);
      if (selectedQuestions.length === 0) {
        setClosed(true);
        saveAttempt(testId, { timing, answers, closed: true, expired: true });
        return;
      }
    }
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = await submitPassingAnswers(testId, answers, timing.attemptId);
      if (!active.current) return;
      setResult(data);
      setClosed(true);
      saveAttempt(testId, { timing, answers, closed: true, result: data, expired: timedOut });
    } catch (reason) {
      if (!active.current) return;
      const issue = failure(reason);
      setSubmitError(issue);
      if (issue.kind === 'expired' || issue.kind === 'unavailable') {
        if (issue.kind === 'expired') setExpired(true);
        setClosed(true);
        saveAttempt(testId, { timing, answers, closed: true, expired: timedOut || issue.kind === 'expired', failure: issue });
      } else {
        saveAttempt(testId, { timing, answers, closed: false, expired: timedOut, failure: issue });
      }
    } finally {
      inFlight.current = false;
      if (active.current) setSubmitting(false);
    }
  }, [test, timing, answers, closed, result, testId]);

  useEffect(() => {
    if (!timing || closed || result) return;
    const checkTime = () => {
      if (remainingMilliseconds(timing.expiresAt) > 0 || inFlight.current || autoSent.current) return;
      autoSent.current = true;
      void submit(true);
    };
    const timeout = window.setTimeout(checkTime, 0);
    const interval = window.setInterval(checkTime, 250);
    window.addEventListener('focus', checkTime);
    document.addEventListener('visibilitychange', checkTime);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      window.removeEventListener('focus', checkTime);
      document.removeEventListener('visibilitychange', checkTime);
    };
  }, [timing, closed, result, submit]);

  return {
    test, answers, result, loading, submitting, error, submitError, validationError, expired, closed,
    selectAnswer, submit, retryLoad: () => setRevision((value) => value + 1),
  };
}
