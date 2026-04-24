"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { searchSymbol, getQuote, getCompanyNews } from '@/app/lib/finnhub'
import { supabase } from '@/app/lib/supabase'
import { GlassCard, SectionCard, StatCard, ComingSoon, EmptyState, NewsItem, LoadingPulse, themes, Theme, ThemeProvider } from '@/app/components/ui'
import { useTheme } from '../components/ui'




type Stock = {
  symbol: string
  shares: number
  price: number
  value: number
  changePercent: number
}

type NewsArticle = {
  headline: string
  summary: string
  datetime: number
  url: string
  source: string
}

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
      style: '3',
      locale: 'en',
      backgroundColor: 'rgba(0,0,0,0)',
      gridColor: 'rgba(255,255,255,0.05)',
      hide_top_toolbar: true,
      hide_legend: true,
      hide_volume: true,
      no_timeframes: true,
      save_image: false,
      height: 260,
      width: '100%',
    })
    container.current.appendChild(script)
  }, [symbol])

  return <div ref={container} className="w-full rounded-lg overflow-hidden" style={{ height: '260px' }} />
}

const sectorMap: Record<string, string[]> = {
  Technology:  ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'AMZN', 'TSLA', 'AMD', 'INTC', 'ORCL'],
  Healthcare:  ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT', 'BMY', 'AMGN'],
  Finance:     ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'C', 'AXP', 'SCHW', 'CB'],
  Energy:      ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'PXD', 'VLO', 'OXY'],
}

const sectorColors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-cyan-500']

