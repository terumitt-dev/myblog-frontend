# ベースイメージ（Node.js 20系）
FROM node:20

# 作業ディレクトリ作成
WORKDIR /app

# jq をインストール（Bitwarden CLI は npm でインストール）
RUN apt-get update && \
    apt-get install -y jq && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Bitwarden CLI を npm でグローバルインストール
RUN npm install -g @bitwarden/cli

# package.json と package-lock.json を先にコピー
COPY package*.json ./

# 依存関係をクリーンインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# Viteのデフォルトポート5173を開放
EXPOSE 5173

# ファイル変更検知の問題を回避（特に Docker Desktop / Mac）
ENV CHOKIDAR_USEPOLLING=true

# Vite開発サーバーをホスト全体に公開（--host 0.0.0.0）
CMD ["npm", "run", "dev", "--", "--host"]
