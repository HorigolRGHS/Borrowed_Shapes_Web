"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Shield, Users, Database } from "lucide-react";

interface NavGroup {
  title: string;
  items: { href: string; label: string }[];
}

const icons = [Shield, Users, FileText, Database];

export default function SidebarNav({ navGroups }: { navGroups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <aside className="md:col-span-1 space-y-8">
      {navGroups.map((group, idx) => {
        const Icon = icons[idx % icons.length];
        return (
          <div key={idx}>
            <h3 className="flex items-center text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-3">
              <Icon className="w-4 h-4 mr-2" />
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item, itemIdx) => {
                const isActive = pathname === item.href;
                return (
                  <li key={itemIdx}>
                    <Link
                      href={item.href}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? "bg-amber-500/10 text-amber-500 font-medium"
                          : "text-foreground hover:bg-card/50 hover:text-amber-500"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </aside>
  );
}
