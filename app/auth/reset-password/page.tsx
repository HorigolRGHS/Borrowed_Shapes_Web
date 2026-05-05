"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token) {
      setMessage("Missing reset token in URL.");
      setSuccess(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(
        `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        },
      );

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccess(true);
        setMessage(data?.message ?? "Password reset successfully.");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setSuccess(false);
        setMessage(
          data?.message ?? "Reset failed. Token may be invalid or expired.",
        );
      }
    } catch {
      setSuccess(false);
      setMessage("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-zinc-900">Reset Password</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This page is used by one-time link from your email.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
              placeholder="Type again"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Reset Password"}
          </button>
        </form>

        {message && (
          <p
            className={`mt-4 text-sm ${success ? "text-emerald-700" : "text-red-600"}`}
          >
            {message}
          </p>
        )}

        <div className="mt-6">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-700 underline"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
          <p className="text-zinc-600">Loading...</p>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
