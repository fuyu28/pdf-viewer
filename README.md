# 縦/横切替 PDF Viewer

React + Vite + TypeScript で作成した、漫画ビューア風 PDF ビューアです。  
縦（連続スクロール）/横（ページめくり）切替、見開き、目次ジャンプ、ページジャンプ、ズームに対応しています。

## 主な機能

- FABで `縦 / 横` モード切替
- `goToPage(page)` にナビ導線を統一（目次・ページ入力・キー操作）
- 見開き表示（縦/横どちらも対応）
- ズーム（`+/-` ボタン、`+/-` キー、倍率セレクト）
- 横モードは `embla-carousel-react`、縦モードは `@tanstack/react-virtual`
- 本情報・目次は PDF と同名の JSON を `public/pdf` から読み込み（zodで検証）

## セットアップ

```bash
bun install
bun run dev
```

本番ビルド:

```bash
bun run build
```

品質チェック:

```bash
bun run lint
bun run format
```

## データ配置

`public/pdf` に PDF と同名 JSON を配置します。

```text
public/pdf/
  3000000149.pdf
  3000000149.json
```

`App.tsx` で指定した PDF パスから JSON パスを自動解決します。

- PDF: `/pdf/3000000149.pdf`
- JSON: `/pdf/3000000149.json`

## JSON 形式（抜粋）

```json
{
  "title": "共生の思想",
  "authors": "藤原, 鎮男（著）",
  "description": "...",
  "table_of_contents": [
    { "chapter": "表紙", "page": 1 },
    { "chapter": "目次", "page": 5 }
  ]
}
```

## キー操作

- `→`: 前ページ
- `←`: 次ページ
- `↑ / ↓`: 現在ビューの上下スクロール
- `+ / -`: ズーム
- 横モード + 見開き時の `← / →` は 2ページ単位で移動

## 主要構成

```text
src/
  app/App.tsx
  features/
    pdf/          # pdf.js 読み込み・Canvas描画
    viewer/       # 縦/横ビュー・見開き・viewer状態
    nav/          # 目次・ページジャンプ
    book/         # JSON取得・正規化・本情報Dialog
  shared/pdfjs/setup.ts  # worker設定
```

## 実装メモ

- PDF worker は `src/shared/pdfjs/setup.ts` に集約
- `PageCanvas` は `scale` を受けるためズーム拡張しやすい設計
- 余計な機能（検索・注釈など）は未実装
