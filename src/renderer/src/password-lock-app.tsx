import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock } from 'lucide-react'

const PasswordLock: React.FC = () => {
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')

  const unlock = async () => {
    // 简易本地密码（演示用，可自行加密存储）
    const saved = (await window.api.settings.get('lock.password')) || ''
    if (!saved) {
      // 未设置过密码，直接关闭
      window.api.close()
      return
    }
    if (pwd === saved) {
      window.api.unlock(pwd)
    } else {
      setErr('密码错误')
    }
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <Lock className="h-10 w-10 text-primary" />
      <h2 className="text-base font-semibold">已锁定</h2>
      <Input
        type="password"
        value={pwd}
        onChange={(e) => {
          setPwd(e.target.value)
          setErr('')
        }}
        onKeyDown={(e) => e.key === 'Enter' && unlock()}
        placeholder="输入密码解锁"
        className="w-56 text-center"
        autoFocus
      />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button size="sm" onClick={unlock}>
        解锁
      </Button>
    </div>
  )
}

export default PasswordLock
