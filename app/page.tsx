import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 40 }}>
      <h1>H.E.M - Home</h1>
      <p>✅ Supabase connected</p>
      <p>
        Visit <Link href="/owner">/owner</Link> to login
      </p>
    </main>
  );
}