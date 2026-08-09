import type { ItineraryPreview } from "./types";

export const itineraryPreview: ItineraryPreview = {
  title: "Your Bwindi Escape",
  destination: "Bwindi Impenetrable Forest",
  nights: 2,
  days: [
    {
      day: 1,
      label: "Arrival",
      activities: [
        { time: "15:00", title: "Lodge check-in" },
        { time: "16:30", title: "Guided nature walk" },
        { time: "19:30", title: "Dinner on the deck" },
      ],
    },
    {
      day: 2,
      label: "The forest",
      activities: [
        { time: "06:00", title: "Gorilla trekking" },
        { time: "13:00", title: "Forest lunch" },
        { time: "19:00", title: "Campfire evening" },
      ],
    },
    {
      day: 3,
      label: "Departure",
      activities: [
        { time: "07:30", title: "Breakfast" },
        { time: "09:00", title: "Community experience" },
        { time: "12:00", title: "Departure" },
      ],
    },
  ],
};
