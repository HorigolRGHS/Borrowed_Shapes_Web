"use client";

export default function DashboardPage() {
  return (
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
          <p>• User &apos;Player1&apos; updated profile</p>
          <p>• System backup completed successfully</p>
        </div>
      </div>
    </main>
  );
}
