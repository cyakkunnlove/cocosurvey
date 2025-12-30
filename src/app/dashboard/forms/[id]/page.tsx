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
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiOverallEnabled, setAiOverallEnabled] = useState(false);
  const [aiMinConfidence, setAiMinConfidence] = useState(0.6);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  useEffect(() => {
    if (!formId) return;
    getFormById(formId).then((data) => {
      if (!data) return;
      setForm(data);
      setTitle(data.title);
      setDescription(data.description);
      setStatus(data.status);
      setFields(data.fields);
      setAiEnabled(Boolean(data.aiEnabled));
      setAiOverallEnabled(Boolean(data.aiOverallEnabled));
      setAiMinConfidence(data.aiMinConfidence ?? 0.6);
      setNotificationEmail(data.notificationEmail ?? "");
      setWebhookUrl(data.webhookUrl ?? "");
      setSlackWebhookUrl(data.slackWebhookUrl ?? "");
      setGoogleSheetUrl(data.googleSheetUrl ?? "");
    });
  }, [formId]);

  const shareUrl = useMemo(() => {
    if (!form?.shareId || typeof window === "undefined") return "";
    return `${window.location.origin}/survey/${form.shareId}`;
  }, [form]);

  const qrUrl = useMemo(() => {
    if (!shareUrl) return "";
    const encoded = encodeURIComponent(shareUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
  }, [shareUrl]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      await updateForm(form.id, {
        title,
        description,
        status,
        fields,
        aiEnabled,
        aiOverallEnabled,
        aiMinConfidence,
        notificationEmail,
        webhookUrl,
        slackWebhookUrl,
        googleSheetUrl,
      });
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
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleCopyQr = async () => {
    if (!qrUrl) return;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const ClipboardItemConstructor = (window as typeof window & {
        ClipboardItem?: typeof ClipboardItem;
      }).ClipboardItem;
      if (!ClipboardItemConstructor || !navigator.clipboard?.write) {
        throw new Error("Clipboard API not supported");
      }
      await navigator.clipboard.write([
        new ClipboardItemConstructor({ [blob.type || "image/png"]: blob }),
      ]);
      setMessage("QR画像をコピーしました");
      setQrCopied(true);
      window.setTimeout(() => setQrCopied(false), 1600);
    } catch (err) {
      setMessage("QR画像のコピーに失敗しました。ダウンロードをご利用ください。");
    }
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-[var(--primary)]"
                    >
                      {copied ? "コピー済み" : "URLコピー"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyQr}
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-[var(--primary)]"
                    >
                      {qrCopied ? "QRコピー済み" : "QRコピー"}
                    </button>
                    {qrUrl && (
                      <a
                        href={qrUrl}
                        download="survey-qr.png"
                        className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-semibold text-[var(--primary)]"
                      >
                        QR保存
                      </a>
                    )}
                  </div>
                </div>
                <p className="mt-2 break-all text-[var(--muted)]">
                  {shareUrl || "生成中..."}
                </p>
                <p className="mt-2 text-[10px] text-[var(--muted)]">
                  ※ローカル起動中は他の端末からアクセスできません。
                </p>
                {qrUrl && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="rounded-xl border border-black/10 bg-white p-2">
                      <img src={qrUrl} alt="共有用QRコード" className="h-28 w-28" />
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      QRをスキャンすると共有URLを開けます。
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">質問項目</h2>
              <div className="mt-4">
                <FormFieldsEditor fields={fields} onChange={setFields} />
              </div>
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
