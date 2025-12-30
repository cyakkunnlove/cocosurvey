"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import FormFieldsEditor from "@/components/FormFieldsEditor";
import TopNav from "@/components/TopNav";
import { useAuth } from "@/lib/auth/AuthContext";
import { createForm } from "@/lib/firebase/surveys";
import type { FieldType, SurveyField } from "@/lib/firebase/types";

type TemplateFieldSpec = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  aiEnabled?: boolean;
  visibility?: {
    dependsOnKey: string;
    operator: "equals" | "not_equals" | "includes" | "checked";
    value?: string;
  };
  validation?: {
    minLength?: number;
    maxLength?: number;
    minDate?: string;
    maxDate?: string;
  };
};

type TemplateDefinition = {
  id: string;
  name: string;
  summary: string;
  title: string;
  description: string;
  fields: TemplateFieldSpec[];
};

const templates: TemplateDefinition[] = [
  {
    id: "visit-intake",
    name: "来店前ヒアリング",
    summary: "初回相談や予約前の確認に。",
    title: "来店前ヒアリングフォーム",
    description: "ご来店前に目的や希望日時を伺います。",
    fields: [
      {
        key: "purpose",
        label: "ご来店目的",
        type: "single_select",
        required: true,
        options: ["相談", "見積もり", "購入", "メンテナンス", "その他"],
      },
      {
        key: "visit_date",
        label: "希望来店日",
        type: "date",
        required: true,
      },
      {
        key: "contact_name",
        label: "お名前",
        type: "short_text",
        required: true,
        validation: { minLength: 2 },
      },
      {
        key: "contact_email",
        label: "メールアドレス",
        type: "short_text",
        required: true,
      },
      {
        key: "budget",
        label: "ご予算目安",
        type: "single_select",
        required: false,
        options: ["〜3万円", "〜10万円", "〜30万円", "30万円以上", "未定"],
      },
      {
        key: "others",
        label: "その他のご要望",
        type: "long_text",
        required: false,
        aiEnabled: true,
        visibility: {
          dependsOnKey: "purpose",
          operator: "equals",
          value: "その他",
        },
      },
    ],
  },
  {
    id: "estimate-b2b",
    name: "B2B見積り依頼",
    summary: "法人向けの見積り問い合わせに。",
    title: "法人向け見積り依頼フォーム",
    description: "必要事項をまとめて受け付け、社内確認を効率化します。",
    fields: [
      { key: "company", label: "会社名", type: "short_text", required: true },
      { key: "person", label: "担当者名", type: "short_text", required: true },
      { key: "email", label: "連絡先メール", type: "short_text", required: true },
      { key: "phone", label: "電話番号", type: "short_text", required: false },
      {
        key: "category",
        label: "対象カテゴリ",
        type: "single_select",
        required: true,
        options: ["店舗システム", "EC連携", "在庫管理", "予約管理", "その他"],
      },
      {
        key: "volume",
        label: "想定数量 / 規模",
        type: "short_text",
        required: false,
        validation: { maxLength: 40 },
      },
      {
        key: "deadline",
        label: "希望納期",
        type: "date",
        required: false,
      },
      {
        key: "detail",
        label: "詳細要件",
        type: "long_text",
        required: true,
        aiEnabled: true,
        validation: { minLength: 10 },
      },
    ],
  },
  {
    id: "event",
    name: "イベント申込み",
    summary: "説明会や店舗イベントの受付に。",
    title: "イベント参加申込みフォーム",
    description: "参加形式や人数を事前に把握します。",
    fields: [
      { key: "org", label: "所属（会社・店舗名）", type: "short_text", required: false },
      { key: "name", label: "お名前", type: "short_text", required: true },
      { key: "mail", label: "メールアドレス", type: "short_text", required: true },
      {
        key: "attendance",
        label: "参加形式",
        type: "single_select",
        required: true,
        options: ["現地参加", "オンライン参加"],
      },
      {
        key: "headcount",
        label: "参加人数",
        type: "short_text",
        required: true,
        validation: { maxLength: 3 },
      },
      {
        key: "diet",
        label: "食事制限・配慮事項",
        type: "long_text",
        required: false,
        aiEnabled: true,
        visibility: {
          dependsOnKey: "attendance",
          operator: "equals",
          value: "現地参加",
        },
      },
      {
        key: "consent",
        label: "参加規約への同意",
        type: "checkbox",
        required: true,
      },
    ],
  },
  {
    id: "csat",
    name: "満足度アンケート",
    summary: "サービス改善や顧客フォローに。",
    title: "サービス満足度アンケート",
    description: "満足度や改善点を可視化します。",
    fields: [
      {
        key: "satisfaction",
        label: "全体満足度",
        type: "single_select",
        required: true,
        options: ["非常に満足", "満足", "普通", "やや不満", "不満"],
      },
      {
        key: "recommend",
        label: "知人におすすめできますか？",
        type: "single_select",
        required: true,
        options: ["ぜひ勧めたい", "勧めたい", "どちらでもない", "勧めたくない"],
      },
      {
        key: "good",
        label: "良かった点",
        type: "long_text",
        required: false,
        aiEnabled: true,
      },
      {
        key: "improve",
        label: "改善してほしい点",
        type: "long_text",
        required: false,
        aiEnabled: true,
      },
    ],
  },
];

