// 阅读引擎统一适配：txt / epub / pdf
// 由 React 组件根据 format 选择对应 Reader 实现

export type ReadFormat = 'txt' | 'epub' | 'pdf'

export interface TocItem {
  label: string
  href?: string
  index?: number // 用于 txt/pdf 的章节索引
}

export interface SearchResult {
  excerpt: string
  progress: number // 跳转到的进度 0-1
  cfi?: string
}

export interface ReaderInstance {
  render(container: HTMLElement): Promise<void>
  next(): void
  prev(): void
  gotoProgress(p: number): void
  getProgress(): number
  setFontSize(px: number): void
  setFontFamily(family: string): void
  setLineHeight(h: number): void
  // 目录
  getToc?(): Promise<TocItem[]>
  gotoTocItem?(item: TocItem): void
  // 全文搜索
  search?(query: string): Promise<SearchResult[]>
  gotoSearchResult?(r: SearchResult): void
  destroy(): void
}

export function detectFormat(ext: string): ReadFormat | null {
  const e = ext.toLowerCase()
  if (e === 'txt') return 'txt'
  if (e === 'epub') return 'epub'
  if (e === 'pdf') return 'pdf'
  return null
}
