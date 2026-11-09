const STORAGE_KEY = 'taskwell.tasks.v1';
const THEME_KEY = 'taskwell.theme.v1';

export function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTask).map(normalizeTask);
  } catch (error) {
    console.error('Could not read saved tasks:', error);
    return [];
  }
}

export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error('Could not save tasks:', error);
    return false;
  }
}

export function loadTheme() {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch (error) { console.warn('Could not save theme:', error); }
}

export function isValidTask(task) {
  return Boolean(task && typeof task === 'object' && typeof task.id === 'string' && typeof task.title === 'string' && task.title.trim());
}

export function normalizeTask(task) {
  return {
    id: task.id,
    title: String(task.title).slice(0, 100),
    description: typeof task.description === 'string' ? task.description.slice(0, 500) : '',
    dueDate: typeof task.dueDate === 'string' ? task.dueDate : '',
    dueTime: typeof task.dueTime === 'string' ? task.dueTime : '',
    priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
    category: ['personal', 'work', 'study', 'health', 'errands'].includes(task.category) ? task.category : 'personal',
    important: Boolean(task.important),
    completed: Boolean(task.completed),
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
  };
}
