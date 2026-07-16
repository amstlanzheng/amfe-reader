import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Trash2, X } from 'lucide-react'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

export const AiPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api.ai.history().then((rows: any[]) => {
      if (rows.length > 0) {
        setMessages(rows.map((r) => ({ role: r.role, content: r.content })))
      }
    })
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const next: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const reply = await window.api.ai.chat(
        next.map((m) => ({ role: m.role, content: m.content }))
      )
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e: any) {
      setMessages([...next, { role: 'assistant', content: '出错: ' + (e?.message || e) }])
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    await window.api.ai.clearHistory()
    setMessages([])
  }

  return (
    <div className="absolute right-0 top-0 flex h-full w-80 flex-col border-l bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">AI 对话</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={clearHistory} title="清空历史">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto p-3">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            询问关于内容的任何问题。<br />需在设置中填入自己的 API Key。
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
              m.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'mr-auto bg-muted'
            }`}
          >
            <div className="whitespace-pre-wrap break-words">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            思考中…
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t p-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="输入问题…"
          disabled={loading}
        />
        <Button size="icon" onClick={send} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
