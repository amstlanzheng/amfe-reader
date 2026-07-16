import type { ReaderInstance, TocItem, SearchResult } from './types'

// TXT 阅读器：懒加载模式
// - 初始渲染一段内容（含缓冲区）
// - 滚动到底部时自动追加下一段
// - 滚动到顶部时自动向前加载（保留视口位置，避免跳动）
// - 翻页（next/prev）改为按视口高度滚动，到底/到顶时触发懒加载
export class TxtReader implements ReaderInstance {
  private text = ''
  private container: HTMLElement | null = null
  private scrollEl: HTMLElement | null = null
  private contentEl: HTMLElement | null = null
  // 已渲染的文本范围 [renderStart, renderEnd)
  private renderStart = 0
  private renderEnd = 0
  // 单次加载的字符数
  private chunkSize = 4000
  // 向前/向后保留的缓冲字符数
  private buffer = 2000
  private fontSize = 16
  private fontFamily = 'system-ui'
  private lineHeight = 1.6
  private onProgressChange?: (p: number) => void
  private tocCache: TocItem[] = []
  private scrollHandler: (() => void) | null = null
  // 防止 scrollTo 与 scroll 事件互相触发的标记
  private suspendScroll = false

  constructor(opts: { text: string; onProgressChange?: (p: number) => void }) {
    this.text = opts.text
    this.onProgressChange = opts.onProgressChange
  }

  async render(container: HTMLElement): Promise<void> {
    this.container = container
    container.innerHTML = ''
    container.style.height = '100%'
    container.style.overflow = 'hidden'
    container.style.padding = '0'
    container.style.userSelect = 'text'

    // 滚动容器
    const scrollEl = document.createElement('div')
    scrollEl.style.height = '100%'
    scrollEl.style.overflow = 'auto'
    scrollEl.style.padding = '24px 32px'
    scrollEl.style.fontSize = `${this.fontSize}px`
    scrollEl.style.fontFamily = this.fontFamily
    scrollEl.style.lineHeight = String(this.lineHeight)
    scrollEl.style.whiteSpace = 'pre-wrap'
    scrollEl.style.wordBreak = 'break-word'
    container.appendChild(scrollEl)

    // 内容元素（一个长文本节点）
    const contentEl = document.createElement('div')
    contentEl.style.minHeight = '100%'
    scrollEl.appendChild(contentEl)

    this.scrollEl = scrollEl
    this.contentEl = contentEl

    // 初始加载：从 renderStart 开始加载一个 chunk
    this.renderStart = 0
    this.renderEnd = Math.min(this.chunkSize, this.text.length)
    this.contentEl.textContent = this.text.slice(this.renderStart, this.renderEnd)
    this.buildToc()
    this.emitProgress()

    // 监听滚动事件实现懒加载
    this.scrollHandler = () => {
      if (this.suspendScroll) return
      const el = this.scrollEl
      if (!el) return
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      const nearTop = el.scrollTop < 80
      if (nearBottom && this.renderEnd < this.text.length) {
        this.loadMoreForward()
      } else if (nearTop && this.renderStart > 0) {
        this.loadMoreBackward()
      }
    }
    scrollEl.addEventListener('scroll', this.scrollHandler)
  }

  // 向后追加内容
  private loadMoreForward(): void {
    if (this.renderEnd >= this.text.length || !this.contentEl) return
    const oldScrollH = this.scrollEl!.scrollHeight
    const oldScrollTop = this.scrollEl!.scrollTop
    const append = this.text.slice(this.renderEnd, this.renderEnd + this.chunkSize)
    this.renderEnd = Math.min(this.renderEnd + this.chunkSize, this.text.length)
    this.contentEl.textContent = this.text.slice(this.renderStart, this.renderEnd)
    // 保持视觉位置（追加内容在下方，scrollHeight 增大，scrollTop 不变即可）
    this.scrollEl!.scrollTop = oldScrollTop
    // 若超过缓冲上限，尝试回收顶部（向前裁剪）
    this.trimTopIfNeeded(oldScrollH)
    this.emitProgress()
  }

