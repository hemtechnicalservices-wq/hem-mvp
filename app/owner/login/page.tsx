import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function OwnerLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
