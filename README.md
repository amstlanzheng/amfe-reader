# AMFE Reader

基于墨鱼阅读架构的 Electron 阅读器，去除付费/登录限制功能。

## 功能特性

### 阅读功能
- **多格式支持**：TXT、EPUB、PDF
- **进度记忆**：自动保存阅读进度，重开继续
- **TXT 懒加载**：滚动到底自动加载下一段，翻页按视口滚动
- **目录跳转**：自动识别章节（第X章/Chapter X）
- **全文搜索**：支持搜索结果跳转
- **字体调节**：字号、行距、字体族

### 摸鱼功能
- **透明窗口**：可调节透明度（10%-100%）
- **老板键**：
  - `Alt+Z`：最小化/恢复（隐藏任务栏图标）
  - `Alt+X`：退到后台（只在托盘显示）
- **鼠标移出隐藏**：鼠标离开窗口自动隐藏，移回恢复
- **窗口置顶**：始终显示在其他窗口之上
- **迷你模式**：缩小窗口专注阅读

### 窗口管理
- **无边框透明窗口**：自定义标题栏
- **八方向缩放**：边缘/角点拖动调整窗口大小
- **可拖动标题栏**：顶部工具栏中间区域拖动
- **托盘图标**：最小化到托盘，单击恢复

### 网页浏览
- **内置 WebView**：浏览网页
- **浏览历史**：自动记录访问历史
- **网页透明**：网页模式独立透明控制

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **React 18** - UI 渲染
- **TypeScript** - 类型安全
- **Zustand** - 状态管理
- **Tailwind CSS** + **shadcn/ui** - UI 组件库
- **sql.js** - SQLite 数据库（纯 JS 实现）
- **foliate-js** - EPUB 解析
- **pdfjs-dist** - PDF 渲染
- **electron-vite** - 构建工具

## 项目结构

```
amfe-reader/
├── src/
│   ├── main/              # 主进程
│   │   ├── index.ts       # 入口，窗口/托盘/快捷键
│   │   ├── db.ts          # SQLite 数据库
│   │   ├── ipc/           # IPC 处理器
│   │   │   ├── library.ts # 书架管理
│   │   │   ├── browsing.ts# 浏览历史
│   │   │   ├── file.ts    # 文件读取
│   │   │   ├── settings.ts# 设置
│   │   │   └── ai.ts      # AI 接口
│   │   └── windows/       # 辅助窗口
│   ├── preload/           # 预加载脚本
│   │   └── index.ts       # IPC 桥接
│   └── renderer/          # 渲染进程
│       └── src/
│           ├── components/  # React 组件
│           │   ├── moyu-toolbar.tsx  # 全局摸鱼工具栏
│           │   ├── shelf.tsx         # 书架
│           │   ├── reader-view.tsx   # 阅读器
│           │   ├── web-view.tsx      # 网页浏览
│           │   ├── settings.tsx      # 设置
│           │   ├── resize-handles.tsx# 窗口缩放手柄
│           │   └── ui/               # 基础组件
│           ├── reader/      # 阅读引擎
│           │   ├── txt-reader.ts   # TXT（懒加载）
│           │   ├── epub-reader.ts  # EPUB
│           │   └── pdf-reader.ts   # PDF
│           ├── store/       # Zustand 状态
│           └── lib/         # 工具函数
├── resources/             # 图标资源
└── scripts/              # 图标生成脚本
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 打包
npm run build:win
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt+Z` | 老板键1：最小化/恢复 |
| `Alt+X` | 老板键2：退到后台 |
| `←` / `→` | 翻页 |
| `Space` | 下一页 |
| `Esc` | 返回/关闭面板 |

## License

MIT
