"use client";

import { useSearchParams } from "next/navigation";

export default function LoginClient() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next"); // example

  // your existing login UI code goes here
  return (
    <div>
      {/* login form */}
      {/* you can use `next` if you need */}
    </div>
  );
}