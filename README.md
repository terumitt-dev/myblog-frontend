# MyBlog Frontend

React + TypeScript + Vite を使用したブログフロントエンドアプリケーション

## 🚀 クイックスタート

```bash
# インストール
npm install

# 開発サーバー起動（モックデータ）
npm run dev:mock

# または実 API を使用
npm run dev:api
```

## 🔐 Bitwarden 環境変数管理

### セットアップ方法

#### 方法A: セッションベース（開発環境向け）

```bash
# 1. Bitwarden CLI をインストール
brew install bitwarden-cli

# 2. Bitwarden にログイン
bw login

# 3. セッションを取得
export BW_SESSION=$(bw unlock --raw)

# 4. 開発サーバー起動
npm run dev:mock
```

#### 方法B: API Key ベース（本番環境・CI/CD向け）

永続的な認証が必要な場合は、API Key を使用します。

```bash
# 1. Bitwarden Web Vault から API Key を取得
#    Settings > Security > Keys > Client ID と Client Secret をコピー

# 2. 環境変数を設定
export BW_CLIENT_ID="your-client-id"
export BW_CLIENT_SECRET="your-client-secret"
export BW_PASSWORD="your-master-password"

# 3. docker-compose で起動
docker-compose up -d
```

### Drone CI/CD での設定

**1. Drone Secrets に登録**

Drone Web UI で以下の Secret を登録します：
- `bw_client_id`: Bitwarden API Client ID
- `bw_client_secret`: Bitwarden API Client Secret
- `bw_password`: Bitwarden Master Password

**2. `.drone.yml` の設定**

```yaml
steps:
  - name: deploy
    image: docker/compose:latest
    environment:
      # ホスト側の環境変数名（docker-compose.yml で参照）
      BW_CLIENT_ID:
        from_secret: bw_client_id
      BW_CLIENT_SECRET:
        from_secret: bw_client_secret
      BW_PASSWORD:
        from_secret: bw_password
    commands:
      - docker-compose up -d
```

**環境変数のマッピング:**
- `BW_CLIENT_ID` (Drone Secret) → `BW_CLIENTID` (コンテナ内)
- `BW_CLIENT_SECRET` (Drone Secret) → `BW_CLIENTSECRET` (コンテナ内)
- `BW_PASSWORD` (Drone Secret) → `BW_PASSWORD` (コンテナ内)

### 保存されている環境設定

Bitwarden に以下の環境設定が保存されています：

- **myblog-frontend-env-api**: 実 API モード（`VITE_ENABLE_MSW=false`）
- **myblog-frontend-env-mock**: モックモード（`VITE_ENABLE_MSW=true`）

### 環境変数の確認

```bash
# API モードの設定を確認
bw get notes myblog-frontend-env-api

# モックモードの設定を確認
bw get notes myblog-frontend-env-mock
```

## 📦 ビルド

```bash
npm run build
```

## 📚 詳細なドキュメント

詳細なセットアップ手順は [`app/README.md`](./app/README.md) を参照してください。
