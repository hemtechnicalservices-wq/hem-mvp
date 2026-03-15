import { Suspense } from "react";
import DispatcherLoginClient from "./LoginClient";

export default function DispatcherLoginPage() {
  return (
    <Suspense fallback={null}>
      <DispatcherLoginClient />
    </Suspense>
  );
}
