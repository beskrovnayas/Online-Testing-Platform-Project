import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAnswersPayload, classifyFailure, normalizeResult, remainingMilliseconds, serverDeadline,
} from '../src/features/test-passing/protocol.ts';

test('single-choice keeps the existing backend request format', () => {
  assert.deepEqual(buildAnswersPayload(1, { 10: 20 }), { test_id: 1, answers: { 10: 20 } });
});

test('multiple-choice sends every selected option, even when only one remains', () => {
  assert.deepEqual(buildAnswersPayload(1, { 10: [20, 21, 20], 11: [30], 12: [] }, 5), {
    test_id: 1, attempt_id: 5, answers: { 10: [20, 21], 11: [30] },
  });
});

test('invalid answer identifiers are rejected before the request', () => {
  assert.throws(() => buildAnswersPayload(0, { 10: 20 }));
  assert.throws(() => buildAnswersPayload(1, { 10: [NaN] }));
  assert.throws(() => buildAnswersPayload(1, { '-1': 20 }));
  assert.throws(() => buildAnswersPayload(1, { 10: 20 }, 0));
});

test('real result keeps attempt identity and answer details', () => {
  const result = normalizeResult({
    attempt_id: 5, test_id: 1, test_title: 'Алгебра', correct_answers: 1,
    total_questions: 2, percentage: 50,
    details: [{ question_id: 10, question_text: '2 + 2', selected_option_text: '4',
      correct_option_text: '4', is_correct: true }],
  });
  assert.equal(result.attemptId, 5);
  assert.equal(result.correctAnswers, 1);
  assert.deepEqual(result.details[0].selectedTexts, ['4']);
  assert.equal(result.details[0].isCorrect, true);
});

test('history percentage does not invent counts or detailed answers', () => {
  const result = normalizeResult({ id: 5, test_id: 1, score: 0, finished_at: '2026-10-03T10:00:00Z' });
  assert.equal(result.percentage, 0);
  assert.equal(result.correctAnswers, undefined);
  assert.deepEqual(result.details, []);
  assert.throws(() => normalizeResult({}));
  assert.throws(() => normalizeResult({ score: 101 }));
});

test('multiple-choice details preserve all answer texts', () => {
  const result = normalizeResult({ percentage: 100, details: [{ question_id: 10,
    selected_option_texts: ['2', '4'], correct_option_texts: ['2', '4'], is_correct: true }] });
  assert.deepEqual(result.details[0].selectedTexts, ['2', '4']);
});

test('expired errors take priority over forbidden access', () => {
  assert.equal(classifyFailure(403, { code: 'attempt_expired' }).kind, 'expired');
  assert.equal(classifyFailure(403).kind, 'unavailable');
  assert.equal(classifyFailure(404).kind, 'unavailable');
  assert.equal(classifyFailure(401).kind, 'auth');
  assert.equal(classifyFailure(400).kind, 'validation');
  assert.equal(classifyFailure().kind, 'network');
});

test('server time offsets are applied and expired deadlines never become negative', () => {
  const clientTime = Date.parse('2026-10-03T09:00:00Z');
  const deadline = serverDeadline('2026-10-03T10:01:00Z', '2026-10-03T10:00:00Z', clientTime);
  assert.equal(remainingMilliseconds(deadline, clientTime), 60000);
  assert.equal(remainingMilliseconds(deadline, clientTime + 60001), 0);
  assert.throws(() => serverDeadline('invalid'));
});
