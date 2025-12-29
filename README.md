# CoCoSurvey

B2B向けの事前ヒアリング/同意フォームを作成・配布・管理する小規模SaaSです。
小売・サービス業でも使える汎用フォームとして設計しています。

## できること（MVP）
- フォーム作成（テキスト/選択/日付/チェック）
- 公開URLの発行
- 回答一覧/詳細
- CSV出力
- B2Bログイン

## 開発環境の起動
```bash
npm install
npm run dev
```

## 環境変数
`.env.local` を作成し、FirebaseのWeb SDK設定値を入れてください。

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Firestore ルール
`firestore.rules` を Firebase コンソールに反映してください。
公開フォームの閲覧/回答は許可し、管理画面は認証必須です。

## 主要ルート
- `/` : ランディング
- `/signup` : 会社/店舗登録
- `/login` : ログイン
- `/dashboard` : フォーム一覧
- `/dashboard/forms/new` : 新規作成
- `/dashboard/forms/[id]` : 編集
- `/dashboard/forms/[id]/responses` : 回答一覧
- `/survey/[shareId]` : 公開フォーム

## デプロイ
Vercel に接続し、上記の環境変数を設定してください。
