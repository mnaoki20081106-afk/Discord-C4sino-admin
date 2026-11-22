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

## デプロイ

### Bot-Factory を使う場合

リポジトリ直下の `bot-factory.json` を Bot-Factory が読み取ります。
Worker名は `c4sino-admin` です。

`wrangler.jsonc` の `build.command` で管理サイトを毎回ビルドしてから、Workerと一緒にデプロイします。

### GitHub Actions を使う場合

`.github/workflows/deploy-worker.yml` が main への push でデプロイします。

Repository Secrets に次を設定してください。

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### 手動の場合

```bash
npm ci
cd apps/worker
npx wrangler deploy
```

### D1

`wrangler.jsonc` には `database_id` を書いていません。
初回デプロイ時に wrangler が `c4sino-admin-db` を自動作成してバインドします。
スキーマはWorkerが起動時に自動作成します（`apps/worker/schema.sql` も同じ内容です）。

### Worker Secret

```bash
cd apps/worker
npx wrangler secret put DISCORD_APPLICATION_ID
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_BOT_TOKEN
npx wrangler secret put DISCORD_CLIENT_SECRET
npx wrangler secret put SESSION_ENCRYPTION_KEY   # 32バイトのランダム値(base64)。作成後は変更しない
npx wrangler secret put DASHBOARD_PASSWORD
```

任意: `WEB_PUBLIC_URL`（独自ドメインで管理サイトを出す場合のみ。未設定ならWorker自身のURL）

### Discord Developer Portal

デプロイ後に発行されたWorker URLで設定します。

- Interactions Endpoint URL: `https://<Worker URL>/interactions`
- OAuth2 Redirect: `https://<Worker URL>/auth/discord/callback`
- Server Members Intent: ON
- Message Content Intent: ON

管理サイト: `https://<Worker URL>/`

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
