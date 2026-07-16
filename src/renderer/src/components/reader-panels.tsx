import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { List, Search as SearchIcon, Clock, Play, Pause, X } from 'lucide-react'
import type { TocItem, SearchResult, ReaderInstance } from '@/reader/types'
import { cn } from '@/lib/utils'

interface ReaderPanelsProps {
  reader: ReaderInstance | null
  onClose: () => void
}

export const TocPanel: React.FC<ReaderPanelsProps> = ({ reader, onClose }) => {
  const [items, setItems] = useState<TocItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      if (reader?.getToc) {
        const r = await reader.getToc()
        setItems(r)
      }
      setLoading(false)
    })()
  }, [reader])

  return (
    <div className="absolute right-0 top-0 flex h-full w-72 flex-col border-l bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <List className="h-3.5 w-3.5" /> 目录
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">加载中…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">无目录</p>
        ) : (
          items.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                reader?.gotoTocItem?.(it)
                onClose()
              }}
              className="block w-full truncate rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
              title={it.label}
            >
              {it.label}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export const SearchPanel: React.FC<ReaderPanelsProps> = ({ reader, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = async () => {
    if (!reader?.search || !query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const r = await reader.search(query.trim())
      setResults(r)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute right-0 top-0 flex h-full w-80 flex-col border-l bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <SearchIcon className="h-3.5 w-3.5" /> 搜索
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="border-b p-2">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="输入关键词…"
            className="h-8 text-xs"
          />
          <Button size="sm" className="h-8" onClick={doSearch} disabled={loading || !query.trim()}>
            搜
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">搜索中…</p>
        ) : searched && results.length === 0 ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">无结果</p>
        ) : (
          results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                reader?.gotoSearchResult?.(r)
                onClose()
              }}
              className="mb-1 block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              <span
                className="line-clamp-2 text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: r.excerpt.replace(/<b>/g, '<b class="text-primary">') }}
              />
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export const AutoPagePanel: React.FC<{
  reader: ReaderInstance | null
  onClose: () => void
}> = ({ reader, onClose }) => {
  const [enabled, setEnabled] = useState(false)
  const [interval, setIntervalSec] = useState(5)

  useEffect(() => {
    if (!enabled) return
    const t = setInterval(() => reader?.next(), interval * 1000)
    return () => clearInterval(t)
  }, [enabled, interval, reader])

  return (
    <div className="absolute right-0 top-0 flex h-full w-64 flex-col border-l bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Clock className="h-3.5 w-3.5" /> 自动翻页
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-4 p-4">
        <button
          onClick={() => setEnabled((v) => !v)}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-medium',
            enabled ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          )}
        >
          {enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {enabled ? '暂停' : '开始'}
        </button>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">间隔（秒）</label>
          <Input
            type="number"
            min={1}
            max={120}
            value={interval}
            onChange={(e) => setIntervalSec(Math.max(1, Number(e.target.value) || 5))}
            className="h-8 text-xs"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">每隔指定秒数自动翻下一页</p>
      </div>
    </div>
  )
}
