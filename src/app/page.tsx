import Link from "next/link";

const benefits = [
  "事前フォーム作成は最短3分",
  "回答データは一覧で管理",
  "公開URLでそのまま共有",
  "小売・サービス業にも汎用対応",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-[var(--primary)]">
              CoCoSurvey
            </p>
            <p className="text-sm font-semibold">事前フォーム・同意管理</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-[var(--primary)]"
            >
              ログイン
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-dark)]"
            >
              無料ではじめる
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="grid gap-10 rounded-3xl border border-black/10 bg-white p-10 shadow-sm lg:grid-cols-[1.1fr,0.9fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--primary)]">
              B2B Survey Platform
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
              事前ヒアリングと同意取得を、
              <br />
              もっとシンプルに。
            </h1>
            <p className="mt-4 text-sm text-[var(--muted)]">
              小売・サービス業の現場に合わせて、事前ヒアリング、同意、回答管理を一元化。
              配布URLを共有するだけで、受付負荷と情報漏れを削減します。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
              >
                無料ではじめる
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-black/10 px-6 py-3 text-sm font-semibold text-[var(--primary)]"
              >
                既に利用中の方
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-[var(--accent)] p-6">
            <p className="text-sm font-semibold">できること</p>
            <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[var(--primary)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl bg-white p-4 text-xs text-[var(--muted)]">
              初期設定後は、共有URLを渡すだけで回答を回収できます。
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "フォームテンプレ",
              text: "業種別テンプレを用意し、最短で公開。",
            },
            {
              title: "回答一覧",
              text: "回答は一覧で確認。CSV出力も可能。",
            },
            {
              title: "チーム運用",
              text: "B2B前提の組織管理で運用に対応。",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-black/10 bg-white p-5"
            >
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{item.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
