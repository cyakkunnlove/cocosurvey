"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import TopNav from "@/components/TopNav";
import { useAuth } from "@/lib/auth/AuthContext";
import { getFormById, listResponses } from "@/lib/firebase/surveys";
import type { SurveyForm, SurveyResponse } from "@/lib/firebase/types";

export default function ResponsesPage() {
  const params = useParams();
  const formId = params.id as string;
  const { user } = useAuth();
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);

  useEffect(() => {
    if (!formId || !user) return;
    getFormById(formId).then(setForm);
    listResponses(formId).then(setResponses);
  }, [formId, user]);

  const headers = useMemo(() => {
    if (!form) return [] as string[];
    return ["回答日時", ...form.fields.map((field) => field.label)];
  }, [form]);

  const formatValue = (value: unknown) => {
    if (Array.isArray(value)) return value.join(" / ");
    if (value === true) return "はい";
    if (value === false) return "いいえ";
    return value ? String(value) : "";
  };

  const handleExport = () => {
    if (!form) return;
    const rows = responses.map((response) => {
      const base = [response.submittedAt.toISOString()];
      const answers = form.fields.map((field) =>
        formatValue(response.answers[field.id])
      );
      return [...base, ...answers];
    });
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form.title}_responses.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">回答一覧</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              回答内容を確認し、CSVで出力できます。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/forms/${formId}`} className="text-sm text-[var(--primary)]">
              フォーム編集へ
            </Link>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white"
            >
              CSV出力
            </button>
          </div>
        </div>

        {!user ? (
          <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 text-sm">
            ログインが必要です。
          </div>
        ) : !form ? (
          <div className="mt-8 text-sm text-[var(--muted)]">読み込み中...</div>
        ) : (
          <div className="mt-8 space-y-4">
            {responses.length === 0 && (
              <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-[var(--muted)]">
                まだ回答がありません。
              </div>
            )}
            {responses.map((response) => (
              <div key={response.id} className="rounded-2xl border border-black/10 bg-white p-6">
                <p className="text-xs text-[var(--muted)]">
                  {response.submittedAt.toLocaleString()}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {form.fields.map((field) => (
                    <div key={field.id} className="text-sm">
                      <p className="text-xs text-[var(--muted)]">{field.label}</p>
                      <p className="mt-1 font-semibold">
                        {formatValue(response.answers[field.id]) || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