const buildTemplateFields = (template: TemplateDefinition): SurveyField[] => {
  const idMap = new Map<string, string>();
  template.fields.forEach((field) => {
    idMap.set(field.key, crypto.randomUUID());
  });
  return template.fields.map((field) => ({
    id: idMap.get(field.key) ?? crypto.randomUUID(),
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.options,
    visibility: field.visibility
      ? {
          dependsOnId: idMap.get(field.visibility.dependsOnKey) ?? "",
          operator: field.visibility.operator,
          value: field.visibility.value,
        }
      : undefined,
    validation: field.validation,
    aiEnabled: field.aiEnabled,
  }));
};

export default function NewFormPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("新規ヒアリングフォーム");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("active");
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiOverallEnabled, setAiOverallEnabled] = useState(false);
  const [aiMinConfidence, setAiMinConfidence] = useState(0.6);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);

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
        aiEnabled,
        aiOverallEnabled,
        aiMinConfidence,
        notificationEmail,
        webhookUrl,
        slackWebhookUrl,
        googleSheetUrl,
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
              <h2 className="text-lg font-semibold">テンプレート</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                用途に合わせたフォームをワンクリックで生成できます。
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setTitle(template.title);
                      setDescription(template.description);
                      setFields(buildTemplateFields(template));
                      setTemplateId(template.id);
                      setError("");
                    }}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      templateId === template.id
                        ? "border-[var(--primary)] bg-[var(--accent)]"
                        : "border-black/10 bg-white hover:border-[var(--primary)]"
                    }`}
                  >
                    <p className="text-sm font-semibold">{template.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {template.summary}
                    </p>
                    <p className="mt-3 text-[11px] font-semibold text-[var(--primary)]">
                      テンプレートを適用
                    </p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[var(--muted)]">
                ※適用後も自由に編集できます。
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">AI分析</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                自由記述の感情判定や、全体評価のスコアを自動で付与します。
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={(event) => setAiEnabled(event.target.checked)}
                  />
                  AI分析を有効化する
                </label>
                {aiEnabled && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={aiOverallEnabled}
                        onChange={(event) => setAiOverallEnabled(event.target.checked)}
                      />
                      全体評価（1-10）を付与
                    </label>
                    <div>
                      <label className="text-xs font-semibold text-[var(--muted)]">
                        信頼度しきい値
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min={0.4}
                        max={0.95}
                        value={aiMinConfidence}
                        onChange={(event) =>
                          setAiMinConfidence(Number(event.target.value) || 0.6)
                        }
                        className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-3 text-[11px] text-[var(--muted)]">
                ※「AI分析対象にする」を選んだ自由記述のみが解析対象になります。
              </p>
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

            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">通知・連携</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                回答通知や外部連携の設定を行います（デモ用の設定項目）。
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">
                    通知メール
                  </label>
                  <input
                    value={notificationEmail}
                    onChange={(event) => setNotificationEmail(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    placeholder="example@company.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">
                    Webhook URL
                  </label>
                  <input
                    value={webhookUrl}
                    onChange={(event) => setWebhookUrl(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    placeholder="https://hooks.example.com/..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">
                    Slack Webhook
                  </label>
                  <input
                    value={slackWebhookUrl}
                    onChange={(event) => setSlackWebhookUrl(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    placeholder="https://hooks.slack.com/..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)]">
                    Google Sheets URL
                  </label>
                  <input
                    value={googleSheetUrl}
                    onChange={(event) => setGoogleSheetUrl(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    placeholder="https://docs.google.com/spreadsheets/..."
                  />
                </div>
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
