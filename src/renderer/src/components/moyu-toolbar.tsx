import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Eye,
  EyeOff,
  EyeClosed,
  Droplet,
  Pin,
  PinOff,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  Library,
  Globe,
  X,
  ArrowLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ViewName = 'shelf' | 'reader' | 'settings' | 'web'

export interface ToolbarProps {
  view: ViewName
  onNavigate: (v: ViewName) => void
  // 仅 web 视图相关
  webTransparent?: boolean
  onWebTransparent?: (on: boolean) => void
  showWebTransparent?: boolean
  showVideoMute?: boolean
}

// 全局顶部摸鱼工具栏 —— 始终显示，可拖动窗口，含导航 + 摸鱼按钮
export const MoyuToolbar: React.FC<ToolbarProps> = ({
  view,
  onNavigate,
  webTransparent,
  onWebTransparent,
  showWebTransparent,
  showVideoMute
}) => {
  const [opacity, setOpacity] = useState(1)
  const [transparent, setTransparent] = useState(false)
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)
  const [miniMode, setMiniMode] = useState(false)
  const [muted, setMuted] = useState(false)
  const [showOpacityPanel, setShowOpacityPanel] = useState(false)
  const [hideOnMouseOut, setHideOnMouseOut] = useState(false)
  const opacityBtnRef = useRef<HTMLButtonElement>(null)
  const [opacityPopoverPos, setOpacityPopoverPos] = useState<{ top: number; right: number } | null>(null)

  // 打开透明度浮层时计算位置（fixed 定位，脱离 drag-region）
  useEffect(() => {
    if (showOpacityPanel && opacityBtnRef.current) {
      const r = opacityBtnRef.current.getBoundingClientRect()
      setOpacityPopoverPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    } else {
      setOpacityPopoverPos(null)
    }
  }, [showOpacityPanel])

  useEffect(() => {
    ;(async () => {
      const op = await window.api.window.getOpacity()
      setOpacity(op)
      setTransparent(op < 1)
      // 初始化时同步 transparent-mode class，确保透明效果生效
      document.body.classList.toggle('transparent-mode', op < 1)
      const top = await window.api.window.getAlwaysOnTop()
      setAlwaysOnTop(top)
    })()
  }, [])

  const applyOpacity = (v: number) => {
    setOpacity(v)
    window.api.window.setOpacity(v)
    // 透明模式下让 body 也透明，便于网页透明叠加
    document.body.classList.toggle('transparent-mode', v < 1)
  }

  const toggleTransparent = () => {
    const next = !transparent
    setTransparent(next)
    if (next) {
      applyOpacity(0.6)
    } else {
      applyOpacity(1)
      setShowOpacityPanel(false)
      setHideOnMouseOut(false)
      onWebTransparent?.(false)
    }
  }

  const toggleAlwaysOnTop = async () => {
    const next = !alwaysOnTop
    setAlwaysOnTop(next)
    await window.api.window.setAlwaysOnTop(next)
  }

  const toggleMini = async () => {
    if (!miniMode) {
      await window.api.window.enterMini()
      setMiniMode(true)
    } else {
      await window.api.window.exitMini()
      setMiniMode(false)
    }
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    document.dispatchEvent(new CustomEvent('moyu:mute', { detail: next }))
  }

  // 鼠标移出隐藏：隐藏整个窗口（含内容），鼠标移回原窗口区域恢复
  // 由主进程轮询鼠标位置实现恢复（隐藏后渲染进程不接收事件）
  const toolbarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!hideOnMouseOut) {
      // 关闭功能时确保窗口可见
      window.api.window.mouseHideOff()
    }
  }, [hideOnMouseOut])

  // 鼠标移出整个窗口 → 通知主进程隐藏
  useEffect(() => {
    if (!hideOnMouseOut) return
    const onMouseLeaveWindow = () => {
      window.api.window.mouseHideOn()
    }
    document.addEventListener('mouseleave', onMouseLeaveWindow)
    return () => document.removeEventListener('mouseleave', onMouseLeaveWindow)
  }, [hideOnMouseOut])

  const NavBtn: React.FC<{ v: ViewName; icon: React.ReactNode; title: string }> = ({ v: target, icon, title }) => (
    <Button
      variant={view === target ? 'secondary' : 'ghost'}
      size="icon"
      className="no-drag h-7 w-7"
      onClick={() => onNavigate(target)}
      title={title}
    >
      {icon}
    </Button>
  )

  return (
    <>
      <div
        ref={toolbarRef}
        className={cn(
          'relative flex items-center gap-1 border-b bg-background/95 px-2 py-1.5 backdrop-blur',
          miniMode && 'justify-center'
        )}
      >
        {/* 左侧导航 */}
        <div className="no-drag relative z-10 flex items-center gap-0.5">
          {view !== 'shelf' && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onNavigate('shelf')} title="返回书架">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          )}
          {!miniMode && (
            <>
              <NavBtn v="shelf" icon={<Library className="h-3.5 w-3.5" />} title="书架" />
              <NavBtn v="web" icon={<Globe className="h-3.5 w-3.5" />} title="网页" />
              <NavBtn v="settings" icon={<SettingsIcon className="h-3.5 w-3.5" />} title="设置" />
            </>
          )}
        </div>

        {/* 中间扩展区 —— 纯拖动手柄，撑满剩余空间 */}
        <div className="drag-region flex flex-1 items-center justify-center self-stretch" />

      {/* 右侧摸鱼按钮组 */}
      <div className="no-drag relative z-10 flex items-center gap-0.5">
        {/* 软件透明 */}
        <Button
          variant={transparent ? 'secondary' : 'ghost'}
          size="icon"
          className="h-7 w-7"
          onClick={toggleTransparent}
          title="软件透明"
        >
          {transparent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>

        {/* 网页透明（水滴按钮） */}
        {showWebTransparent && transparent && (
          <Button
            variant={webTransparent ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => onWebTransparent?.(!webTransparent)}
            title="网页透明"
          >
            <Droplet className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* 透明度调节：点击按钮在下方弹出浮层滑块 */}
        {transparent && (
          <div className="no-drag relative">
            <Button
              ref={opacityBtnRef}
              variant={showOpacityPanel ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowOpacityPanel((v) => !v)}
              title="调节透明度"
            >
              <span className="text-[10px] font-bold">{Math.round(opacity * 100)}</span>
            </Button>
            {showOpacityPanel && opacityPopoverPos && (
              <div
                className="no-drag fixed z-[99999] flex items-center gap-2 rounded-md border bg-popover p-2 shadow-lg"
                style={{
                  top: opacityPopoverPos.top,
                  right: opacityPopoverPos.right,
                  WebkitAppRegion: 'no-drag'
                } as any}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] text-muted-foreground">透明度</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={opacity}
                  onInput={(e) => applyOpacity(parseFloat((e.target as HTMLInputElement).value))}
                  onChange={(e) => applyOpacity(parseFloat(e.target.value))}
                  className="h-4 w-32 cursor-pointer accent-primary"
                  style={{ WebkitAppRegion: 'no-drag' } as any}
                />
                <span className="w-8 text-right text-[10px]">{Math.round(opacity * 100)}%</span>
              </div>
            )}
          </div>
        )}

        {/* 鼠标移出隐藏（始终可见，不依赖透明模式） */}
        <Button
          variant={hideOnMouseOut ? 'secondary' : 'ghost'}
          size="icon"
          className={cn('h-7 w-7', !hideOnMouseOut && 'text-muted-foreground', hideOnMouseOut && 'text-primary')}
          onClick={() => setHideOnMouseOut((v) => !v)}
          title="鼠标移出隐藏工具栏"
        >
          <EyeClosed className="h-3.5 w-3.5" />
        </Button>

        {/* 视频静音 */}
        {showVideoMute && (
          <Button variant={muted ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={toggleMute} title="静音">
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
        )}

        {/* 置顶 */}
        <Button
          variant={alwaysOnTop ? 'secondary' : 'ghost'}
          size="icon"
          className="h-7 w-7"
          onClick={toggleAlwaysOnTop}
          title="置顶"
        >
          {alwaysOnTop ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
        </Button>

        {/* 迷你模式 */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMini} title="迷你模式">
          {miniMode ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
        </Button>

        {/* 关闭到后台 */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.api.window.hide()} title="隐藏到后台">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      </div>
    </>
  )
}
