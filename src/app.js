import { loadTasks, saveTasks, loadTheme, saveTheme, normalizeTask, isValidTask } from './storage.js';
import { icon } from './icons.js';
import {
  CATEGORIES, localISODate, formatDate, formatLongDate, formatDue, isOverdue,
  isWithinNextDays, escapeHTML, categoryMeta, sortTasks, monthLabel, monthGrid,
  greeting, makeId, parseISODate,
} from './utils.js';

const state = {
  tasks: loadTasks(),
  theme: loadTheme(),
  view: 'dashboard',
  query: '',
  priorityFilter: 'all',
  categoryFilter: 'all',
  sortBy: 'date',
  calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  confirmDeleteId: null,
  toastTimer: null,
};

const app = document.querySelector('#app');
const taskDialog = document.querySelector('#task-dialog');
const confirmDialog = document.querySelector('#confirm-dialog');
const taskForm = document.querySelector('#task-form');
const importInput = document.querySelector('#import-file');

const VIEW_META = {
  dashboard: { title: 'Overview', subtitle: 'A clear view of what matters today.' },
  all: { title: 'All tasks', subtitle: 'Everything you have planned, in one place.' },
  today: { title: 'Today', subtitle: 'Make steady progress, one task at a time.' },
  upcoming: { title: 'Upcoming', subtitle: 'A little visibility into what is ahead.' },
  important: { title: 'Important', subtitle: 'The work that deserves your attention first.' },
  completed: { title: 'Completed', subtitle: 'A record of the things you have finished.' },
  overdue: { title: 'Overdue', subtitle: 'Bring anything past its due date back into focus.' },
  calendar: { title: 'Calendar', subtitle: 'See your plans across the month.' },
};

function counts() {
  const today = localISODate();
  const active = state.tasks.filter((task) => !task.completed);
  return {
    total: state.tasks.length,
    completed: state.tasks.filter((task) => task.completed).length,
    pending: active.length,
    overdue: active.filter(isOverdue).length,
    today: active.filter((task) => task.dueDate === today).length,
    important: active.filter((task) => task.important).length,
  };
}

function navButton(view, label, iconName, badge = '') {
  const active = state.view === view ? ' is-active' : '';
  return `<button class="nav-item${active}" data-action="nav" data-view="${view}" ${state.view === view ? 'aria-current="page"' : ''}>
    ${icon(iconName)}<span>${label}</span>${badge ? `<span class="nav-count">${badge}</span>` : ''}
  </button>`;
}

