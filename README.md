# 世界株価ダッシュボード (Global Market Dashboard)

世界の主要な株価指数、為替、債券、コモディティ、仮想通貨などを一覧表示し、直近24時間の価格変動を軽量チャートで可視化するパーソナルダッシュボードツールです。

---

## 1. システム概要

本システムは、サーバーレスインフラを活用し、完全無料で24時間稼働する高性能なダッシュボードです。

- **フロントエンド**: Cloudflare Pages (React + Vite + TypeScript + TradingView Lightweight Charts)
- **バックエンド**: Cloudflare Workers (`world` - API & Cron収集の一本化)
- **データストレージ**: 
  - **Workers KV**: 最新価格（スナップショット）と24時間の時系列データ（ヒストリ）を保持
  - **Cloudflare D1**: ユーザーごとのレイアウト表示設定をリレーショナルに保存

### システム構成図

```
┌──────────────────────────────────────────────────────────────┐
│  Cloudflare Pages (フロントエンド)                            │
│  React + Vite + TradingView Lightweight Charts               │
│  ・価格タイル表示（最新クォート）                               │
│  ・5分足ミニチャート表示（蓄積された時系列データ）              │
│  ・銘柄表示ON/OFF設定、グリッド列数選択UI                     │
│  ・Authelia OIDC + Firebase Auth によるユーザー認証            │
└─────────────────────┬────────────────────────────────────────┘
                      │ HTTP (GET/POST /api/*)
┌─────────────────────▼────────────────────────────────────────┐
│  Cloudflare Workers (world)                                  │
│  【API機能】                                                 │
│    - GET  /api/snapshot   → KVからスナップショット/ヒストリ返却  │
│    - GET  /api/layout     → D1からユーザー別レイアウト設定の取得 │
│    - POST /api/layout     → D1へユーザー別レイアウト設定の保存   │
│  【Cron収集機能 (5分毎)】                                    │
│    - 各データソースから最新値を取得してKVに保存・時系列クレンジング│
└───────────┬───────────────────────────────┬──────────────────┘
            │ KV (get/put)                  │ D1 (query)
┌───────────▼──────────┐        ┌──────────▼──────────────────┐
│  Workers KV           │        │  Cloudflare D1              │
│  `market:snapshot`    │        │  `layout` テーブル           │
│  `market:history`     │        │  （ユーザー別表示設定）      │
└───────────▲──────────┘        └─────────────────────────────┘
            │ KV.put
            └─────────────────────────┐ (Yahoo Finance / Finnhub)
```

---

## 2. ユーザー認証設計 (Authelia OIDC SSO + Firebase Auth)

ユーザーのログインおよび個人設定（レイアウト等）の安全な保存のため、Authelia OIDC SSO と Firebase Auth を連携させた認証システムを採用しています。

### 認証フロー

```
ユーザー（ブラウザ）
  → Firebase Auth（OIDCプロバイダー: Authelia）
    → Authelia (https://auth.yusukesakai.com) でSSOログイン
      → 認証成功 → IDトークン発行
        → Firebase Auth がトークンを検証
          → 確立された Firebase UID に紐付けて D1 (layoutテーブル) に保存
```

### Authelia側設定（OIDC クライアント登録）

`Authelia` の `configuration.yml` に以下のようにクライアントを登録します。

```yaml
identity_providers:
  oidc:
    clients:
      - client_id: kabuka-dashboard
        client_secret: {生成したクライアントシークレット}
        redirect_uris:
          - https://world.yusukesakai.com/__/auth/handler
        scopes:
          - openid
          - profile
          - email
        grant_types:
          - authorization_code
        response_types:
          - code
```

### Firebase Auth側設定

1. Firebase Console → **Authentication** → **Sign-in method** を開く。
2. **「新しいプロバイダーを追加」** から **「OpenID Connect」** を選択。
3. 以下の項目を設定します：
   - **プロバイダーID**: `oidc.authelia`
   - **クライアントID**: `kabuka-dashboard`
   - **クライアントシークレット**: {Authelia側で生成したシークレット}
   - **発行者 (URL)**: `https://auth.yusukesakai.com`

---

## 3. データソース & 収集仕様

5分間隔で `world` Worker が起動し、以下のデータソースから最新値を取得・マージして KV へ保存します。市場クローズ時間帯（土日など）のフラットな不要データを排除するための自動クレンジング処理を備えています。

### 1. Yahoo Finance (非公式エンドポイント)
- **対象**: 為替 (USD/JPY 等)、国際インデックス (^N225 等)、コモディティ、債券、VIX、仮想通貨など
- **処理形式**: 複数シンボルを1回のリクエストでまとめて一括取得（バッチ処理）

### 2. Finnhub (公式無料API)
- **対象**: 米国株、その他個別銘柄など
- **処理形式**: 個別に順次取得。APIレートリミット対策として、リクエスト間に 100ms のスリープを挿入

---

## 4. プロジェクト構成と開発手順

### ディレクトリ構成

- `/src` : フロントエンド React アプリケーションのソースコード
- `/public` : 静的アセットおよび Pages 転送設定 (`_redirects` 等)
- `/workers/api` : `world` Worker (API 兼 Cron 収集) プロジェクト

### 開発およびビルド手順

#### 1. フロントエンドのビルド
フロントエンドのビルドには、キャッシュ回避処理および Cloudflare Rocket Loader による Vite モジュール実行阻害対策を含んだ `build.sh` スクリプトを使用します。

```bash
# ビルドの実行
./build.sh
```

#### 2. バックエンド (Workers) のデプロイ
Wrangler を使用して `world` Worker をデプロイします。

```bash
cd workers/api

# ローカル環境用環境変数 (.dev.vars) の作成
echo "FINNHUB_API_KEY=your_key" > .dev.vars

# 本番環境への Finnhub API キーの登録 (シークレット)
npx wrangler secret put FINNHUB_API_KEY

# 本番環境へのデプロイ
npx wrangler deploy
```

#### 3. D1 データベースの初期化
レイアウト保存用のテーブルを D1 データベース上に作成します。

```bash
# 本番データベースにマイグレーション/テーブル作成を実行する場合
npx wrangler d1 execute world --remote --command="CREATE TABLE IF NOT EXISTS layout (user_id TEXT PRIMARY KEY DEFAULT 'default', config TEXT NOT NULL, updated_at TEXT NOT NULL);"
```
