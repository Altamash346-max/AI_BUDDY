import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export const ThemeProvider = ({ children }) => {
  // 'dark' | 'light'
  const [colorMode, setColorMode] = useState(
    () => localStorage.getItem('aibuddy-color-mode') || 'dark'
  )
  // 'rounded' | 'sharp'
  const [shapeMode, setShapeMode] = useState(
    () => localStorage.getItem('aibuddy-shape-mode') || 'rounded'
  )

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-color-mode', colorMode)
    root.setAttribute('data-shape-mode', shapeMode)
    localStorage.setItem('aibuddy-color-mode', colorMode)
    localStorage.setItem('aibuddy-shape-mode', shapeMode)
  }, [colorMode, shapeMode])

  const toggleColorMode = () =>
    setColorMode(m => (m === 'dark' ? 'light' : 'dark'))

  const toggleShapeMode = () =>
    setShapeMode(m => (m === 'rounded' ? 'sharp' : 'rounded'))

  return (
    <ThemeContext.Provider value={{ colorMode, shapeMode, toggleColorMode, toggleShapeMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
