import { Suspense } from "react";
import ClientLoginClient from "./ClientLoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <ClientLoginClient />
    </Suspense>
  );
}
