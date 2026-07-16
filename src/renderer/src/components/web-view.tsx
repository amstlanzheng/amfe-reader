import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  ArrowLeft,
  ArrowRight,
  Star,
  StarOff,
  Smartphone,
  Monitor,
  RefreshCw,
  ImageOff,
  Image as ImageIcon,
  Play,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Scroll,
  Gauge,
  History,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WebViewProps {
  webTransparent: boolean
  onWebTransparentChange: (on: boolean) => void
}

const PRESETS = [
  { name: '微信读书', url: 'https://weread.qq.com' },
  { name: '番茄小说', url: 'https://fanqienovel.com' },
  { name: '粉笔网', url: 'https://www.fenbi.com' },
  { name: 'B站', url: 'https://www.bilibili.com' }
]

interface WebConfig {
  webTransparent: boolean
  mobileMode: boolean
  compatibility: boolean
  hideImages: boolean
  fontSize: number // 百分比
  textColor: string
  autoScroll: boolean
  scrollSpeed: number // 像素/秒
  wheelSpeed: number // 滚轮倍率
}

const DEFAULT_CONFIG: Omit<WebConfig, 'webTransparent'> = {
  mobileMode: false,
  compatibility: false,
  hideImages: false,
  fontSize: 100,
  textColor: '',
  autoScroll: false,
  scrollSpeed: 30,
  wheelSpeed: 1
}

// 注入到 webview 的控制脚本
function buildInjectScript(cfg: WebConfig): string {
  return `
  (function() {
    // 文字颜色
    if (cfg_textColor) {
      document.documentElement.style.color = cfg_textColor;
      document.body && (document.body.style.color = cfg_textColor);
    }
    // 字号
    document.documentElement.style.fontSize = cfg_fontSize + '%';
    // 隐藏图片
    if (cfg_hideImages) {
      var css = 'img,video,picture,canvas,svg{visibility:hidden!important}';
      var s = document.getElementById('__moyu_hide_img');
      if (!s) { s = document.createElement('style'); s.id = '__moyu_hide_img'; document.head.appendChild(s); }
      s.textContent = css;
    } else {
      var s2 = document.getElementById('__moyu_hide_img');
      if (s2) s2.textContent = '';
    }
    // 网页透明：把背景设为透明
    if (cfg_webTransparent) {
      document.documentElement.style.background = 'transparent';
      document.body && (document.body.style.background = 'transparent');
      var all = document.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        var st = getComputedStyle(el);
        if (st.backgroundColor !== 'rgba(0, 0, 0, 0)' && st.backgroundColor !== 'transparent') {
          el.style.background = 'transparent';
        }
      }
    }
  })();
  `.replace('cfg_textColor', JSON.stringify(cfg.textColor))
    .replace('cfg_fontSize', String(cfg.fontSize))
    .replace('cfg_hideImages', String(cfg.hideImages))
    .replace('cfg_webTransparent', String(cfg.webTransparent))
}

