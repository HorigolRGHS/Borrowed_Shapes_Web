"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function GoogleFinishContent() {
  const searchParams = useSearchParams();
  const loginCode = useMemo(
    () => searchParams.get("loginCode") ?? "",
    [searchParams],
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loginCode) return;
    void navigator.clipboard
      ?.writeText(loginCode)
      .then(() => setCopied(true))
      .catch(() => {});
  }, [loginCode]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Google Login Complete
        </h1>
        <p className="mt-3 text-zinc-700">
          {loginCode
            ? "Đã nhận loginCode. Copy mã này sang Unity để hoàn tất đăng nhập."
            : "Thiếu loginCode trên URL."}
        </p>

        {loginCode && (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-950 px-4 py-3 text-sm text-zinc-100">
            {loginCode}
          </pre>
        )}

        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className={copied ? "text-emerald-600" : "text-zinc-500"}>
            {copied ? "Đã copy vào clipboard" : "Đang chờ copy..."}
          </span>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function GoogleFinishPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
          <p className="text-zinc-600">Loading...</p>
        </main>
      }
    >
      <GoogleFinishContent />
    </Suspense>
  );
}
