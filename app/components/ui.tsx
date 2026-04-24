'use client'
import { get } from 'http'
import { features } from 'process'
import React, { useEffect, useState, createContext, useContext } from 'react'

/*THEME SETUP*/

export type Theme = 'light' | 'dark'


export const themes = {
  light: {
    invt:'text-black',
    text: 'text-white',
    subText: 'text-white/50',
    mutedText: 'text-white/30',
    glass: {
      background: 'rgba(235,235,235,0.05)',
      border: '1px solid rgba(0,0,0,0.3)',
      backdropFilter: 'blur(12px)',
      color:'#fff',
    },
    input:{
      norm:{background: 'rgba(255,255,255,1)', border: '1px solid rgba(0,0,0,0.5)', color: '#000'},
      focus:{border: '1px solid rgba(0,0,0,0.1)', focus: '1px solid rgba(0,122,255,1)', color: '#000'},
    },
    colored: {
      green: 'text-green-600',
      red: 'text-red-500',
      blue: 'text-blue-500',
      purple: 'text-purple-500',
      orange: 'text-orange-500',
    },
    button: {
      solid: { background: '#2563eb', color: '#fff' },
      outline: {
        background: 'transparent',
        border: '1px solid rgba(255,255,255,1)',
        color: '#fff',
      },
      login:{
        norm: {background: '#007AFF', color: '#fff' },
        hover: {background: '#fff', color:'#007AFF', border: '5px solid rgba(0,122,255,1)'},
        input:{border: '1px solid rgba(0,0,0,0.1)', focus: '1px solid rgba(0,122,255,1)'}
      },
      ghost: {
        background: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.7)',
      },
      features: {
        background: '#0f0f0f',
      },
    },
    filter:{
      active: {background:'transparent', borderColor: '#007AFF', color:'#007AFF'},
      inactive: 'bg-transparent border border-transparent text-black cursor-pointer hover:border-black/40 hover:text-black'
      // inactive: {background: 'transparent', border: '1px solid transparent', color: '#fff', cursor: 'pointer', hover:{borderColor: 'rgba(255,255,255,0.4)', color: 'rgba(255,255,255,1)'}},
    },
    table:{
      hover:{background: 'rgba(0,0,0,0.1)'}
    },
  },

  dark: {
    invt:'text-white',
    text: 'text-black',
    subText: 'text-white-500',
    mutedText: 'text-black-400',
    glass: {
      background: 'rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.3)',
      backdropFilter: 'blur(12px)',
      color:'#000',
    },
    input:{
      norm:{background: 'rgba(255,255,255,1)', border: '1px solid rgba(0,0,0,0.5)', color: '#000'},
      focus:{border: '1px solid rgba(0,0,0,0.1)', focus: '1px solid rgba(0,122,255,1)', color: '#000'},
    },
    colored: {
      green: 'text-green-600',
      red: 'text-red-500',
      blue: 'text-blue-500',
      purple: 'text-purple-500',
      orange: 'text-orange-500',
    },
    button: {
      solid: { background: '#2563eb', color: '#fff' },
      outline: {
        background: '#fff',
        border: '1px solid rgba(37,99,235,1)',
        color: '#2563eb',
      },
      login:{
        norm: {background: '#007AFF', color: '#fff' },
        hover: {background: '#fff', color:'#007AFF', border: '5px solid rgba(0,122,255,1)'}
      },
      ghost: {
        background: 'rgba(0,0,0,0.05)',
        color: '#333',
      },
      features: {
        background: '#ffffff',
      }, 
    },
    filter:{
      active: {background:'transparent', borderColor: '#007AFF', color:'#007AFF'},
      inactive: 'bg-transparent border border-transparent text-white cursor-pointer hover:border-white/40 hover:text-white'
      // inactive: {background: 'transparent', border: '1px solid transparent', color: '#fff', cursor: 'pointer', hover:{borderColor: 'rgba(255,255,255,0.4)', color: 'rgba(255,255,255,1)'}},
    },
    table:{
      hover:{background: 'rgba(0,0,0,0.5)'}
    },
  },
}

/*CONTEXT*/

const ThemeContext = createContext<
{
theme: Theme
  toggle: () => void
}
>({
  theme: themes ? 'dark' : 'light',
  toggle: () => {},
})

console.log('Current Theme:', ThemeContext); // Debugging line

export function ThemeWrapper({children}:{children: React.ReactNode}){
  const {theme} = useTheme();
  const background = 
    theme === 'light' ? "#0e0e0e" : "#ffffff";

    return (
      <div 
        style={{
          minHeight: "100vh",
          background,
          transition: "background 0.3s ease",
        }}
        className={`${`+theme+`}`}
      >
        {children}
      </div>
    );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  const toggle = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  // ✅ Apply theme + save to localStorage
  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("dark", theme === "dark");

    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

// export const useTheme = () => useContext(ThemeContext);

/*COMPONENTS*/

// Glass Card
export function GlassCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const { theme } = useTheme()
  const current = themes[theme]

  return (
    <div
      className={`p-4 rounded-lg ${current.text} ${className}`}
      style={current.glass}
    >
      {children}
    </div>
  )
}

