"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { createResponse, getFormByShareId } from "@/lib/firebase/surveys";
import type { AnswerValue, SurveyForm } from "@/lib/firebase/types";

export default function PublicSurveyPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!shareId) return;
    getFormByShareId(shareId).then(setForm);
  }, [shareId]);

  const handleAnswerChange = (fieldId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const requiredMissing = useMemo(() => {
    if (!form) return [];
    return form.fields.filter((field) => {
      if (!field.required) return false;
      const value = answers[field.id];
      if (field.type === "multi_select") {
        return !Array.isArray(value) || value.length === 0;
      }
      if (field.type === "checkbox") {
        return value !== true;
      }
      return value === undefined || value === null || value === "";
    });
  }, [answers, form]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    if (requiredMissing.length > 0) {
      setError("未入力の必須項目があります。");
      return;
    }
    setError("");
    await createResponse({
      formId: form.id,
      orgId: form.orgId,
      answers,
    });
    setSubmitted(true);
  };

  if (!form) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-6 py-16 text-sm text-[var(--muted)]">
        読み込み中です...
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <main className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-3xl border border-black/10 bg-white p-8 text-center">
            <h1 className="text-2xl font-semibold">送信ありがとうございました</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              回答を受け付けました。内容確認のうえご連絡いたします。
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-3xl border border-black/10 bg-white p-8">
          <p className="text-xs font-semibold tracking-[0.3em] text-[var(--primary)]">
            CoCoSurvey
          </p>
          <h1 className="mt-3 text-2xl font-semibold">{form.title}</h1>
          {form.description && (
            <p className="mt-2 text-sm text-[var(--muted)]">{form.description}</p>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {error}
              </div>
            )}
            {form.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-semibold">
                  {field.label}
                  {field.required && (
                    <span className="ml-2 text-xs text-red-500">必須</span>
                  )}
                </label>
                {field.type === "short_text" && (
                  <input
                    type="text"
                    value={(answers[field.id] as string) ?? ""}
                    onChange={(event) => handleAnswerChange(field.id, event.target.value)}
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  />
                )}
                {field.type === "long_text" && (
                  <textarea
                    value={(answers[field.id] as string) ?? ""}
                    onChange={(event) => handleAnswerChange(field.id, event.target.value)}
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    rows={4}
                  />
                )}
                {field.type === "single_select" && (
                  <select
                    value={(answers[field.id] as string) ?? ""}
                    onChange={(event) => handleAnswerChange(field.id, event.target.value)}
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  >
                    <option value="">選択してください</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
                {field.type === "multi_select" && (
                  <div className="space-y-2">
                    {(field.options ?? []).map((option) => {
                      const current = Array.isArray(answers[field.id])
                        ? (answers[field.id] as string[])
                        : [];
                      const checked = current.includes(option);
                      return (
                        <label key={option} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [...current, option]
                                : current.filter((item) => item !== option);
                              handleAnswerChange(field.id, next);
                            }}
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                )}
                {field.type === "date" && (
                  <input
                    type="date"
                    value={(answers[field.id] as string) ?? ""}
                    onChange={(event) => handleAnswerChange(field.id, event.target.value)}
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  />
                )}
                {field.type === "checkbox" && (
                  <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <input
                      type="checkbox"
                      checked={Boolean(answers[field.id])}
                      onChange={(event) => handleAnswerChange(field.id, event.target.checked)}
                    />
                    同意する
                  </label>
                )}
              </div>
            ))}
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
            >
              送信する
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