function render() {
  const meta = VIEW_META[state.view] || VIEW_META.dashboard;
  const count = counts();
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.theme === 'dark' ? '#171d1a' : '#f6f7f4');
  app.setAttribute('aria-busy', 'false');
  app.innerHTML = `
    <aside class="sidebar" aria-label="Main navigation">
      <button class="brand-lockup" data-action="nav" data-view="dashboard" aria-label="Taskwell home">
        <span class="brand-mark"><i></i><i></i><i></i></span><span class="brand-name">taskwell<span class="brand-period">.</span></span>
      </button>
      <div class="sidebar-section">
        <p class="sidebar-label">WORKSPACE</p>
        <nav class="primary-nav">
          ${navButton('dashboard', 'Overview', 'home')}
          ${navButton('all', 'All tasks', 'tasks', count.pending ? String(count.pending) : '')}
          ${navButton('today', 'Today', 'today', count.today ? String(count.today) : '')}
          ${navButton('upcoming', 'Upcoming', 'clock')}
          ${navButton('important', 'Important', 'star')}
          ${navButton('completed', 'Completed', 'check')}
          ${navButton('overdue', 'Overdue', 'alert', count.overdue ? String(count.overdue) : '')}
          ${navButton('calendar', 'Calendar', 'calendar')}
        </nav>
      </div>
      <div class="sidebar-bottom">
        <div class="sidebar-note">
          <span class="note-mark">${icon('check')}</span>
          <p>Small steps add up.<br><span>Keep your day moving.</span></p>
        </div>
        <div class="sidebar-foot"><span class="status-dot"></span> Your tasks are saved on this device</div>
      </div>
    </aside>

    <div class="mobile-topbar">
      <button class="brand-lockup" data-action="nav" data-view="dashboard" aria-label="Taskwell home"><span class="brand-mark"><i></i><i></i><i></i></span><span class="brand-name">taskwell<span class="brand-period">.</span></span></button>
      <div class="mobile-top-actions">
        <button class="icon-button theme-button" data-action="theme" aria-label="Switch ${state.theme === 'dark' ? 'to light' : 'to dark'} theme">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button>
        <button class="icon-button" data-action="export" aria-label="Export backup" title="Export backup">${icon('download')}</button>
        <button class="icon-button" data-action="import" aria-label="Import backup" title="Import backup">${icon('upload')}</button>
        <button class="button button-primary button-compact" data-action="new-task">${icon('plus')}<span>New</span></button>
      </div>
    </div>

    <main class="main-area">
      <div class="mobile-search-row"><label class="search-box" for="mobile-global-search">${icon('search')}<input id="mobile-global-search" data-control="search" type="search" value="${escapeHTML(state.query)}" placeholder="Search tasks..." autocomplete="off" aria-label="Search tasks"></label></div>
      <header class="topbar">
        <div class="breadcrumb"><span>Workspace</span>${icon('chevron')}<strong>${meta.title}</strong></div>
        <div class="topbar-actions">
          <label class="search-box" for="global-search">${icon('search')}<input id="global-search" data-control="search" type="search" value="${escapeHTML(state.query)}" placeholder="Search tasks..." autocomplete="off" aria-label="Search tasks"><kbd>⌘ K</kbd></label>
          <button class="icon-button" data-action="export" aria-label="Export backup" title="Export backup">${icon('download')}</button>
          <button class="icon-button" data-action="import" aria-label="Import backup" title="Import backup">${icon('upload')}</button>
          <button class="icon-button theme-button desktop-theme" data-action="theme" aria-label="Switch ${state.theme === 'dark' ? 'to light' : 'to dark'} theme">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button>
          <button class="button button-primary new-task-button" data-action="new-task">${icon('plus')}<span>New task</span></button>
        </div>
      </header>

      <section class="page-content">
        ${state.view === 'dashboard' ? dashboardView(count) : state.view === 'calendar' ? calendarView() : taskListView(state.view)}
      </section>
    </main>

    <nav class="mobile-nav" aria-label="Mobile navigation">
      ${mobileNavButton('dashboard', 'Home', 'home')}
      ${mobileNavButton('all', 'Tasks', 'tasks')}
      ${mobileNavButton('calendar', 'Calendar', 'calendar')}
      ${mobileNavButton('important', 'Important', 'star')}
    </nav>`;
  restoreSearchFocus();
}

function mobileNavButton(view, label, iconName) {
  return `<button class="mobile-nav-item ${state.view === view ? 'is-active' : ''}" data-action="nav" data-view="${view}" aria-label="${label}" ${state.view === view ? 'aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span></button>`;
}

function restoreSearchFocus() {
  if (!state.searchWasFocused) return;
  const input = document.getElementById(state.searchInputId || 'global-search');
  if (input) {
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }
  state.searchWasFocused = false;
}

