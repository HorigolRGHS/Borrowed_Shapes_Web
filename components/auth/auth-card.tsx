import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  logo?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthCard({ logo, title, description, children, footer, className }: Props) {
  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader className="space-y-3 text-center">
        {logo && <div className="flex justify-center">{logo}</div>}
        <CardTitle className="text-2xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && <CardFooter className="justify-center text-sm">{footer}</CardFooter>}
    </Card>
  );
}

export function AuthLogo() {
  return (
    <div className="w-14 h-14 bg-linear-to-tr from-primary to-primary/70 rounded-2xl rotate-12 flex items-center justify-center shadow-md">
      <span className="text-primary-foreground text-2xl font-black -rotate-12">B</span>
    </div>
  );
}
