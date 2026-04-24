'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { GlassCard, themes, Theme, useTheme } from '@/app/components/ui'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [theme, setTheme] = useState<Theme>(useTheme() ? 'dark' : 'light');
  const current = theme === useTheme().theme ? themes.light : themes.dark

  const passwordMatch = confirm.length > 0 && password !== confirm

  const inputStyle = {
    background: current.input.norm.background,
    border: current.input.norm.border,
    backdropFilter: current.glass.backdropFilter,
    color: current.input.norm.color,
  }

  async function handleSignUp() {
    if (passwordMatch || !email || !password || !name) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <GlassCard className="rounded-2xl space-y-6">

          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className={`text-2xl font-bold tracking-wide`}>PriceView</h1>
            <p className={`${current.invt} text-xs`}>Create your account</p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div className="relative">
              <input type="text" placeholder="Full Name" value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full px-4 py-3 pr-10 rounded-full ${current.invt} text-sm focus:outline-none transition`}
                style={inputStyle} />
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${current.invt} text-sm`}>👤</span>
            </div>
            <div className="relative">
              <input type="email" placeholder="Email ID" value={email}
                onChange={e => setEmail(e.target.value)}
                className={`w-full px-4 py-3 pr-10 rounded-full ${current.invt} text-sm focus:outline-none transition `}
                style={inputStyle} />
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-black text-sm `}>✉</span>
            </div>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full px-4 py-3 pr-10 rounded-full ${current.invt} text-sm  focus:outline-none transition`}
                style={inputStyle} />
              <button onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${current.invt} hover:${current.invt} transition text-sm `}>
                {showPassword ? '🔓' : '🔒'}
              </button>
            </div>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm Password" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={`w-full px-4 py-3 pr-10 rounded-full ${current.invt} text-sm focus:outline-none transition`}
                style={inputStyle}/>
              <button onClick={() => setShowConfirm(!showConfirm)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${current.invt} hover:${current.invt} transition text-sm `}>
                {showConfirm ? '🔓' : '🔒'}
              </button>
            </div>
            {passwordMatch && <p className={`${current.colored.red} text-xs pl-4`}>Passwords do not match</p>}
            {error && <p className={ `${current.colored.red} text-xs pl-4`}>{error}</p>}
          </div>

          {/* Sign Up Button */}
          <button onClick={handleSignUp} disabled={loading || passwordMatch}
            className="w-full py-3 rounded-full font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={current.button.login.norm}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className={`text-center text-xs ${current.invt}`}>
            Already have an account?{' '}
            <a href="/login" className={`${current.colored.blue} hover:${current.colored.blue}underline transition`}>Login</a>
          </p>

        </GlassCard>
      </div>
    </div>
  )
}