function dashboardView(count) {
  const completion = count.total ? Math.round((count.completed / count.total) * 100) : 0;
  const todayTasks = sortTasks(state.tasks.filter((task) => task.dueDate === localISODate() && !task.completed), 'date');
  const upcoming = sortTasks(state.tasks.filter((task) => !task.completed && isWithinNextDays(task.dueDate, 7)), 'date').slice(0, 4);
  const recentCompleted = sortTasks(state.tasks.filter((task) => task.completed), 'created').slice(0, 3);
  return `
    <div class="welcome-row">
      <div><p class="eyebrow">${formatLongDate()}</p><h1>${greeting()}<span class="welcome-comma">,</span> <span class="welcome-soft">let's make today count.</span></h1><p class="welcome-subtitle">A little structure goes a long way. Here's where things stand.</p></div>
      <button class="button button-primary welcome-add" data-action="new-task">${icon('plus')}<span>Add a task</span></button>
    </div>

    <div class="stats-grid">
      ${statCard('Total tasks', count.total, 'tasks', 'Your full list')}
      ${statCard('Completed', count.completed, 'check', count.total ? `${completion}% of all tasks` : 'Ready when you are', 'stat-green')}
      ${statCard('Still to do', count.pending, 'clock', 'Across every category', 'stat-blue')}
      ${statCard('Overdue', count.overdue, 'alert', count.overdue ? 'Needs a little attention' : 'You are all caught up', 'stat-coral')}
    </div>

    <div class="dashboard-grid">
      <section class="panel today-panel">
        <div class="panel-heading"><div><p class="eyebrow">YOUR FOCUS</p><h2>Today's tasks</h2></div><button class="text-link" data-action="nav" data-view="today">View all ${icon('arrow')}</button></div>
        ${todayTasks.length ? `<div class="task-list dashboard-task-list">${todayTasks.slice(0, 5).map((task) => taskRow(task, true)).join('')}</div>${todayTasks.length > 5 ? `<p class="list-footnote">And ${todayTasks.length - 5} more on your list for today.</p>` : ''}` : emptyState('today', 'Nothing scheduled for today', 'Enjoy the breathing room, or add something you want to get done.', 'Add a task')}
      </section>

      <section class="panel progress-panel">
        <div class="panel-heading"><div><p class="eyebrow">YOUR MOMENTUM</p><h2>Overall progress</h2></div>${icon('check', 'panel-heading-icon')}</div>
        <div class="progress-summary"><span class="progress-number">${completion}<small>%</small></span><span class="progress-caption">of all tasks completed</span></div>
        <div class="progress-track" role="progressbar" aria-label="Task completion" aria-valuenow="${completion}" aria-valuemin="0" aria-valuemax="100"><span style="width:${completion}%"></span></div>
        <div class="progress-legend"><span><i class="legend-dot done-dot"></i>Completed <strong>${count.completed}</strong></span><span><i class="legend-dot todo-dot"></i>Pending <strong>${count.pending}</strong></span></div>
        <div class="progress-divider"></div>
        <div class="focus-line"><span class="focus-icon">${icon('star')}</span><div><strong>${count.important} important ${count.important === 1 ? 'task' : 'tasks'}</strong><span>Keep your priorities close.</span></div><button class="round-arrow" data-action="nav" data-view="important" aria-label="View important tasks">${icon('arrow')}</button></div>
      </section>
    </div>

    <section class="panel upcoming-panel">
      <div class="panel-heading"><div><p class="eyebrow">NEXT ON YOUR LIST</p><h2>Coming up</h2></div><button class="text-link" data-action="nav" data-view="upcoming">See upcoming ${icon('arrow')}</button></div>
      ${upcoming.length ? `<div class="upcoming-grid">${upcoming.map((task) => upcomingCard(task)).join('')}</div>` : emptyState('upcoming', 'Your week is open', 'Tasks with a date in the next seven days will show up here.', 'Plan something')}
    </section>

    ${recentCompleted.length ? `<section class="recent-section"><div class="section-title-row"><div><p class="eyebrow">A LOOK BACK</p><h2>Recently completed</h2></div><button class="text-link" data-action="nav" data-view="completed">All completed ${icon('arrow')}</button></div><div class="recent-list">${recentCompleted.map((task) => `<div class="recent-item"><span class="recent-check">${icon('check')}</span><span class="recent-title">${escapeHTML(task.title)}</span><span class="recent-category">${escapeHTML(categoryMeta(task.category).label)}</span></div>`).join('')}</div></section>` : ''}`;
}

function statCard(label, value, iconName, caption, extraClass = '') {
  return `<article class="stat-card ${extraClass}"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon(iconName)}</span></div><div class="stat-value">${value}</div><div class="stat-caption">${caption}</div></article>`;
}

function upcomingCard(task) {
  const category = categoryMeta(task.category);
  return `<button class="upcoming-card" data-action="edit-task" data-id="${escapeHTML(task.id)}"><span class="upcoming-date">${formatDate(task.dueDate, { weekday: 'short', month: 'short', day: 'numeric' })}</span><span class="upcoming-card-title">${escapeHTML(task.title)}</span><span class="upcoming-meta"><i class="category-dot ${category.color}"></i>${category.label}<span class="priority-word priority-${task.priority}">${capitalize(task.priority)}</span></span></button>`;
}

