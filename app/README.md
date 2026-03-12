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

#### 初回セットアップ

```bash
# 1. Bitwarden CLI をインストール
brew install bitwarden-cli

# 2. Bitwarden にログイン
bw login

# 3. シェル設定に便利関数を追加（初回のみ）
cat >> ~/.zshrc << 'EOF'

# ========================================
# Bitwarden セッション管理
# ========================================

# Bitwarden アンロック関数
bw_unlock() {
    if command -v bw &> /dev/null; then
        if bw login --check &> /dev/null; then
            export BW_SESSION=$(bw unlock --raw)
            echo "✅ Bitwarden unlocked"
        else
            echo "⚠️  Bitwarden: Not logged in. Run 'bw login' first."
        fi
    else
        echo "⚠️  Bitwarden CLI not installed."
    fi
}

# エイリアス（短縮版）
alias bwu='bw_unlock'

# MyBlog プロジェクト用の便利関数
# 事前に例: export MYBLOG_FRONTEND_DIR="$HOME/ghq/github.com/<your-org>/myblog-frontend/app"
myblog_dev() {
    local dir="${MYBLOG_FRONTEND_DIR:-}"
    if [ -z "$dir" ]; then
        echo "⚠️  MYBLOG_FRONTEND_DIR が未設定です（例: \$HOME/.../myblog-frontend/app）"
        return 1
    fi

    cd "$dir" || return 1

    if command -v bw &> /dev/null && bw login --check &> /dev/null; then
        if [ -z "${BW_SESSION-}" ]; then
            echo "🔐 Unlocking Bitwarden..."
            export BW_SESSION="$(bw unlock --raw)"
        else
            echo "✅ Bitwarden session already active"
        fi
    fi
}

EOF

# 4. 設定を反映
source ~/.zshrc
```

#### 日常的な使い方

```bash
# 新しいターミナルを開いたら、以下のいずれかを実行

# 方法1: 短縮コマンド
bwu

# 方法2: プロジェクトに移動 + 自動アンロック
myblog_dev

# 方法3: 手動
export BW_SESSION=$(bw unlock --raw)
```

**注意:** セッションは一時的です。ターミナルを閉じると消えるため、新しいターミナルでは再度アンロックが必要です。

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

### モード 3: デフォルト（Bitwarden なし、MSW 有効）

Bitwarden を使わずに **MSW を有効で** 起動したい場合は、以下を使用します（Bitwarden 未設定でもフォールバックします）。

```bash
npm run dev:mock
```

※ `npm run dev` は Vite の通常起動で、`.env` 等の設定に依存します。

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
