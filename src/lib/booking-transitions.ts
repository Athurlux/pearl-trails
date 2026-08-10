import { BOOKING_STATUSES, type BookingStatus } from "./booking-status";

/**
 * What a booking may become, and from where.
 *
 * Pure and central, so there is exactly one answer to "is this change legal"
 * and the operations UI cannot offer something the server would refuse. The
 * server refuses anyway — this is not the guarantee, it is the shared
 * definition the guarantee is written against.
 *
 * The rules:
 *
 *   pending    → confirmed  the property accepted it
 *              → cancelled  the traveller or the property withdrew
 *              → expired    it lapsed before anyone actioned it
 *   confirmed  → cancelled  a confirmed stay can still fall through
 *   cancelled  → nothing    terminal
 *   expired    → nothing    terminal
 *
 * `confirmed → pending` is deliberately absent. Telling a traveller their stay
 * is confirmed and then quietly un-confirming it is not a state change, it is a
 * different conversation, and it should require a cancellation someone can see.
 *
 * Both terminal states release the unit — they are outside
 * `BLOCKING_BOOKING_STATUSES` — so moving into one frees inventory for the
 * dates, which is exactly what cancelling should do.
 */
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ["confirmed", "cancelled", "expired"],
  confirmed: ["cancelled"],
  cancelled: [],
  expired: [],
};

export function allowedTransitions(from: BookingStatus): readonly BookingStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

/**
 * What a staff member is about to do, in their words.
 *
 * Written for a confirmation prompt, so each one names the consequence rather
 * than the enum — "the dates are released" is the part that matters and the
 * part someone might not expect.
 */
export const TRANSITION_DESCRIPTIONS: Record<BookingStatus, string> = {
  confirmed:
    "Marks this reservation as accepted by the property. The dates stay held.",
  cancelled:
    "Cancels this reservation and releases the dates. Someone else can book them.",
  expired:
    "Marks this request as lapsed and releases the dates. Use it for requests nobody actioned.",
  pending: "Returns this to an unreviewed request.",
};
