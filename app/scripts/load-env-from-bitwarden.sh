#!/bin/bash
# Bitwarden から環境変数を読み込むスクリプト

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
ENV_VARS=$(bw get notes myblog-frontend-env --session "$BW_SESSION" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Error: Failed to fetch environment variables from Bitwarden."
    echo "Make sure 'myblog-frontend-env' item exists in your vault."
    exit 1
fi

# 環境変数をエクスポート
export $ENV_VARS

# 引数で渡されたコマンドを実行
exec "$@"
