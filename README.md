# Taskwell

A polished, responsive to-do application built with semantic HTML, modern CSS, and modular vanilla JavaScript. It is dependency-free and can be hosted as a static website.

## Run locally

**Windows:** Double-click `run_local.bat`.

**macOS / Linux:** In this folder, run:

```bash
chmod +x run_local.sh
./run_local.sh
```

Or start any static HTTP server in this folder, for example:

```bash
python -m http.server 8080
```

Then open <http://localhost:8080>.

> Do not open `index.html` directly using a `file://` URL. The app uses JavaScript modules, so it should be served over HTTP.

## Features

- Overview with task totals, completion rate, today's focus, upcoming tasks, and recently completed work.
- Create, edit, complete, star, and delete tasks.
- Optional due dates, optional times, priorities, descriptions, and categories.
- Views for all tasks, today, upcoming, important, completed, and overdue.
- Live search, category and priority filters, and date / priority / recently-added sorting.
- Monthly calendar with month navigation and click-to-create dates.
- Responsive desktop sidebar and mobile navigation.
- Light and dark themes, remembered between visits.
- Local persistence using browser `localStorage`.
- JSON backup export and import.
- Keyboard shortcuts: `N` to create a task, `/` to focus search, `Ctrl/Cmd + K` to focus search, and `Ctrl/Cmd + Shift + E` to export a backup.

## Data and privacy

Tasks are stored in the current browser on the current device. They remain after refresh and browser restarts, but they are not synced to an account or shared across devices. Clearing this site's browser storage removes locally saved tasks. Use **Export backup** to save a JSON copy; **Import backup** restores a backup and replaces the current local task list after confirmation.

## Project structure

```text
taskwell/
├── index.html
├── styles.css
├── README.md
├── run_local.bat
├── run_local.sh
└── src/
    ├── app.js       # UI rendering, navigation, interactions, and dialogs
    ├── icons.js     # Small inline SVG icon set
    ├── storage.js   # Local persistence and task normalization
    └── utils.js     # Dates, sorting, formatting, and shared helpers
```

## Tests

Run the included utility and persistence tests with:

```bash
npm test
```

The app also received a headless Chromium interaction smoke test covering task creation and validation, editing, completion, deletion confirmation, search, filters, calendar navigation, theme switching, JSON backup import/export, and mobile layout.

## Deploy

Upload the contents of this folder to any static host such as GitHub Pages, Netlify, Vercel, or a standard web host. No build step or server-side runtime is required.