export default function Page() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ symbol: string; description: string }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [stocks, setStocks] = useState<Stock[]>([])
  const [loadingStocks, setLoadingStocks] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [news, setNews] = useState<NewsArticle[]>([])
  const [newsLoading, setNewsLoading] = useState(false)

  const [theme, setTheme] = useState<Theme>(useTheme().theme ? 'light' : 'dark');
  const current = theme === useTheme().theme ? themes.dark : themes.light


  // Default to first stock once loaded
  useEffect(() => {
    if (stocks.length > 0 && !selectedSymbol) setSelectedSymbol(stocks[0].symbol)
  }, [stocks])

  // Fetch news for all tracked symbols
  useEffect(() => {
    if (stocks.length === 0) return
    async function fetchAllNews() {
      setNewsLoading(true)
      try {
        const allNews = await Promise.all(stocks.map(s => getCompanyNews(s.symbol).catch(() => [])))
        const merged = allNews.flat()
          .filter((a, i, arr) => arr.findIndex(b => b.url === a.url) === i)
          .sort((a, b) => b.datetime - a.datetime)
          .slice(0, 10)
        setNews(merged)
      } catch (err) {
        console.error('Failed to fetch news:', err)
      } finally {
        setNewsLoading(false)
      }
    }
    fetchAllNews()
  }, [stocks])

  const portfolioValue = stocks.reduce((sum, s) => sum + s.value, 0)
  const todayChange = stocks.reduce((sum, s) => sum + (s.value * s.changePercent / 100), 0)
  const todayChangePercent = stocks.length > 0
    ? stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length
    : 0

  const sectors = (() => {
    const counts: Record<string, number> = { Technology: 0, Healthcare: 0, Finance: 0, Energy: 0, Other: 0 }
    stocks.forEach(s => {
      let found = false
      for (const [sector, syms] of Object.entries(sectorMap)) {
        if (syms.includes(s.symbol)) { counts[sector]++; found = true; break }
      }
      if (!found) counts['Other']++
    })
    const total = stocks.length || 1
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
  })()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (!userId) return
    async function fetchWatchlist() {
      setLoadingStocks(true)
      try {
        const { data, error } = await supabase.from('watchlist').select('symbol').order('created_at', { ascending: false })
        if (error) throw error
        const stocksWithPrices = await Promise.all(
          (data ?? []).map(async ({ symbol }: { symbol: string }) => {
            try {
              const quote = await getQuote(symbol)
              return { symbol, shares: 0, price: quote.price, value: quote.price, changePercent: quote.changePercent }
            } catch {
              return { symbol, shares: 0, price: 0, value: 0, changePercent: 0 }
            }
          })
        )
        setStocks(stocksWithPrices)
      } catch (err) {
        console.error('Failed to fetch watchlist:', err)
      } finally {
        setLoadingStocks(false)
      }
    }
    fetchWatchlist()
  }, [userId])

  async function removeFromWatchlist(symbol: string) {
    const { error } = await supabase.from('watchlist').delete().eq('symbol', symbol).eq('user_id', userId)
    if (error) { console.error('Failed to remove:', error); return }
    setStocks(prev => prev.filter(s => s.symbol !== symbol))
    if (selectedSymbol === symbol) setSelectedSymbol(null)
  }

  useEffect(() => {
    if (query.length < 1) { setResults([]); setShowDropdown(false); return }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchSymbol(query)
        const filtered = data.filter((r: { symbol: string }) => !r.symbol.includes('.')).slice(0, 6)
        setResults(filtered)
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

  function handleSelect(symbol: string) {
    

    setQuery(''); setShowDropdown(false)
    router.push(`/details?symbol=${symbol}`)
  }

  
  return (
    <div
      className={`space-y-4 p-4 max-w-6xl mx-auto`}
      style={{
        minHeight: '100vh',
      }}
    >
      {/* TITLE */}
      <h1 className={`text-3xl font-bold text-center ${current.invt}`}>
        DASHBOARD
      </h1>

      {/* ================= SEARCH ================= */}
      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-xl" ref={dropdownRef}>

          <input
            type="text"
            placeholder="Search for financial instrument (e.g. AAPL, BTC, SPY)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition ${current.input.focus}`}
            style={{
              ...current.input.norm,
              color: current.input.norm.color,
            }}
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
                  className={`w-full px-4 py-3 flex justify-between items-center text-left transition-all`}
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
                    theme === 'light'
                      ? 'rgba(15,15,30,0.95)'
                      : 'rgba(255,255,255,0.95)',
                  border: current.glass.border,
                  color: current.glass.color,
                }}
              >
                <p className={current.input.norm.color}>
                  No results for "{query}"
                </p>
              </div>
            )}
        </div>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Portfolio Value"
          value={`$${portfolioValue.toLocaleString()}`}
          sub="+$2,500 (2.04%)"
          subColor = {`${current.colored.green}`}
        />

        <StatCard
          label="Today's Returns"
          value={
            loadingStocks
              ? '...'
              : `${todayChange >= 0 ? '+' : ''}$${Math.abs(
                  todayChange
                ).toFixed(2)}`
          }
          sub={
            loadingStocks
              ? ''
              : `${todayChangePercent >= 0 ? '+' : ''}${todayChangePercent.toFixed(
                  2
                )}% avg today`
          }
          subColor={
            todayChangePercent >= 0 ? current.colored.green : current.colored.red
          }
        />

        <StatCard
          label="Holdings"
          value={loadingStocks ? '...' : stocks.length.toString()}
          sub="Stocks"
        />
      </div>

      {/* ================= SECTORS + HOLDINGS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* SECTORS */}
        <SectionCard title="Sector Allocation">
          {loadingStocks ? (
            <LoadingPulse message="Loading sectors..." />
          ) : sectors.length === 0 ? (
            <p className={current.text}>
              Add stocks to see sector breakdown.
            </p>
          ) : (
            <div className="space-y-2">
              {sectors.map((sector: any, i: number) => (
                <div key={sector.name}>
                  <div className="flex justify-between mb-1">
                    <span className={`text-xs ${current.invt}`}>
                      {sector.name}
                    </span>
                    <span className={current.invt}>
                      {sector.count} stock{sector.count !== 1 ? 's' : ''} ·{' '}
                      {sector.percent}%
                    </span>
                  </div>

                  <div
                    className="w-full h-2 rounded-full"
                    style={{ background: current.glass.border }}
                  >
                    <div
                      style={{
                        width: `${sector.percent}%`,
                        background:
                          sectorColors[i % sectorColors.length],
                      }}
                      className="h-2 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* HOLDINGS */}
        <SectionCard title="Holdings">
          {loadingStocks ? (
            <LoadingPulse message="Loading watchlist..." />
          ) : stocks.length === 0 ? (
            <p className={current.invt}>
              No stocks yet. Search above to add some.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-sm">
                <thead
                  style={{
                    borderBottom: current.glass.border,
                  }}
                >
                  <tr>
                    {['Symbol', 'Price', 'Change', ''].map((h) => (
                      <th
                        key={h}
                        className={`pb-2 text-xs ${current.invt}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {stocks.map((stock: any) => (
                    <tr
                      key={stock.symbol}
                      className="cursor-pointer"
                      style={{
                        borderBottom: current.glass.border,
                      }}
                    >
                      <td
                        className={`px-4 py-2 font-semibold ${current.colored.blue}`}
                        onClick={() =>
                          setSelectedSymbol(
                            selectedSymbol === stock.symbol
                              ? null
                              : stock.symbol
                          )
                        }
                      >
                        {stock.symbol}
                      </td>

                      <td className={`${current.invt}`}>
                        {/* ${stock.price.toFixed(2)} */}
                        ${Number(stock.price || 0).toFixed(2)}
                      </td>

                      <td
                        className={
                          stock.changePercent >= 0
                            ? current.colored.green
                            : current.colored.red
                        }
                      >
                        {stock.changePercent >= 0 ? '+' : ''}
                        {stock.changePercent.toFixed(2)}%
                      </td>

                      <td className="text-right">
                        <button
                          onClick={() =>
                            removeFromWatchlist(stock.symbol)
                          }
                          className={'text-xs hover: ${current.colored.green} transition-opacity'}
                          style={{
                            color:
                              theme === 'dark'
                                ? 'rgba(255,255,255,0.2)'
                                : 'rgba(0,0,0,0.4)',
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ================= CHARTS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* PERFORMANCE */}
        <SectionCard title="Performance Graph">
          {loadingStocks ? (
            <LoadingPulse />
          ) : stocks.length === 0 ? (
            <EmptyState message="Add stocks to see performance" />
          ) : (
            <div className="flex gap-4 overflow-x-auto">
              {stocks.map((stock: any) => {
                const isPos = stock.changePercent >= 0

                return (
                  <div key={stock.symbol} className="text-center">
                    <div
                      className="w-8 rounded-sm"
                      style={{
                        height: `${Math.abs(stock.changePercent) * 3}px`,
                        background: isPos
                          ? '#22c55e'
                          : '#ef4444',
                      }}
                    />
                    <p className={current.invt}>
                      {stock.symbol}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* STOCK CHART */}
        <GlassCard>
          <div className="flex justify-between mb-3">
            <h2 className={`text-lg font-bold ${current.invt}`}>
              Stock Chart
            </h2>

            {selectedSymbol && (
              <span className="text-xs text-blue-400 px-2 py-1 rounded">
                {selectedSymbol}
              </span>
            )}
          </div>

          {selectedSymbol ? (
            <TradingViewWidget symbol={selectedSymbol} />
          ) : (
            <EmptyState message="Select a stock to view chart" />
          )}
        </GlassCard>
      </div>

      {/* ================= NEWS ================= */}
      <SectionCard title="News Dashboard">
        {newsLoading ? (
          <LoadingPulse message="Loading news..." />
        ) : news.length === 0 ? (
          <p className={current.invt}>
            No recent news for your watchlist.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {news.map((article: any) => (
              <NewsItem key={article.url} {...article} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* ================= AI ================= */}
      <SectionCard title="AI Summary">
        <ComingSoon description="AI-powered portfolio analysis coming soon." />
      </SectionCard>

      <p className={`text-center text-xs ${current.invt}`}>
        Designed by Req
      </p>
    </div>
  )
}