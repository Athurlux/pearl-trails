/**
 * Stub for the `server-only` package under Vitest.
 *
 * `server-only` deliberately throws when resolved outside a React Server
 * Component. Tests import the query layer directly in Node, so the guard has
 * nothing to protect and only gets in the way. The real package stays in place
 * for the application build.
 */
export {};
