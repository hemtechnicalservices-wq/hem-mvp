"use client";

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export default function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
        {value}
      </div>
      {subtitle ? (
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}