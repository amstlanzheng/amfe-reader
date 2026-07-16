// 生成 AMFE Reader 图标 —— 紫蓝渐变字母 A
// 运行: node scripts/generate-icons.mjs
// 依赖: 无（使用纯 SVG 字符串 + 内置工具）

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const resDir = join(root, 'resources')
mkdirSync(resDir, { recursive: true })

// SVG 图标定义：紫蓝渐变背景圆角矩形 + 白色字母 A
const createSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
    <linearGradient id="letter" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E0E7FF"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="56" fill="url(#bg)"/>
  <text x="128" y="180" font-family="Segoe UI, Arial, sans-serif" font-size="160" font-weight="900" fill="url(#letter)" text-anchor="middle">A</text>
</svg>`

// 托盘图标 SVG：更小的 A + 透明背景
const createTraySvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="url(#bg)"/>
  <text x="16" y="23" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" text-anchor="middle">A</text>
</svg>`

// 保存 SVG（作为矢量源）
writeFileSync(join(resDir, 'icon.svg'), createSvg(256))
writeFileSync(join(resDir, 'tray.svg'), createTraySvg(32))

// 由于无 sharp/canvas，生成一个简单的 ICO 头 + PNG 数据的占位方案不可行。
// 改为：直接保存 SVG，主进程用 nativeImage.createFromPath 加载 SVG（Electron 支持）。
// 对于 electron-builder 打包，需要 PNG/ICO，这里用 PowerShell 转换。

console.log('SVG 图标已生成:')
console.log('  resources/icon.svg')
console.log('  resources/tray.svg')
console.log('请运行 convert-icons.ps1 转换为 PNG/ICO')
