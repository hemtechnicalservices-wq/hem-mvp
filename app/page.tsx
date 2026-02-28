import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>H.E.M MVP</h1>
      <ul>
        <li><Link href="/owner/login">Owner Login</Link></li>
        <li><Link href="/dispatcher/login">Dispatcher Login</Link></li>
        <li><Link href="/technician/login">Technician Login</Link></li>
      </ul>
    </main>
  );
}