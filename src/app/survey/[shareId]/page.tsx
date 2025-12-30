"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { createResponse, getFormByShareId } from "@/lib/firebase/surveys";
import type { AnswerValue, SurveyField, SurveyForm } from "@/lib/firebase/types";

export default function PublicSurveyPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [respondentId, setRespondentId] = useState<string | null>(null);
  const [alreadyResponded, setAlreadyResponded] = useState(false);

  useEffect(() => {
    if (!shareId) return;
    setLoading(true);
    getFormByShareId(shareId)
      .then(setForm)
      .finally(() => setLoading(false));
  }, [shareId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("cocosurvey_respondent_id");
    if (stored) {
      setRespondentId(stored);
      return;
    }
    const next = crypto.randomUUID();
    window.localStorage.setItem("cocosurvey_respondent_id", next);
    setRespondentId(next);
  }, []);

  useEffect(() => {
    if (!form || typeof window === "undefined") return;
    const key = `cocosurvey_response_${form.id}`;
    setAlreadyResponded(Boolean(window.localStorage.getItem(key)));
  }, [form]);

  const handleAnswerChange = (fieldId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setValidationErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const isFieldVisible = (field: SurveyField) => {
    const visibility = field.visibility;
    if (!visibility?.dependsOnId) return true;
    const targetValue = answers[visibility.dependsOnId];
    switch (visibility.operator) {
      case "checked":
        return targetValue === true;
      case "includes":
        if (Array.isArray(targetValue)) {
          return targetValue.includes(String(visibility.value ?? ""));
        }
        if (typeof targetValue === "string") {
          return targetValue.includes(String(visibility.value ?? ""));
        }
        return false;
      case "not_equals":
        return String(targetValue ?? "") !== String(visibility.value ?? "");
      default:
        return String(targetValue ?? "") === String(visibility.value ?? "");
    }
  };

  const visibleFields = useMemo(
    () => (form ? form.fields.filter((field) => isFieldVisible(field)) : []),
    [form, answers]
  );

  const validateField = (field: SurveyField, value: AnswerValue) => {
    if (!field.required) {
      if (value === undefined || value === null || value === "") {
        return "";
      }
    }
    if (field.required) {
      if (field.type === "multi_select") {
        if (!Array.isArray(value) || value.length === 0) return "必須項目です。";
      } else if (field.type === "checkbox") {
        if (value !== true) return "同意が必要です。";
      } else if (value === undefined || value === null || value === "") {
        return "必須項目です。";
      }
    }
    const validation = field.validation;
    if (!validation) return "";
    if (typeof value === "string") {
      if (validation.minLength && value.length < validation.minLength) {
        return `最小${validation.minLength}文字以上で入力してください。`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `最大${validation.maxLength}文字以内で入力してください。`;
      }
    }
    if (field.type === "date" && typeof value === "string") {
      if (validation.minDate && value < validation.minDate) {
        return `${validation.minDate} 以降の日付を選択してください。`;
      }
      if (validation.maxDate && value > validation.maxDate) {
        return `${validation.maxDate} 以前の日付を選択してください。`;
      }
    }
    return "";
  };

  const formatAnswer = (value: AnswerValue) => {
    if (Array.isArray(value)) return value.join(" / ");
    if (value === true) return "はい";
    if (value === false) return "いいえ";
    return value ? String(value) : "";
  };

  const buildTextForAi = (targetFields: SurveyField[]) =>
    targetFields
      .map((field) => {
        const value = formatAnswer(answers[field.id]);
        return value ? `Q:${field.label}\nA:${value}` : "";
      })
      .filter(Boolean)
      .join("\n\n");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    if (alreadyResponded) {
      setError("このフォームは既に回答済みです。");
      return;
    }
    if (!respondentId) {
      setError("回答者IDの取得に失敗しました。再読み込みしてください。");
      return;
    }
    const nextErrors: Record<string, string> = {};
    visibleFields.forEach((field) => {
      const message = validateField(field, answers[field.id]);
      if (message) nextErrors[field.id] = message;
    });
    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors);
      setError("入力内容を確認してください。");
      return;
    }
    setError("");
    let analysis: {
      overallScore?: number | null;
      sentimentLabel?: "positive" | "neutral" | "negative" | "needs_review" | null;
      confidence?: number | null;
      keywords?: string[];
      model?: string;
    } | null = null;

    if (form.aiEnabled) {
      const freeTextFields = form.fields.filter(
        (field) =>
          field.aiEnabled && (field.type === "short_text" || field.type === "long_text")
      );
      const freeText = buildTextForAi(freeTextFields);
      const overallText = form.aiOverallEnabled ? buildTextForAi(form.fields) : "";
      if (freeText || overallText) {
        try {
          const response = await fetch("/api/ai/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              freeText,
              overallText,
              wantsSentiment: Boolean(freeText),
              wantsOverall: Boolean(overallText),
              minConfidence: form.aiMinConfidence ?? 0.6,
              scoreScale: 10,
            }),
          });
          if (response.ok) {
            analysis = await response.json();
          } else {
            analysis = { sentimentLabel: "needs_review", confidence: 0 };
          }
        } catch {
          analysis = { sentimentLabel: "needs_review", confidence: 0 };
        }
      }
    }

    const responseId = `${form.id}_${respondentId}`;
    try {
      await createResponse({
        responseId,
        formId: form.id,
        orgId: form.orgId,
        respondentId,
        answers,
        analysis: analysis ?? undefined,
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`cocosurvey_response_${form.id}`, "1");
      }
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "送信に失敗しました。";
      if (message.toLowerCase().includes("permission")) {
        setError("このフォームは既に回答済みの可能性があります。");
      } else {
        setError(message);
      }
    }
  };

  if (!form) {
    if (!loading) {
      return (
        <div className="min-h-screen bg-[var(--bg)] px-6 py-16 text-sm text-[var(--muted)]">
          フォームが見つかりませんでした。
        </div>
      );
    }
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
            {alreadyResponded && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700">
                このフォームは既に回答済みです。再回答する場合はブラウザの履歴を削除してください。
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {error}
              </div>
            )}
            {visibleFields.map((field) => (
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
                {validationErrors[field.id] && (
                  <p className="text-xs text-red-500">{validationErrors[field.id]}</p>
                )}
              </div>
            ))}
            <button
              type="submit"
              disabled={alreadyResponded}
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
