// =====================================================================
//  TODO List — modular single-file MVC
//  Model:      owns state + API + (later) localStorage. Only place state mutates.
//  View:       pure rendering. DOM out, no business logic.
//  Controller: wires DOM events -> Model -> View.
// =====================================================================

const API_BASE = "https://dummyjson.com/todos";
const STORAGE_KEY = "todos";
const PAGE_SIZE = 10; // pending-list items per page

// =====================================================================
//  MODEL
// =====================================================================
const Model = {
  // Single source of truth. dummyjson does NOT persist changes, so after every
  // successful API call we manually update this array.
  todos: [],

  getPending() {
    return this.todos.filter((t) => !t.completed);
  },

  getCompleted() {
    return this.todos.filter((t) => t.completed);
  },

  // dummyjson's /add returns the same id (255) every time and never saves, so
  // we generate our own guaranteed-unique id to avoid collisions.
  nextLocalId() {
    return this.todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  },

  // Write current state to localStorage so it survives refresh.
  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.todos));
  },

  // Load state: prefer localStorage (persisted changes); fall back to the API
  // seed on the first ever visit, then save that seed locally.
  async load() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      this.todos = JSON.parse(stored);
      return;
    }
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`GET failed: ${res.status}`);
    const data = await res.json();
    this.todos = data.todos || [];
    this.save();
  },

  // POST a new todo, then update local state.
  async add(title) {
    const res = await fetch(`${API_BASE}/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todo: title, completed: false, userId: 1 }),
    });
    if (!res.ok) throw new Error(`POST failed: ${res.status}`);
    await res.json(); // confirm success; we use our own id (see nextLocalId)

    this.todos.unshift({ id: this.nextLocalId(), todo: title, completed: false });
    this.save();
  },

  // DELETE a todo, then remove from local state.
  async remove(id) {
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);
      await res.json();
    } catch (err) {
      // Locally-added ids don't exist on the server (404). Update local anyway
      // so the UI stays correct — the API is best-effort here.
      console.warn("DELETE not persisted on server:", err.message);
    }
    this.todos = this.todos.filter((t) => t.id !== id);
    this.save();
  },

  // PATCH completed flag, then flip it locally so the item moves lists.
  async toggle(id) {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return;
    const newCompleted = !todo.completed;
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newCompleted }),
      });
      if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
      await res.json();
    } catch (err) {
      console.warn("PATCH not persisted on server:", err.message);
    }
    todo.completed = newCompleted;
    this.save();
  },

  // PATCH the title, then update local state.
  async edit(id, newTitle) {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todo: newTitle }),
      });
      if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
      await res.json();
    } catch (err) {
      console.warn("PATCH (edit) not persisted on server:", err.message);
    }
    todo.todo = newTitle;
    this.save();
  },
};

// =====================================================================
//  VIEW
// =====================================================================
const View = {
  pendingList: document.getElementById("pending-list"),
  completedList: document.getElementById("completed-list"),
  pendingPagination: document.getElementById("pending-pagination"),
  addForm: document.getElementById("add-form"),
  todoInput: document.getElementById("todo-input"),

  // Id of the todo currently being edited inline (null = none).
  editingId: null,

  // Current page of the Pending list (1-based).
  currentPage: 1,

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  todoItemHtml(todo) {
    const isEditing = todo.id === this.editingId;
    const completedClass = todo.completed ? " completed" : "";
    // Arrow hints the move: pending -> complete (→), completed -> pending (←)
    const toggleLabel = todo.completed ? "←" : "→";

    // In edit mode: show an input + a Save button instead of the title + Edit.
    const titleHtml = isEditing
      ? `<input class="todo-edit-input" type="text" value="${this.escapeHtml(
          todo.todo
        )}" />`
      : `<span class="todo-title">${this.escapeHtml(todo.todo)}</span>`;

    const editButtonHtml = isEditing
      ? `<button class="btn btn-save" data-action="save">Save</button>`
      : `<button class="btn btn-edit" data-action="edit">Edit</button>`;

    return `
      <li class="todo-item${completedClass}" data-id="${todo.id}">
        ${titleHtml}
        <div class="todo-actions">
          <button class="btn btn-toggle" data-action="toggle">${toggleLabel}</button>
          ${editButtonHtml}
          <button class="btn btn-delete" data-action="delete">Delete</button>
        </div>
      </li>
    `;
  },

  render() {
    const pending = Model.getPending();
    const totalPages = Math.max(1, Math.ceil(pending.length / PAGE_SIZE));

    // Clamp page in case items were removed/toggled off the current page.
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const start = (this.currentPage - 1) * PAGE_SIZE;
    const pageItems = pending.slice(start, start + PAGE_SIZE);

    this.pendingList.innerHTML = pageItems
      .map((t) => this.todoItemHtml(t))
      .join("");
    this.completedList.innerHTML = Model.getCompleted()
      .map((t) => this.todoItemHtml(t))
      .join("");

    this.renderPagination(totalPages);
  },

  // Build Prev / numbered / Next controls for the Pending list.
  renderPagination(totalPages) {
    if (totalPages <= 1) {
      this.pendingPagination.innerHTML = ""; // nothing to page through
      return;
    }

    let html = `<button class="btn page-btn" data-action="prev" ${
      this.currentPage === 1 ? "disabled" : ""
    }>Prev</button>`;

    for (let i = 1; i <= totalPages; i++) {
      const active = i === this.currentPage ? " active" : "";
      html += `<button class="btn page-btn${active}" data-action="page" data-page="${i}">${i}</button>`;
    }

    html += `<button class="btn page-btn" data-action="next" ${
      this.currentPage === totalPages ? "disabled" : ""
    }>Next</button>`;

    this.pendingPagination.innerHTML = html;
  },

  clearInput() {
    this.todoInput.value = "";
  },

  // Enter edit mode for one item and focus its input (cursor at end).
  startEdit(id) {
    this.editingId = id;
    this.render();
    const input = document.querySelector(".todo-edit-input");
    if (input) {
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
  },

  // Read the current value of the open edit input for a given id.
  getEditValue(id) {
    const input = document.querySelector(
      `.todo-item[data-id="${id}"] .todo-edit-input`
    );
    return input ? input.value.trim() : "";
  },
};

