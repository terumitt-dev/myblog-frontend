# My Blog — Frontend

個人ブログプラットフォームのフロントエンドアプリケーション。
React + TypeScript で構築し、Atomic Design によるコンポーネント設計、JWT 認証、リッチテキストエディタなどを実装しています。

<!-- TODO: サイトのスクリーンショットを貼る -->
<!-- ![トップページ](docs/screenshots/top.png) -->

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | React 19 + TypeScript 5.8 |
| ビルドツール | Vite 6 |
| ルーティング | React Router v7 |
| スタイリング | Tailwind CSS 3 |
| リッチテキスト | TipTap（Headless Editor） |
| テスト | Vitest + Testing Library |
| モック | MSW（Mock Service Worker） |
| リンター | ESLint 9（Flat Config） |
| コンテナ | Docker（multi-stage build） |
| CI/CD | Drone CI → AWS ECR |
| 本番サーバー | Nginx（Alpine） |

## アーキテクチャ

### コンポーネント設計（Atomic Design）

```
src/components/
├── atoms/        # Button, Input, Textarea, Skeleton, LoadingSpinner
├── molecules/    # CommentItem, CommentButtons, ThemeToggle
├── organisms/    # CommentForm, RichTextEditor, Header, CommentList
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

- **AuthContext** — JWT トークン管理、ログイン/ログアウト
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
- コメント機能（認証ユーザーのみ）

<!-- TODO: 記事一覧のスクリーンショット -->
<!-- ![記事一覧](docs/screenshots/posts.png) -->

### 管理画面
- 記事の作成・編集・削除
- TipTap ベースのリッチテキストエディタ（画像・リンク対応）
- 画像アップロード（Rails ActiveStorage 連携）
- Movable Type 形式からのインポート機能

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
| 認証 | JWT（Authorization ヘッダー） |
| トークン送信先制限 | 設定済み API ベース URL のみに送信 |
| エンドポイント検証 | プロトコル相対URL・パストラバーサルを拒否 |
| セキュリティヘッダー | X-Frame-Options, X-Content-Type-Options, CSP 等（Nginx） |
| エラー情報の制限 | エラーメッセージを最大500文字に切り詰め |

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
  → Docker ビルド
  → コンテナ起動検証（ヘルスチェック）
  → ECR push（commit SHA + latest タグ）
  → K8s 上で自動デプロイ（Keel による image digest 検知）
```

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

MSW がブラウザ上で API レスポンスをモックするため、バックエンドなしで画面の動作確認ができます。

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

環境変数は Bitwarden CLI 経由で安全に管理しています。詳細は `app/scripts/load-env-from-bitwarden.sh` を参照してください。

## 関連リポジトリ

- [myblog-backend](https://github.com/terumitt-dev/myblog-backend) — Rails API バックエンド
