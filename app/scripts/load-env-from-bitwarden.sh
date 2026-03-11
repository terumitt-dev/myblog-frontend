#!/bin/bash
# Bitwarden から環境変数を読み込むスクリプト

# 使い方を表示
usage() {
    echo "Usage: $0 <environment> <command>"
    echo ""
    echo "Environments:"
    echo "  api   - Load myblog-frontend-env-api (VITE_ENABLE_MSW=false)"
    echo "  mock  - Load myblog-frontend-env-mock (VITE_ENABLE_MSW=true)"
    echo ""
    echo "Example:"
    echo "  $0 api npm run dev"
    echo "  $0 mock npm run dev"
    exit 1
}

# 引数チェック
if [ $# -lt 2 ]; then
    usage
fi

ENV_TYPE=$1
shift

# 環境タイプに応じて Bitwarden アイテム名を決定
case "$ENV_TYPE" in
    api)
        ITEM_NAME="myblog-frontend-env-api"
        ;;
    mock)
        ITEM_NAME="myblog-frontend-env-mock"
        ;;
    *)
        echo "Error: Invalid environment type '$ENV_TYPE'"
        usage
        ;;
esac

# Bitwarden CLI がインストールされているか確認
if ! command -v bw &> /dev/null; then
    echo "Error: Bitwarden CLI is not installed."
    echo "Install it with: brew install bitwarden-cli"
    exit 1
fi

# Bitwarden にログインしているか確認
if ! bw login --check &> /dev/null; then
    echo "Error: Not logged in to Bitwarden."
    echo "Run: bw login"
    exit 1
fi

# セッションキーが設定されているか確認
if [ -z "$BW_SESSION" ]; then
    echo "Error: BW_SESSION is not set."
    echo "Run: export BW_SESSION=\$(bw unlock --raw)"
    exit 1
fi

# Bitwarden から環境変数を取得
ENV_VARS=$(bw get notes "$ITEM_NAME" --session "$BW_SESSION" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Error: Failed to fetch environment variables from Bitwarden."
    echo "Make sure '$ITEM_NAME' item exists in your vault."
    exit 1
fi

echo "✅ Loaded environment: $ENV_TYPE ($ITEM_NAME)"
echo "   $ENV_VARS"

# 環境変数をエクスポート
export $ENV_VARS

# 引数で渡されたコマンドを実行
exec "$@"
