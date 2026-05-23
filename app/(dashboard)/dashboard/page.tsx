"use client";

import { Activity, HeartPulse, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Stat = {
  label: string;
  value: string;
  icon: typeof Users;
  accent?: boolean;
};

const STATS: Stat[] = [
  { label: "Total Users", value: "1,234", icon: Users },
  { label: "Active Sessions", value: "56", icon: Activity },
  { label: "System Health", value: "Good", icon: HeartPulse, accent: true },
];

const ACTIVITY = [
  "Admin logged in from 127.0.0.1",
  "User 'Player1' updated profile",
  "System backup completed successfully",
];

export default function DashboardPage() {
  return (
    <main className="p-4 md:p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATS.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>{label}</CardDescription>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle
                className={
                  accent ? "text-3xl text-emerald-600 dark:text-emerald-400" : "text-3xl"
                }
              >
                {value}
              </CardTitle>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ACTIVITY.map((line, i) => (
            <div key={i}>
              <p className="text-sm text-muted-foreground">• {line}</p>
              {i < ACTIVITY.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
