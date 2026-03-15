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
  "Technician arrived",
  "Job started",
  "Job completed",
  "Invoice issued",
  "Payment completed",
  "Job closed",
] as const;

export const CLIENT_NOTIFICATIONS = [
  "Request received",
  "Quote ready",
  "Job scheduled",
  "Technician assigned",
  "Technician on the way",
  "Technician arrived",
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
    key: "basic",
    name: "Basic Plan",
    monthlyPriceAed: 299,
    yearlyPriceAed: 3200,
    maintenanceVisitsPerYear: "4",
    emergencyCalloutsPerYear: "4",
    responseTime: "Within 24 hours",
    laborDiscount: "20%",
    sparePartsIncluded: false,
    features: [
      "AC inspection",
      "Electrical inspection",
      "Plumbing inspection",
      "General maintenance inspection",
    ],
  },
  {
    key: "standard",
    name: "Standard Plan",
    monthlyPriceAed: 499,
    yearlyPriceAed: 5000,
    maintenanceVisitsPerYear: "8",
    emergencyCalloutsPerYear: "8",
    responseTime: "Within 12 hours",
    laborDiscount: "25%",
    sparePartsIncluded: false,
    features: [
      "2 AC services per year",
      "2 electrical inspections per year",
      "2 plumbing inspections per year",
      "4 handyman minor-repair visits per year",
    ],
  },
  {
    key: "premium",
    name: "Premium Plan",
    monthlyPriceAed: 799,
    yearlyPriceAed: 8500,
    maintenanceVisitsPerYear: "Unlimited",
    emergencyCalloutsPerYear: "Unlimited",
    responseTime: "2-4 hours",
    laborDiscount: "30%",
    sparePartsIncluded: false,
    features: [
      "3 AC services per year",
      "Unlimited electrical minor repairs",
      "Unlimited plumbing minor repairs",
      "Unlimited handyman minor repairs",
    ],
  },
] as const;

export const CLIENT_DATA_FIELDS = [
  "Name",
  "Phone number",
  "Email",
  "Primary address",
  "Additional properties",
] as const;
