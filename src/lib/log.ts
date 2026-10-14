// Who did what, one line each, on the server's output: what `flyctl logs`
// shows. A person is their first name and the start of their id, so two
// Anas can be told apart without printing the whole cookie value.
export function who(person: { id: string; name: string }): string {
  return `${person.name}(${person.id.slice(0, 8)})`;
}

export function log(actor: { id: string; name: string } | undefined, action: string, detail: Record<string, unknown> = {}) {
  const parts = Object.entries(detail).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
  console.log(`[vybe] ${actor ? who(actor) : "anonymous"} ${action}${parts.length ? " " + parts.join(" ") : ""}`);
}
