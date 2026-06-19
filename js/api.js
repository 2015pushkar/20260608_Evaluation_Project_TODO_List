// Transport layer: knows the endpoints and how to talk HTTP. Returns parsed
// data and throws on failure. No app state lives here.
import { API_BASE } from "./config.js";

// Shared fetch helper: sends JSON when a body is given, checks the status, and
// returns the parsed response body.
async function request(url, method = "GET", body) {
  const options = { method };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${method} failed: ${res.status}`);
  return res.json();
}

export const Api = {
  getAll() {
    return request(API_BASE);
  },
  add(todo) {
    return request(`${API_BASE}/add`, "POST", todo);
  },
  update(id, patch) {
    return request(`${API_BASE}/${id}`, "PATCH", patch);
  },
  remove(id) {
    return request(`${API_BASE}/${id}`, "DELETE");
  },
};
