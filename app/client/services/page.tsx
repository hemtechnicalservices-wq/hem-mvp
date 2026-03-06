const CATEGORIES = [
  "AC Services",
  "Electrical",
  "Plumbing",
  "Painting",
  "Handyman",
  "Jet Washing",
  "General Property Maintenance",
];

const AC_ISSUES = [
  "AC not cooling",
  "AC leaking water",
  "AC noisy",
  "AC bad smell",
  "AC thermostat issue",
  "AC maintenance",
  "AC installation",
];

export default function ServicesPage() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Services</h1>
      <ul className="list-disc pl-6">
        {CATEGORIES.map((c) => <li key={c}>{c}</li>)}
      </ul>

      <h2 className="text-xl font-medium">AC Service Issues</h2>
      <ul className="list-disc pl-6">
        {AC_ISSUES.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </main>
  );
}