function taskListView(view) {
  const meta = VIEW_META[view] || VIEW_META.all;
  const base = getViewTasks(view);
  const filtered = applyFilters(base);
  const sorted = sortTasks(filtered, state.sortBy);
  const hasFilters = state.query || state.priorityFilter !== 'all' || state.categoryFilter !== 'all';
  const headingCount = filtered.length;
  return `
    <div class="list-page-heading"><div><p class="eyebrow">TASK MANAGEMENT</p><h1>${meta.title}</h1><p class="welcome-subtitle">${meta.subtitle}</p></div><button class="button button-primary" data-action="new-task">${icon('plus')}<span>New task</span></button></div>
    <section class="panel list-panel">
      <div class="list-toolbar"><div class="result-count"><strong>${headingCount}</strong> ${headingCount === 1 ? 'task' : 'tasks'}${hasFilters ? ' found' : ''}</div><div class="filter-controls"><label class="select-wrap"><span class="sr-only">Filter by category</span><select class="toolbar-select" data-control="category-filter"><option value="all">All categories</option>${CATEGORIES.map((cat) => `<option value="${cat.id}" ${state.categoryFilter === cat.id ? 'selected' : ''}>${cat.label}</option>`).join('')}</select></label><label class="select-wrap"><span class="sr-only">Filter by priority</span><select class="toolbar-select" data-control="priority-filter"><option value="all">All priorities</option><option value="high" ${state.priorityFilter === 'high' ? 'selected' : ''}>High priority</option><option value="medium" ${state.priorityFilter === 'medium' ? 'selected' : ''}>Medium priority</option><option value="low" ${state.priorityFilter === 'low' ? 'selected' : ''}>Low priority</option></select></label><label class="select-wrap sort-select"><span class="sr-only">Sort tasks</span><select class="toolbar-select" data-control="sort"><option value="date" ${state.sortBy === 'date' ? 'selected' : ''}>Soonest first</option><option value="latest" ${state.sortBy === 'latest' ? 'selected' : ''}>Latest first</option><option value="priority" ${state.sortBy === 'priority' ? 'selected' : ''}>Priority</option><option value="created" ${state.sortBy === 'created' ? 'selected' : ''}>Recently added</option></select></label>${hasFilters ? `<button class="clear-filters" data-action="clear-filters">Clear</button>` : ''}</div></div>
      ${sorted.length ? `<div class="task-list">${sorted.map((task) => taskRow(task)).join('')}</div>` : emptyState(view, hasFilters ? 'No tasks match those filters' : emptyTitle(view), hasFilters ? 'Try a different search or clear a filter to see more tasks.' : emptyDescription(view), hasFilters ? 'Clear filters' : 'Create a task', hasFilters ? 'clear-filters' : 'new-task')}
    </section>`;
}

function getViewTasks(view) {
  const today = localISODate();
  switch (view) {
    case 'today': return state.tasks.filter((task) => !task.completed && task.dueDate === today);
    case 'upcoming': return state.tasks.filter((task) => !task.completed && task.dueDate && task.dueDate > today);
    case 'important': return state.tasks.filter((task) => task.important && !task.completed);
    case 'completed': return state.tasks.filter((task) => task.completed);
    case 'overdue': return state.tasks.filter(isOverdue);
    default: return state.tasks;
  }
}

function applyFilters(tasks) {
  const query = state.query.trim().toLocaleLowerCase();
  return tasks.filter((task) => {
    const matchesQuery = !query || `${task.title} ${task.description} ${categoryMeta(task.category).label}`.toLocaleLowerCase().includes(query);
    const matchesPriority = state.priorityFilter === 'all' || task.priority === state.priorityFilter;
    const matchesCategory = state.categoryFilter === 'all' || task.category === state.categoryFilter;
    return matchesQuery && matchesPriority && matchesCategory;
  });
}

