import LoginForm from "@/app/components/LoginForm";

export default function OwnerLoginPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Owner Login</h1>
      <LoginForm redirectTo="/owner/dashboard" />
    </main>
  );
}