export const CATEGORIES = [
  { id: 'personal', label: 'Personal', color: 'sage' },
  { id: 'work', label: 'Work', color: 'blue' },
  { id: 'study', label: 'Study', color: 'violet' },
  { id: 'health', label: 'Health', color: 'coral' },
  { id: 'errands', label: 'Errands', color: 'amber' },
];

export const PRIORITIES = ['low', 'medium', 'high'];

export function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function formatDate(value, options = { month: 'short', day: 'numeric' }) {
  const date = parseISODate(value);
  if (!date) return 'No date';
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

export function formatDue(task) {
  if (!task.dueDate) return '<span class="due-muted">No due date</span>';
  const date = parseISODate(task.dueDate);
  if (!date) return '<span class="due-muted">No due date</span>';
  const today = localISODate();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = localISODate(tomorrow);
  let label = formatDate(task.dueDate);
  if (task.dueDate === today) label = 'Today';
  else if (task.dueDate === tomorrowISO) label = 'Tomorrow';
  else if (task.dueDate < today) label = formatDate(task.dueDate);
  const time = task.dueTime ? ` · ${formatTime(task.dueTime)}` : '';
  const overdue = !task.completed && task.dueDate < today;
  return `<span class="due-label ${overdue ? 'is-overdue' : ''}">${escapeHTML(label + time)}</span>`;
}

export function formatTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return '';
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function isOverdue(task) {
  return !task.completed && Boolean(task.dueDate) && task.dueDate < localISODate();
}

export function isWithinNextDays(dateString, days = 7) {
  if (!dateString) return false;
  const today = parseISODate(localISODate());
  const date = parseISODate(dateString);
  if (!today || !date) return false;
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return date > today && date <= end;
}

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export function categoryMeta(id) {
  return CATEGORIES.find((item) => item.id === id) || CATEGORIES[0];
}

export function priorityRank(priority) {
  return ({ high: 0, medium: 1, low: 2 })[priority] ?? 1;
}

export function sortTasks(tasks, sortBy) {
  const copy = [...tasks];
  if (sortBy === 'priority') {
    return copy.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || compareDate(a, b));
  }
  if (sortBy === 'latest') return copy.sort((a, b) => compareDate(b, a));
  if (sortBy === 'created') return copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return copy.sort((a, b) => compareDate(a, b));
}

function compareDate(a, b) {
  const aDate = a.dueDate || '9999-12-31';
  const bDate = b.dueDate || '9999-12-31';
  if (aDate !== bDate) return aDate.localeCompare(bDate);
  return (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99');
}

export function monthLabel(year, month) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
}

export function monthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => {
    const day = index - mondayOffset + 1;
    const date = new Date(year, month, day);
    return { date, inMonth: date.getMonth() === month, iso: localISODate(date) };
  });
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function makeId() {
  return globalThis.crypto?.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
