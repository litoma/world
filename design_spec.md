# 世界株価ダッシュボード 実装設計書

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | 世界株価ダッシュボード |
| ホスティング | Cloudflare Pages（無料プラン） |
| チャート | TradingView 埋め込みウィジェット（無料） |
| 開発環境 | Ubuntu 24.04 |
| 構成 | 静的HTML / CSS / Vanilla JS（フレームワーク不使用） |

---

## 2. 機能要件

### 2.1 チャート管理

- 分類（セクション）単位でチャートを追加・削除できる
- チャート追加時はシンボル・表示名を入力して登録
- 削除は各チャートカードに設置した削除ボタンで実行
- 削除前に確認ダイアログを表示

### 2.2 並び順変更

- ドラッグ＆ドロップによるチャートカードの並び替え
- セクション内のみ移動可（セクション間移動は対象外）
- タッチデバイスにも対応（Touch Events API）

### 2.3 レイアウト保存

- チャート構成・並び順・表示設定を `localStorage` に保存
- 保存タイミング：追加・削除・並び替え・設定変更の直後に自動保存
- 次回アクセス時に保存済み設定を自動ロード
- 設定リセットボタン（デフォルト構成に戻す）を設置

### 2.4 レスポンシブレイアウト

| ブレークポイント | カラム数 |
|----------------|---------|
| ～ 639px（スマホ） | 1列 |
| 640px ～ 1023px（タブレット） | 2列 |
| 1024px ～（PC） | 3列 |

- CSS Grid を使用
- チャートウィジェットの高さはビューポートに応じて自動調整

### 2.5 ダークモード

- OS設定（`prefers-color-scheme`）を初期値として自動適用
- ヘッダーにトグルボタンを設置し手動切替可能
- 選択状態は `localStorage` に保存
- TradingViewウィジェットも `theme: "dark" / "light"` で連動

---

## 3. データ設計

### 3.1 localStorage スキーマ

```json
{
  "theme": "dark",
  "sections": [
    {
      "id": "jp-stock",
      "label": "🇯🇵 日本株式",
      "charts": [
        { "id": "chart-001", "symbol": "TVC:NI225",  "label": "日経平均" },
        { "id": "chart-002", "symbol": "CME:NKD1!",  "label": "日経時間外" }
      ]
    },
    {
      "id": "us-stock",
      "label": "🇺🇸 米国株式",
      "charts": [
        { "id": "chart-003", "symbol": "DJ:DJI",       "label": "ダウ平均" },
        { "id": "chart-004", "symbol": "CME:YM1!",     "label": "サンデーダウ" },
        { "id": "chart-005", "symbol": "NASDAQ:IXIC",  "label": "ナスダック" },
        { "id": "chart-006", "symbol": "SP:SPX",       "label": "S&P500" }
      ]
    },
    {
      "id": "bond",
      "label": "📊 債券・恐怖指数",
      "charts": [
        { "id": "chart-007", "symbol": "CBOE:VIX",    "label": "恐怖指数(VIX)" },
        { "id": "chart-008", "symbol": "TVC:JP10Y",   "label": "日本国債10年" },
        { "id": "chart-009", "symbol": "TVC:US10Y",   "label": "米国国債10年" }
      ]
    },
    {
      "id": "commodity",
      "label": "🥇 コモディティ",
      "charts": [
        { "id": "chart-010", "symbol": "TVC:GOLD",    "label": "ゴールド" },
        { "id": "chart-011", "symbol": "COMEX:GC1!",  "label": "ゴールドサンデー" },
        { "id": "chart-012", "symbol": "TVC:USOIL",   "label": "WTI原油先物" },
        { "id": "chart-013", "symbol": "NYMEX:CL1!",  "label": "WTI原油先物サンデー" }
      ]
    },
    {
      "id": "fx",
      "label": "💱 為替",
      "charts": [
        { "id": "chart-014", "symbol": "FX:USDJPY",  "label": "ドル円" },
        { "id": "chart-015", "symbol": "FX:EURUSD",  "label": "ユーロドル" }
      ]
    },
    {
      "id": "crypto",
      "label": "🪙 暗号資産",
      "charts": [
        { "id": "chart-016", "symbol": "COINBASE:BTCUSD", "label": "ビットコイン(BTC)" },
        { "id": "chart-017", "symbol": "COINBASE:ETHUSD", "label": "イーサリアム(ETH)" },
        { "id": "chart-018", "symbol": "COINBASE:SOLUSD", "label": "ソラナ(SOL)" }
      ]
    },
    {
      "id": "jp-individual",
      "label": "🏢 日本個別株",
      "charts": []
    }
  ]
}
```

