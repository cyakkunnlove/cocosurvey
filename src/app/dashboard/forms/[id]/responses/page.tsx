"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import TopNav from "@/components/TopNav";
import { useAuth } from "@/lib/auth/AuthContext";
import { getFormById, listResponses, updateResponse } from "@/lib/firebase/surveys";
import type { SurveyForm, SurveyResponse } from "@/lib/firebase/types";

const statusOptions = [
  { value: "new", label: "新規" },
  { value: "in_progress", label: "対応中" },
  { value: "done", label: "完了" },
] as const;

const positiveWords = ["満足", "良い", "便利", "助かる", "素晴らしい", "快適", "早い", "安心"];
const negativeWords = ["不満", "悪い", "不便", "面倒", "遅い", "高い", "困る", "不安"];

const formatValue = (value: unknown) => {
  if (Array.isArray(value)) return value.join(" / ");
  if (value === true) return "はい";
  if (value === false) return "いいえ";
  return value ? String(value) : "";
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

export default function ResponsesPage() {
  const params = useParams();
  const formId = params.id as string;
  const { user } = useAuth();
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | SurveyResponse["status"]>(
    "all"
  );
  const [keywordFilter, setKeywordFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [memoInputs, setMemoInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!formId || !user) return;
    getFormById(formId).then(setForm);
    listResponses(formId, user.orgId).then((items) => {
      setResponses(items);
      const memos: Record<string, string> = {};
      items.forEach((item) => {
        memos[item.id] = item.memo ?? "";
      });
      setMemoInputs(memos);
    });
  }, [formId, user]);

  const filteredResponses = useMemo(() => {
    return responses.filter((response) => {
      if (statusFilter !== "all" && response.status !== statusFilter) return false;
      if (tagFilter && !response.tags.some((tag) => tag.includes(tagFilter))) return false;
      if (startDate && toDateKey(response.submittedAt) < startDate) return false;
      if (endDate && toDateKey(response.submittedAt) > endDate) return false;
      if (keywordFilter) {
        const haystack = [
          ...Object.values(response.answers).map(formatValue),
          response.memo ?? "",
          response.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keywordFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [responses, statusFilter, tagFilter, keywordFilter, startDate, endDate]);

  const summary = useMemo(() => {
    if (!form) {
      return {
        total: 0,
        completionRate: 0,
        avgAnswered: 0,
        lastResponse: "-",
      };
    }
    const requiredFields = form.fields.filter((field) => field.required);
    const completionRates = responses.map((response) => {
      if (requiredFields.length === 0) return 1;
      const answered = requiredFields.filter((field) => {
        const value = response.answers[field.id];
        if (field.type === "multi_select") {
          return Array.isArray(value) && value.length > 0;
        }
        if (field.type === "checkbox") {
          return value === true;
        }
        return value !== undefined && value !== null && value !== "";
      });
      return answered.length / requiredFields.length;
    });
    const avgAnswered =
      responses.length === 0
        ? 0
        : Math.round(
            responses.reduce((sum, response) => {
              const count = form.fields.filter((field) => {
                const value = response.answers[field.id];
                if (field.type === "multi_select") {
                  return Array.isArray(value) && value.length > 0;
                }
                if (field.type === "checkbox") {
                  return value === true;
                }
                return value !== undefined && value !== null && value !== "";
              }).length;
              return sum + count;
            }, 0) / responses.length
          );
    const lastResponse = responses[0]?.submittedAt.toLocaleString() ?? "-";
    const completionRate =
      completionRates.length === 0
        ? 0
        : Math.round(
            (completionRates.reduce((sum, rate) => sum + rate, 0) /
              completionRates.length) *
              100
          );
    return {
      total: responses.length,
      completionRate,
      avgAnswered,
      lastResponse,
    };
  }, [form, responses]);

  const distribution = useMemo(() => {
    if (!form) return [];
    return form.fields
      .filter((field) => field.type === "single_select" || field.type === "multi_select")
      .map((field) => {
        const options = field.options ?? [];
        const counts = options.reduce<Record<string, number>>((acc, option) => {
          acc[option] = 0;
          return acc;
        }, {});
        responses.forEach((response) => {
          const value = response.answers[field.id];
          if (field.type === "multi_select" && Array.isArray(value)) {
            value.forEach((item) => {
              if (counts[item] !== undefined) counts[item] += 1;
            });
          }
          if (field.type === "single_select" && typeof value === "string") {
            if (counts[value] !== undefined) counts[value] += 1;
          }
        });
        const max = Math.max(1, ...Object.values(counts));
        return { field, counts, max };
      });
  }, [form, responses]);

  const textInsights = useMemo(() => {
    const textValues = responses.flatMap((response) =>
      Object.values(response.answers)
        .map((value) => formatValue(value))
        .filter((value) => value)
    );
    const combined = textValues.join(" ").toLowerCase();
    const rawTokens = combined
      .split(/[\s,、。.!?()\n\r]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2);
    const tokens = rawTokens.filter((token) => !/^\d+$/.test(token));
    const freq = tokens.reduce<Record<string, number>>((acc, token) => {
      acc[token] = (acc[token] ?? 0) + 1;
      return acc;
    }, {});
    const keywordEntries = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const sentiment = responses.reduce(
      (acc, response) => {
        const text = Object.values(response.answers)
          .map((value) => formatValue(value))
          .join(" ");
        const score =
          positiveWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0) -
          negativeWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
        if (score > 0) acc.positive += 1;
        else if (score < 0) acc.negative += 1;
        else acc.neutral += 1;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );
    return { keywords: keywordEntries, sentiment };
  }, [responses]);

  const handleExport = () => {
    if (!form) return;
    const headers = [
      "回答日時",
      "ステータス",
      "担当者",
      "タグ",
      "メモ",
      ...form.fields.map((field) => field.label),
    ];
    const rows = responses.map((response) => {
      const base = [
        response.submittedAt.toISOString(),
        response.status,
        response.assigneeName ?? "",
        response.tags.join(" / "),
        response.memo ?? "",
      ];
      const answers = form.fields.map((field) =>
        formatValue(response.answers[field.id])
      );
      return [...base, ...answers];
    });
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/\"/g, "\"\"")}"`).join(",")
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

  const updateLocalResponse = (id: string, updates: Partial<SurveyResponse>) => {
    setResponses((prev) =>
      prev.map((response) => (response.id === id ? { ...response, ...updates } : response))
    );
  };

  const handleStatusChange = async (response: SurveyResponse, status: SurveyResponse["status"]) => {
    updateLocalResponse(response.id, { status });
    await updateResponse(response.id, { status });
  };

  const handleAssignChange = async (response: SurveyResponse, assignee: string) => {
    if (!user) return;
    const updates =
      assignee === "none"
        ? { assigneeUid: null, assigneeName: null }
        : { assigneeUid: user.uid, assigneeName: user.email };
    updateLocalResponse(response.id, updates);
    await updateResponse(response.id, updates);
  };

  const handleTagAdd = async (response: SurveyResponse) => {
    const nextTag = tagInputs[response.id]?.trim();
    if (!nextTag) return;
    const nextTags = Array.from(new Set([...response.tags, nextTag]));
    setTagInputs((prev) => ({ ...prev, [response.id]: "" }));
    updateLocalResponse(response.id, { tags: nextTags });
    await updateResponse(response.id, { tags: nextTags });
  };

  const handleTagRemove = async (response: SurveyResponse, tag: string) => {
    const nextTags = response.tags.filter((item) => item !== tag);
    updateLocalResponse(response.id, { tags: nextTags });
    await updateResponse(response.id, { tags: nextTags });
  };

  const handleMemoSave = async (response: SurveyResponse) => {
    const memo = memoInputs[response.id] ?? "";
    updateLocalResponse(response.id, { memo });
    await updateResponse(response.id, { memo });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">回答一覧</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              回答状況と分析結果を確認できます。
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
          <div className="mt-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "回答数", value: `${summary.total}件` },
                { label: "必須回答率", value: `${summary.completionRate}%` },
                { label: "平均回答項目数", value: `${summary.avgAnswered}項目` },
                { label: "直近の回答", value: summary.lastResponse },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-xs text-[var(--muted)]">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">ステータス</label>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as typeof statusFilter)
                    }
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  >
                    <option value="all">すべて</option>
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">タグ</label>
                  <input
                    value={tagFilter}
                    onChange={(event) => setTagFilter(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    placeholder="VIP など"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">検索</label>
                  <input
                    value={keywordFilter}
                    onChange={(event) => setKeywordFilter(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    placeholder="回答内容で検索"
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-[var(--muted)]">開始日</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--muted)]">終了日</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <h2 className="text-lg font-semibold">設問別の分布</h2>
                <div className="mt-4 space-y-6">
                  {distribution.length === 0 && (
                    <p className="text-sm text-[var(--muted)]">
                      選択肢形式の質問がありません。
                    </p>
                  )}
                  {distribution.map(({ field, counts, max }) => (
                    <div key={field.id} className="space-y-2">
                      <p className="text-sm font-semibold">{field.label}</p>
                      {Object.entries(counts).map(([option, count]) => (
                        <div key={option} className="flex items-center gap-3 text-xs">
                          <span className="w-20 truncate text-[var(--muted)]">{option}</span>
                          <div className="h-2 flex-1 rounded-full bg-[var(--accent)]">
                            <div
                              className="h-2 rounded-full bg-[var(--primary)]"
                              style={{ width: `${(count / max) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <h2 className="text-lg font-semibold">テキスト分析</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs text-[var(--muted)]">頻出キーワード</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {textInsights.keywords.length === 0 && (
                        <span className="text-xs text-[var(--muted)]">まだデータがありません</span>
                      )}
                      {textInsights.keywords.map(([keyword, count]) => (
                        <span
                          key={keyword}
                          className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs text-[var(--primary)]"
                        >
                          {keyword} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">簡易感情判定</p>
                    <div className="mt-2 grid gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>ポジティブ</span>
                        <span>{textInsights.sentiment.positive}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ニュートラル</span>
                        <span>{textInsights.sentiment.neutral}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ネガティブ</span>
                        <span>{textInsights.sentiment.negative}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {filteredResponses.length === 0 && (
              <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-[var(--muted)]">
                まだ回答がありません。
              </div>
            )}

            {filteredResponses.map((response) => (
              <div key={response.id} className="rounded-2xl border border-black/10 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[var(--muted)]">
                    {response.submittedAt.toLocaleString()}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={response.status}
                      onChange={(event) =>
                        handleStatusChange(response, event.target.value as SurveyResponse["status"])
                      }
                      className="rounded-full border border-black/10 px-3 py-1 text-xs"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={response.assigneeUid ? "me" : "none"}
                      onChange={(event) => handleAssignChange(response, event.target.value)}
                      className="rounded-full border border-black/10 px-3 py-1 text-xs"
                    >
                      <option value="none">未割当</option>
                      <option value="me">担当: 自分</option>
                    </select>
                  </div>
                </div>

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

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-[var(--muted)]">タグ</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {response.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagRemove(response, tag)}
                          className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs text-[var(--primary)]"
                        >
                          {tag} ×
                        </button>
                      ))}
                      {response.tags.length === 0 && (
                        <span className="text-xs text-[var(--muted)]">未設定</span>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={tagInputs[response.id] ?? ""}
                        onChange={(event) =>
                          setTagInputs((prev) => ({ ...prev, [response.id]: event.target.value }))
                        }
                        className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-xs"
                        placeholder="タグを追加"
                      />
                      <button
                        type="button"
                        onClick={() => handleTagAdd(response)}
                        className="rounded-xl border border-black/10 px-3 py-2 text-xs text-[var(--primary)]"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--muted)]">メモ</p>
                    <textarea
                      value={memoInputs[response.id] ?? ""}
                      onChange={(event) =>
                        setMemoInputs((prev) => ({ ...prev, [response.id]: event.target.value }))
                      }
                      onBlur={() => handleMemoSave(response)}
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-xs"
                      placeholder="対応内容や補足メモ"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
