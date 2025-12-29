"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/auth/AuthContext";

const navLinks = [
  { href: "/dashboard", label: "フォーム一覧" },
  { href: "/dashboard/forms/new", label: "新規フォーム" },
];

export default function TopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-[0.3em] text-[var(--primary)]">
            CoCoSurvey
          </span>
          <span className="text-sm font-semibold">事前フォーム管理</span>
        </Link>

        <nav className="hidden items-center gap-4 text-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 transition ${
                pathname === link.href
                  ? "bg-[var(--accent)] text-[var(--primary)]"
                  : "text-[var(--muted)] hover:text-[var(--primary)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden text-[var(--muted)] sm:block">
                {user.orgName}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-[var(--primary)] hover:border-[var(--primary)]"
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-dark)]"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
