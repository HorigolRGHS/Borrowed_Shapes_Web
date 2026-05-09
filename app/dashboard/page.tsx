"use client";

import { useI18n } from "@/lib/i18/i18n-context";
import { getUserProfile, handleLogout } from "@/lib/api/api-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const profile = getUserProfile();
    if (!profile || profile.role !== "ADMIN") {
      router.push("/");
    } else {
      setUser(profile);
    }
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar giả lập */}
      <div className="w-64 bg-slate-900 text-white p-6 hidden md:block">
        <h2 className="text-2xl font-bold mb-10">Admin Panel</h2>
        <nav className="space-y-4">
          <div className="p-3 bg-blue-600 rounded-lg cursor-pointer">
            {t("common.dashboard")}
          </div>
          <div className="p-3 hover:bg-slate-800 rounded-lg cursor-pointer">
            Users
          </div>
          <div className="p-3 hover:bg-slate-800 rounded-lg cursor-pointer">
            Settings
          </div>
        </nav>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <h1 className="text-xl font-bold text-gray-800">
            {t("common.dashboard")}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">
              {user.displayName}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:underline"
            >
              {t("common.logout")}
            </button>
          </div>
        </header>

        <main className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-white rounded-xl shadow-sm border">
              <p className="text-sm text-gray-500 mb-1">Total Users</p>
              <h3 className="text-3xl font-bold">1,234</h3>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm border">
              <p className="text-sm text-gray-500 mb-1">Active Sessions</p>
              <h3 className="text-3xl font-bold">56</h3>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm border">
              <p className="text-sm text-gray-500 mb-1">System Health</p>
              <h3 className="text-3xl font-bold text-green-500">Good</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-8">
            <h4 className="text-lg font-bold mb-4">Recent Activity</h4>
            <div className="space-y-4 text-gray-600">
              <p>• Admin logged in from 127.0.0.1</p>
              <p>• User 'Player1' updated profile</p>
              <p>• System backup completed successfully</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
