"use client";
import { AppShell } from '@/components/layout';

export default function Template({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
