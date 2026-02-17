# 縦/横切替 PDF Viewer (React + Vite + TypeScript)

漫画ビューア風に、`縦（連続スクロール）` と `横（ページめくり）` を FAB で切り替えられる PDF ビューアです。  
目次と本のメタ情報は `public/book.json` から読み込みます（PDF outlineは不使用）。

## 依存パッケージ

- runtime
  - `pdfjs-dist`
  - `zustand`
  - `zod`
  - `@tanstack/react-virtual`
  - `embla-carousel-react`
  - `lucide-react`
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-scroll-area`
  - `@radix-ui/react-separator`
  - `@radix-ui/react-slot`
  - `@radix-ui/react-visually-hidden`
  - `class-variance-authority`
  - `clsx`
  - `tailwind-merge`
- dev
  - `tailwindcss`
  - `postcss`
  - `autoprefixer`
  - `tailwindcss-animate`

## 導入コマンド（bun）

```bash
# 1) 依存導入
bun install

# 2) Tailwind 初期化（既に設定済みプロジェクトなら不要）
bunx tailwindcss init -p

# 3) shadcn 初期化（既に設定済みプロジェクトなら不要）
bunx shadcn@latest init

# 4) 開発サーバー
bun run dev
```

## 起動手順

```bash
# 依存導入
bun install

# 開発サーバー
bun run dev

# 本番ビルド
bun run build
```

ブラウザで `http://localhost:5173` を開きます。

## ディレクトリ構成

```text
src/
  app/
    App.tsx
  features/
    book/
      bookStore.ts
      BookInfoDialog.tsx
    nav/
      NavPanel.tsx
      NavSheet.tsx
      TocList.tsx
      PageJump.tsx
    pdf/
      PdfProvider.tsx
      PageCanvas.tsx
    viewer/
      VerticalViewer.tsx
      HorizontalViewer.tsx
      viewerStore.ts
  shared/
    hooks/useMediaQuery.ts
    pdfjs/setup.ts
    utils/
      clamp.ts
      cn.ts
  components/ui/
    button.tsx
    input.tsx
    badge.tsx
    separator.tsx
    scroll-area.tsx
    dialog.tsx
    sheet.tsx
  styles/globals.css
public/
  book.json
  sample.pdf
```

## 設計の要点

- `goToPage(page)` を唯一のナビ導線に統一
  - 目次クリック
  - ページ番号入力
  - モード切替後の同期
  - すべて `goToPage` を経由
- `goToPage` で `1..numPages` に clamp
- 縦モード
  - `@tanstack/react-virtual` で仮想化
  - 表示中心に近いページを `currentPage` に反映
  - `goToPage` 時は `scrollToIndex` で移動
- 横モード
  - `embla-carousel-react` でスワイプ + スナップ
  - `goToPage` で `embla.scrollTo(index)`
  - 描画負荷軽減のため `current ± 2` のみ `PageCanvas` をマウント
- PDF.js worker 設定を一箇所に集約
  - `src/shared/pdfjs/setup.ts`
- 目次/本情報のデータ源
  - `public/book.json` を fetch + zod バリデーション + 正規化

## book.json フォーマット

`public/book.json` は次のような形式です（`table_of_contents` の `page` は 1 始まり）。

```json
{
  "title": "共生の思想",
  "authors": "藤原, 鎮男（著）",
  "publisher": "丸善出版",
  "publication_country": "日本",
  "language": "日本語",
  "publication_date": "2022/11",
  "page_count": "viii, 180p",
  "isbn": "9784621053133",
  "eisbn": "-",
  "genre": "理工学 > 自然科学 > 自然科学",
  "ndc_class": "404",
  "subject": "自然",
  "content_id": "3000000149",
  "downloadable_after_purchase": "可(60ページ)",
  "description": "...",
  "table_of_contents": [
    { "chapter": "表紙", "page": 1 },
    { "chapter": "目次", "page": 5 }
  ]
}
```

## 注意

- この実装は最小構成です。検索/注釈/ズームは未実装です。
- ただし `PageCanvas` は `scale` props を受け取り、後からズーム機能を拡張しやすくしています。
