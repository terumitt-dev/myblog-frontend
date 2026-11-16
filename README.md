# My Blog — Frontend

個人ブログプラットフォームのフロントエンドアプリケーション。
React + TypeScript で構築し、Atomic Design によるコンポーネント設計、JWT 認証、リッチテキストエディタなどを実装しています。

<!-- TODO: サイトのスクリーンショットを貼る -->
<!-- ![トップページ](docs/screenshots/top.png) -->

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | React 19 + TypeScript 5.8 |
| ビルドツール | Vite 8 |
| ルーティング | React Router v7 |
| スタイリング | Tailwind CSS 4 |
| リッチテキスト | TipTap（Headless Editor） |
| テスト | Vitest + Testing Library |
| モック | MSW（Mock Service Worker） |
| リンター | ESLint 10（Flat Config） |
| コンテナ | Docker（multi-stage build） |
| CI/CD | Drone CI → AWS ECR |
| 本番サーバー | Nginx（Alpine） |

## アーキテクチャ

### コンポーネント設計（Atomic Design）

```
src/components/
├── atoms/        # Button, Input, Textarea, Skeleton, LoadingSpinner
├── molecules/    # CommentItem, CommentButtons, ThemeToggle
├── organisms/    # CommentForm, RichTextEditor, Header, CommentList, XConnectSection
├── layouts/      # Layout, Container
└── utils/        # ErrorBoundary, sanitizer, cn utility
```

再利用性と責務分離を意識し、atoms → molecules → organisms の粒度でコンポーネントを分割しています。

### ディレクトリ構成

```
app/src/
├── api/          # API クライアント（認証・バリデーション付き）
├── components/   # Atomic Design ベースのコンポーネント群
├── context/      # AuthContext, ThemeContext（グローバル状態）
├── hooks/        # カスタムフック（useAuth, usePosts など）
├── pages/        # ページコンポーネント（Top, PostDetail, Admin など）
├── router/       # ルーティング定義（認証ガード付き）
├── types/        # TypeScript 型定義
├── constants/    # 設定値
├── mocks/        # MSW ハンドラー（開発・テスト用）
└── test/         # テスト設定・ユーティリティ
```

### 状態管理

外部ライブラリ（Redux 等）は使用せず、**React Context API** で必要十分な状態管理を実現しています。

- **AuthContext** — JWT トークン管理、ログイン/ログアウト。トークンはメモリ上にだけ持ち、`localStorage` などには保存しない（ページを再読み込みすると再ログインが必要）
- **ThemeContext** — ライト/ダークモード切替（システム設定に追従）

### API クライアント設計

`src/api/client.ts` にて、認証付き API クライアントを独自実装しています。

- Authorization ヘッダーの自動付与（安全なオリジン・パスのみ）
- エンドポイントのバリデーション（プロトコル相対URL、パストラバーサルを拒否）
- レスポンスの型付きパース
- エラーメッセージのサニタイズ（最大500文字）

## 主要機能

### ブログ閲覧
- 記事一覧表示（カテゴリ別フィルタ対応）
- 記事詳細ページ（リッチテキスト表示）
- コメント機能（認証不要・Cloudflare Turnstile による bot 対策）

<!-- TODO: 記事一覧のスクリーンショット -->
<!-- ![記事一覧](docs/screenshots/posts.png) -->

### 管理画面
- 記事の作成・編集・削除
- TipTap ベースのリッチテキストエディタ（画像・リンク対応）
- 画像アップロード（Rails ActiveStorage 連携）
- Movable Type 形式からのインポート機能
- 記事の X（旧 Twitter）への投稿（自動投稿が失敗したときの手動リトライ）
- 「Xと連携する」ボタン（OAuth）。X の認可画面へ移動し、戻ってきた結果を画面に表示する
- 管理者登録、パスワード再設定（パスワードは 12文字以上。backend の設定と揃えている）

<!-- TODO: 管理画面のスクリーンショット -->
<!-- ![管理画面](docs/screenshots/admin.png) -->

