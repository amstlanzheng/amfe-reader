import React, { useEffect, useRef } from 'react'

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

// 透明无边框窗口的自实现 resize 手柄
// 8 个边缘/角点，鼠标按下后通过 IPC 调整窗口 bounds
export const ResizeHandles: React.FC = () => {
  const dragRef = useRef<{ edge: Edge; startX: number; startY: number; startBounds: any } | null>(null)

  useEffect(() => {
    const onMouseMove = async (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      e.preventDefault()
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      let { x, y, width, height } = d.startBounds

      const MIN_W = 240
      const MIN_H = 160

      // 根据 edge 计算新 bounds
      if (d.edge.includes('e')) width = Math.max(MIN_W, d.startBounds.width + dx)
      if (d.edge.includes('s')) height = Math.max(MIN_H, d.startBounds.height + dy)
      if (d.edge.includes('w')) {
        const newW = Math.max(MIN_W, d.startBounds.width - dx)
        x = d.startBounds.x + (d.startBounds.width - newW)
        width = newW
      }
      if (d.edge.includes('n')) {
        const newH = Math.max(MIN_H, d.startBounds.height - dy)
        y = d.startBounds.y + (d.startBounds.height - newH)
        height = newH
      }

      await window.api.window.setBounds({ x, y, width, height })
    }
    const onMouseUp = () => {
      dragRef.current = null
      document.body.style.cursor = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const startDrag = async (edge: Edge, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const bounds = await window.api.window.getBounds()
    if (!bounds) return
    dragRef.current = { edge, startX: e.clientX, startY: e.clientY, startBounds: bounds }
  }

  const edges: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
  return (
    <>
      {edges.map((edge) => (
        <div
          key={edge}
          className={`resize-handle ${edge}`}
          onMouseDown={(e) => startDrag(edge, e)}
        />
      ))}
    </>
  )
}
