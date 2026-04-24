const BASE = 'https://finnhub.io/api/v1'
const KEY = process.env.NEXT_PUBLIC_FINNHUB_KEY

// Get live quote for a symbol
export async function getQuote(symbol: string) {
  const res = await fetch(`${BASE}/quote?symbol=${symbol}&token=${KEY}`)
  const data = await res.json()
  return {
    price: data.c,        // current price
    change: data.d,       // change
    changePercent: data.dp, // change %
    high: data.h,
    low: data.l,
    open: data.o,
    volume: data.v,
  }
}

// Search symbols
export async function searchSymbol(query: string) {
  const res = await fetch(`${BASE}/search?q=${query}&token=${KEY}`)
  const data = await res.json()
  return data.result // [{ symbol, description }]
}

export async function getCompanyNews(symbol: string) {
  const to = new Date().toISOString().split('T')[0] // today e.g. "2026-03-19"
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days ago

  const res = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${KEY}`
  )
  const data = await res.json()
  // returns array of news articles, limit to 5
  return data.slice(0, 5) as {
    headline: string
    summary: string
    datetime: number
    url: string
    source: string
  }[]
}


export async function getMassQuotes(
  tickers: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<Record<string, Awaited<ReturnType<typeof getQuote>>>> {
  const results: Record<string, Awaited<ReturnType<typeof getQuote>>> = {}
  const chunkSize = 10

  for (let i = 0; i < tickers.length; i += chunkSize) {
    const chunk = tickers.slice(i, i + chunkSize)

    await Promise.all(
      chunk.map(async (ticker) => {
        try {
          results[ticker] = await getQuote(ticker)
        } catch {
        }
      })
    )

    onProgress?.(Math.min(i + chunkSize, tickers.length), tickers.length)

    if (i + chunkSize < tickers.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  return results
}