### 3.2 ID生成ルール

- セクションID：固定文字列（スラッグ形式）
- チャートID：`chart-` + タイムスタンプ（`Date.now()`）

---

## 4. 画面設計

### 4.1 ページ全体構成

```
┌─────────────────────────────────────┐
│  ヘッダー                            │
│  [サイト名]    [ダークモードトグル]   │
├─────────────────────────────────────┤
│  セクション: 🇯🇵 日本株式  [+ 追加]  │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │チャート│ │チャート│ │チャート│  │
│  │  [×]  │ │  [×]  │ │  [×]  │  │
│  └────────┘ └────────┘ └────────┘  │
├─────────────────────────────────────┤
│  セクション: 🇺🇸 米国株式  [+ 追加]  │
│  ...                                │
└─────────────────────────────────────┘
```

### 4.2 チャートカード

```
┌──────────────────────────────┐
│ 日経平均          [≡] [×]    │  ← ≡: ドラッグハンドル
│                              │
│  [TradingView ウィジェット]   │
│                              │
└──────────────────────────────┘
```

### 4.3 チャート追加モーダル

```
┌──────────────────────────────┐
│ チャートを追加           [×] │
│                              │
│ 表示名: [__________________] │
│ シンボル: [________________] │
│     例) TVC:NI225            │
│                              │
│          [キャンセル] [追加]  │
└──────────────────────────────┘
```

---

## 5. 技術設計

### 5.1 ファイル構成

```
/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js          # エントリポイント、初期化
│   ├── storage.js       # localStorageの読み書き
│   ├── chart.js         # TradingViewウィジェット生成
│   ├── drag.js          # ドラッグ＆ドロップ処理
│   └── theme.js         # ダークモード切替
└── _redirects           # Cloudflare Pages用（SPA対応）
```

### 5.2 TradingViewウィジェット仕様

使用ウィジェット：**Mini Symbol Overview**

```javascript
new TradingView.MiniWidget({
  container_id: "tv-chart-{id}",
  symbol: "TVC:NI225",
  width: "100%",
  height: 220,
  locale: "ja",
  dateRange: "12M",
  colorTheme: "dark",      // or "light"
  trendLineColor: "rgba(41, 98, 255, 1)",
  underLineColor: "rgba(41, 98, 255, 0.3)",
  isTransparent: true,
  autosize: true,
  largeChartUrl: ""
});
```

### 5.3 ドラッグ＆ドロップ

- **PC**: HTML5 Drag and Drop API
- **スマホ**: `touchstart` / `touchmove` / `touchend` イベント
- ライブラリは使用しない（Vanilla JSで実装）
- ドラッグ中は対象カードに `.dragging` クラスを付与し視覚フィードバック

### 5.4 ダークモード CSS変数

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

## 6. 非機能要件

| 項目 | 方針 |
|------|------|
| パフォーマンス | TradingViewウィジェットをIntersection Observerで遅延ロード（画面内に入ったときのみ初期化） |
| アクセシビリティ | ボタンに `aria-label` を付与、キーボード操作対応 |
| ブラウザ対応 | Chrome / Firefox / Safari / Edge 最新版 |
| SEO | 静的HTMLのためmetaタグ設定のみ |

---

## 7. デプロイ手順

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

## 8. 開発フェーズ

| フェーズ | 内容 |
|---------|------|
| Phase 1 | 静的HTML構築・TradingViewウィジェット埋め込み確認 |
| Phase 2 | ダークモード・レスポンシブCSS実装 |
| Phase 3 | localStorage保存・ロード実装 |
| Phase 4 | チャート追加・削除機能実装 |
| Phase 5 | ドラッグ＆ドロップ実装 |
| Phase 6 | Cloudflare Pagesデプロイ・動作確認 |

---

## 9. 既知の制約・注意事項

- TradingViewウィジェットはiframe埋め込みのため、親ページからの直接操作不可
- テーマ切替時はウィジェットを再初期化する必要あり（DOMを再生成）
- `CME:NKD1!` 等の先物シンボルは市場時間外にデータが止まる場合あり
- TradingViewの無料プランではウィジェット下部にTradingViewロゴが常時表示される
