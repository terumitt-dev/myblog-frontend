# MyBlog Frontend

React + TypeScript + Vite を使用したブログフロントエンドアプリケーション

## 🚀 開発環境のセットアップ

### 前提条件

- Node.js 18+
- npm または yarn
- Bitwarden CLI（オプション）

### インストール

```bash
npm install
```

## 🔧 開発サーバーの起動

### Bitwarden CLI のセットアップ（オプション）

**外部ユーザー向け:** Bitwarden のセットアップは不要です。自動的にフォールバック環境変数が使用されます。

**チームメンバー向け:** Bitwarden で環境変数を一元管理する場合は、以下をセットアップしてください。

```bash
# 1. Bitwarden CLI をインストール
brew install bitwarden-cli

# 2. Bitwarden にログイン
bw login

# 3. セッションをアンロック（シェルセッションごとに1回実行）
export BW_SESSION=$(bw unlock --raw)
```

**注意:** セッションは一時的です。ターミナルを閉じると消えるため、再度アンロックが必要です。

### モード 1: モックデータを使用

```bash
npm run dev:mock
```

MSW（Mock Service Worker）を使用してモックデータで開発します。

- **Bitwarden 利用時:** `myblog-frontend-env-mock` から読み込み
- **フォールバック:** `VITE_ENABLE_MSW=true` を自動設定

### モード 2: 実 API を使用

```bash
npm run dev:api
```

Backend API（`http://localhost:3000`）に接続して開発します。

- **Bitwarden 利用時:** `myblog-frontend-env-api` から読み込み
- **フォールバック:** `VITE_ENABLE_MSW=false` を自動設定

### モード 3: デフォルト（Bitwarden なし）

```bash
npm run dev
```

Bitwarden を使用せず、デフォルト設定で起動します（開発環境では MSW 有効）。

## 🔐 Bitwarden 環境変数管理

### 保存されている環境設定

プロジェクトでは以下の2つの環境設定が Bitwarden に保存されています：

- **myblog-frontend-env-api**: 実 API モード（`VITE_ENABLE_MSW=false`）
- **myblog-frontend-env-mock**: モックモード（`VITE_ENABLE_MSW=true`）

### 環境変数の確認

```bash
# API モードの設定を確認
bw get notes myblog-frontend-env-api

# モックモードの設定を確認
bw get notes myblog-frontend-env-mock
```

### 新しい環境設定の追加

```bash
# テンプレートを作成
bw get template item | jq '.type = 2 | .secureNote.type = 0 | .name = "myblog-frontend-env-staging" | .notes = "VITE_ENABLE_MSW=false\nVITE_API_BASE_URL=https://staging-api.example.com"' > /tmp/staging_env.json

# Bitwarden に保存
cat /tmp/staging_env.json | bw encode | bw create item
```

### 環境変数の更新

```bash
# アイテムを取得して編集
bw get item myblog-frontend-env-api | jq '.notes = "VITE_ENABLE_MSW=false\nVITE_API_BASE_URL=http://localhost:3000"' | bw encode | bw edit item <item-id>
```

## 📦 ビルド

```bash
npm run build
```

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