### ダークモード
- ライト/ダーク切替（ボタン + システム設定の自動検知）
- Tailwind CSS の `class` ベースで実装

<!-- TODO: ダークモードのスクリーンショット -->
<!-- ![ダークモード](docs/screenshots/dark-mode.png) -->

## セキュリティ

| 対策 | 実装 |
|---|---|
| XSS 防止 | DOMPurify によるHTML サニタイズ |
| 認証 | JWT（Authorization ヘッダー）。トークンはメモリ保持のみ |
| トークン送信先制限 | 設定済み API ベース URL のみに送信 |
| エンドポイント検証 | プロトコル相対URL・パストラバーサルを拒否 |
| セキュリティヘッダー | X-Frame-Options, X-Content-Type-Options, Referrer-Policy（Nginx）。HSTS などは手前の Ingress で付与 |
| X 連携の遷移先検証 | backend から受け取った認可 URL が https かつ X のホストである場合だけ遷移する（backend の検証に加えた二重の確認） |
| URL パラメータの扱い | 連携結果（`?x_connect=`）は既知の値だけを受け付け、固定メッセージを表示する。URL の値をそのまま画面に出さない |
| ログイン後の遷移先 | 許可リスト方式（`/admin` と、既知の連携結果を付けた `/admin` のみ） |
| エラー情報の制限 | エラーメッセージを最大500文字に切り詰め |
| コメント Bot 対策 | Cloudflare Turnstile widget。公式 script を直読み込み（npm 依存ゼロ）、token 再利用ガード、二重送信防止、本番 Site Key 未設定で fail-fast |

### X 連携（OAuth）

