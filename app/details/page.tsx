'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getQuote, getCompanyNews, searchSymbol } from '@/app/lib/finnhub'
import { supabase } from '@/app/lib/supabase'
import { GlassCard, SectionCard, ComingSoon, NewsItem, LoadingPulse, Button, themes, useTheme, Theme } from '@/app/components/ui'

function TradingViewWidget({ symbol }: { symbol: string }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return
    container.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol: `NASDAQ:${symbol}`,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(0,0,0,0)',
      gridColor: 'rgba(255,255,255,0.05)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      height: 400,
      width: '100%',
    })
    container.current.appendChild(script)
  }, [symbol])

  return <div ref={container} className="w-full rounded-lg overflow-hidden" style={{ height: '400px' }} />
}

function DetailsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const symbol = searchParams.get('symbol') ?? 'AAPL'

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ symbol: string; description: string }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [theme, setTheme] = useState<Theme>(useTheme().theme ? 'light' : 'dark');
  const current = theme === useTheme().theme ? themes.dark : themes.light

  const [quote, setQuote] = useState<{
    price: number; change: number; changePercent: number
    high: number; low: number; open: number
  } | null>(null)

  const [news, setNews] = useState<{
    headline: string; summary: string; datetime: number; url: string; source: string
  }[]>([])

  const [newsLoading, setNewsLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [tracked, setTracked] = useState(false)
  const [trackLoading, setTrackLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const isPositive = (quote?.change ?? 0) >= 0

  useEffect(() => {
    if (query.length < 1) { setResults([]); setShowDropdown(false); return }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchSymbol(query)
        setResults(data.filter((r: { symbol: string }) => !r.symbol.includes('.')).slice(0, 6))
        setShowDropdown(true)
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(sym: string) {
    setQuery(''); setShowDropdown(false)
    router.push(`/details?symbol=${sym}`)
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: existing } = await supabase.from('watchlist').select('id')
          .eq('user_id', uid).eq('symbol', symbol).maybeSingle()
        setTracked(!!existing)
      }
    }
    init()
  }, [symbol])

  async function handleTrack() {
    if (!userId) return
    setTrackLoading(true)
    if (tracked) {
      await supabase.from('watchlist').delete().eq('user_id', userId).eq('symbol', symbol)
      setTracked(false)
    } else {
      await supabase.from('watchlist').insert({ user_id: userId, symbol })
      setTracked(true)
    }
    setTrackLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    async function fetchQuote() {
      try { const data = await getQuote(symbol); setQuote(data) }
      catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchQuote()
    const interval = setInterval(fetchQuote, 10000)
    return () => clearInterval(interval)
  }, [symbol])

  useEffect(() => {
    setNewsLoading(true)
    async function fetchNews() {
      try { const data = await getCompanyNews(symbol); setNews(data) }
      catch (err) { console.error(err) }
      finally { setNewsLoading(false) }
    }
    fetchNews()
  }, [symbol])

  return (
    <div className={`space-y-4 p-4 max-w-6xl mx-auto ${current.invt} relative z-10`}>
      <h1 className="text-4xl font-bold text-center mb-2">{symbol}</h1>
      <p className={`text-center text-sm ${current.glass.color}`}>Live Data - NASDAQ</p>

      {/* Search */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-xl" ref={dropdownRef}>
          <input
            type="text"
            placeholder="Search for another stock (e.g. MSFT, TSLA, SPY)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={`w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition ${current.input.focus}`}
            style={{
              ...current.input.norm,
              color: current.input.norm.color,
            }}
            suppressHydrationWarning
          />
          {/* LOADING SPINNER */}
          {searching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div
                className="w-3 h-3 border rounded-full animate-spin"
                style={{
                  borderColor:
                    theme === 'dark'
                      ? 'rgba(255,255,255,0.3)'
                      : 'rgba(0,0,0,0.2)',
                  borderTopColor: theme === 'dark' ? '#fff' : '#000',
                }}
              />
            </div>
          )}

          {/* DROPDOWN RESULTS */}
          {showDropdown && results.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50"
              style={current.input.norm}
            >
              {results.map((result: any) => (
                <button
                  key={result.symbol}
                  onClick={() => handleSelect(result.symbol)}
                  className="w-full px-4 py-3 flex justify-between items-center text-left transition-all"
                  style={{
                    borderBottom: current.glass.border,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      theme === 'dark'
                        ? 'rgba(0,0,0,0.1)'
                        : 'rgba(0,0,0,0.1)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <span className={`font-semibold text-sm ${current.input.norm.color}`}>
                    {result.symbol}
                  </span>
                  <span className={`text-xs ml-4 text-right ${current.input.norm.color}`}>
                    {result.description}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* NO RESULTS */}
          {showDropdown &&
            results.length === 0 &&
            !searching &&
            query.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded-lg px-4 py-3 z-50"
                style={{
                  background:
                    theme === 'dark'
                      ? 'rgba(15,15,30,0.95)'
                      : 'rgba(255,255,255,0.95)',
                  border: current.glass.border,
                  color: current.glass.color,
                }}
              >
                <p className={current.invt}>
                  No results for "{query}"
                </p>
              </div>
            )}
        </div>
      </div>

      {/* Price Section */}
      <GlassCard>
        {loading ? <LoadingPulse message="Loading live price..." /> : quote ? (
          <div className="flex justify-between items-center">
            <div>
              <p className={`text-3xl font-bold ${current.colored.blue}`}>
                ${Number(quote.price).toFixed(2)}
              </p>
              <p className={`text-sm ${isPositive ? current.colored.green : current.colored.red}`}>
                {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
              </p>
            </div>
            <div className="text-right">
              <p className={`text-xs ${current.invt}`}>
                Today's Range
              </p>
              <p className={`text-sm font-semibold ${current.invt}`}>
                ${quote.low.toFixed(2)} — ${quote.high.toFixed(2)}
              </p>
              <p className={`text-xs ${current.invt} mt-1`}>
                Open: ${quote.open.toFixed(2)}
              </p>
            </div>
          </div>
        ) : <p className={`text-sm ${current.colored.red}`}>Failed to load price data.</p>}
      </GlassCard>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Current Price', value: `$${quote?.price.toFixed(2)}`, color: current.colored.blue },
          { label: 'Day High', value: `$${quote?.high.toFixed(2)}`, color: current.colored.green },
          { label: 'Day Low', value: `$${quote?.low.toFixed(2)}`, color: current.colored.red },
          { label: 'Change %', value: `${isPositive ? '+' : ''}${quote?.changePercent.toFixed(2)}%`, color: isPositive ? current.colored.green : current.colored.red },
        ].map(({ label, value, color }) => (
          <GlassCard key={label}>
            <p className={`text-s font-bold text-center ${current.invt}`}>{label}</p>
            <p className={`text-lg font-bold text-center ${color}`}>{loading ? '...' : value}</p>
          </GlassCard>
        ))}
      </div>

      {/* TradingView Chart */}
      <GlassCard>
        <div className="mb-4">
          <p className={`text-xs uppercase tracking-widest font-bold ${current.invt}`}>Price Chart</p>
          <p className="text-2xl font-bold">{loading ? '...' : `$${quote?.price.toFixed(2)}`}</p>
          <p className={`text-sm mt-1 ${isPositive ? current.colored.green : current.colored.red}`}>
            {!loading && `${isPositive ? '↑' : '↓'} ${quote?.changePercent.toFixed(2)}% today`}
          </p>
        </div>
        <TradingViewWidget symbol={symbol} />
      </GlassCard>

      {/* News */}
      <SectionCard title="Latest News">
        {newsLoading ? <LoadingPulse message="Loading news..." /> :
          news.length > 0 ? (
            <div className="space-y-3">
              {news.map((article) => <NewsItem key={article.url} {...article} />)}
            </div>
          ) : <p className={`text-sm ${current.invt}`}>No recent news found.</p>}
      </SectionCard>

      {/* AI Summary */}
      <SectionCard title="AI Summary">
        <ComingSoon description="AI-powered news sentiment and stock analysis will appear here." />
      </SectionCard>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        <Button href="/dashboard" variant="solid">Back to Portfolio Dashboard</Button>
        <Button onClick={handleTrack} disabled={trackLoading} variant={tracked ? 'ghost' : 'outline'}>
          {trackLoading ? '...' : tracked ? '✓ Tracking' : '+ Track this Stock'}
        </Button>
      </div>

      <p className="text-center text-white/30 text-xs mt-6">Designed by Req</p>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40 animate-pulse">Loading...</p>
      </div>
    }>
      <DetailsContent />
    </Suspense>
  )
}