  // 向前插入内容（保持视口位置）
  private loadMoreBackward(): void {
    if (this.renderStart <= 0 || !this.contentEl) return
    const oldScrollH = this.scrollEl!.scrollHeight
    const newStart = Math.max(0, this.renderStart - this.chunkSize)
    const inserted = this.renderStart - newStart
    this.renderStart = newStart
    this.contentEl.textContent = this.text.slice(this.renderStart, this.renderEnd)
    // 保持视口位置：内容在顶部插入了 inserted 字符，scrollHeight 增大
    this.suspendScroll = true
    this.scrollEl!.scrollTop = this.scrollEl!.scrollTop + (this.scrollEl!.scrollHeight - oldScrollH)
    requestAnimationFrame(() => {
      this.suspendScroll = false
    })
    // 回收底部
    this.trimBottomIfNeeded()
    this.emitProgress()
  }

  // 当向前已加载内容超过 buffer + 2*chunkSize 时，裁剪顶部
  private trimTopIfNeeded(oldScrollH: number): void {
    const rendered = this.renderEnd - this.renderStart
    if (rendered <= this.buffer + this.chunkSize * 2) return
    const trim = this.chunkSize
    this.renderStart += trim
    if (!this.contentEl || !this.scrollEl) return
    const beforeH = this.scrollEl.scrollHeight
    const beforeTop = this.scrollEl.scrollTop
    this.contentEl.textContent = this.text.slice(this.renderStart, this.renderEnd)
    // 顶部裁剪后内容变短，需要调整 scrollTop 保持视口
    this.suspendScroll = true
    this.scrollEl.scrollTop = Math.max(0, beforeTop - (beforeH - this.scrollEl.scrollHeight))
    requestAnimationFrame(() => {
      this.suspendScroll = false
    })
  }

  // 向后加载后若缓冲过大，裁剪底部
  private trimBottomIfNeeded(): void {
    const rendered = this.renderEnd - this.renderStart
    if (rendered <= this.buffer + this.chunkSize * 2) return
    const trim = this.chunkSize
    const beforeH = this.scrollEl!.scrollHeight
    const beforeTop = this.scrollEl!.scrollTop
    this.renderEnd -= trim
    if (!this.contentEl || !this.scrollEl) return
    this.contentEl.textContent = this.text.slice(this.renderStart, this.renderEnd)
    // 底部裁剪后 scrollHeight 减小，scrollTop 保持不变（若超出则浏览器自动夹紧）
    this.scrollEl.scrollTop = Math.min(beforeTop, this.scrollEl.scrollHeight)
  }

  private emitProgress(): void {
    const total = this.text.length
    if (total <= 0) {
      this.onProgressChange?.(0)
      return
    }
    // 进度按当前视口顶部对应的文本位置估算
    const top = this.renderStart + this.estimateVisibleCharOffset()
    this.onProgressChange?.(Math.min(1, top / total))
  }

  // 估算视口顶部对应的字符偏移（基于 scrollLeft/scrollTop 与已渲染内容比例）
  private estimateVisibleCharOffset(): number {
    if (!this.scrollEl || !this.contentEl) return 0
    const sh = this.scrollEl.scrollHeight
    if (sh <= 0) return 0
    const ratio = this.scrollEl.scrollTop / sh
    const rendered = this.renderEnd - this.renderStart
    return Math.floor(ratio * rendered)
  }

  // 翻页：按视口高度滚动一页
  // - 向后翻：到底部时触发懒加载；加载后仍在底部则继续滚动
  // - 向前翻：到顶部时触发懒加载
  next(): void {
    const el = this.scrollEl
    if (!el) return
    const pageH = el.clientHeight - 48 // 减去 padding
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
    if (remaining > 8) {
      // 还有内容可滚
      el.scrollBy({ top: pageH, behavior: 'smooth' })
    } else if (this.renderEnd < this.text.length) {
      // 到底了但还有未加载内容，加载后滚动
      this.loadMoreForward()
      requestAnimationFrame(() => {
        el.scrollBy({ top: el.clientHeight * 0.6, behavior: 'smooth' })
      })
    }
  }

