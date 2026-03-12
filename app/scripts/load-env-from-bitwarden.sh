#!/bin/bash
# Bitwarden から環境変数を読み込むスクリプト（フォールバック機能付き）

# 使い方を表示
usage() {
    echo "Usage: $0 <environment> <command>"
    echo ""
    echo "Environments:"
    echo "  api   - VITE_ENABLE_MSW=false"
    echo "  mock  - VITE_ENABLE_MSW=true"
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

# 環境タイプに応じて環境変数を決定
case "$ENV_TYPE" in
    api)
        FALLBACK_ENV="VITE_ENABLE_MSW=false"
        ITEM_NAME="myblog-frontend-env-api"
        ;;
    mock)
        FALLBACK_ENV="VITE_ENABLE_MSW=true"
        ITEM_NAME="myblog-frontend-env-mock"
        ;;
    *)
        echo "Error: Invalid environment type '$ENV_TYPE'"
        usage
        ;;
esac

# Bitwarden CLI がインストールされているかチェック
if ! command -v bw &> /dev/null; then
    echo "⚠️  Bitwarden CLI not found. Using fallback environment variables."
    echo "   $FALLBACK_ENV"
    export "${FALLBACK_ENV}"
    exec "$@"
fi

# Bitwarden にログインしているかチェック
if ! bw login --check &> /dev/null; then
    echo "⚠️  Not logged in to Bitwarden. Using fallback environment variables."
    echo "   $FALLBACK_ENV"
    export "${FALLBACK_ENV}"
    exec "$@"
fi

# セッションキーが設定されているかチェック
if [ -z "${BW_SESSION-}" ]; then
    echo "⚠️  BW_SESSION not set. Using fallback environment variables."
    echo "   $FALLBACK_ENV"
    echo "   Tip: Run 'export BW_SESSION=\$(bw unlock --raw)' to use Bitwarden."
    export "${FALLBACK_ENV}"
    exec "$@"
fi

# Bitwarden から環境変数を取得
if ! ENV_VARS=$(bw get notes "$ITEM_NAME" --session "$BW_SESSION" 2>/dev/null); then
    echo "⚠️  Failed to fetch from Bitwarden. Using fallback environment variables."
    echo "   $FALLBACK_ENV"
    export "${FALLBACK_ENV}"
    exec "$@"
fi

if [ -z "$ENV_VARS" ]; then
    echo "⚠️  Bitwarden item is empty. Using fallback environment variables."
    echo "   $FALLBACK_ENV"
    export "${FALLBACK_ENV}"
    exec "$@"
fi

echo "✅ Loaded environment from Bitwarden: $ENV_TYPE"

# 環境変数をエクスポート（KEY=VALUE 形式のみ許可）
while IFS= read -r line; do
    line=${line%$'\r'}
    [[ -z "${line//[[:space:]]/}" ]] && continue
    case "$line" in
        [A-Za-z_][A-Za-z0-9_]*=*)
            name=${line%%=*}
            value=${line#*=}
            export "$name=$value"
            ;;
        *)
            echo "⚠️  Skipped invalid env line: $line" >&2
            ;;
    esac
done <<< "$ENV_VARS"

# 引数で渡されたコマンドを実行
exec "$@"
