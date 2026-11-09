import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTasks, saveTasks, loadTheme, saveTheme, normalizeTask, isValidTask } from '../src/storage.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

test('tasks persist as JSON and are normalized on load', () => {
  globalThis.localStorage = memoryStorage();
  const original = [{ id: '1', title: 'Plan sprint', priority: 'high', category: 'work', dueDate: '2026-11-10' }];
  assert.equal(saveTasks(original), true);
  const loaded = loadTasks();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].title, 'Plan sprint');
  assert.equal(loaded[0].description, '');
  assert.equal(loaded[0].priority, 'high');
  assert.equal(loaded[0].completed, false);
});

test('invalid storage JSON degrades safely to an empty task list', () => {
  globalThis.localStorage = memoryStorage({ 'taskwell.tasks.v1': '{bad json' });
  assert.deepEqual(loadTasks(), []);
});

test('task validation requires a usable id and title', () => {
  assert.equal(isValidTask({ id: 'a', title: 'Task' }), true);
  assert.equal(isValidTask({ id: 'a', title: '  ' }), false);
  assert.equal(isValidTask({ title: 'Task' }), false);
});

test('normalization constrains fields and keeps task state', () => {
  const task = normalizeTask({ id: 'a', title: 'Task', priority: 'urgent', category: 'random', completed: true, important: true });
  assert.equal(task.priority, 'medium');
  assert.equal(task.category, 'personal');
  assert.equal(task.completed, true);
  assert.equal(task.important, true);
});

test('theme preference is remembered and safely defaults to light', () => {
  globalThis.localStorage = memoryStorage();
  assert.equal(loadTheme(), 'light');
  saveTheme('dark');
  assert.equal(loadTheme(), 'dark');
  globalThis.localStorage.setItem('taskwell.theme.v1', 'unrecognized');
  assert.equal(loadTheme(), 'light');
});
