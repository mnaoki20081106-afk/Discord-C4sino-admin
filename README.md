# Discord-C4sino-admin

Discordサーバー管理BOTと、そのWeb管理サイトです。
Xaccount-Botのサーバー管理機能をそのまま移植しています（他Bot連携は除外）。

**1つのDiscord Application / 1つのBOT Token / 1つのCloudflare Worker** で動きます。
管理サイトも同じWorkerから配信されるため、GitHub Pagesや別ホスティングは不要です。

## 管理サイトからできること

販売

- 自販機 & 商品管理（パネルデザイン・商品・在庫・クーポン・通知・実績部屋）
- 在庫エディタ
- クーポン管理
- PayPay / Kyash 受取設定
- アセット管理（Embedパネル作成・設置）
- 設置済みパネル一覧

サーバー

- チャンネル位置エディタ（カテゴリ・チャンネルの並び替え、作成、編集、フォーラムタグ）
- チャンネル権限 / ロール権限の編集（個別・一括）
- ロール管理（作成・編集・削除・並び順）
- テンプレート適用
- チケット窓口 / 認証パネル
- 入室管理（入退室通知）
- セキュリティ（Anti-Nuke / Anti-Raid / Anti-Spam / Phishing / Lockdown）
- バックアップ / 復元 / メンバー復旧

## Xaccount-Botから除外したもの

他Botとの連携機能は入れていません。

- 仕入れbot（Discord-Shiire）連携: 仕入れbotタブ、アフィリエイト、フォロ爆、仕入れ決済ブリッジ
- 外部Generator連携: 垢生成タブ、自動補充
- X-Utility連携: X Utilityタブ、パネル設置依頼
- Supply bridge（外部Botからの在庫投入API）
- Node.js版サーバー（apps/server）と docker-compose

## 構成

```text
apps/web     React + Vite の管理サイト（ビルド結果を Worker の静的アセットとして配信）
apps/worker  Cloudflare Worker
             ├─ /api/*          管理API
             ├─ /interactions   Discord Interactions
             ├─ /auth/*         Discord OAuth（認証・メンバー復旧）
             ├─ /media/*        自販機パネル画像
             ├─ /health         ヘルスチェック
             └─ それ以外        管理サイト（SPA）
             D1: c4sino-admin-db
             Durable Object: DiscordSecurityGateway（Gateway接続・Security・入退室）
             Cron: 毎分
```

## デプロイ（Discord-Bot-Factory）

トークン・鍵の管理とデプロイは **Discord-Bot-Factory** で行います。
このリポジトリ自身にはデプロイ用ワークフローを置いていません（二重デプロイ防止）。

1. Factory管理サイトのリポジトリ一覧から `Discord-C4sino-admin` を選ぶ
   （`bot-factory.json` を自動で読み込みます）
2. Cloudflareアカウントを選び、表示された項目を入力する
   - `DISCORD_BOT_TOKEN` / `DISCORD_APPLICATION_ID` / `DISCORD_PUBLIC_KEY` / `DISCORD_CLIENT_SECRET`
   - `DASHBOARD_PASSWORD`（管理サイトのログイン用）
   - `SESSION_ENCRYPTION_KEY` は Factory が自動生成・暗号化保存し、再デプロイ時も同じ値を再利用
   - `WEB_PUBLIC_URL` は任意（独自ドメイン時のみ）
3. Intents・権限・ロール順のチェックを確認してデプロイ

Factory の処理内容:

- `npm ci` → `wrangler deploy --name c4sino-admin`（Worker Secret も同時に登録）
- `wrangler.jsonc` の `build.command` により管理サイト（apps/web）をビルドして同じWorkerに同梱
- D1 `c4sino-admin-db` を初回に自動作成し、IDを `wrangler.jsonc` に書き戻してコミット
- `apps/worker/schema.sql` をD1へ適用

### デプロイ後（初回のみ）

発行されたWorker URLで Discord Developer Portal を設定します。Worker の再デプロイは不要です。

- Interactions Endpoint URL: `https://<Worker URL>/interactions`
- OAuth2 Redirect: `https://<Worker URL>/auth/discord/callback`
- Server Members Intent: ON
- Message Content Intent: ON

管理サイト: `https://<Worker URL>/`
ヘルスチェック: `https://<Worker URL>/health`

## 必須Discord設定

- BOTロール: 人間の管理者より下、操作対象ロールより上
- サーバー管理、チャンネル管理、ロール管理、Kick/Ban、Timeout、Webhook/メッセージ管理の各権限

## ローカル開発

```bash
npm ci
cp apps/worker/.dev.vars.example apps/worker/.dev.vars   # 値を入れる
npm run build --workspace @dsm/web
npm run dev:worker          # http://localhost:8787 で API + 管理サイト
# または管理サイトだけHMRで動かす
npm run dev:web             # http://localhost:5173 → API は localhost:8787
```

## テスト

```bash
npm test --workspace @dsm/worker
npm test --workspace @dsm/web
```

## Source

移植元: mnaoki20081106-afk/Xaccount-Bot
