import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

const TeamTray: React.FC = () => {
  const [books, setBooks] = useState<any[]>([])

  useEffect(() => {
    window.api.getBooks().then(setBooks)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b px-4 py-3">
        <h1 className="text-sm font-semibold">最近阅读</h1>
      </header>
      <div className="flex-1 overflow-auto p-2">
        {books.length === 0 ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">暂无书籍</p>
        ) : (
          <div className="space-y-1">
            {books.slice(0, 20).map((b) => (
              <Card
                key={b.id}
                onClick={() => window.api.openBook(b.id)}
                className="flex cursor-pointer items-center gap-3 p-2 hover:bg-accent"
              >
                <div className="flex h-10 w-8 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                  {b.format?.slice(0, 3).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-medium">{b.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.progress > 0 ? `${Math.round(b.progress * 100)}%` : '未读'}
                  </p>
                </div>
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TeamTray
