"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import TopNav from "@/components/TopNav";
import { useAuth } from "@/lib/auth/AuthContext";
import { listForms } from "@/lib/firebase/surveys";
import type { SurveyForm } from "@/lib/firebase/types";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [forms, setForms] = useState<SurveyForm[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    listForms(user.orgId)
      .then(setForms)
      .finally(() => setFetching(false));
  }, [user]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">フォーム一覧</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              作成したフォームと回答状況を確認できます。
            </p>
          </div>
          <Link
            href="/dashboard/forms/new"
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
          >
            新規フォーム
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 text-sm text-[var(--muted)]">読み込み中...</div>
        ) : !user ? (
          <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 text-sm">
            <p>ログインが必要です。</p>
            <Link href="/login" className="mt-3 inline-block text-[var(--primary)]">
              ログインへ
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {forms.length === 0 && !fetching && (
              <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-[var(--muted)]">
                まだフォームがありません。右上の「新規フォーム」から作成してください。
              </div>
            )}
            {forms.map((form) => (
              <div key={form.id} className="rounded-2xl border border-black/10 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{form.title}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {form.description || "説明なし"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold text-[var(--primary)]">
                    {form.status === "active" ? "公開中" : "下書き"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  <Link
                    href={`/dashboard/forms/${form.id}`}
                    className="rounded-full border border-black/10 px-3 py-1 text-[var(--primary)]"
                  >
                    編集
                  </Link>
                  <Link
                    href={`/dashboard/forms/${form.id}/responses`}
                    className="rounded-full border border-black/10 px-3 py-1 text-[var(--primary)]"
                  >
                    回答一覧
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