// Stat Card
export function StatCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string
  value: string
  sub?: string
  subColor?: string
}) {
  const { theme } = useTheme()
  const current = themes[theme]

  return (
    <GlassCard>
      <p className={`text-xs ${current.subText}`}>{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && (
        <p className={`text-xs mt-1 ${subColor ?? current.subText}`}>
          {sub}
        </p>
      )}
    </GlassCard>
  )
}

// Section Card
export function SectionCard({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <GlassCard className={className}>
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      {children}
    </GlassCard>
  )
}

// Button
export function Button({
  children,
  href,
  onClick,
  variant = 'solid',
  disabled = false,
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: 'solid' | 'outline' | 'ghost'
  disabled?: boolean
}) {
  const { theme } = useTheme()
  const styles = themes[theme].button[variant]

  const base =
    'px-6 py-2 rounded font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed'

  if (href) {
    return (
      <a href={href} className={base} style={styles}>
        {children}
      </a>
    )
  }

  return (
    <button onClick={onClick} disabled={disabled} className={base} style={styles}>
      {children}
    </button>
  )
}

// Theme Toggle Button
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  
  return (

    <button onClick={toggle} className="p-2 rounded-lg backdrop-blur hover:bg-white/10 transition">
      <div className={`w-6 h-6 flex items-center justify-center transform transition-transform duration-500 ${theme === "dark" ? "rotate-0" : "rotate-360"}`}>
        {theme === "dark" ? (<span className="text-white text-lg leading-none">☀︎</span>) : (
          <span className="text-white text-lg leading-none">⏾</span>)}
      </div>
    </button>

    // <Button onClick={toggle} variant="ghost">
    //   {theme === 'dark' ? '☀ Light Mode' : '🌙 Dark Mode'}
    // </Button>
  )
}

// Coming Soon
export function ComingSoon({
  label = 'Coming Soon',
  description,
}: {
  label?: string
  description?: string
}) {
  const { theme } = useTheme()
  const current = themes[theme]

  return (
    <div
      className="flex flex-col items-center justify-center py-8 rounded-lg gap-2"
      style={{
        border:
          theme === 'dark'
            ? '1px dashed rgba(255,255,255,0.1)'
            : '1px dashed rgba(0,0,0,0.1)',
      }}
    >
      <p className="text-2xl">TBA</p>
      <p className={`text-sm font-semibold tracking-widest uppercase ${current.subText}`}>
        {label}
      </p>
      {description && (
        <p className={`text-xs text-center max-w-xs ${current.mutedText}`}>
          {description}
        </p>
      )}
    </div>
  )
}

// Empty State
export function EmptyState({ message }: { message: string }) {
  const { theme } = useTheme()
  const current = themes[theme]

  return (
    <div className="flex items-center justify-center h-64">
      <p className={`text-sm ${current.mutedText}`}>{message}</p>
    </div>
  )
}

// News Item
export function NewsItem({
  headline,
  summary,
  datetime,
  url,
  source,
}: {
  headline: string
  summary?: string
  datetime: number
  url: string
  source: string
}) {
  const { theme } = useTheme()
  const current = themes[theme]

  function formatTime(datetime: number) {
    const diff = Date.now() - datetime * 1000
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block pl-3 py-2 rounded-lg hover:opacity-80 transition-opacity"
      style={{
        border:
          theme === 'dark'
            ? '1px solid rgba(99,160,255,0.3)'
            : '1px solid rgba(0,0,0,0.1)',
        borderLeft:
          theme === 'dark'
            ? '2px solid rgba(99,160,255,0.8)'
            : '2px solid #2563eb',
        background:
          theme === 'dark'
            ? current.button.features.background
            : current.button.features.background,
      }}
    >
      <p className={`text-xs ${current.subText}`}>
        {formatTime(datetime)} · {source}
      </p>
      <p className={`font-semibold text-sm ${current.text}`}>
        {headline}
      </p>
      {summary && (
        <p className={`text-xs mt-1 line-clamp-2 ${current.subText}`}>
          {summary}
        </p>
      )}
    </a>
  )
}

// Loading
export function LoadingPulse({
  message = 'Loading...',
}: {
  message?: string
}) {
  const { theme } = useTheme()
  const current = themes[theme]

  return (
    <p className={`text-sm animate-pulse ${current.subText}`}>
      {message}
    </p>
  )
}

