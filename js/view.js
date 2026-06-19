// View: pure rendering. Reads from the Model, writes to the DOM. No business
// logic and no state mutation beyond its own UI flags (editingId, currentPage).
import { PAGE_SIZE } from "./config.js";
import { Model } from "./model.js";

export const View = {
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
