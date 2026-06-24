// Model: the single source of truth for todo state. Owns localStorage and
// orchestrates API calls (via Api). The only place state mutates.
import { STORAGE_KEY } from "./config.js";
import { Api } from "./api.js";

export const Model = {
  // dummyjson does NOT persist changes, so after every successful API call we
  // manually update this array (and localStorage).
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
    const data = await Api.getAll();
    this.todos = data.todos || [];
    console.log("Loaded todos from API:", this.todos); 
    this.save();
  },



  // POST a new todo, then update local state.
  async add(title) {
    await Api.add({ todo: title, completed: false, userId: 1 });
    this.todos.unshift({ id: this.nextLocalId(), todo: title, completed: false });
    this.save();
  },

  // DELETE a todo, then remove from local state.
  async remove(id) {
    try {
      await Api.remove(id);
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
      await Api.update(id, { completed: newCompleted });
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
      await Api.update(id, { todo: newTitle });
    } catch (err) {
      console.warn("PATCH (edit) not persisted on server:", err.message);
    }
    todo.todo = newTitle;
    this.save();
  },
};
