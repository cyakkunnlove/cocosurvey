"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import FormFieldsEditor from "@/components/FormFieldsEditor";
import TopNav from "@/components/TopNav";
import { useAuth } from "@/lib/auth/AuthContext";
import { createForm } from "@/lib/firebase/surveys";
import type { SurveyField } from "@/lib/firebase/types";

export default function NewFormPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("新規ヒアリングフォーム");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("active");
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (fields.length === 0) {
      setError("質問項目を追加してください");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const shareId = crypto.randomUUID();
      const formId = await createForm({
        orgId: user.orgId,
        createdBy: user.uid,
        title,
        description,
        status,
        shareId,
        fields,
      });
      router.push(`/dashboard/forms/${formId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <TopNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">新規フォーム作成</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              汎用の事前ヒアリングフォームを作成します。
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-[var(--primary)]">
            一覧へ戻る
          </Link>
        </div>

        {!user ? (
          <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 text-sm">
            ログインが必要です。
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-600">
                {error}
              </div>
            )}
            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">
                    タイトル
                  </label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">
                    公開状態
                  </label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as "draft" | "active")}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  >
                    <option value="active">公開</option>
                    <option value="draft">下書き</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="text-xs font-semibold text-[var(--muted)]">
                  説明
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">質問項目</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                業種を問わず使える質問を追加してください。
              </p>
              <div className="mt-4">
                <FormFieldsEditor fields={fields} onChange={setFields} />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
              >
                {saving ? "保存中..." : "保存して公開"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