export const WebView: React.FC<WebViewProps> = ({ webTransparent, onWebTransparentChange }) => {
  const webviewRef = useRef<any>(null)
  const [url, setUrl] = useState('https://weread.qq.com')
  const [inputUrl, setInputUrl] = useState('https://weread.qq.com')
  const [config, setConfig] = useState<Omit<WebConfig, 'webTransparent'>>(DEFAULT_CONFIG)

  // 网页透明状态由全局工具栏控制，同步到本地 config 用于注入
  useEffect(() => {
    setConfig((c) => ({ ...c, webTransparent } as any))
  }, [webTransparent])
  const [showPanel, setShowPanel] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [bookmarks, setBookmarks] = useState<{ name: string; url: string }[]>([])
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [history, setHistory] = useState<{ id: number; url: string; title: string; visited_at: number }[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const autoScrollRef = useRef<number | null>(null)

  // 加载收藏 + 浏览历史
  useEffect(() => {
    ;(async () => {
      const saved = await window.api.settings.get('web.bookmarks')
      if (saved) {
        try {
          setBookmarks(JSON.parse(saved))
        } catch {
          // ignore
        }
      }
      const h = await window.api.browsing.list()
      setHistory(h)
    })()
  }, [])

  const refreshHistory = async () => {
    const h = await window.api.browsing.list()
    setHistory(h)
  }

  // 注入配置变化
  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return
    const inject = () => {
      try {
        wv.executeJavaScript(buildInjectScript(config))
      } catch {
        // ignore
      }
    }
    wv.addEventListener('dom-ready', inject)
    wv.addEventListener('did-finish-load', inject)
    // 即时注入
    inject()
    return () => {
      wv.removeEventListener('dom-ready', inject)
      wv.removeEventListener('did-finish-load', inject)
    }
  }, [config])

  // 自动滚动
  useEffect(() => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current)
      autoScrollRef.current = null
    }
    if (!config.autoScroll) return
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const wv = webviewRef.current
      if (wv) {
        try {
          wv.executeJavaScript(`window.scrollBy(0, ${config.scrollSpeed * dt})`)
        } catch {
          // ignore
        }
      }
      autoScrollRef.current = requestAnimationFrame(tick)
    }
    autoScrollRef.current = requestAnimationFrame(tick)
    return () => {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current)
    }
  }, [config.autoScroll, config.scrollSpeed])

  // 监听静音事件
  useEffect(() => {
    const onMute = (e: Event) => {
      const muted = (e as CustomEvent).detail
      const wv = webviewRef.current
      if (wv) {
        try {
          wv.setAudioMuted(muted)
        } catch {
          // ignore
        }
      }
    }
    document.addEventListener('moyu:mute', onMute)
    return () => document.removeEventListener('moyu:mute', onMute)
  }, [])

  const navigate = (target: string) => {
    let u = target.trim()
    if (!u) return
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u
    setUrl(u)
    setInputUrl(u)
    const wv = webviewRef.current
    if (wv) wv.src = u
    // 记录浏览历史
    window.api.browsing.visit(u, u).then(refreshHistory)
  }

  const onNavState = () => {
    const wv = webviewRef.current
    if (!wv) return
    setCanGoBack(wv.canGoBack?.() ?? false)
    setCanGoForward(wv.canGoForward?.() ?? false)
    // 页面加载完成后用真实标题更新历史
    try {
      const title = wv.getTitle?.() || ''
      if (title && url) {
        window.api.browsing.visit(url, title).then(refreshHistory)
      }
    } catch {
      // ignore
    }
  }

  const toggleBookmark = async () => {
    const exists = bookmarks.find((b) => b.url === url)
    let next: { name: string; url: string }[]
    if (exists) {
      next = bookmarks.filter((b) => b.url !== url)
    } else {
      const wv = webviewRef.current
      const title = wv?.getTitle?.() || url
      next = [...bookmarks, { name: title, url }]
    }
    setBookmarks(next)
    await window.api.settings.set('web.bookmarks', JSON.stringify(next))
  }

  // 保存当前站点配置
  const saveSiteConfig = async () => {
    const key = 'web.siteConfig.' + url
    await window.api.settings.set(key, JSON.stringify(config))
    alert('配置已保存，下次进入此网站可点击"应用"恢复')
  }
  const applySiteConfig = async () => {
    const key = 'web.siteConfig.' + url
    const saved = await window.api.settings.get(key)
    if (saved) {
      try {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) })
      } catch {
        // ignore
      }
    } else {
      alert('该网站未保存配置')
    }
  }

  const setCfg = <K extends keyof WebConfig>(k: K, v: WebConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v } as any))

  return (
    <div className="flex h-full flex-col">
      {/* 网址栏 */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => webviewRef.current?.goBack()}
          disabled={!canGoBack}
          title="后退"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => webviewRef.current?.goForward()}
          disabled={!canGoForward}
          title="前进"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => (webviewRef.current?.reload())}
          title="刷新"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && navigate(inputUrl)}
          placeholder="输入网址"
          className="h-7 flex-1 text-xs"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleBookmark}
          title={bookmarks.find((b) => b.url === url) ? '取消收藏' : '收藏'}
        >
          {bookmarks.find((b) => b.url === url) ? (
            <Star className="h-3.5 w-3.5 text-yellow-500" />
          ) : (
            <StarOff className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowBookmarks((v) => !v)}
          title="收藏夹"
        >
          <Star className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={showHistory ? 'secondary' : 'ghost'}
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowHistory((v) => !v)}
          title="浏览历史"
        >
          <History className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={showPanel ? 'secondary' : 'ghost'}
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowPanel((v) => !v)}
          title="设置"
        >
          <SettingsIcon className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 收藏夹 */}
      {showBookmarks && (
        <div className="border-b bg-muted/30 p-2">
          <div className="flex flex-wrap gap-1">
            {bookmarks.length === 0 ? (
              <span className="text-xs text-muted-foreground">暂无收藏</span>
            ) : (
              bookmarks.map((b) => (
                <button
                  key={b.url}
                  onClick={() => navigate(b.url)}
                  className="rounded bg-background px-2 py-1 text-xs hover:bg-accent"
                >
                  {b.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 浏览历史 */}
      {showHistory && (
        <div className="border-b bg-muted/30 p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">最近访问</span>
            <button
              onClick={async () => {
                await window.api.browsing.clear()
                refreshHistory()
              }}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> 清空
            </button>
          </div>
          <div className="max-h-40 overflow-auto">
            {history.length === 0 ? (
              <span className="text-xs text-muted-foreground">暂无历史</span>
            ) : (
              history.map((h) => (
                <div
                  key={h.id}
                  className="group flex items-center justify-between rounded bg-background px-2 py-1 text-xs hover:bg-accent"
                >
                  <button
                    onClick={() => navigate(h.url)}
                    className="flex min-w-0 flex-1 flex-col items-start"
                  >
                    <span className="truncate">{h.title || h.url}</span>
                    <span className="truncate text-[10px] text-muted-foreground">{h.url}</span>
                  </button>
                  <button
                    onClick={async () => {
                      await window.api.browsing.remove(h.id)
                      refreshHistory()
                    }}
                    className="ml-1 hidden text-muted-foreground hover:text-destructive group-hover:block"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 设置面板 */}
      {showPanel && (
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-3">
            {/* 手机模式 */}
            <div className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1.5">
              <span className="text-xs">手机模式</span>
              <Switch
                checked={config.mobileMode}
                onCheckedChange={(v) => {
                  setCfg('mobileMode', v)
                  const wv = webviewRef.current
                  if (wv) wv.setUserAgent?.(v ? MOBILE_UA : DESKTOP_UA)
                }}
              />
            </div>
            {/* 兼容模式 */}
            <div className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1.5">
              <span className="text-xs">兼容模式</span>
              <Switch checked={config.compatibility} onCheckedChange={(v) => setCfg('compatibility', v)} />
            </div>
            {/* 隐藏图片 */}
            <div className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1.5">
              <span className="text-xs">隐藏图片</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCfg('hideImages', !config.hideImages)}
              >
                {config.hideImages ? <ImageOff className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {/* 字号 */}
            <div className="flex items-center gap-2 rounded bg-background px-2 py-1.5">
              <span className="text-xs">字号</span>
              <Slider
                value={[config.fontSize]}
                min={50}
                max={200}
                step={10}
                onValueChange={(v) => setCfg('fontSize', v[0])}
                className="flex-1"
              />
              <span className="w-10 text-right text-[10px]">{config.fontSize}%</span>
            </div>
            {/* 文字颜色 */}
            <div className="flex items-center gap-2 rounded bg-background px-2 py-1.5">
              <span className="text-xs">文字色</span>
              <input
                type="color"
                value={config.textColor || '#000000'}
                onChange={(e) => setCfg('textColor', e.target.value)}
                className="h-6 w-8 cursor-pointer rounded border"
              />
              <button
                className="text-[10px] text-muted-foreground"
                onClick={() => setCfg('textColor', '')}
              >
                清除
              </button>
            </div>
            {/* 滚轮速度 */}
            <div className="flex items-center gap-2 rounded bg-background px-2 py-1.5">
              <Gauge className="h-3 w-3" />
              <span className="text-xs">滚轮</span>
              <Slider
                value={[config.wheelSpeed]}
                min={0.2}
                max={3}
                step={0.1}
                onValueChange={(v) => setCfg('wheelSpeed', v[0])}
                className="flex-1"
              />
              <span className="w-8 text-right text-[10px]">{config.wheelSpeed.toFixed(1)}x</span>
            </div>
            {/* 自动滚动 */}
            <div className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1.5">
              <Scroll className="h-3 w-3" />
              <span className="text-xs">自动滚动</span>
              <Switch checked={config.autoScroll} onCheckedChange={(v) => setCfg('autoScroll', v)} />
            </div>
            <div className="flex items-center gap-2 rounded bg-background px-2 py-1.5">
              <span className="text-xs">速度</span>
              <Slider
                value={[config.scrollSpeed]}
                min={10}
                max={200}
                step={5}
                onValueChange={(v) => setCfg('scrollSpeed', v[0])}
                className="flex-1"
              />
              <span className="w-10 text-right text-[10px]">{config.scrollSpeed}px/s</span>
            </div>
            {/* 保存/应用配置 */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={saveSiteConfig}>
                保存配置
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={applySiteConfig}>
                应用
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 预设站点 */}
      <div className="flex items-center gap-1 overflow-x-auto border-b px-2 py-1">
        {PRESETS.map((p) => (
          <button
            key={p.url}
            onClick={() => navigate(p.url)}
            className="whitespace-nowrap rounded px-2 py-1 text-xs hover:bg-accent"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* webview 容器 */}
      <div className="relative flex-1 overflow-hidden">
        <webview
          ref={webviewRef}
          src={url}
          className="h-full w-full"
          // 启用 webview，允许插件、禁用 nodeIntegrationInSubFrames
          // @ts-ignore - React 不识别 webview 属性
          allowpopups="true"
          // @ts-ignore
          webpreferences="contextIsolation=yes,nodeIntegration=no"
          onDidNavigate={onNavState}
          onDidNavigateInPage={onNavState}
        />
      </div>
    </div>
  )
}

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
