# 世界株価ダッシュボード 実装設計書

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | 世界株価ダッシュボード |
| ホスティング | Cloudflare Pages（無料プラン） |
| チャート | TradingView 埋め込みウィジェット（無料） |
| 認証 | Authelia OIDC SSO + Firebase Auth |
| DB | Firebase Firestore（ユーザーレイアウト保存） |
| 開発環境 | Ubuntu 24.04 |
| 構成 | 静的HTML / CSS / Vanilla JS（フレームワーク不使用） |

---

## 2. 機能要件

### 2.1 チャート管理

- カテゴリー単位でチャートを追加・削除できる
- チャート追加時はシンボル入力欄でサジェスト候補を表示（TradingViewシンボル検索API利用）
- 削除は各チャートカードの削除ボタンで実行、削除前に確認ダイアログを表示

### 2.2 並び順変更

- ドラッグ＆ドロップによるチャートカードの並び替え
- カテゴリー内のみ移動可（カテゴリー間移動は対象外）
- タッチデバイスにも対応（Touch Events API）

### 2.3 レイアウト保存

- **未ログイン時**: `localStorage` に保存（ブラウザローカルのみ）
- **ログイン時**: Firebase Firestore にユーザーIDひもづきで保存・同期
- 保存タイミング：追加・削除・並び替え・設定変更の直後に自動保存
- 次回アクセス時に保存済み設定を自動ロード
- 設定リセットボタン（デフォルト構成に戻す）を設置

### 2.4 ユーザー認証

- Authelia（`https://auth.yusukesakai.com`）をOIDCプロバイダーとして使用
- Firebase AuthのカスタムOIDCプロバイダーとして登録
- Autheliaに登録済みのユーザーのみログイン可能
- ログイン状態はヘッダーに表示（アバター・ログアウトボタン）

### 2.5 シンボルサジェスト

- チャート追加モーダルのシンボル入力欄で候補をサジェスト表示
- TradingViewの非公式シンボル検索エンドポイントを使用
- 入力から300ms後（debounce）にAPIを呼び出し
- **⚠️ 非公式エンドポイントのため将来的に使用不可になるリスクあり**

### 2.6 レスポンシブレイアウト

| ブレークポイント | カラム数 |
|----------------|---------|
| ～ 639px（スマホ） | 1列 |
| 640px ～ 1023px（タブレット） | 2列 |
| 1024px ～（PC） | 3列 |

- CSS Grid を使用
- チャートウィジェットの高さはビューポートに応じて自動調整

### 2.7 ダークモード

- OS設定（`prefers-color-scheme`）を初期値として自動適用
- ヘッダーにトグルボタンを設置し手動切替可能
- 選択状態は `localStorage` に保存
- TradingViewウィジェットも `theme: "dark" / "light"` で連動（再初期化）

---

## 3. 認証設計

### 3.1 認証フロー

```
ユーザー（ブラウザ）
  → Firebase Auth（OIDCプロバイダー: Authelia）
    → Authelia (https://auth.yusukesakai.com) でSSOログイン
      → 認証成功 → IDトークン発行
        → Firebase Auth がトークンを検証
          → Firestoreアクセス許可
```

### 3.2 Authelia側設定（OIDC クライアント登録）

```yaml
# Authelia configuration.yml に追加
identity_providers:
  oidc:
    clients:
      - client_id: kabuka-dashboard
        client_secret: {生成したシークレット}
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

### 3.3 Firebase Auth側設定

- Firebase Console → Authentication → Sign-in method
- 「新しいプロバイダーを追加」→「OpenID Connect」を選択
- 以下を設定：
  - プロバイダーID: `oidc.authelia`
  - クライアントID: `kabuka-dashboard`
  - 発行者URL: `https://auth.yusukesakai.com`

### 3.4 Firestoreセキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/layout/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

---

## 4. データ設計

### 4.1 Firestoreスキーマ

```
users/
  {uid}/
    layout/
      config    ← ドキュメント（レイアウトJSON全体を1件保存）
```

```json
{
  "theme": "dark",
  "updatedAt": "2025-01-01T00:00:00Z",
  "sections": [ ... ]
}
```

### 4.2 localStorageスキーマ（未ログイン時 / キャッシュ）

