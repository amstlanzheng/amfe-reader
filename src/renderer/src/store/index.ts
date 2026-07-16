import { create } from 'zustand'

export interface BookItem {
  id: number
  title: string
  author?: string
  format: string
  file_path: string
  cover?: string
  file_size?: number
  added_at: number
  last_read_at?: number
  progress: number
  cfi?: string
  chapter?: string
}

type Theme = 'light' | 'dark'

interface AppState {
  books: BookItem[]
  currentBook: BookItem | null
  theme: Theme
  fontFamily: string
  fontSize: number
  lineHeight: number
  loading: boolean
  // 阅读快捷键（用户自定义）
  shortcuts: {
    next: string
    prev: string
    boss1: string
    boss2: string
  }

  setBooks: (b: BookItem[]) => void
  setCurrentBook: (b: BookItem | null) => void
  setTheme: (t: Theme) => void
  setFontFamily: (f: string) => void
  setFontSize: (n: number) => void
  setLineHeight: (n: number) => void
  setLoading: (b: boolean) => void
  setShortcuts: (s: Partial<AppState['shortcuts']>) => void
  loadBooks: () => Promise<void>
}

export const useStore = create<AppState>((set) => ({
  books: [],
  currentBook: null,
  theme: 'light',
  fontFamily: 'system-ui',
  fontSize: 16,
  lineHeight: 1.6,
  loading: false,
  shortcuts: {
    next: 'ArrowRight',
    prev: 'ArrowLeft',
    boss1: 'Alt+Z',
    boss2: 'Alt+X'
  },

  setBooks: (books) => set({ books }),
  setCurrentBook: (currentBook) => set({ currentBook }),
  setTheme: (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    set({ theme })
  },
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setFontSize: (fontSize) => set({ fontSize }),
  setLineHeight: (lineHeight) => set({ lineHeight }),
  setLoading: (loading) => set({ loading }),
  setShortcuts: (s) => set((state) => ({ shortcuts: { ...state.shortcuts, ...s } })),
  loadBooks: async () => {
    set({ loading: true })
    try {
      const books = await window.api.library.list()
      set({ books })
    } finally {
      set({ loading: false })
    }
  }
}))
