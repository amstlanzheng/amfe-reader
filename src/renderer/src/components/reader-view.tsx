import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  ChevronLeft,
  ChevronRight,
  Type,
  MessageSquare,
  List,
  Search as SearchIcon,
  Clock,
  X
} from 'lucide-react'
import type { BookItem } from '@/store'
import type { ReaderInstance } from '@/reader/types'
import { TxtReader } from '@/reader/txt-reader'
import { EpubReader } from '@/reader/epub-reader'
import { PdfReader } from '@/reader/pdf-reader'
import { AiPanel } from './ai-panel'
import { TocPanel, SearchPanel, AutoPagePanel } from './reader-panels'

interface ReaderViewProps {
  book: BookItem
  onBack: () => void
}

type Panel = 'none' | 'font' | 'ai' | 'toc' | 'search' | 'autopage'

export const ReaderView: React.FC<ReaderViewProps> = ({ book, onBack }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const readerRef = useRef<ReaderInstance | null>(null)
  const [progress, setProgress] = useState(book.progress || 0)
  const [panel, setPanel] = useState<Panel>('none')
  const [error, setError] = useState<string | null>(null)
  const { fontSize, fontFamily, lineHeight, setFontSize, setFontFamily, setLineHeight, shortcuts } =
    useStore()

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (!containerRef.current) return
      setError(null)
      try {
        let reader: ReaderInstance
        if (book.format === 'txt') {
          const { text } = await window.api.readTxt(book.file_path)
          reader = new TxtReader({ text, onProgressChange: (p) => setProgress(p) })
        } else if (book.format === 'epub') {
          reader = new EpubReader({
            filePath: book.file_path,
            onProgressChange: (p) => setProgress(p)
          })
        } else if (book.format === 'pdf') {
          reader = new PdfReader({
            filePath: book.file_path,
            onProgressChange: (p) => setProgress(p)
          })
        } else {
          throw new Error('不支持的格式: ' + book.format)
        }
        await reader.render(containerRef.current)
        reader.setFontSize(fontSize)
        reader.setFontFamily(fontFamily)
        reader.setLineHeight(lineHeight)
        // 恢复上次阅读进度
        const savedProgress = book.progress || 0
        if (savedProgress > 0) {
          try {
            reader.gotoProgress(savedProgress)
            setProgress(savedProgress)
          } catch {
            // ignore
          }
        }
        if (!cancelled) readerRef.current = reader
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e))
      }
    }
    init()
    return () => {
      cancelled = true
      readerRef.current?.destroy()
      readerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id])

  // 进度变化时持久化
  useEffect(() => {
    const t = setTimeout(() => {
      if (book.id && progress > 0) {
        window.api.library.updateProgress({ id: book.id, progress })
      }
    }, 800)
    return () => clearTimeout(t)
  }, [progress, book.id])

  // 自定义快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 构造加速键字符串
      const parts: string[] = []
      if (e.ctrlKey) parts.push('Control')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      if (e.metaKey) parts.push('Meta')
      const key = e.key
      parts.push(key.length === 1 ? key.toUpperCase() : key)
      const accel = parts.join('+')

      if (accel === shortcuts.next || key === shortcuts.next) {
        readerRef.current?.next()
        e.preventDefault()
      } else if (accel === shortcuts.prev || key === shortcuts.prev) {
        readerRef.current?.prev()
        e.preventDefault()
      } else if (key === 'Escape') {
        if (panel !== 'none') setPanel('none')
        else onBack()
      } else if (key === ' ') {
        // 空格翻页
        readerRef.current?.next()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack, panel, shortcuts])

  // 鼠标移出隐藏底部工具栏
  const footerRef = useRef<HTMLDivElement>(null)
  const [autoHideFooter, setAutoHideFooter] = useState(false)
  const [footerHidden, setFooterHidden] = useState(false)
  useEffect(() => {
    if (!autoHideFooter) {
      setFooterHidden(false)
      return
    }
    const onMove = (e: MouseEvent) => {
      const el = footerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const inside = e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6
      setFooterHidden(!inside)
    }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [autoHideFooter])

  return (
    <div className="flex h-full flex-col">
      {/* 字体面板 */}
      {panel === 'font' && (
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-20 text-xs text-muted-foreground">字号</span>
              <Slider
                value={[fontSize]}
                min={12}
                max={28}
                step={1}
                onValueChange={(v) => {
                  setFontSize(v[0])
                  readerRef.current?.setFontSize(v[0])
                }}
                className="flex-1"
              />
              <span className="w-8 text-right text-xs">{fontSize}px</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-20 text-xs text-muted-foreground">行距</span>
              <Slider
                value={[lineHeight]}
                min={1.2}
                max={2.4}
                step={0.1}
                onValueChange={(v) => {
                  setLineHeight(v[0])
                  readerRef.current?.setLineHeight(v[0])
                }}
                className="flex-1"
              />
              <span className="w-8 text-right text-xs">{lineHeight.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-20 text-xs text-muted-foreground">字体</span>
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={fontFamily}
                onChange={(e) => {
                  setFontFamily(e.target.value)
                  readerRef.current?.setFontFamily(e.target.value)
                }}
              >
                <option value="system-ui">系统默认</option>
                <option value="serif">衬线</option>
                <option value="sans-serif">无衬线</option>
                <option value="monospace">等宽</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 阅读内容区 */}
      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
            <p className="text-destructive">打开失败</p>
            <p className="text-xs">{error}</p>
          </div>
        ) : (
          <div ref={containerRef} className="h-full" />
        )}

        {panel === 'ai' && <AiPanel onClose={() => setPanel('none')} />}
        {panel === 'toc' && (
          <TocPanel reader={readerRef.current} onClose={() => setPanel('none')} />
        )}
        {panel === 'search' && (
          <SearchPanel reader={readerRef.current} onClose={() => setPanel('none')} />
        )}
        {panel === 'autopage' && (
          <AutoPagePanel reader={readerRef.current} onClose={() => setPanel('none')} />
        )}
      </div>

      {/* 底部翻页栏 */}
      <footer
        ref={footerRef}
        className={`flex items-center justify-between border-t px-4 py-2 transition-opacity ${
          footerHidden ? 'pointer-events-none opacity-0' : ''
        }`}
      >
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => readerRef.current?.prev()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => readerRef.current?.next()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={panel === 'toc' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setPanel(panel === 'toc' ? 'none' : 'toc')}
            title="目录"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={panel === 'search' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setPanel(panel === 'search' ? 'none' : 'search')}
            title="搜索"
          >
            <SearchIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={panel === 'autopage' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setPanel(panel === 'autopage' ? 'none' : 'autopage')}
            title="自动翻页"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant={panel === 'font' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setPanel(panel === 'font' ? 'none' : 'font')}
            title="字体"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant={panel === 'ai' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setPanel(panel === 'ai' ? 'none' : 'ai')}
            title="AI"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{Math.round(progress * 100)}%</span>
          <button
            onClick={() => setAutoHideFooter((v) => !v)}
            className={`rounded p-1 text-xs ${autoHideFooter ? 'text-primary' : 'text-muted-foreground'}`}
            title="鼠标移出隐藏工具栏"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </footer>
    </div>
  )
}
