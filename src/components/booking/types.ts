/** Shared shapes for the booking flow's client components. */

export interface BookingOption {
  slug: string;
  name: string;
  shortDescription: string;
  guestCapacity: number;
  bedDescription: string;
  priceFromUgx: number;
  sizeSqm: number | null;
  features: string[];
  image: string;
  imageAlt: string;
  /**
   * Units free for the currently selected dates, computed server-side.
   *
   * Advisory: it is what the interface shows, not what decides the booking.
   * The authority is the exclusion constraint hit on submit, so a stale value
   * here loses a race gracefully rather than overbooking.
   */
  available: number;
  inventory: number;
}

export interface BookingExperienceOption {
  slug: string;
  name: string;
  shortDescription: string;
  category: string;
  duration: string;
  priceFromUgx: number | null;
  image: string;
  imageAlt: string;
}

/**
 * Traveller details.
 *
 * Lives in component state and goes straight into the server action. It is
 * never written to the URL, never to localStorage, and never to a query
 * parameter — see docs/decisions/003.
 */
export interface TravellerForm {
  fullName: string;
  email: string;
  phoneCode: string;
  phoneNumber: string;
  country: string;
  specialRequests: string;
}
