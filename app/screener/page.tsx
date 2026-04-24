'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getMassQuotes } from '@/app/lib/finnhub'
import { SectionCard, LoadingPulse, useTheme, themes, Theme } from '@/app/components/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockRow {
  ticker: string
  company: string
  sector: string
  price: number | null
  change: number | null
  changePercent: number | null
  marketCap: string
  volume: number | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const sectorMap: Record<string, string[]> = {
  Technology:  ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'AMZN', 'TSLA', 'AMD', 'INTC', 'ORCL'],
  Healthcare:  ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT', 'BMY', 'AMGN'],
  Finance:     ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'C', 'AXP', 'SCHW', 'CB'],
  Energy:      ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'PXD', 'VLO', 'OXY'],
}

const companyNames: Record<string, string> = {
  AAPL: 'Apple Inc', MSFT: 'Microsoft Corp', GOOGL: 'Alphabet Inc', NVDA: 'NVIDIA Corp',
  META: 'Meta Platforms', AMZN: 'Amazon.com Inc', TSLA: 'Tesla Inc', AMD: 'Advanced Micro Devices',
  INTC: 'Intel Corp', ORCL: 'Oracle Corp', JNJ: 'Johnson & Johnson', PFE: 'Pfizer Inc',
  UNH: 'UnitedHealth Group', ABBV: 'AbbVie Inc', MRK: 'Merck & Co', LLY: 'Eli Lilly',
  TMO: 'Thermo Fisher', ABT: 'Abbott Labs', BMY: 'Bristol-Myers Squibb', AMGN: 'Amgen Inc',
  JPM: 'JPMorgan Chase', BAC: 'Bank of America', WFC: 'Wells Fargo', GS: 'Goldman Sachs',
  MS: 'Morgan Stanley', BLK: 'BlackRock Inc', C: 'Citigroup Inc', AXP: 'American Express',
  SCHW: 'Charles Schwab', CB: 'Chubb Ltd', XOM: 'Exxon Mobil', CVX: 'Chevron Corp',
  COP: 'ConocoPhillips', SLB: 'SLB (Schlumberger)', EOG: 'EOG Resources', MPC: 'Marathon Petroleum',
  PSX: 'Phillips 66', PXD: 'Pioneer Natural', VLO: 'Valero Energy', OXY: 'Occidental Petroleum',
}

const marketCaps: Record<string, string> = {
  AAPL: '3.45T', MSFT: '3.12T', GOOGL: '2.18T', NVDA: '2.95T', META: '1.42T',
  AMZN: '1.98T', TSLA: '780B', AMD: '245B', INTC: '89B', ORCL: '412B',
  JNJ: '385B', PFE: '152B', UNH: '492B', ABBV: '318B', MRK: '276B',
  LLY: '748B', TMO: '198B', ABT: '195B', BMY: '118B', AMGN: '165B',
  JPM: '585B', BAC: '312B', WFC: '218B', GS: '158B', MS: '182B',
  BLK: '128B', C: '118B', AXP: '195B', SCHW: '128B', CB: '95B',
  XOM: '478B', CVX: '282B', COP: '125B', SLB: '58B', EOG: '68B',
  MPC: '58B', PSX: '52B', PXD: '48B', VLO: '45B', OXY: '48B',
}

const SECTORS = ['All', ...Object.keys(sectorMap)]
const PAGE_SIZE = 10

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null, decimals = 2) {
  if (n === null) return '—'
  return n.toFixed(decimals)
}