管理画面の「Xと連携する」ボタン（`XConnectSection`）から、X の OAuth 認可を始めます。トークンの交換と保存は backend と [`myblog-dispatch`](https://github.com/terumitt-dev/myblog-dispatch) が行い、frontend は認可画面への遷移と結果の表示だけを受け持ちます。

```
ボタン押下 → 確認ダイアログ → POST /api/admin/x/connect
        → 返ってきた認可 URL を検証して X の認可画面へ遷移
        → X → backend のコールバック → /admin?x_connect=success|denied|error へ戻る
        → 結果を表示し、URL からパラメータを消す
```

- 連携は開始から 5分以内に、始めたブラウザで完了させる必要があります。
- コールバックからの戻りでページが再読み込みされるため、再ログインが必要です。ログイン後は連携結果つきの管理画面に戻ります（`resolveAdminReturnPath`）。

### コメント Bot 対策（Cloudflare Turnstile）

コメント投稿時に Cloudflare Turnstile widget で bot 検証を行います。backend（[`myblog-backend`](https://github.com/terumitt-dev/myblog-backend)）と ops（[`go-lilaregard-ops`](https://github.com/terumitt-dev/go-lilaregard-ops)）の Secret 管理と組み合わせた多層構成です。

**全体フロー**

```
ユーザー → widget 解決 → callback で token 取得 → submit
       → POST /api/blogs/:id/comments (body の top-level に turnstile_token)
       → backend が Cloudflare siteverify で検証 → 成功なら 201、失敗なら 422
```

**frontend 側の実装**

- `app/src/components/molecules/TurnstileWidget.tsx`: Cloudflare 公式 script (`challenges.cloudflare.com/turnstile/v0/api.js`) を `index.html` から直接読み込み、薄いラッパー (~120 行) を自作（npm 依存ゼロでサプライチェーン攻撃のリスクを回避）
- `app/src/components/organisms/CommentForm.tsx`: widget 埋め込み、token 取得、submit 有効化制御
- 信頼性:
  - script ロードのポーリングは最大 5 秒（広告ブロッカー等で永続化しないよう打ち切り）
  - `window.turnstile.render` の例外は `try/catch` で捕捉して `onError` に倒す（app crash 防止）
  - cleanup 時に `setTimeout` ID を解除（unmount 後にタイマー残らないように）
- token 再利用ガード: 投稿失敗時は token を破棄 + widget を `reset`（Cloudflare token は single-use のため、`token 消費 → 422 ループ` を防ぐ）
- 二重送信防止: `useRef`（同期再入ガード）+ `useState`（UI 反映）の両建てで、await 中の連打でも同じ token が使い回されない
- 状態フィードバック: `error` / `expire` / `submit_failed` の 3 variant で `role="alert"` メッセージを出し分け（ユーザーが原因を識別可能）

**Env 注入**

| 値 | 用途 | 経路 |
|---|---|---|
| `VITE_TURNSTILE_SITE_KEY` | widget の Site Key (公開値、HTML に露出) | Drone org Secret → docker `--build-arg` → Vite ビルド時埋め込み |

本番ビルドで未設定 / 空文字なら `Dockerfile.prod` の `RUN test -n` で build 失敗 + `CommentForm` のロード時 `throw` の二重ガード。dev / test 環境では Cloudflare 公開の always-pass テスト Site Key (`1x00000000000000000000AA`) にフォールバックするため追加設定不要。

## テスト

```bash
# テスト実行
npm run test

# UI付きテスト
npm run test:ui

# カバレッジ計測
npm run test:coverage
```

- **Vitest** + **Testing Library** によるコンポーネントテスト
- **MSW** で API レスポンスをモック（テスト時はネットワーク通信なし）
- CI はイメージのビルドだけを行い、テストは実行しません（マージ前に手元で `npm run test` を実行する）

## デプロイ

### Docker（マルチステージビルド）

```dockerfile
# ステージ1: Node.js でビルド
# ステージ2: Nginx Alpine で配信（軽量）
```

本番イメージは **Nginx Alpine ベース** で、ビルド成果物（静的ファイル）のみを含みます。

### CI/CD（Drone）

```
push to main
  → Docker ビルド（Kaniko。本番の Turnstile Site Key を埋め込む）
  → ECR push（commit SHA + latest タグ）
  → K8s 上で自動デプロイ（Keel による image digest 検知）

pull request
  → Docker ビルドのみ（push しない。Cloudflare 公開のテスト用 Site Key でビルドを通す）
```

シークレットを参照するステップは main への push のときだけ動きます。

### Nginx 設定

- SPA ルーティング（`try_files $uri $uri/ /index.html`）
- `/api/*` はフロントエンドで処理せず 404 を返す（バックエンドへの誤ルーティング防止）
- 静的アセット: 1年キャッシュ（immutable）
- `index.html`: キャッシュなし（常に最新を配信）
- Gzip 圧縮有効

## 開発環境セットアップ

### 前提条件

- Node.js 20+
- npm

### モックモードで起動（バックエンド不要）

```bash
cd app
npm install
npm run dev:mock
```

MSW がブラウザ上で API レスポンスをモックするため、バックエンドなしで記事の閲覧まわりの動作確認ができます。
管理者ログインはモックが現在の認証エンドポイント（`/api/auth/sign_in` など）に追従していないため、モックモードでは動きません。管理画面を確認するときは実 API モードを使ってください。

### 実 API モードで起動

```bash
cd app
npm run dev:api
```

バックエンド（`http://localhost:3000`）が起動している必要があります。
Vite の dev proxy が `/api` リクエストをバックエンドに転送します。

### Docker Compose で起動

```bash
docker-compose up -d
```

### 環境変数

| 変数 | 説明 | デフォルト |
|---|---|---|
| `VITE_ENABLE_MSW` | MSW モック有効化 | `false` |
| `VITE_API_BASE_URL` | API ベース URL | `/api` |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile の Site Key（本番ビルドで必須） | dev / test は公開のテスト用キー |

環境変数は Bitwarden CLI 経由で安全に管理しています。詳細は `app/scripts/load-env-from-bitwarden.sh` を参照してください。

## 関連リポジトリ

- [myblog-backend](https://github.com/terumitt-dev/myblog-backend) — Rails API バックエンド
- [myblog-dispatch](https://github.com/terumitt-dev/myblog-dispatch) — X 連携サービス（Go）
- [go-lilaregard-ops](https://github.com/terumitt-dev/go-lilaregard-ops) — インフラ・K8s マニフェスト・CD
