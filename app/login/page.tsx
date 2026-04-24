'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { GlassCard, Theme, themes, useTheme } from '@/app/components/ui'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [theme, setTheme] = useState<Theme>(useTheme() ? 'dark' : 'light');
  const current = theme === useTheme().theme ? themes.light : themes.dark

  const inputStyle = {
    background: current.input.norm.background,
    border: current.input.norm.border,
    backdropFilter: current.glass.backdropFilter,
    color: current.input.norm.color,
  }

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <GlassCard className="rounded-2xl space-y-6">

          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-wide">PriceView</h1>
            <p className={`text-xs ${current.invt}`}>Sign in to your account</p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div className="relative">
              <input type="email" placeholder="Email ID" value={email}
                onChange={e => setEmail(e.target.value)}
                className={`w-full px-4 py-3 pr-10 rounded-full text-sm focus:outline-none transition`}
                style={inputStyle} 
              />
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-black text-sm`}>✉</span>
            </div>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full px-4 py-3 pr-10 rounded-full text-sm focus:outline-none transition`}
                style={inputStyle} 
              />
              <button onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${current.text} hover:text-white/60 transition text-sm`}>
                {showPassword ? '🔓' : '🔒'}
              </button>
            </div>
            {error && <p className={`text-center font-bold ${current.colored.red} text-xs pl-4`}>{error}</p>}
          </div>

          {/* Remember + Forgot */}
          <div className="flex justify-between items-center text-xs">
            <label className={`flex items-center gap-2 ${current.invt} cursor-pointer select-none`}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                className="accent-blue-500 w-3 h-3" />
              Remember me
            </label>
            <a href="#" className={`${current.colored.blue} hover:text-${current.colored.blue}/80 transition`}>Forgot Password?</a>
          </div>

          {/* Login Button */}
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: current.button.login.norm.background, color: current.button.login.norm.color }}
            onMouseEnter={e => (
              e.currentTarget.style.background = current.button.login.hover.background,
              e.currentTarget.style.color = current.button.login.hover.color,
              e.currentTarget.style.borderColor = current.button.login.hover.border,
              e.currentTarget.style.cursor = "pointer" 
            )}
            onMouseLeave={e => (
              e.currentTarget.style.background = current.button.login.norm.background,
              e.currentTarget.style.color = current.button.login.norm.color
              )}>
            {loading ? 'Signing in...' : 'Login'}
          </button>

          <p className={`text-center text-xs ${current.invt} cursor-pointer`}>
            Don't have an account?{' '}
            <a href="/signup" className={`${current.colored.blue} hover:${current.colored.blue}/80 underline transition`}>Register</a>
          </p>

        </GlassCard>
      </div>
    </div>
  )
}