function taskRow(task, compact = false) {
  const category = categoryMeta(task.category);
  return `<article class="task-row ${task.completed ? 'is-completed' : ''} ${compact ? 'is-compact' : ''}" data-task-row="${escapeHTML(task.id)}">
    <button class="task-check ${task.completed ? 'is-checked' : ''}" data-action="toggle-task" data-id="${escapeHTML(task.id)}" role="checkbox" aria-checked="${task.completed}" aria-label="Mark ${escapeHTML(task.title)} ${task.completed ? 'as pending' : 'as complete'}">${task.completed ? icon('check') : ''}</button>
    <div class="task-main"><button class="task-title-button" data-action="edit-task" data-id="${escapeHTML(task.id)}">${escapeHTML(task.title)}</button>${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ''}<div class="task-meta-mobile"><span class="category-pill ${category.color}"><i></i>${category.label}</span><span class="priority-pill priority-${task.priority}">${capitalize(task.priority)}</span><span class="mobile-due">${formatDue(task)}</span></div></div>
    <div class="task-category"><span class="category-pill ${category.color}"><i></i>${category.label}</span></div>
    <div class="task-due">${formatDue(task)}</div>
    <div class="task-priority"><span class="priority-pill priority-${task.priority}"><i></i>${capitalize(task.priority)}</span></div>
    <div class="task-actions"><button class="icon-button row-action ${task.important ? 'is-starred' : ''}" data-action="toggle-important" data-id="${escapeHTML(task.id)}" aria-label="${task.important ? 'Remove from' : 'Add to'} important" title="${task.important ? 'Remove from important' : 'Mark important'}">${icon('star')}</button><button class="icon-button row-action" data-action="edit-task" data-id="${escapeHTML(task.id)}" aria-label="Edit ${escapeHTML(task.title)}" title="Edit task">${icon('edit')}</button><button class="icon-button row-action delete-action" data-action="delete-task" data-id="${escapeHTML(task.id)}" aria-label="Delete ${escapeHTML(task.title)}" title="Delete task">${icon('trash')}</button></div>
  </article>`;
}

function calendarView() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const cells = monthGrid(year, month);
  const today = localISODate();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthTasks = sortTasks(state.tasks.filter((task) => task.dueDate && parseISODate(task.dueDate) && task.dueDate.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)), 'date');
  const selectedMonthTasks = monthTasks.filter((task) => !task.completed);
  return `
    <div class="list-page-heading calendar-page-heading"><div><p class="eyebrow">PLAN YOUR TIME</p><h1>Calendar</h1><p class="welcome-subtitle">Your month, with a little more perspective.</p></div><button class="button button-primary" data-action="new-task">${icon('plus')}<span>New task</span></button></div>
    <section class="panel calendar-panel">
      <div class="calendar-toolbar"><div class="month-switcher"><button class="icon-button" data-action="month-prev" aria-label="Previous month">${icon('left')}</button><h2>${monthLabel(year, month)}</h2><button class="icon-button" data-action="month-next" aria-label="Next month">${icon('right')}</button></div><div class="calendar-actions"><span class="calendar-count">${selectedMonthTasks.length} ${selectedMonthTasks.length === 1 ? 'task' : 'tasks'} this month</span><button class="button button-quiet button-small" data-action="month-today">Today</button></div></div>
      <div class="calendar-grid calendar-weekdays">${dayNames.map((day) => `<div>${day}</div>`).join('')}</div>
      <div class="calendar-grid calendar-days">${cells.map((cell) => calendarCell(cell, monthTasks, today)).join('')}</div>
      <div class="calendar-legend"><span><i class="legend-dot calendar-dot"></i>Scheduled task</span><span><i class="legend-dot calendar-done-dot"></i>Completed</span><span class="calendar-hint">Select a day to add a task</span></div>
    </section>`;
}

function calendarCell(cell, tasks, today) {
  const items = tasks.filter((task) => task.dueDate === cell.iso);
  return `<div class="calendar-cell ${cell.inMonth ? '' : 'outside-month'} ${cell.iso === today ? 'is-today' : ''}" data-date="${cell.iso}">
    <button class="calendar-day-number" data-action="create-day" data-date="${cell.iso}" aria-label="Add task on ${formatDate(cell.iso, { weekday: 'long', month: 'long', day: 'numeric' })}"><span>${cell.date.getDate()}</span></button>
    <div class="calendar-cell-tasks">${items.slice(0, 3).map((task) => `<button class="calendar-task ${task.completed ? 'is-completed' : ''} priority-edge-${task.priority}" data-action="edit-task" data-id="${escapeHTML(task.id)}" title="${escapeHTML(task.title)}">${escapeHTML(task.title)}</button>`).join('')}${items.length > 3 ? `<span class="calendar-more">+${items.length - 3} more</span>` : ''}</div>
  </div>`;
}

function emptyTitle(view) {
  return ({ all: 'A fresh start', today: 'Your day is clear', upcoming: 'Nothing on the horizon', important: 'No priorities flagged', completed: 'Nothing completed yet', overdue: 'Nothing overdue' })[view] || 'No tasks here yet';
}
function emptyDescription(view) {
  return ({ all: 'Add your first task and give your plans a place to land.', today: 'Add a task with today’s date and it will appear here.', upcoming: 'Add a future due date to see what is coming next.', important: 'Star a task to keep it close at hand.', completed: 'Finished tasks will collect here as you check them off.', overdue: 'You are all caught up. Keep that feeling going.' })[view] || 'Create a task to get started.';
}

