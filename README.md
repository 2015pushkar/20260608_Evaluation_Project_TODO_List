# Todo List

A Todo List app built with **Vanilla JavaScript + HTML + CSS** (no frameworks or
libraries). Todos are seeded from the [DummyJSON](https://dummyjson.com/todos) API,
and all changes persist locally via `localStorage`.

## Screenshots

### Application UI
Two lists (Pending / Completed) with add, inline edit, delete, move-between-lists,
and pagination on the Pending list.

![Todo List UI](images/application%20ui.png)

### Persistence (localStorage)
Every change is written to `localStorage` under the `todos` key, so tasks survive a
page refresh. Inspect it in DevTools → **Application → Local Storage**.

![localStorage in DevTools](images/persistence_storage.png)

## Features

- **Two lists** — Pending and Completed; items move between them when toggled.
- **Add** — type a task and click **Submit** (or press Enter).
- **Delete** — remove any task.
- **Toggle complete** — the arrow button moves a task between lists, driven by the
  `completed` property.
- **Inline edit** — click **Edit** to edit the title in place; **Save** (or Enter)
  to confirm, **Escape** to cancel.
- **Pagination** — the Pending list is paginated client-side (10 per page) with
  Prev / numbered / Next controls.
- **Persistence** — state is saved to `localStorage` and restored on reload.

## Tech & architecture

- Plain **HTML / CSS / JavaScript** — no frameworks or libraries.
- **Single-file MVC** in `app.js`:
  - **Model** — owns the `todos` state, API calls, and `localStorage`. The only
    place state mutates.
  - **View** — pure rendering (lists, items, pagination). No business logic.
  - **Controller** — wires DOM events to Model methods, then re-renders.
- **Event delegation** — one click listener per list container (and one for the
  pagination controls) handles all item buttons efficiently.

## Data handling

The app uses all four CRUD endpoints, but treats the API as best-effort: DummyJSON
is a mock and does **not** persist changes, so after every successful call the local
state is updated manually and saved to `localStorage` (the real source of truth).

| Action | Endpoint |
| --- | --- |
| Fetch (initial seed) | `GET https://dummyjson.com/todos` |
| Add | `POST https://dummyjson.com/todos/add` |
| Edit / Toggle | `PATCH https://dummyjson.com/todos/:id` |
| Delete | `DELETE https://dummyjson.com/todos/:id` |

On first load, todos are fetched from the API and cached in `localStorage`. On
later loads, the cached data is used (so your changes are preserved).

## Running locally

No build step. Either:

- **Double-click `index.html`** to open it in a browser, or
- Serve it with a local server (e.g. VS Code **Live Server**) — recommended, since
  `localStorage` behaves more predictably under an `http://` origin than `file://`.

## Project structure

```
.
├── index.html      # markup: add form + Pending/Completed lists + pagination
├── styles.css      # layout and styling
├── app.js          # Model / View / Controller
├── images/         # screenshots used in this README
└── README.md
```
