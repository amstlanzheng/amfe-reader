import { ipcMain } from 'electron'
import { readFile } from 'fs/promises'
import { basename, extname } from 'path'
import { existsSync } from 'fs'
import * as chardet from 'chardet'
import * as iconv from 'iconv-lite'

export function registerFileHandlers(): void {
  // 读取 txt 文件，自动检测编码并转换为 UTF-8
  ipcMain.handle('file:readTxt', async (_evt, filePath: string) => {
    const buf = await readFile(filePath)
    const encoding = chardet.detect(buf) || 'utf-8'
    const text = iconv.decode(buf, encoding)
    return { text, encoding, name: basename(filePath) }
  })

  // 读取 epub 元数据
  ipcMain.handle('file:readEpub', async (_evt, filePath: string) => {
    const epub = await import('epub2')
    const book = await epub.loadAsync(filePath)
    const metadata = {
      title: book.metadata?.title || basename(filePath, extname(filePath)),
      author: book.metadata?.creator,
      description: book.metadata?.description,
      publisher: book.metadata?.publisher
    }
    return metadata
  })

  // 读取任意文件 Buffer（用于渲染进程 pdfjs 解析）
  ipcMain.handle('file:readBuffer', async (_evt, filePath: string) => {
    if (!existsSync(filePath)) throw new Error('文件不存在')
    const buf = await readFile(filePath)
    return { buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }
  })

  // 文件信息
  ipcMain.handle('file:stat', async (_evt, filePath: string) => {
    const { stat } = await import('fs/promises')
    const s = await stat(filePath)
    return {
      name: basename(filePath),
      size: s.size,
      ext: extname(filePath).slice(1).toLowerCase()
    }
  })
}
