// Transport layer: knows the endpoints and how to talk HTTP. Returns parsed
// data and throws on failure. No app state lives here.
import { API_BASE } from "./config.js";

// Shared fetch helper: sends JSON when a body is given, checks the status, and
// returns the parsed response body.
async function request(url, method = "GET", body) {
  const options = { method };
  if (body !== undefined) {  // adding new properties to the options object
    options.headers = { "Content-Type": "application/json" }; // tell server we're sending JSON as the request body
    options.body = JSON.stringify(body); // convert the request body to a JSON string  - HTTP sends data as text/bytes
  }
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${method} failed: ${res.status}`);
  return res.json(); // converts the response body to a JavaScript object or array of objects
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
