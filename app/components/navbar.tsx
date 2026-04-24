"use client"

import { ThemeToggle } from '@/app/components/ui'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function Navbar() {
  const router = useRouter()
  const [loggedIn, setLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-black backdrop-blur shadow" style={{ zIndex: 50, position: 'sticky', top: 0 }}>
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">

        {/* Logo */} {/*click logo navigate to main dashboard page */}
        <div>
          <a href="/dashboard" className="text-2xl font-bold text-white">PriceView</a>
        </div>

        <div className="relative">
        {/* ALWAYS visible navbar */}
        <nav className="flex gap-2 items-center">
          <a href="/" className="p-2 text-white hover:bg-white/10 text-sm"
          >Home</a>

          {loggedIn ? (
          <button onClick={handleLogout} className="p-2 text-white hover:bg-white/10 hover:text-red-400 transition text-sm"
          >Logout</button>
          ) : (
          <a href="/login" className="p-2 text-white hover:bg-white/10 text-sm"
          >Login</a>
          )}
          <ThemeToggle />

          <button onClick={() => setMenuOpen(menuOpen ? false : true)} className="flex flex-col gap-1.5 p-1 hover:bg-white/10" aria-label="Open menu">
            <span className="block w-5 h-0.5 bg-white rounded" />
            <span className="block w-5 h-0.5 bg-white rounded" />
            <span className="block w-5 h-0.5 bg-white rounded" />
          </button>

        </nav>
        {loggedIn ? (
        <div>
          {/* Dropdown (separate layer) */}
          {menuOpen && (
            <div className="absolute top-14 right-0 bg-black rounded-b-lg p-4 flex flex-col gap-4 z-50 shadow-lg">
              <a href="/dashboard" onClick={() => setMenuOpen(false)} className="p-2 text-white hover:bg-white/10 text-sm"
              >Dashboard</a>

              <a href="/details" onClick={() => setMenuOpen(false)} className="p-2 text-white hover:bg-white/10 text-sm"
              >Stock Details</a>

              <a href="/screener" onClick={() => setMenuOpen(false)} className="p-2 text-white hover:bg-white/10 text-sm"
              >Stock Screener</a>

              <button onClick={() => setMenuOpen(false)} className="p-2 text-white hover:bg-white/10 text-sm text-left"
              >✕ Close</button>
            </div>
          )}
        </div>
        ):(
          <div>
            {/* Dropdown (separate layer) */}
            {menuOpen && (
              <div className="absolute top-14 right-0 bg-black rounded-b-lg p-4 flex flex-col gap-4 z-50 shadow-lg">
                <a href="/login" onClick={() => setMenuOpen(false)} className="p-2 text-white hover:bg-white/10 text-sm"
                >Dashboard</a>

                <a href="/login" onClick={() => setMenuOpen(false)} className="p-2 text-white hover:bg-white/10 text-sm"
                >Stock Details</a>

                <a href="/login" onClick={() => setMenuOpen(false)} className="p-2 text-white hover:bg-white/10 text-sm"
                >Stock Screener</a>

                <button onClick={() => setMenuOpen(false)} className="p-2 text-white hover:bg-white/10 text-sm text-left"
                >✕ Close</button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </header>
  )
}