function emptyState(view, title, description, buttonLabel, action = 'new-task') {
  const mark = view === 'completed' ? 'check' : view === 'overdue' ? 'check' : view === 'important' ? 'star' : 'plus';
  return `<div class="empty-state"><span class="empty-mark">${icon(mark)}</span><h3>${title}</h3><p>${description}</p><button class="button button-quiet empty-button" data-action="${action}">${action === 'clear-filters' ? '' : icon('plus')}${buttonLabel}</button></div>`;
}

function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }

function openTaskDialog(taskId = null, dueDate = '') {
  taskForm.reset();
  delete taskForm.dataset.editingId;
  document.querySelector('#title-error').textContent = '';
  const task = taskId ? state.tasks.find((item) => item.id === taskId) : null;
  document.querySelector('#task-dialog-title').textContent = task ? 'Edit task' : 'New task';
  document.querySelector('#task-dialog-kicker').textContent = task ? 'UPDATE YOUR TASK' : 'YOUR WORKSPACE';
  document.querySelector('#task-save-button').textContent = task ? 'Save changes' : 'Create task';
  if (task) {
    taskForm.dataset.editingId = task.id;
    taskForm.elements.title.value = task.title;
    taskForm.elements.description.value = task.description;
    taskForm.elements.dueDate.value = task.dueDate;
    taskForm.elements.dueTime.value = task.dueTime;
    taskForm.elements.priority.value = task.priority;
    taskForm.elements.category.value = task.category;
    taskForm.elements.important.checked = task.important;
  } else {
    taskForm.elements.dueDate.value = dueDate;
    taskForm.elements.priority.value = 'medium';
    taskForm.elements.category.value = 'personal';
  }
  taskDialog.showModal();
  window.setTimeout(() => document.querySelector('#task-title').focus(), 50);
}

function commitTasks(nextTasks, successMessage) {
  if (!saveTasks(nextTasks)) {
    showToast('Could not save changes. Check your browser storage settings.', 'error');
    return false;
  }
  state.tasks = nextTasks;
  render();
  if (successMessage) showToast(successMessage);
  return true;
}

function handleTaskSubmit(event) {
  event.preventDefault();
  const title = taskForm.elements.title.value.trim();
  const description = taskForm.elements.description.value.trim();
  const dueDate = taskForm.elements.dueDate.value;
  const dueTime = taskForm.elements.dueTime.value;
  const titleError = document.querySelector('#title-error');
  titleError.textContent = '';
  if (!title) {
    titleError.textContent = 'Give your task a name before saving.';
    taskForm.elements.title.focus();
    return;
  }
  if (title.length > 100 || description.length > 500) {
    showToast('Please shorten the task details and try again.', 'error');
    return;
  }
  if (dueDate && !parseISODate(dueDate)) {
    showToast('Choose a valid due date.', 'error');
    return;
  }
  if (dueTime && !dueDate) {
    showToast('Add a due date before setting a time.', 'error');
    taskForm.elements.dueDate.focus();
    return;
  }
  const editingId = taskForm.dataset.editingId;
  const existing = editingId ? state.tasks.find((task) => task.id === editingId) : null;
  const nextTask = normalizeTask({
    id: existing?.id || makeId(), title, description, dueDate, dueTime,
    priority: taskForm.elements.priority.value,
    category: taskForm.elements.category.value,
    important: taskForm.elements.important.checked,
    completed: existing?.completed || false,
    createdAt: existing?.createdAt || new Date().toISOString(),
    completedAt: existing?.completedAt || null,
  });
  const nextTasks = existing ? state.tasks.map((task) => task.id === editingId ? nextTask : task) : [...state.tasks, nextTask];
  if (commitTasks(nextTasks, existing ? 'Task updated.' : 'Task created.')) taskDialog.close();
}

function showToast(message, type = 'success') {
  const region = document.querySelector('#toast-region');
  region.innerHTML = `<div class="toast ${type === 'error' ? 'toast-error' : ''}"><span class="toast-symbol">${icon(type === 'error' ? 'alert' : 'check')}</span><span>${escapeHTML(message)}</span></div>`;
  clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => { region.innerHTML = ''; }, 3200);
}