function fmtVolume(v: number | null) {
  if (v === null) return '—'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K'
  return v.toString()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  
  const [theme, setTheme] = useState<Theme>(useTheme() ? 'dark' : 'light');
  const current = theme === useTheme().theme ? themes.light : themes.dark

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
        active
          ? 'bg-blue-500 border-blue-500 text-white'
          : current.filter.inactive
      }`}
    >
      {label}
    </button>
  )
}

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: 'asc' | 'desc' }) {
  const [theme, setTheme] = useState<Theme>(useTheme() ? 'dark' : 'light');
  const current = theme === useTheme().theme ? themes.dark : themes.light

  if (sortField !== field) return <span className={`${current.subText} ml-1`}>↕</span>
  return <span className={`${current.colored.blue} font-bold ml-1`}>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function ChangeCell({ val, pct }: { val: number | null; pct: number | null }) {
  const [theme, setTheme] = useState<Theme>(useTheme() ? 'dark' : 'light');
  const current = theme === useTheme().theme ? themes.dark : themes.light
  
  if (val === null || pct === null) return <span className={`${current.invt}`}>—</span>
  const positive = pct >= 0
  return (
    <span className={positive ? current.colored.green : current.colored.red}>
      {positive ? '+' : ''}{fmt(pct)}%
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Screener() {
  const router = useRouter()

  const [sector, setSector] = useState('All')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<keyof StockRow>('ticker')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  const [theme, setTheme] = useState<Theme>(useTheme() ? 'dark' : 'light');
  const current = theme === useTheme().theme ? themes.light : themes.dark

  const tickerList = useCallback(() => {
    const base = sector === 'All'
      ? Object.entries(sectorMap).flatMap(([s, tickers]) => tickers.map(t => ({ ticker: t, sector: s })))
      : sectorMap[sector]?.map(t => ({ ticker: t, sector })) ?? []

    if (!search.trim()) return base
    return base.filter(
      ({ ticker }) =>
        ticker.toLowerCase().includes(search.toLowerCase()) ||
        (companyNames[ticker] ?? '').toLowerCase().includes(search.toLowerCase())
    )
  }, [sector, search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setProgress(0)

    const tickers = tickerList()

    getMassQuotes(
      tickers.map(t => t.ticker),
      (loaded, total) => {
        if (!cancelled) setProgress(Math.round((loaded / total) * 100))
      }
    ).then(quoteMap => {
      if (cancelled) return
      setRows(tickers.map(({ ticker, sector: s }) => {
        const q = quoteMap[ticker]
        return {
          ticker,
          company:       companyNames[ticker] ?? ticker,
          sector:        s,
          price:         q?.price         ?? null,
          change:        q?.change        ?? null,
          changePercent: q?.changePercent ?? null,
          marketCap:     marketCaps[ticker] ?? '—',
          volume:        q?.volume        ?? null,
        } satisfies StockRow
      }))
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [tickerList])

  useEffect(() => { setPage(1) }, [sector, search])

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortField]
    const bv = b[sortField]
    if (av === null) return 1
    if (bv === null) return -1
    if (typeof av === 'string' && typeof bv === 'string')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(field: keyof StockRow) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const cols: { key: keyof StockRow; label: string; align?: string }[] = [
    { key: 'ticker',        label: 'Ticker' },
    { key: 'company',       label: 'Company' },
    { key: 'sector',        label: 'Sector' },
    { key: 'price',         label: 'Price',    align: 'center' },
    { key: 'changePercent', label: 'Change %', align: 'center' },
    { key: 'marketCap',     label: 'Mkt Cap',  align: 'center' },
    { key: 'volume',        label: 'Volume',   align: 'center' },
  ]

  return (
    <div className="space-y-4 p-4 max-w-6xl mx-auto">
      <h1 className={['text-3xl font-bold text-center', current.invt].join(' ')}>
        Stock Screener
      </h1>

      {/* Filters */}
      <SectionCard title="Filters">
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search ticker or company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition"
            style={{
              background: current.input.norm.background,
              border: current.input.norm.border,
              color: current.input.norm.color,
            }}
            // style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}
          />
          <div className="flex gap-2 flex-wrap">
            {SECTORS.map(s => (
              <FilterChip key={s} label={s} active={sector === s} onClick={() => setSector(s)} />
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Table */}
      <SectionCard title={`Results · ${rows.length} stocks`}>

        {/* Progress bar */}
        {loading && (
          <div className="w-full rounded-full h-0.5 mb-4" style={{ background: current.input.norm.background }}>
            <div
              className="bg-blue-500 h-0.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {loading && rows.length === 0 ? (
          <LoadingPulse message="Fetching quotes…" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-sm">
              <thead style={{ borderBottom: current.input.norm.color}}>
                <tr>
                  {cols.map(({ key, label, align }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className={`pb-2 text-center ${current.invt} font-bold text-s cursor-pointer hover:${current.table.hover} transition select-none`}
                        style={{ borderBottom: current.glass.border }}
                    >
                      {label}
                      <SortIcon field={key} sortField={sortField} sortDir={sortDir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(row => (
                  <tr
                    key={row.ticker}
                    onClick={() => router.push(`/details?symbol=${row.ticker}`)}
                    className="cursor-pointer group"
                    style={{ borderBottom: current.glass.border }}
                    onMouseEnter={e => (e.currentTarget.style.background = current.table.hover.background)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className={`py-2 font-semibold text-sm ${current.colored.blue} group-hover:text-blue-300`}>
                      {row.ticker}
                    </td>
                    <td className={`py-2 text-sm ${current.invt}`}>{row.company}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs text-white`}
                        style={{ background: current.button.login.norm.background }}>
                        {row.sector}
                      </span>
                    </td>
                    <td className={`py-2 text-center text-sm ${current.invt} font-mono`}>
                      {row.price !== null ? `$${fmt(row.price)}` : '—'}
                    </td>
                    <td className={`py-2 text-center text-sm font-semibold font-mono`}>
                      <ChangeCell val={row.change} pct={row.changePercent} />
                    </td>
                    <td className={`py-2 text-center text-sm ${current.invt}`}>{row.marketCap}</td>
                    <td className={`py-2 text-center text-sm ${current.invt} font-mono`}>
                      {fmtVolume(row.volume)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className={`flex items-center justify-between pt-3 mt-3 text-xs ${current.invt}`}>
            <span>
              {(page - 1) * PAGE_SIZE + 1} – {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1 rounded ${current.invt}/10 hover:${current.invt} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition `}
                style={{ border: current.glass.border }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-3 py-1 rounded ${current.invt} cursor-pointer hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition`}
                style={{ border: current.glass.border }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <p className={['text-center', current.invt, 'text-xs mt-4'].join(' ')}>
        Designed by Req
      </p>
    </div>
  )
}