// =====================================================================
//  CONTROLLER
// =====================================================================
const Controller = {
  async init() {
    this.bindEvents();
    try {
      await Model.load();
      View.render();
    } catch (err) {
      console.error("Failed to load todos:", err);
    }
  },

  bindEvents() {
    View.addForm.addEventListener("submit", (e) => this.handleAdd(e));
    // Event delegation: one listener per container handles all item buttons.
    View.pendingList.addEventListener("click", (e) => this.handleListClick(e));
    View.completedList.addEventListener("click", (e) => this.handleListClick(e));
    // Enter = save, Escape = cancel, while editing inline.
    View.pendingList.addEventListener("keydown", (e) => this.handleListKeydown(e));
    View.completedList.addEventListener("keydown", (e) => this.handleListKeydown(e));
    // Event delegation for the pagination controls.
    View.pendingPagination.addEventListener("click", (e) => this.handlePageClick(e));
  },

  handlePageClick(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn || btn.disabled) return;

    const action = btn.dataset.action;
    if (action === "prev") View.currentPage -= 1;
    else if (action === "next") View.currentPage += 1;
    else if (action === "page") View.currentPage = Number(btn.dataset.page);

    View.render();
  },

  async handleAdd(e) {
    e.preventDefault();
    const title = View.todoInput.value.trim();
    if (!title) return; // guard against empty / whitespace-only input
    try {
      await Model.add(title);
      View.clearInput();
      View.currentPage = 1; // new item lands at the top of page 1
      View.render();
    } catch (err) {
      console.error("Failed to add todo:", err);
    }
  },

  async handleListClick(e) {
    const button = e.target.closest("button[data-action]");
    if (!button) return; // clicked somewhere other than an action button

    const item = button.closest(".todo-item");
    const id = Number(item.dataset.id);
    const action = button.dataset.action;

    if (action === "delete") {
      await Model.remove(id);
      View.render();
    } else if (action === "toggle") {
      await Model.toggle(id);
      View.render();
    } else if (action === "edit") {
      View.startEdit(id);
    } else if (action === "save") {
      await this.handleSave(id);
    }
  },

  async handleSave(id) {
    const newTitle = View.getEditValue(id);
    if (!newTitle) return; // ignore empty; stay in edit mode
    await Model.edit(id, newTitle);
    View.editingId = null;
    View.render();
  },

  handleListKeydown(e) {
    if (!e.target.classList.contains("todo-edit-input")) return;
    const id = Number(e.target.closest(".todo-item").dataset.id);
    if (e.key === "Enter") {
      e.preventDefault();
      this.handleSave(id);
    } else if (e.key === "Escape") {
      View.editingId = null;
      View.render();
    }
  },
};

Controller.init();
