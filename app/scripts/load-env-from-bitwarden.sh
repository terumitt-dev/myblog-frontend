#!/usr/bin/env bash
# Bitwarden から環境変数を読み込むスクリプト（フォールバック機能付き）
set -euo pipefail

# 使い方を表示
usage() {
    echo "Usage: $0 <environment> <command>" >&2
    echo "" >&2
    echo "Environments:" >&2
    echo "  api   - VITE_ENABLE_MSW=false" >&2
    echo "  mock  - VITE_ENABLE_MSW=true" >&2
    echo "" >&2
    echo "Example:" >&2
    echo "  $0 api npm run dev" >&2
    echo "  $0 mock npm run dev" >&2
    exit 1
}

# 引数チェック
if [ $# -lt 2 ]; then
    usage
fi

ENV_TYPE=$1
shift

# ENV_TYPE の検証（英数字のみ許可）
if ! [[ "$ENV_TYPE" =~ ^[a-z]+$ ]]; then
    echo "Error: Invalid environment type '$ENV_TYPE' (only lowercase letters allowed)" >&2
    usage
fi

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
        echo "Error: Invalid environment type '$ENV_TYPE'" >&2
        usage
        ;;
esac

# ITEM_NAME の検証（英数字、ハイフン、アンダースコアのみ許可）
if ! [[ "$ITEM_NAME" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo "Error: Invalid ITEM_NAME '$ITEM_NAME'" >&2
    exit 1
fi

# 親プロセスからの値の持ち越しを防ぐ（VITE_ プレフィックスを全解除）
unset_all_vite_vars() {
    local name
    while IFS= read -r name; do
        unset "$name" 2>/dev/null || true
    done < <(compgen -v | grep -E '^VITE_' || true)
}

# 親プロセスからの値の持ち越しを防ぐため、VITE_* を全解除してから適用する
unset_all_vite_vars

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

        # allow "export KEY=VALUE" (spaces/tabs supported)
        if [[ "$line" =~ ^export[[:space:]]+(.+)$ ]]; then
            line="${BASH_REMATCH[1]}"
        fi

        if [[ "$line" =~ ^(VITE_[A-Za-z0-9_]+)=(.*)$ ]]; then
            name="${BASH_REMATCH[1]}"
            value="${BASH_REMATCH[2]}"

            # trim spaces around value
            value="${value#"${value%%[![:space:]]*}"}"
            value="${value%"${value##*[![:space:]]}"}"

            # 値のパース（引用符付き/なし、末尾コメント対応）
            if [[ "$value" =~ ^\"(.*)\"[[:space:]]*(#.*)?$ ]]; then
                value="${BASH_REMATCH[1]}"
            elif [[ "$value" =~ ^\'(.*)\'[[:space:]]*(#.*)?$ ]]; then
                value="${BASH_REMATCH[1]}"
            else
                # unquoted inline comments: KEY=value # comment
                value="${value%%[[:space:]]#*}"
                value="${value%"${value##*[![:space:]]}"}"
            fi

            # 安全ガード（改行/NUL を含む値は無効）
            if [[ "$value" == *$'\n'* || "$value" == *$'\0'* ]]; then
                echo "⚠️  Skipped invalid VITE value (contains control chars): $name" >&2
                continue
            fi

            # 値の長さ制限（4KB を超える値は拒否）
            if [[ ${#value} -gt 4096 ]]; then
                echo "⚠️  Skipped invalid VITE value (too long): $name (${#value} bytes)" >&2
                continue
            fi

            # 空の値は警告を出すが許可（明示的な空値設定の可能性）
            if [[ -z "$value" ]]; then
                echo "⚠️  Setting empty value for: $name" >&2
            fi

            export "${name}=${value}"
        else
            key="${line%%=*}"
            if [[ "$key" == "$line" ]]; then
                echo "⚠️  Skipped non-VITE env line" >&2
            else
                echo "⚠️  Skipped non-VITE env key: $key" >&2
            fi
        fi
    done <<< "$input"
}

exec_cmd() {
    unset BW_SESSION 2>/dev/null || true
    exec "$@"
}

# Bitwarden CLI がインストールされているかチェック
if ! command -v bw &> /dev/null; then
    echo "⚠️  Bitwarden CLI not found. Using fallback environment variables." >&2
    echo "   (fallback env applied)" >&2
    apply_env_lines "$FALLBACK_ENV"
    exec_cmd "$@"
fi

# Bitwarden にログインしているかチェック
if ! bw login --check &> /dev/null; then
    echo "⚠️  Not logged in to Bitwarden. Using fallback environment variables." >&2
    echo "   (fallback env applied)" >&2
    apply_env_lines "$FALLBACK_ENV"
    exec_cmd "$@"
fi

# セッションキーが設定されているかチェック（可能なら自動アンロック）
if [ -z "${BW_SESSION-}" ]; then
    if [ -t 0 ]; then
        echo "🔐 BW_SESSION not set. Trying to unlock Bitwarden..." >&2
        if BW_SESSION="$(bw unlock --raw </dev/tty)" && [[ -n "$BW_SESSION" ]]; then
            export BW_SESSION
        else
            echo "⚠️  Failed to unlock Bitwarden. Using fallback environment variables." >&2
            echo "   (fallback env applied)" >&2
            apply_env_lines "$FALLBACK_ENV"
            exec_cmd "$@"
        fi
    else
        echo "⚠️  BW_SESSION not set (non-interactive). Using fallback environment variables." >&2
        echo "   (fallback env applied)" >&2
        echo "   Tip: Run 'export BW_SESSION=\$(bw unlock --raw)' to use Bitwarden." >&2
        apply_env_lines "$FALLBACK_ENV"
        exec_cmd "$@"
    fi
fi

# Bitwarden から環境変数を取得（timeout が無ければフォールバック）
local_timeout_bin=""
if command -v timeout &> /dev/null; then
    local_timeout_bin="timeout"
elif command -v gtimeout &> /dev/null; then
    local_timeout_bin="gtimeout"
fi

if [[ -n "$local_timeout_bin" ]]; then
    if ! ENV_VARS=$(BW_SESSION="$BW_SESSION" "$local_timeout_bin" 10 bw get notes "$ITEM_NAME" 2>/dev/null); then
        echo "⚠️  Failed to fetch from Bitwarden (item: $ITEM_NAME). Using fallback environment variables." >&2
        echo "   (fallback env applied)" >&2
        apply_env_lines "$FALLBACK_ENV"
        exec_cmd "$@"
    fi
else
    echo "⚠️  timeout command not found. Fetching from Bitwarden without timeout." >&2
    if ! ENV_VARS=$(BW_SESSION="$BW_SESSION" bw get notes "$ITEM_NAME" 2>/dev/null); then
        echo "⚠️  Failed to fetch from Bitwarden (item: $ITEM_NAME). Using fallback environment variables." >&2
        echo "   (fallback env applied)" >&2
        apply_env_lines "$FALLBACK_ENV"
        exec_cmd "$@"
    fi
fi

if ! grep -qE '^[[:space:]]*(export[[:space:]]+)?VITE_[A-Za-z0-9_]+=' <<< "$ENV_VARS"; then
    echo "⚠️  Bitwarden item has no valid VITE_ entries. Using fallback environment variables." >&2
    echo "   (fallback env applied)" >&2
    apply_env_lines "$FALLBACK_ENV"
    exec_cmd "$@"
fi

echo "✅ Loaded environment from Bitwarden: $ENV_TYPE" >&2

# まず VITE_* を全解除してから、フォールバック→Bitwarden の順に適用
unset_all_vite_vars
apply_env_lines "$FALLBACK_ENV"
apply_env_lines "$ENV_VARS"

# 引数で渡されたコマンドを実行（BW セッションは引き継がない）
exec_cmd "$@"
