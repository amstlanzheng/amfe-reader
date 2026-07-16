import React, { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Library, Plus, BookOpen, Trash2 } from 'lucide-react'
import { detectFormat } from '@/reader/types'
import type { BookItem } from '@/store'

interface ShelfProps {
  onOpenBook: (b: BookItem) => void
}

export const Shelf: React.FC<ShelfProps> = ({ onOpenBook }) => {
  const { books, loadBooks } = useStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  const refresh = async () => {
    setLoading(true)
    try {
      await loadBooks()
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    const paths = await window.api.openFilePicker()
    if (!paths || paths.length === 0) return
    for (const p of paths) {
      const stat = await window.api.fileStat(p)
      const fmt = detectFormat(stat.ext)
      if (!fmt) continue
      let title = stat.name
      let author: string | undefined
      if (fmt === 'epub') {
        try {
          const meta = await window.api.readEpub(p)
          title = meta.title || title
          author = meta.author
        } catch {
          // ignore
        }
      }
      await window.api.library.add({
        title,
        author,
        format: fmt,
        file_path: p,
        file_size: stat.size,
        added_at: Date.now(),
        progress: 0
      })
    }
    refresh()
  }

  const handleRemove = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    await window.api.library.remove(id)
    refresh()
  }

  const formatTime = (t?: number) => {
    if (!t) return '未读'
    const d = new Date(t)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="flex h-full flex-col">
      {/* 次级操作行（顶部摸鱼工具栏已在 App 全局渲染） */}
      <header className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">书架</h1>
          <span className="text-[10px] text-muted-foreground">AMFE Reader</span>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4" /> 添加书籍
        </Button>
      </header>

      {/* 书籍网格 */}
      <main className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">加载中…</div>
        ) : books.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <BookOpen className="h-12 w-12 opacity-30" />
            <p>书架空空如也</p>
            <Button onClick={handleAdd} variant="outline">
              <Plus className="h-4 w-4" /> 添加第一本书
            </Button>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(120px, 14vw, 240px), 1fr))' }}
          >
            {books.map((b) => (
              <Card
                key={b.id}
                onClick={() => onOpenBook(b)}
                className="group relative cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                style={{ containerType: 'inline-size' }}
              >
                <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30">
                  <span className="font-bold uppercase text-primary/60" style={{ fontSize: 'clamp(1.5rem, 18cqw, 3rem)' }}>
                    {b.format}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 font-medium" title={b.title} style={{ fontSize: 'clamp(0.8rem, 5cqw, 0.95rem)' }}>
                    {b.title}
                  </h3>
                  {b.author && (
                    <p className="mt-1 truncate text-muted-foreground" style={{ fontSize: 'clamp(0.65rem, 3.5cqw, 0.75rem)' }}>
                      {b.author}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-muted-foreground" style={{ fontSize: 'clamp(0.6rem, 3cqw, 0.7rem)' }}>
                    <span>{formatTime(b.last_read_at)}</span>
                    {b.progress > 0 && <span>{Math.round(b.progress * 100)}%</span>}
                  </div>
                </div>
                <button
                  onClick={(e) => handleRemove(e, b.id!)}
                  className="absolute right-1 top-1 hidden rounded-md bg-background/80 p-1 text-muted-foreground hover:text-destructive group-hover:block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