function openDeleteDialog(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  state.confirmDeleteId = id;
  document.querySelector('#confirm-copy').textContent = `“${task.title}” will be permanently removed from your task list.`;
  confirmDialog.showModal();
}

function exportBackup() {
  const data = { app: 'Taskwell', schemaVersion: 1, exportedAt: new Date().toISOString(), tasks: state.tasks };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `taskwell-backup-${localISODate()}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Your backup is ready.');
}

async function importBackup(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.tasks;
    if (!Array.isArray(rows) || !rows.every(isValidTask)) throw new Error('This file does not contain a valid Taskwell backup.');
    const imported = rows.map(normalizeTask);
    if (!window.confirm(`Import ${imported.length} task(s)? This will replace the tasks currently saved on this device.`)) return;
    if (commitTasks(imported, `${imported.length} task(s) imported.`)) state.view = 'all', render();
  } catch (error) {
    showToast(error.message || 'Could not read that backup file.', 'error');
  } finally {
    importInput.value = '';
  }
}

// One delegated event layer keeps controls working after each lightweight render.
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, view, id, date } = button.dataset;
  switch (action) {
    case 'nav':
      state.view = view;
      state.query = '';
      state.priorityFilter = 'all';
      state.categoryFilter = 'all';
      render();
      break;
    case 'new-task': openTaskDialog(); break;
    case 'edit-task': openTaskDialog(id); break;
    case 'toggle-task': {
      const next = state.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed, completedAt: task.completed ? null : new Date().toISOString() } : task);
      commitTasks(next, next.find((task) => task.id === id)?.completed ? 'Nice work. Task completed.' : 'Task moved back to your list.');
      break;
    }
    case 'toggle-important': {
      const next = state.tasks.map((task) => task.id === id ? { ...task, important: !task.important } : task);
      commitTasks(next, next.find((task) => task.id === id)?.important ? 'Added to important tasks.' : 'Removed from important tasks.');
      break;
    }
    case 'delete-task': openDeleteDialog(id); break;
    case 'confirm-delete': {
      const next = state.tasks.filter((task) => task.id !== state.confirmDeleteId);
      if (commitTasks(next, 'Task deleted.')) confirmDialog.close();
      state.confirmDeleteId = null;
      break;
    }
    case 'close-task-dialog': taskDialog.close(); break;
    case 'close-confirm': confirmDialog.close(); state.confirmDeleteId = null; break;
    case 'clear-filters':
      state.query = '';
      state.priorityFilter = 'all';
      state.categoryFilter = 'all';
      render();
      break;
    case 'theme':
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      saveTheme(state.theme);
      render();
      break;
    case 'month-prev': state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1); render(); break;
    case 'month-next': state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1); render(); break;
    case 'month-today': state.calendarDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1); render(); break;
    case 'create-day': openTaskDialog(null, date); break;
    case 'export': exportBackup(); break;
    case 'import': importInput.click(); break;
  }
});

document.addEventListener('input', (event) => {
  if (event.target.matches('[data-control="search"]')) {
    state.query = event.target.value;
    state.searchInputId = event.target.id;
    state.searchWasFocused = true;
    if (state.view === 'dashboard' && state.query.trim()) state.view = 'all';
    render();
  }
});

document.addEventListener('change', (event) => {
  const control = event.target.dataset.control;
  if (control === 'category-filter') state.categoryFilter = event.target.value;
  else if (control === 'priority-filter') state.priorityFilter = event.target.value;
  else if (control === 'sort') state.sortBy = event.target.value;
  else return;
  render();
});

taskForm.addEventListener('submit', handleTaskSubmit);
importInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (file) importBackup(file);
});

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const typing = target && (target.matches('input, textarea, select') || target.isContentEditable);
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    const search = document.querySelector('[data-control="search"]');
    search?.focus();
  } else if (!typing && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    openTaskDialog();
  } else if (!typing && event.key === '/') {
    event.preventDefault();
    document.querySelector('[data-control="search"]')?.focus();
  }
});

// A small export/import menu is available from the app's backup shortcut.
// The keyboard shortcut is intentionally kept unobtrusive: Ctrl/Cmd+Shift+E exports a backup.
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
    event.preventDefault();
    exportBackup();
  }
});

render();