```json
{
  "theme": "dark",
  "sections": [
    {
      "id": "indices",
      "label": "Indices",
      "charts": [
        { "id": "chart-001", "symbol": "NIKKEI", "label": "日経平均" },
        { "id": "chart-002", "symbol": "DJ30",        "label": "ダウ平均" },
        { "id": "chart-003", "symbol": "NASDAQ", "label": "ナスダック" },
        { "id": "chart-004", "symbol": "SPX", "label": "S&P500" }
      ]
    },
    {
      "id": "futures",
      "label": "Futures",
      "charts": [
        { "id": "chart-005", "symbol": "NK2251!",   "label": "日経時間外" },
        { "id": "chart-006", "symbol": "DJ30",    "label": "サンデーダウ" },
        { "id": "chart-007", "symbol": "TVC:GOLD",    "label": "ゴールド" },
        { "id": "chart-008", "symbol": "COMEX:GC1!",  "label": "ゴールドサンデー" },
        { "id": "chart-009", "symbol": "TVC:USOIL",   "label": "WTI原油先物" },
        { "id": "chart-010", "symbol": "NYMEX:CL1!",  "label": "WTI原油先物サンデー" }
      ]
    },
    {
      "id": "forex",
      "label": "Forex",
      "charts": [
        { "id": "chart-011", "symbol": "FX:USDJPY",  "label": "ドル円" },
        { "id": "chart-012", "symbol": "FX:EURUSD",  "label": "ユーロドル" }
      ]
    },
    {
      "id": "crypto",
      "label": "Crypto",
      "charts": [
        { "id": "chart-013", "symbol": "COINBASE:BTCUSD", "label": "BTC" },
        { "id": "chart-014", "symbol": "COINBASE:ETHUSD", "label": "ETH" },
        { "id": "chart-015", "symbol": "COINBASE:SOLUSD", "label": "SOL" }
      ]
    },
    {
      "id": "stocks",
      "label": "Stocks",
      "charts": []
    },
    {
      "id": "bonds",
      "label": "Bonds",
      "charts": [
        { "id": "chart-016", "symbol": "JP10Y",  "label": "日本国債10年" },
        { "id": "chart-017", "symbol": "US10Y",  "label": "米国国債10年" }
      ]
    },
    {
      "id": "economy",
      "label": "Economy",
      "charts": [
        { "id": "chart-018", "symbol": "VIX", "label": "恐怖指数(VIX)" }
      ]
    }
  ]
}
```

### 4.3 ID生成ルール

- カテゴリーID: 固定文字列（スラッグ形式）
- チャートID: `chart-` + タイムスタンプ（`Date.now()`）

---

## 5. 画面設計

### 5.1 ページ全体構成

```
┌─────────────────────────────────────────────┐
│  ヘッダー                                    │
│  [サイト名]  [ダークモードトグル] [ログイン]  │
├─────────────────────────────────────────────┤
│  カテゴリー: Indices            [+ 追加]      │
│  ┌────────┐ ┌────────┐ ┌────────┐           │
│  │チャート│ │チャート│ │チャート│           │
│  │  [×]  │ │  [×]  │ │  [×]  │           │
│  └────────┘ └────────┘ └────────┘           │
├─────────────────────────────────────────────┤
│  カテゴリー: Futures            [+ 追加]      │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### 5.2 チャートカード

```
┌──────────────────────────────┐
│ 日経平均          [≡] [×]    │  ← ≡: ドラッグハンドル
│                              │
│  [TradingView ウィジェット]   │
│                              │
└──────────────────────────────┘
```

### 5.3 チャート追加モーダル（サジェスト付き）

```
┌────────────────────────────────────┐
│ チャートを追加                 [×] │
│                                    │
│ 表示名: [______________________]   │
│ シンボル: [____________________]   │
│ ┌──────────────────────────────┐   │
│ │ FOREXCOM:JPN225  日経平均    │   │  ← サジェスト候補
│ │ CME:NKD1!        日経先物    │   │
│ │ ...                          │   │
│ └──────────────────────────────┘   │
│                                    │
│              [キャンセル] [追加]    │
└────────────────────────────────────┘
```

---

## 6. 技術設計

### 6.1 ファイル構成

```
/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js          # エントリポイント、初期化
│   ├── auth.js          # Firebase Auth / Authelia OIDC処理
│   ├── storage.js       # localStorage / Firestore 読み書き
│   ├── chart.js         # TradingViewウィジェット生成
│   ├── suggest.js       # シンボルサジェスト（TradingView非公式API）
│   ├── drag.js          # ドラッグ＆ドロップ処理
│   └── theme.js         # ダークモード切替
└── _redirects           # Cloudflare Pages用（SPA対応）
```

### 6.2 Firebase SDK読み込み（CDN）

```html
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-app.js";
  import { getAuth, signInWithPopup, OAuthProvider } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";
