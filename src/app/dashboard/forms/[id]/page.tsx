"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import FormFieldsEditor from "@/components/FormFieldsEditor";
import TopNav from "@/components/TopNav";
import { useAuth } from "@/lib/auth/AuthContext";
import { getFormById, updateForm } from "@/lib/firebase/surveys";
import type { SurveyField, SurveyForm } from "@/lib/firebase/types";

export default function EditFormPage() {
  const params = useParams();
  const formId = params.id as string;
  const { user } = useAuth();
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!formId) return;
    getFormById(formId).then((data) => {
      if (!data) return;
      setForm(data);
      setTitle(data.title);
      setDescription(data.description);
      setStatus(data.status);
      setFields(data.fields);
    });
  }, [formId]);

  const shareUrl = useMemo(() => {
    if (!form?.shareId || typeof window === "undefined") return "";
    return `${window.location.origin}/survey/${form.shareId}`;
  }, [form]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      await updateForm(form.id, { title, description, status, fields });
      setMessage("更新しました");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setMessage("共有URLをコピーしました");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <TopNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">フォーム編集</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              共有URLの管理や質問内容の調整ができます。
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
        ) : !form ? (
          <div className="mt-8 text-sm text-[var(--muted)]">読み込み中...</div>
        ) : (
          <div className="mt-8 space-y-6">
            {message && (
              <div className="rounded-2xl border border-black/10 bg-[var(--accent)] p-3 text-xs text-[var(--primary)]">
                {message}
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
              <div className="mt-4 rounded-xl border border-dashed border-black/10 bg-[var(--accent)] p-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--primary)]">共有URL</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-[var(--primary)]"
                  >
                    コピー
                  </button>
                </div>
                <p className="mt-2 break-all text-[var(--muted)]">
                  {shareUrl || "生成中..."}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">質問項目</h2>
              <div className="mt-4">
                <FormFieldsEditor fields={fields} onChange={setFields} />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Link
                href={`/dashboard/forms/${form.id}/responses`}
                className="rounded-full border border-black/10 px-6 py-3 text-sm font-semibold text-[var(--primary)]"
              >
                回答一覧
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60"
              >
                {saving ? "保存中..." : "更新"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
