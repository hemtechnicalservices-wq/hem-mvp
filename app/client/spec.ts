export const CLIENT_SCREENS = [
  "Home",
  "Services",
  "New Request",
  "My Jobs",
  "Invoices",
  "Profile",
] as const;

export const SERVICE_CATALOG = [
  {
    key: "ac-services",
    name: "AC Services",
    icon: "❄",
    description: "Cooling, leakage, gas refill, and preventive AC maintenance.",
    issues: [
      "AC not cooling",
      "AC leaking water",
      "AC noisy",
      "AC bad smell",
      "AC thermostat problem",
      "AC maintenance service",
      "AC installation",
      "AC gas refill",
      "AC filter cleaning",
    ],
  },
  {
    key: "electrical-services",
    name: "Electrical Services",
    icon: "⚡",
    description: "Fault finding, wiring, switches, sockets, and fixture installs.",
    issues: [
      "Light not working",
      "Socket not working",
      "Breaker keeps tripping",
      "Electrical burning smell",
      "Water heater electrical issue",
      "Switch replacement",
      "Electrical wiring issue",
      "Fan installation",
    ],
  },
  {
    key: "plumbing-services",
    name: "Plumbing Services",
    icon: "🔧",
    description: "Leak repairs, drain blockage clearing, and fixture replacement.",
    issues: [
      "Leak under sink",
      "Blocked drain",
      "Toilet flushing problem",
      "Shower leak",
      "Water heater leak",
      "Low water pressure",
      "Pipe repair",
      "Faucet replacement",
    ],
  },
  {
    key: "painting-services",
    name: "Painting Services",
    icon: "🎨",
    description: "Touch-up, crack repair, full room, and full apartment painting.",
    issues: [
      "Wall painting",
      "Ceiling painting",
      "Crack repair and paint",
      "Touch up painting",
      "Full room painting",
      "Full apartment painting",
    ],
  },
  {
    key: "handyman-services",
    name: "Handyman Services",
    icon: "🛠",
    description: "Mounting, installations, furniture assembly, and minor fixes.",
    issues: [
      "TV mounting",
      "Curtain installation",
      "Shelf installation",
      "Door handle repair",
      "Furniture assembly",
      "Lock replacement",
    ],
  },
  {
    key: "jet-washing-services",
    name: "Jet Washing Services",
    icon: "💧",
    description: "High-pressure cleaning for balconies, driveways, and exteriors.",
    issues: [
      "Balcony washing",
      "Driveway washing",
      "Outdoor tiles washing",
      "Parking washing",
      "Villa exterior washing",
    ],
  },
  {
    key: "general-property-maintenance",
    name: "General Property Maintenance",
    icon: "🏠",
    description: "Inspection, preventive maintenance, and multi-issue visits.",
    issues: [
      "Property inspection",
      "Minor repairs",
      "Preventive maintenance",
      "Multiple issues visit",
    ],
  },
] as const;

export const SERVICE_CATEGORIES = SERVICE_CATALOG.map((item) => item.name);

export const ISSUES_BY_CATEGORY: Record<string, readonly string[]> = Object.fromEntries(
  SERVICE_CATALOG.map((item) => [item.name, item.issues])
);

export const QUICK_ACTIONS = [
  { label: "New Request", href: "/client/new-request" },
  { label: "My Jobs", href: "/client/my-jobs" },
  { label: "Invoices", href: "/client/invoices" },
] as const;

export const CLIENT_TIMELINE = [
  "Request received",
  "Quote prepared",
  "Quote approved",
  "Technician assigned",
  "Technician on the way",
  "Job in progress",
  "Job completed",
  "Invoice generated",
  "Payment completed",
] as const;

export const CLIENT_NOTIFICATIONS = [
  "Request received",
  "Quote ready",
  "Job scheduled",
  "Technician assigned",
  "Technician on the way",
  "Job completed",
  "Invoice generated",
  "Payment confirmation",
] as const;

export const JOB_STATUSES = [
  "Pending review",
  "Waiting quote",
  "Scheduled",
  "Technician assigned",
  "On the way",
  "In progress",
  "Completed",
  "Cancelled",
] as const;

export const TECHNICIAN_STATUSES = ["Assigned", "On the way", "Arrived", "In progress"] as const;

export const AMC_PLANS = [
  {
    name: "Basic Plan",
    priceAed: 699,
    features: ["Two visits per year", "Priority support"],
  },
  {
    name: "Standard Plan",
    priceAed: 1299,
    features: ["Four visits per year", "Discount on repairs"],
  },
  {
    name: "Premium Plan",
    priceAed: 2299,
    features: ["Unlimited service visits", "Priority scheduling", "Preventive maintenance"],
  },
] as const;

export const CLIENT_DATA_FIELDS = [
  "Name",
  "Phone number",
  "Email",
  "Primary address",
  "Additional properties",
] as const;
