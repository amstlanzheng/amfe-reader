import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Check } from 'lucide-react'
import { useStore } from '@/store'

interface SettingsProps {
  onBack: () => void
}

// 监听一次按键，返回加速键字符串
function captureKey(): Promise<string> {
  return new Promise((resolve) => {
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      window.removeEventListener('keydown', onKey, true)
      if (e.key === 'Escape') {
        resolve('')
        return
      }
      const parts: string[] = []
      if (e.ctrlKey) parts.push('Control')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      if (e.metaKey) parts.push('Meta')
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(k)) parts.push(k)
      resolve(parts.join('+'))
    }
    window.addEventListener('keydown', onKey, true)
  })
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const { theme, setTheme, fontSize, fontFamily, lineHeight, setFontSize, setFontFamily, setLineHeight, shortcuts, setShortcuts } =
    useStore()
  const [aiProvider, setAiProvider] = useState('deepseek')
  const [aiKey, setAiKey] = useState('')
  const [aiModel, setAiModel] = useState('deepseek-chat')
  const [bgColor1, setBgColor1] = useState('#ffffff')
  const [bgColor2, setBgColor2] = useState('#f0f0f0')
  const [saved, setSaved] = useState(false)
  const [capturing, setCapturing] = useState<null | 'next' | 'prev' | 'boss1' | 'boss2'>(null)

  useEffect(() => {
    ;(async () => {
      const all = await window.api.settings.getAll()
      if (all['ai.provider']) setAiProvider(all['ai.provider'])
      if (all['ai.apiKey']) setAiKey(all['ai.apiKey'])
      if (all['ai.model']) setAiModel(all['ai.model'])
      if (all['theme']) setTheme(all['theme'] as 'light' | 'dark')
      if (all['fontFamily']) setFontFamily(all['fontFamily'])
      if (all['fontSize']) setFontSize(Number(all['fontSize']))
      if (all['lineHeight']) setLineHeight(Number(all['lineHeight']))
      if (all['bg.color1']) setBgColor1(all['bg.color1'])
      if (all['bg.color2']) setBgColor2(all['bg.color2'])
      const boss = await window.api.shortcut.getBoss()
      setShortcuts({ boss1: boss.boss1, boss2: boss.boss2 })
      if (all['shortcut.next']) setShortcuts({ next: all['shortcut.next'] })
      if (all['shortcut.prev']) setShortcuts({ prev: all['shortcut.prev'] })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const capture = async (which: 'next' | 'prev' | 'boss1' | 'boss2') => {
    setCapturing(which)
    const k = await captureKey()
    setCapturing(null)
    if (!k) return
    setShortcuts({ [which]: k } as any)
  }

  const save = async () => {
    await window.api.settings.set('ai.provider', aiProvider)
    await window.api.settings.set('ai.apiKey', aiKey)
    await window.api.settings.set('ai.model', aiModel)
    await window.api.settings.set('theme', theme)
    await window.api.settings.set('fontFamily', fontFamily)
    await window.api.settings.set('fontSize', String(fontSize))
    await window.api.settings.set('lineHeight', String(lineHeight))
    await window.api.settings.set('bg.color1', bgColor1)
    await window.api.settings.set('bg.color2', bgColor2)
    await window.api.settings.set('shortcut.next', shortcuts.next)
    await window.api.settings.set('shortcut.prev', shortcuts.prev)
    await window.api.shortcut.setBoss(1, shortcuts.boss1)
    await window.api.shortcut.setBoss(2, shortcuts.boss2)
    // 应用背景色
    document.body.style.background = `linear-gradient(135deg, ${bgColor1}, ${bgColor2})`
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 py-2">
        <h1 className="text-sm font-semibold">设置</h1>
        <Button size="sm" onClick={save}>
          {saved ? <Check className="h-4 w-4" /> : null}
          {saved ? '已保存' : '保存'}
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* 外观 */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">外观</h2>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">深色模式</span>
              <Switch checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">字号</span>
              <span className="text-sm text-muted-foreground">{fontSize}px</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">行距</span>
              <span className="text-sm text-muted-foreground">{lineHeight.toFixed(1)}</span>
            </div>
          </Card>

          {/* 自定义背景 */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">自定义背景（渐变色）</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">起始</label>
                <input
                  type="color"
                  value={bgColor1}
                  onChange={(e) => setBgColor1(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">结束</label>
                <input
                  type="color"
                  value={bgColor2}
                  onChange={(e) => setBgColor2(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border"
                />
              </div>
              <div
                className="h-8 flex-1 rounded border"
                style={{ background: `linear-gradient(135deg, ${bgColor1}, ${bgColor2})` }}
              />
            </div>
          </Card>

          {/* 快捷键 */}
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">快捷键</h2>
            <p className="mb-4 text-xs text-muted-foreground">点击按钮后按下组合键，Esc 取消</p>
            <div className="space-y-3">
              {([
                { key: 'next', label: '下一页' },
                { key: 'prev', label: '上一页' },
                { key: 'boss1', label: '老板键1（最小化/恢复）' },
                { key: 'boss2', label: '老板键2（隐藏到后台）' }
              ] as const).map((row) => (
                <div key={row.key} className="flex items-center justify-between">
                  <span className="text-sm">{row.label}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-[140px]"
                    onClick={() => capture(row.key)}
                  >
                    {capturing === row.key ? '按下组合键…' : (shortcuts as any)[row.key] || '未设置'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* AI 配置 */}
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">AI 配置</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              填入你自己的 API Key 即可使用，无需登录、无任何账户限制。
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">服务商</label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={aiProvider}
                  onChange={(e) => {
                    setAiProvider(e.target.value)
                    setAiModel(e.target.value === 'deepseek' ? 'deepseek-chat' : '')
                  }}
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="doubao">豆包（火山方舟）</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">API Key</label>
                <Input
                  type="password"
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">模型 ID</label>
                <Input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder={aiProvider === 'deepseek' ? 'deepseek-chat' : 'ep-xxx'}
                />
              </div>
            </div>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            AMFE Reader · 本地优先 · 无登录 · 无付费限制
          </p>
        </div>
      </main>
    </div>
  )
}
