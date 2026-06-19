// Controller: wires DOM events to Model methods, then re-renders via the View.
import { Model } from "./model.js";
import { View } from "./view.js";

export const Controller = {
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
    View.completedList.addEventListener("keydown", (e) =>
      this.handleListKeydown(e)
    );
    // Event delegation for the pagination controls.
    View.pendingPagination.addEventListener("click", (e) =>
      this.handlePageClick(e)
    );
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
