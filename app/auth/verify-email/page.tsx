"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerifyState = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!token) {
        if (!active) return;
        setState("error");
        setMessage("Missing verification token.");
        return;
      }

      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
          {
            method: "POST",
          },
        );
        const data = await res.json().catch(() => ({}));

        if (!active) return;

        if (res.ok) {
          setState("success");
          setMessage(
            data?.message ??
              "Email verified successfully. You can now login in game/web.",
          );
        } else {
          setState("error");
          setMessage(data?.message ?? "Verification failed or link expired.");
        }
      } catch {
        if (!active) return;
        setState("error");
        setMessage("Cannot connect to server. Please try again.");
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Email Verification
        </h1>
        <p className="mt-3 text-zinc-700">{message}</p>

        {state === "loading" && (
          <p className="mt-4 text-sm text-zinc-500">Please wait...</p>
        )}

        {state !== "loading" && (
          <div className="mt-6 flex gap-3">
            <Link
              href="/"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Back to Home
            </Link>
            {state === "error" && (
              <Link
                href="/auth/reset-password"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Open Reset Page
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
          <p className="text-zinc-600">Loading...</p>
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