  prev(): void {
    const el = this.scrollEl
    if (!el) return
    const pageH = el.clientHeight - 48
    if (el.scrollTop > 8) {
      el.scrollBy({ top: -pageH, behavior: 'smooth' })
    } else if (this.renderStart > 0) {
      // 到顶了但前面还有内容，加载后保持视口
      this.loadMoreBackward()
    }
  }

  gotoProgress(p: number): void {
    const target = Math.floor(Math.max(0, Math.min(1, p)) * this.text.length)
    // 重新加载目标位置附近的内容
    this.renderStart = Math.max(0, target - this.chunkSize)
    this.renderEnd = Math.min(this.text.length, this.renderStart + this.chunkSize * 2)
    if (!this.contentEl || !this.scrollEl) return
    this.contentEl.textContent = this.text.slice(this.renderStart, this.renderEnd)
    // 滚动到目标位置
    this.suspendScroll = true
    this.scrollEl.scrollTop = 0
    requestAnimationFrame(() => {
      if (!this.scrollEl) return
      // 估算目标 scrollTop
      const sh = this.scrollEl.scrollHeight
      const rendered = this.renderEnd - this.renderStart
      const offsetInRendered = target - this.renderStart
      const ratio = rendered > 0 ? offsetInRendered / rendered : 0
      this.scrollEl.scrollTop = ratio * sh
      this.suspendScroll = false
      this.emitProgress()
    })
  }

  getProgress(): number {
    if (this.text.length <= 0) return 0
    const top = this.renderStart + this.estimateVisibleCharOffset()
    return Math.min(1, top / this.text.length)
  }

  async getToc(): Promise<TocItem[]> {
    return this.tocCache
  }

  gotoTocItem(item: TocItem): void {
    if (typeof item.index === 'number') {
      this.gotoProgress(item.index / this.text.length)
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!query) return []
    const results: SearchResult[] = []
    const lower = this.text.toLowerCase()
    const q = query.toLowerCase()
    let pos = 0
    let count = 0
    while (count < 200) {
      const idx = lower.indexOf(q, pos)
      if (idx === -1) break
      const start = Math.max(0, idx - 30)
      const end = Math.min(this.text.length, idx + q.length + 30)
      const excerpt =
        (start > 0 ? '…' : '') + this.text.slice(start, end) + (end < this.text.length ? '…' : '')
      results.push({ excerpt, progress: idx / this.text.length })
      pos = idx + q.length
      count++
    }
    return results
  }

  gotoSearchResult(r: SearchResult): void {
    this.gotoProgress(r.progress)
  }

  setFontSize(px: number): void {
    this.fontSize = px
    if (this.scrollEl) this.scrollEl.style.fontSize = `${px}px`
  }

  setFontFamily(family: string): void {
    this.fontFamily = family
    if (this.scrollEl) this.scrollEl.style.fontFamily = family
  }

  setLineHeight(h: number): void {
    this.lineHeight = h
    if (this.scrollEl) this.scrollEl.style.lineHeight = String(h)
  }

  destroy(): void {
    if (this.scrollHandler && this.scrollEl) {
      this.scrollEl.removeEventListener('scroll', this.scrollHandler)
    }
    this.scrollHandler = null
    if (this.container) this.container.innerHTML = ''
    this.container = null
    this.scrollEl = null
    this.contentEl = null
    this.text = ''
  }

  // 简易目录：识别"第X章" / "Chapter X" / 数字标题
  private buildToc(): void {
    const items: TocItem[] = []
    const regex =
      /第[一二三四五六七八九十百千零\d]+[章节回卷集部篇]|[Cc]hapter\s+\d+|^[ \t]*\d+[、.．]\s*.+$/gm
    let m: RegExpExecArray | null
    while ((m = regex.exec(this.text)) !== null) {
      const lineStart = this.text.lastIndexOf('\n', m.index) + 1
      const lineEnd = this.text.indexOf('\n', m.index)
      const label = this.text.slice(lineStart, lineEnd === -1 ? m.index + 40 : lineEnd).trim()
      if (label.length > 0 && label.length < 50) {
        items.push({ label, index: lineStart })
      }
    }
    this.tocCache = items.slice(0, 500)
  }
}