</script>
```

### 6.3 TradingViewウィジェット仕様

使用ウィジェット：**Mini Symbol Overview**

```javascript
new TradingView.MiniWidget({
  container_id: "tv-chart-{id}",
  symbol: "FOREXCOM:JPN225",
  width: "100%",
  height: 220,
  locale: "ja",
  dateRange: "12M",
  colorTheme: "dark",       // or "light"
  trendLineColor: "rgba(41, 98, 255, 1)",
  underLineColor: "rgba(41, 98, 255, 0.3)",
  isTransparent: true,
  autosize: true,
  largeChartUrl: ""
});
```

> ⚠️ テーマ切替時はiframeの制約によりウィジェットのDOM要素を再生成する必要あり

### 6.4 シンボルサジェストAPI（非公式）

```javascript
// 入力値に対してdebounce 300ms後に呼び出す
const res = await fetch(
  `https://symbol-search.tradingview.com/symbol_search/v3/`
  + `?text=${encodeURIComponent(query)}`
  + `&lang=ja`
  + `&domain=production`
);
const data = await res.json();
// data.symbols[] に候補リスト
```

> ⚠️ 非公式エンドポイントのため予告なく変更・廃止の可能性あり

### 6.5 ドラッグ＆ドロップ

- **PC**: HTML5 Drag and Drop API
- **スマホ**: `touchstart` / `touchmove` / `touchend` イベント
- ライブラリ不使用（Vanilla JSで実装）
- ドラッグ中は対象カードに `.dragging` クラスを付与し視覚フィードバック

### 6.6 ダークモード CSS変数

```css
:root {
  --bg-primary:    #0d0d0d;
  --bg-secondary:  #1a1a1a;
  --bg-card:       #1e1e1e;
  --text-primary:  #f0f0f0;
  --text-secondary:#a0a0a0;
  --accent:        #2962ff;
  --border:        #2a2a2a;
}

[data-theme="light"] {
  --bg-primary:    #f5f5f5;
  --bg-secondary:  #ffffff;
  --bg-card:       #ffffff;
  --text-primary:  #111111;
  --text-secondary:#555555;
  --accent:        #2962ff;
  --border:        #e0e0e0;
}
```

---

## 7. 非機能要件

| 項目 | 方針 |
|------|------|
| パフォーマンス | TradingViewウィジェットをIntersection Observerで遅延ロード（画面内に入ったときのみ初期化） |
| アクセシビリティ | ボタンに `aria-label` を付与、キーボード操作対応 |
| ブラウザ対応 | Chrome / Firefox / Safari / Edge 最新版 |
| SEO | 静的HTMLのためmetaタグ設定のみ |

---

## 8. デプロイ手順

```bash
# 1. Gitリポジトリ初期化
git init
git remote add origin https://github.com/litoma/world.git

# 2. Cloudflare Pages設定
#    - GitHubリポジトリと連携
#    - ビルドコマンド: なし（静的ファイルのため）
#    - 出力ディレクトリ: / (ルート)

# 3. pushで自動デプロイ
git add .
git commit -m "initial commit"
git push origin main
```

---

## 9. 開発フェーズ

| フェーズ | 内容 |
|---------|------|
| Phase 1 | 静的HTML構築・TradingViewウィジェット埋め込み確認 |
| Phase 2 | ダークモード・レスポンシブCSS実装 |
| Phase 3 | localStorage保存・ロード実装 |
| Phase 4 | チャート追加・削除・サジェスト機能実装 |
| Phase 5 | ドラッグ＆ドロップ実装 |
| Phase 6 | Firebase Auth + Authelia OIDC連携実装 |
| Phase 7 | Firestore保存・ロード実装 |
| Phase 8 | Cloudflare Pagesデプロイ・動作確認 |

---

## 10. 既知の制約・注意事項

- TradingViewウィジェットはiframe埋め込みのため、テーマ切替時はDOM再生成が必要
- シンボルサジェストAPIは非公式のため、予告なく使用不可になるリスクあり
- 先物シンボルは市場時間外にデータが止まる場合あり
- TradingView無料プランではウィジェット下部にTradingViewロゴが常時表示される
- FirebaseのAPIキー等は `firebaseConfig` オブジェクトとしてHTMLに記載（公開前提の設定値のため問題なし、Firestoreセキュリティルールで保護）
