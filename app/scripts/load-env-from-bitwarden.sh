#!/usr/bin/env bash
# Bitwarden から環境変数を読み込むスクリプト（フォールバック機能付き）
set -euo pipefail

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
        FALLBACK_ENV=$'VITE_ENABLE_MSW=false\nVITE_API_BASE_URL=http://localhost:3000'
        ITEM_NAME="myblog-frontend-env-api"
        ;;
    mock)
        FALLBACK_ENV=$'VITE_ENABLE_MSW=true\nVITE_API_BASE_URL=http://localhost:3000'
        ITEM_NAME="myblog-frontend-env-mock"
        ;;
    *)
        echo "Error: Invalid environment type '$ENV_TYPE'"
        usage
        ;;
esac

# 親プロセスからの値の持ち越しを防ぐ（このスクリプトが設定するキーだけ解除）
unset_vite_keys() {
    local input="$1" line name
    while IFS= read -r line; do
        line=${line%$'\r'}

        # trim spaces
        line="${line#"${line%%[![:space:]]*}"}"
        line="${line%"${line##*[![:space:]]}"}"

        [[ -z "$line" ]] && continue
        [[ "$line" == \#* ]] && continue
        [[ "$line" == export\ * ]] && line="${line#export }"

        case "$line" in
            VITE_[A-Za-z0-9_]*=*)
                name=${line%%=*}
                unset "$name" 2>/dev/null || true
                ;;
        esac
    done <<< "$input"
}

unset_vite_keys "$FALLBACK_ENV"

apply_env_lines() {
    local input="$1"
    local line name value key
    while IFS= read -r line; do
        line=${line%$'\r'}

        # trim spaces
        line="${line#"${line%%[![:space:]]*}"}"
        line="${line%"${line##*[![:space:]]}"}"

        [[ -z "$line" ]] && continue
        [[ "$line" == \#* ]] && continue

        # allow "export KEY=VALUE"
        [[ "$line" == export\ * ]] && line="${line#export }"

        case "$line" in
            VITE_[A-Za-z0-9_]*=*)
                name=${line%%=*}
                value=${line#*=}

                # trim spaces around value
                value="${value#"${value%%[![:space:]]*}"}"
                value="${value%"${value##*[![:space:]]}"}"

                # unquoted inline comments: KEY=value # comment
                if [[ "$value" != \"* && "$value" != \'* ]]; then
                    value="${value%%[[:space:]]#*}"
                    value="${value%"${value##*[![:space:]]}"}"
                fi

                # strip surrounding quotes: KEY="value" or KEY='value'
                if [[ ( "$value" == \"*\" && "$value" == *\" ) || ( "$value" == \'*\' && "$value" == *\' ) ]]; then
                    value="${value:1:-1}"
                fi

                export "$name=$value"
                ;;
            *)
                key="${line%%=*}"
                if [[ "$key" == "$line" ]]; then
                    echo "⚠️  Skipped non-VITE env line" >&2
                else
                    echo "⚠️  Skipped non-VITE env key: $key" >&2
                fi
                ;;
        esac
    done <<< "$input"
}

# Bitwarden CLI がインストールされているかチェック
if ! command -v bw &> /dev/null; then
    echo "⚠️  Bitwarden CLI not found. Using fallback environment variables." >&2
    echo "   (fallback env applied)" >&2
    apply_env_lines "$FALLBACK_ENV"
    exec "$@"
fi

# Bitwarden にログインしているかチェック
if ! bw login --check &> /dev/null; then
    echo "⚠️  Not logged in to Bitwarden. Using fallback environment variables." >&2
    echo "   (fallback env applied)" >&2
    apply_env_lines "$FALLBACK_ENV"
    exec "$@"
fi

# セッションキーが設定されているかチェック（可能なら自動アンロック）
if [ -z "${BW_SESSION-}" ]; then
    if [ -t 0 ]; then
        echo "🔐 BW_SESSION not set. Trying to unlock Bitwarden..." >&2
        if BW_SESSION="$(bw unlock --raw 2>/dev/null)"; then
            export BW_SESSION
        else
            echo "⚠️  Failed to unlock Bitwarden. Using fallback environment variables." >&2
            echo "   (fallback env applied)" >&2
            apply_env_lines "$FALLBACK_ENV"
            exec "$@"
        fi
    else
        echo "⚠️  BW_SESSION not set (non-interactive). Using fallback environment variables." >&2
        echo "   (fallback env applied)" >&2
        echo "   Tip: Run 'export BW_SESSION=\$(bw unlock --raw)' to use Bitwarden." >&2
        apply_env_lines "$FALLBACK_ENV"
        exec "$@"
    fi
fi

# Bitwarden から環境変数を取得
if ! ENV_VARS=$(BW_SESSION="$BW_SESSION" bw get notes "$ITEM_NAME" 2>/dev/null); then
    echo "⚠️  Failed to fetch from Bitwarden. Using fallback environment variables." >&2
    echo "   (fallback env applied)" >&2
    apply_env_lines "$FALLBACK_ENV"
    exec "$@"
fi

if [ -z "$ENV_VARS" ]; then
    echo "⚠️  Bitwarden item is empty. Using fallback environment variables." >&2
    echo "   (fallback env applied)" >&2
    apply_env_lines "$FALLBACK_ENV"
    exec "$@"
fi

echo "✅ Loaded environment from Bitwarden: $ENV_TYPE" >&2

# まず対象キーを解除してから、フォールバック→Bitwarden の順に適用
unset_vite_keys "$FALLBACK_ENV"$'\n'"$ENV_VARS"
apply_env_lines "$FALLBACK_ENV"
apply_env_lines "$ENV_VARS"

# 引数で渡されたコマンドを実行（BW セッションは引き継がない）
unset BW_SESSION
exec "$@"
