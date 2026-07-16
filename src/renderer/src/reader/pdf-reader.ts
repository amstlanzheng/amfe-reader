import type { ReaderInstance, TocItem, SearchResult } from './types'

// 基于 pdfjs-dist 的 PDF 阅读器封装
// 支持：滚轮缩放、拖动平移、翻页保持缩放、目录
export class PdfReader implements ReaderInstance {
  private container: HTMLElement | null = null
  private filePath: string
  private pdfDoc: any = null
  private currentPage = 1
  private numPages = 0
  private scale = 1.2
  private onProgressChange?: (p: number) => void
  private renderTask: any = null
  private fontFamily = 'system-ui'
  private lineHeight = 1.6
  private fontSize = 16
  private canvas: HTMLCanvasElement | null = null
  private dragging = false
  private dragStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 }
  private keepScaleOnPageTurn = true

  constructor(opts: { filePath: string; onProgressChange?: (p: number) => void }) {
    this.filePath = opts.filePath
    this.onProgressChange = opts.onProgressChange
  }

  async render(container: HTMLElement): Promise<void> {
    this.container = container
    container.innerHTML = ''
    container.style.height = '100%'
    container.style.overflow = 'auto'
    container.style.background = '#525659'
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.alignItems = 'center'
    container.style.padding = '16px'
    container.style.gap = '8px'
    container.style.cursor = 'grab'
    container.style.userSelect = 'none'

    // 设置 worker
    const pdfjs = await import('pdfjs-dist')
    // @ts-ignore - workerUrl 静态属性
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()

    const buf = await window.api.readBuffer(this.filePath)
    const loadingTask = pdfjs.getDocument({ data: buf.buffer })
    this.pdfDoc = await loadingTask.promise
    this.numPages = this.pdfDoc.numPages

    // 缩放（滚轮 + ctrl 才缩放，纯滚轮滚动；这里直接滚轮缩放，更符合墨鱼风格）
    container.addEventListener('wheel', this.onWheel, { passive: false })
    // 拖动
    container.addEventListener('mousedown', this.onMouseDown)
    container.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('mouseup', this.onMouseUp)

    await this.renderPage()
  }

  private onWheel = (e: WheelEvent) => {
    if (!this.container) return
    e.preventDefault()
    // 滚轮缩放
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newScale = Math.max(0.3, Math.min(6, this.scale + delta))
    if (newScale !== this.scale) {
      this.scale = newScale
      this.renderPage()
    }
  }

  private onMouseDown = (e: MouseEvent) => {
    if (!this.container) return
    this.dragging = true
    this.dragStart = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: this.container.scrollLeft,
      scrollTop: this.container.scrollTop
    }
    this.container.style.cursor = 'grabbing'
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.dragging || !this.container) return
    const dx = e.clientX - this.dragStart.x
    const dy = e.clientY - this.dragStart.y
    this.container.scrollLeft = this.dragStart.scrollLeft - dx
    this.container.scrollTop = this.dragStart.scrollTop - dy
  }

  private onMouseUp = () => {
    this.dragging = false
    if (this.container) this.container.style.cursor = 'grab'
  }

  private async renderPage(): Promise<void> {
    if (!this.container || !this.pdfDoc) return
    const canvas = this.container.querySelector('canvas') as HTMLCanvasElement | null
    if (canvas) canvas.remove()

    const page = await this.pdfDoc.getPage(this.currentPage)
    const viewport = page.getViewport({ scale: this.scale })
    const cv = document.createElement('canvas')
    const ctx = cv.getContext('2d')!
    cv.width = viewport.width
    cv.height = viewport.height
    cv.style.maxWidth = '100%'
    cv.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)'
    this.container.appendChild(cv)
    this.canvas = cv

    this.renderTask = page.render({ canvasContext: ctx, viewport })
    await this.renderTask.promise
    this.onProgressChange?.(this.currentPage / this.numPages)
  }

  next(): void {
    if (this.currentPage < this.numPages) {
      this.currentPage++
      // 翻页后回到顶部；keepScaleOnPageTurn 默认 true
      this.renderPage().then(() => {
        if (this.container) this.container.scrollTop = 0
      })
    }
  }
  prev(): void {
    if (this.currentPage > 1) {
      this.currentPage--
      this.renderPage().then(() => {
        if (this.container) this.container.scrollTop = 0
      })
    }
  }
  gotoProgress(p: number): void {
    const target = Math.max(1, Math.min(this.numPages, Math.ceil(p * this.numPages)))
    this.currentPage = target
    this.renderPage()
  }
  getProgress(): number {
    return this.numPages > 0 ? this.currentPage / this.numPages : 0
  }

  // PDF 目录：pdfjs 提供 getOutline
  async getToc(): Promise<TocItem[]> {
    if (!this.pdfDoc) return []
    try {
      const outline = await this.pdfDoc.getOutline()
      if (!outline) return []
      const out: TocItem[] = []
      const walk = (items: any[]) => {
        for (const it of items) {
          out.push({ label: it.title, href: it.dest })
          if (it.items?.length) walk(it.items)
        }
      }
      walk(outline)
      return out
    } catch {
      return []
    }
  }

  async gotoTocItem(item: TocItem): Promise<void> {
    if (!this.pdfDoc || !item.href) return
    try {
      const dest = typeof item.href === 'string' ? await this.pdfDoc.getDestination(item.href) : item.href
      if (dest) {
        const pageIdx = await this.pdfDoc.getPageIndex(dest[0])
        this.currentPage = pageIdx + 1
        await this.renderPage()
      }
    } catch {
      // ignore
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    // PDF 全文搜索：逐页文本提取并匹配（性能一般，仅做基础实现）
    if (!this.pdfDoc || !query) return []
    const results: SearchResult[] = []
    for (let i = 1; i <= this.numPages; i++) {
      const page = await this.pdfDoc.getPage(i)
      const tc = await page.getTextContent()
      const text = tc.items.map((it: any) => it.str).join('')
      const idx = text.indexOf(query)
      if (idx >= 0) {
        const start = Math.max(0, idx - 30)
        const end = Math.min(text.length, idx + query.length + 30)
        results.push({
          excerpt: (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : ''),
          progress: i / this.numPages
        })
      }
      if (results.length >= 100) break
    }
    return results
  }

  gotoSearchResult(r: SearchResult): void {
    this.gotoProgress(r.progress)
  }

  // PDF 是固定版式，字号/字体设置不影响内容
  setFontSize(): void {}
  setFontFamily(): void {}
  setLineHeight(): void {}

  destroy(): void {
    try {
      this.renderTask?.cancel?.()
    } catch {
      // ignore
    }
    if (this.container) {
      this.container.removeEventListener('wheel', this.onWheel)
      this.container.removeEventListener('mousedown', this.onMouseDown)
      this.container.removeEventListener('mousemove', this.onMouseMove)
      window.removeEventListener('mouseup', this.onMouseUp)
      this.container.innerHTML = ''
    }
    this.pdfDoc = null
    this.container = null
    this.canvas = null
  }
}
