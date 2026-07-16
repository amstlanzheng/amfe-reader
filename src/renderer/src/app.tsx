import React, { useEffect, useState } from 'react'
import { Shelf } from '@/components/shelf'
import { ReaderView } from '@/components/reader-view'
import { Settings } from '@/components/settings'
import { WebView } from '@/components/web-view'
import { MoyuToolbar, type ViewName } from '@/components/moyu-toolbar'
import { ResizeHandles } from '@/components/resize-handles'
import type { BookItem } from '@/store'
import { useStore } from '@/store'

const App: React.FC = () => {
  const [view, setView] = useState<ViewName>('shelf')
  const [current, setCurrent] = useState<BookItem | null>(null)
  // 网页透明状态提升到全局，供工具栏与 web-view 共享
  const [webTransparent, setWebTransparent] = useState(false)
  const { theme } = useStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // 应用保存的渐变背景
  useEffect(() => {
    ;(async () => {
      const all = await window.api.settings.getAll()
      const c1 = all['bg.color1']
      const c2 = all['bg.color2']
      if (c1 && c2) {
        document.body.style.background = `linear-gradient(135deg, ${c1}, ${c2})`
      }
    })()
  }, [])

  const navigate = (v: ViewName) => {
    setView(v)
  }

  return (
    <div className="flex h-screen flex-col">
      {/* 全局摸鱼工具栏 —— 所有视图始终显示 */}
      <MoyuToolbar
        view={view}
        onNavigate={navigate}
        webTransparent={webTransparent}
        onWebTransparent={setWebTransparent}
        showWebTransparent={view === 'web'}
        showVideoMute={view === 'web'}
      />

      {/* 视图内容区 */}
      <div className="relative flex-1 overflow-hidden">
        {view === 'shelf' && (
          <Shelf
            onOpenBook={(b) => {
              setCurrent(b)
              setView('reader')
            }}
          />
        )}
        {view === 'reader' && current && <ReaderView book={current} onBack={() => setView('shelf')} />}
        {view === 'settings' && <Settings onBack={() => setView('shelf')} />}
        {view === 'web' && (
          <WebView
            webTransparent={webTransparent}
            onWebTransparentChange={setWebTransparent}
          />
        )}
      </div>

      {/* 窗口 resize 手柄（透明无边框窗口自实现） */}
      <ResizeHandles />
    </div>
  )
}

export default App
