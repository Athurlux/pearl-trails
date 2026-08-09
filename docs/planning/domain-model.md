# Domain Model

> Not yet written.

## Entities to define

Property · Unit (room / pitch) · Unit type · Rate / pricing rule · Availability
Booking · Booking line · Guest · Payment · Refund · Cancellation

## Questions the model must answer

- What exactly is the bookable unit — a specific room, or a room *type* with allocation at check-in?
- How is availability represented, and what makes it authoritative?
- Can one booking span multiple units or date ranges?
- What states can a booking be in, and which transitions are legal?
- Where does money live, and how does it relate to a booking?
