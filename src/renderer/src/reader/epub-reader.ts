import type { ReaderInstance, TocItem, SearchResult } from './types'

// 基于 foliate-js 的 EPUB 阅读器封装
// foliate-js 通过自定义元素 <foliate-view> 提供 EPUB 渲染
export class EpubReader implements ReaderInstance {
  private view: any = null
  private container: HTMLElement | null = null
  private filePath: string
  private onProgressChange?: (p: number) => void
  private fontSize = 16
  private fontFamily = 'system-ui'
  private lineHeight = 1.6

  constructor(opts: { filePath: string; onProgressChange?: (p: number) => void }) {
    this.filePath = opts.filePath
    this.onProgressChange = opts.onProgressChange
  }

  async render(container: HTMLElement): Promise<void> {
    this.container = container
    container.innerHTML = ''
    container.style.height = '100%'
    container.style.overflow = 'hidden'

    // foliate-js 通过 customElements.define 注册 <foliate-view>，需要先导入模块
    await import('foliate-js/view.js')

    const view = document.createElement('foliate-view') as any
    container.appendChild(view)
    this.view = view

    view.addEventListener('relocate', (e: any) => {
      const fraction = e?.detail?.fraction ?? 0
      this.onProgressChange?.(fraction)
    })

    // 通过主进程读取文件 buffer，构造 File 传入（避免 file:// CSP 限制）
    const { buffer } = await window.api.readBuffer(this.filePath)
    const file = new File([buffer], 'book.epub', { type: 'application/epub+zip' })
    await view.open(file)
    this.applyStyles()
  }

  private applyStyles(): void {
    if (!this.view) return
    try {
      this.view.renderer.setStyles?.(
        `:root { --font-size: ${this.fontSize}px; --font-family: ${this.fontFamily}; --line-height: ${this.lineHeight}; }`
      )
    } catch {
      // 部分版本 API 不同，忽略
    }
  }

  next(): void {
    this.view?.next?.()
  }
  prev(): void {
    this.view?.prev?.()
  }
  gotoProgress(p: number): void {
    this.view?.goToFraction?.(p)
  }
  getProgress(): number {
    return 0
  }

  // 目录：foliate-js 的 view.book.toc 是树结构，扁平化
  async getToc(): Promise<TocItem[]> {
    if (!this.view?.book?.toc) return []
    const out: TocItem[] = []
    const walk = (items: any[]) => {
      for (const it of items) {
        out.push({ label: it.label || it.title || '', href: it.href })
        if (it.subitems?.length) walk(it.subitems)
      }
    }
    walk(this.view.book.toc)
    return out
  }

  gotoTocItem(item: TocItem): void {
    if (item.href) this.view?.goTo?.(item.href)
  }

  // 搜索：foliate-js 的 view.search 返回异步迭代结果
  async search(query: string): Promise<SearchResult[]> {
    if (!this.view?.search || !query) return []
    const results: SearchResult[] = []
    try {
      for await (const r of this.view.search(query)) {
        // r 形如 { cfi, excerpt, progress }
        results.push({
          excerpt: (r.excerptBefore || '') + '<b>' + query + '</b>' + (r.excerptAfter || ''),
          progress: r.progress ?? 0,
          cfi: r.cfi
        })
        if (results.length >= 200) break
      }
    } catch {
      // 旧版 API 不支持迭代
    }
    return results
  }

  gotoSearchResult(r: SearchResult): void {
    if (r.cfi) this.view?.goTo?.(r.cfi)
  }

  setFontSize(px: number): void {
    this.fontSize = px
    this.applyStyles()
  }
  setFontFamily(family: string): void {
    this.fontFamily = family
    this.applyStyles()
  }
  setLineHeight(h: number): void {
    this.lineHeight = h
    this.applyStyles()
  }
  destroy(): void {
    try {
      this.view?.close?.()
    } catch {
      // ignore
    }
    if (this.container) this.container.innerHTML = ''
    this.view = null
    this.container = null
  }
}
