import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localISODate, parseISODate, formatDate, isOverdue, isWithinNextDays,
  escapeHTML, categoryMeta, priorityRank, sortTasks, monthGrid,
} from '../src/utils.js';

const today = localISODate(new Date(2026, 10, 9));

test('localISODate uses local calendar fields and zero padding', () => {
  assert.equal(localISODate(new Date(2026, 0, 4)), '2026-01-04');
});

test('parseISODate accepts real calendar dates and rejects invalid ones', () => {
  assert.equal(parseISODate('2026-02-28')?.getDate(), 28);
  assert.equal(parseISODate('2026-02-30'), null);
  assert.equal(parseISODate('not-a-date'), null);
});

test('formatDate safely formats ISO dates', () => {
  assert.equal(formatDate('not-a-date'), 'No date');
  assert.ok(formatDate('2026-11-09').length > 0);
});

test('overdue logic excludes completed and undated tasks', () => {
  assert.equal(isOverdue({ dueDate: '2026-11-08', completed: false }), true);
  assert.equal(isOverdue({ dueDate: '2026-11-08', completed: true }), false);
  assert.equal(isOverdue({ dueDate: '', completed: false }), false);
});

test('upcoming window includes future dates through the selected horizon', () => {
  assert.equal(isWithinNextDays('2026-11-10', 7), true);
  assert.equal(isWithinNextDays('2026-11-16', 7), true);
  assert.equal(isWithinNextDays('2026-11-17', 7), false);
  assert.equal(isWithinNextDays('2026-11-08', 7), false);
});

test('escapeHTML protects user-provided task text', () => {
  assert.equal(escapeHTML(`<script a="b">'x' &`), '&lt;script a=&quot;b&quot;&gt;&#39;x&#39; &amp;');
});

test('category and priority helpers return stable defaults', () => {
  assert.equal(categoryMeta('work').label, 'Work');
  assert.equal(categoryMeta('unknown').id, 'personal');
  assert.equal(priorityRank('high'), 0);
  assert.equal(priorityRank('low'), 2);
});

test('task sorting handles due dates and priority', () => {
  const tasks = [
    { id: 'later', dueDate: '2026-11-20', dueTime: '', priority: 'low' },
    { id: 'high', dueDate: '2026-11-12', dueTime: '', priority: 'high' },
    { id: 'early', dueDate: '2026-11-10', dueTime: '', priority: 'medium' },
  ];
  assert.deepEqual(sortTasks(tasks, 'date').map((task) => task.id), ['early', 'high', 'later']);
  assert.deepEqual(sortTasks(tasks, 'priority').map((task) => task.id), ['high', 'early', 'later']);
  assert.deepEqual(sortTasks(tasks, 'latest').map((task) => task.id), ['later', 'high', 'early']);
});

test('monthGrid starts on Monday and covers every date in the month', () => {
  const cells = monthGrid(2026, 10);
  assert.equal(cells.length % 7, 0);
  assert.equal(cells[0].date.getDay(), 1);
  assert.equal(cells.filter((cell) => cell.inMonth).length, 30);
  assert.equal(cells.find((cell) => cell.inMonth).iso, '2026-11-01');
});
