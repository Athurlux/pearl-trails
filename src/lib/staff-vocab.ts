/**
 * Operations vocabulary.
 *
 * Client-safe, like `stay-types.ts` and `booking-status.ts` — the Postgres
 * enums are built from these lists, and a client component can label a role
 * without pulling Drizzle into the browser bundle.
 *
 * See `docs/decisions/006-staff-authentication.md`.
 */

/**
 * Two roles, because there are exactly two things to distinguish.
 *
 * `operations` is the daily work: read everything, act on bookings.
 * `admin` additionally changes the catalogue — prices, inventory, visibility.
 *
 * A third would be invented rather than observed.
 */
export const STAFF_ROLES = ["operations", "admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  operations: "Operations",
  admin: "Administrator",
};

/** Admin is a superset of operations, so this is a rank rather than a set. */
export function hasRole(actual: StaffRole, required: StaffRole): boolean {
  if (required === "operations") return true;
  return actual === "admin";
}

/**
 * What a property is doing in the catalogue.
 *
 * `draft` is not yet public, `published` is live, `archived` is retired without
 * being deleted — bookings reference stays, and history must survive a property
 * leaving the catalogue.
 */
export const STAY_VISIBILITIES = ["draft", "published", "archived"] as const;
export type StayVisibility = (typeof STAY_VISIBILITIES)[number];

export const STAY_VISIBILITY_LABELS: Record<StayVisibility, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

/** Actions worth recording. Not every click — every consequence. */
export const AUDIT_ACTIONS = [
  "staff.signed_in",
  "staff.signed_out",
  "booking.status_changed",
  "booking.note_added",
  "stay.updated",
  "stay.visibility_changed",
  "accommodation.updated",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "staff.signed_in": "Signed in",
  "staff.signed_out": "Signed out",
  "booking.status_changed": "Changed booking status",
  "booking.note_added": "Added a note",
  "stay.updated": "Updated a property",
  "stay.visibility_changed": "Changed property visibility",
  "accommodation.updated": "Updated an accommodation",
};

export const MAX_STAFF_NOTE = 1000;
export const OPS_PAGE_SIZE = 20;
