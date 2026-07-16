import { ipcMain } from 'electron'
import { getDb, persist } from '../db'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function all(sql: string, params: any[] = []): any[] {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

// 不做任何登录限制：用户在设置里填入自己的 API Key 即可使用
export function registerAiHandlers(): void {
  ipcMain.handle('ai:chat', async (_evt, opts: { messages: ChatMessage[] }) => {
    const providerRow = all("SELECT value FROM settings WHERE key = 'ai.provider'")[0] as
      | { value: string }
      | undefined
    const keyRow = all("SELECT value FROM settings WHERE key = 'ai.apiKey'")[0] as
      | { value: string }
      | undefined
    const modelRow = all("SELECT value FROM settings WHERE key = 'ai.model'")[0] as
      | { value: string }
      | undefined

    const provider = providerRow?.value || 'deepseek'
    const apiKey = keyRow?.value
    const model = modelRow?.value || 'deepseek-chat'

    if (!apiKey) {
      throw new Error('未配置 API Key，请在设置中填入你自己的 DeepSeek 或豆包 API Key')
    }

    const endpoints: Record<string, string> = {
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      doubao: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
    }
    const url = endpoints[provider] || endpoints.deepseek

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages: opts.messages, stream: false })
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`AI 接口请求失败 (${resp.status}): ${errText}`)
    }

    const data = (await resp.json()) as any
    const content = data?.choices?.[0]?.message?.content || ''

    // 持久化到本地历史
    const db = getDb()
    db.run('INSERT INTO ai_history (role, content, created_at) VALUES (?, ?, ?)', [
      'user',
      opts.messages[opts.messages.length - 1]?.content || '',
      Date.now()
    ])
    db.run('INSERT INTO ai_history (role, content, created_at) VALUES (?, ?, ?)', [
      'assistant',
      content,
      Date.now()
    ])
    persist()

    return content
  })

  ipcMain.handle('ai:history', async () => {
    return all('SELECT * FROM ai_history ORDER BY created_at ASC LIMIT 200')
  })

  ipcMain.handle('ai:clearHistory', async () => {
    getDb().run('DELETE FROM ai_history')
    persist()
    return true
  })
}
