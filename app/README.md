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

### オプション 1: モックデータを使用（デフォルト）

```bash
npm run dev
# または
npm run dev:mock
```

MSW（Mock Service Worker）を使用してモックデータで開発します。

### オプション 2: 実 API を使用

```bash
npm run dev:api
```

Backend API（`http://localhost:3000`）に接続して開発します。

### オプション 3: Bitwarden から環境変数を読み込む

```bash
# 1. Bitwarden CLI をインストール
brew install bitwarden-cli

# 2. Bitwarden にログイン
bw login

# 3. セッションをアンロック
export BW_SESSION=$(bw unlock --raw)

# 4. 開発サーバーを起動
npm run dev:bw
```

Bitwarden に保存された環境変数を使用して開発します。

## 🔐 Bitwarden 環境変数管理

### 環境変数の保存

```bash
# Bitwarden にアイテムを作成
bw get template item | jq '.type = 2 | .secureNote.type = 0 | .name = "myblog-frontend-env" | .notes = "VITE_ENABLE_MSW=false"' | bw encode | bw create item
```

### 環境変数の確認

```bash
bw get notes myblog-frontend-env
```

### 環境変数の更新

```bash
# アイテムを取得
bw get item myblog-frontend-env | jq '.notes = "VITE_ENABLE_MSW=true"' | bw encode | bw edit item <item-id>
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
