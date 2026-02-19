
type CacheEntry<T> = { 
  data: T
  fetchedAt: number
  etag?: string
  version?: number
}

type CacheOptions = {
  ttlMs?: number
  maxAgeMs?: number
  backgroundRefresh?: boolean
  persistToStorage?: boolean
  validateBeforeUse?: (data: any) => boolean
}

type FetcherWithEtag<T> = (etag?: string) => Promise<{ data: T; etag?: string; notModified?: boolean }>

// In-memory cache for instant access
const cache = new Map<string, CacheEntry<any>>()
const inFlight = new Map<string, Promise<any>>()

// Cache version for invalidation on app updates
const CACHE_VERSION = 1
const VERSION_KEY = '__cache_version__'

// Configuration
const DEFAULT_TTL = 1000 * 60 * 5 // 5 minutes (stale-after)
const DEFAULT_MAX_AGE = 1000 * 60 * 60 // 1 hour (eviction)
const STORAGE_PREFIX = 'cache_v1_'
const MAX_STORAGE_ITEMS = 100 // Prevent storage bloat

/**
 * Initialize cache system - call this early in app lifecycle
 */
export function initCache() {
  if (typeof window === 'undefined') return
  
  // Check cache version and clear if outdated
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY)
    if (storedVersion !== String(CACHE_VERSION)) {
      clearAllCache()
      localStorage.setItem(VERSION_KEY, String(CACHE_VERSION))
    }
  } catch (err) {
    console.warn('Cache version check failed:', err)
  }
  
  // Hydrate memory cache from localStorage on startup
  hydrateFromStorage()
  
  // Cleanup old entries periodically
  if (typeof window !== 'undefined') {
    setInterval(() => cleanupExpiredEntries(), 1000 * 60 * 5) // Every 5 minutes
  }
}

/**
 * Hydrate in-memory cache from localStorage for instant first render
 */
function hydrateFromStorage() {
  if (typeof window === 'undefined') return
  
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX))
    
    keys.forEach(storageKey => {
      try {
        const key = storageKey.replace(STORAGE_PREFIX, '')
        const item = localStorage.getItem(storageKey)
        if (!item) return
        
        const entry = JSON.parse(item) as CacheEntry<any>
        const age = Date.now() - entry.fetchedAt
        
        // Only hydrate if not too old (within maxAge)
        if (age <= DEFAULT_MAX_AGE) {
          cache.set(key, entry)
        } else {
          localStorage.removeItem(storageKey)
        }
      } catch (err) {
        console.warn('Failed to hydrate cache entry:', storageKey, err)
        localStorage.removeItem(storageKey)
      }
    })
  } catch (err) {
    console.warn('Cache hydration failed:', err)
  }
}

/**
 * Get a cached value synchronously if it exists and is not older than maxAge (ms).
 * Useful to render immediately on the client from memory cache.
 */
export function getCachedSync<T>(key: string, maxAgeMs = DEFAULT_MAX_AGE): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return undefined
  
  const age = Date.now() - entry.fetchedAt
  if (age > maxAgeMs) {
    cache.delete(key)
    removeFromStorage(key)
    return undefined
  }
  
  return entry.data
}

/**
 * Enhanced fetch-with-cache with persistence and etag support
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: (() => Promise<T>) | FetcherWithEtag<T>,
  opts?: CacheOptions
): Promise<T> {
  const ttlMs = opts?.ttlMs ?? DEFAULT_TTL
  const maxAgeMs = opts?.maxAgeMs ?? DEFAULT_MAX_AGE
  const persistToStorage = opts?.persistToStorage ?? true
  const now = Date.now()

  const entry = cache.get(key) as CacheEntry<T> | undefined
  
  if (entry) {
    const age = now - entry.fetchedAt
    
    // Validate cached data if validator provided
    if (opts?.validateBeforeUse && !opts.validateBeforeUse(entry.data)) {
      cache.delete(key)
      removeFromStorage(key)
    } else if (age <= ttlMs) {
      // Fresh - return immediately
      return entry.data
    } else if (age <= maxAgeMs) {
      // Stale but valid - return cached and refresh in background
      if (opts?.backgroundRefresh ?? true) {
        refreshInBackground(key, fetcher, { ...opts, persistToStorage })
      }
      return entry.data
    } else {
      // Too old - evict and refetch
      cache.delete(key)
      removeFromStorage(key)
    }
  }

  // Dedupe concurrent requests
  let inflight = inFlight.get(key) as Promise<T> | undefined
  if (inflight) return inflight

  // Check if fetcher supports etag
  const supportsEtag = fetcher.length > 0
  
  inflight = (async () => {
    try {
      let result: T
      let etag: string | undefined
      
      if (supportsEtag && entry?.etag) {
        // Try conditional fetch with etag
        const response = await (fetcher as FetcherWithEtag<T>)(entry.etag)
        if (response.notModified && entry) {
          // Content not modified - update timestamp and return cached
          const updatedEntry = { ...entry, fetchedAt: Date.now() }
          cache.set(key, updatedEntry)
          if (persistToStorage) saveToStorage(key, updatedEntry)
          return entry.data
        }
        result = response.data
        etag = response.etag
      } else {
        result = await (fetcher as () => Promise<T>)()
      }
      
      const newEntry: CacheEntry<T> = {
        data: result,
        fetchedAt: Date.now(),
        etag,
        version: CACHE_VERSION
      }
      
      cache.set(key, newEntry)
      if (persistToStorage) saveToStorage(key, newEntry)
      
      return result
    } finally {
      inFlight.delete(key)
    }
  })()
  
  inFlight.set(key, inflight)
  return inflight
}

/**
 * Refresh cache in background without blocking
 */
export function refreshInBackground<T>(
  key: string,
  fetcher: (() => Promise<T>) | FetcherWithEtag<T>,
  opts?: CacheOptions
) {
  if (inFlight.has(key)) return

  const entry = cache.get(key) as CacheEntry<T> | undefined
  const supportsEtag = fetcher.length > 0
  const persistToStorage = opts?.persistToStorage ?? true

  const p = (async () => {
    try {
      let result: T
      let etag: string | undefined
      
      if (supportsEtag && entry?.etag) {
        const response = await (fetcher as FetcherWithEtag<T>)(entry.etag)
        if (response.notModified && entry) {
          // Not modified - just update timestamp  
          const updatedEntry = { ...entry, fetchedAt: Date.now() }
          cache.set(key, updatedEntry)
          if (persistToStorage) saveToStorage(key, updatedEntry)
          return
        }
        result = response.data
        etag = response.etag
      } else {
        result = await (fetcher as () => Promise<T>)()
      }
      
      const newEntry: CacheEntry<T> = {
        data: result,
        fetchedAt: Date.now(),
        etag,
        version: CACHE_VERSION
      }
      
      cache.set(key, newEntry)
      if (persistToStorage) saveToStorage(key, newEntry)
    } catch (err) {
      console.error(`Background refresh failed for ${key}:`, err)
    }
  })()

  inFlight.set(key, p)
  p.finally(() => inFlight.delete(key))
}

/**
 * Preload/prefetch data into cache
 */
export async function prefetchData<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: CacheOptions
): Promise<void> {
  // Don't prefetch if already cached and fresh
  const entry = cache.get(key)
  if (entry) {
    const age = Date.now() - entry.fetchedAt
    if (age <= (opts?.ttlMs ?? DEFAULT_TTL)) {
      return
    }
  }
  
  try {
    await fetchWithCache(key, fetcher, opts)
  } catch (err) {
    console.warn(`Prefetch failed for ${key}:`, err)
  }
}

/**
 * Invalidate cache entries by key or prefix
 */
export function invalidateCache(prefixOrKey?: string, opts?: { storage?: boolean }) {
  const shouldClearStorage = opts?.storage ?? true
  
  if (!prefixOrKey) {
    cache.clear()
    if (shouldClearStorage) clearAllCache()
    return
  }

  // Check if exact key exists
  if (cache.has(prefixOrKey)) {
    cache.delete(prefixOrKey)
    if (shouldClearStorage) removeFromStorage(prefixOrKey)
  } else {
    // Treat as prefix
    const keys = Array.from(cache.keys())
    keys.forEach(k => {
      if (k.startsWith(prefixOrKey)) {
        cache.delete(k)
        if (shouldClearStorage) removeFromStorage(k)
      }
    })
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  const entries = Array.from(cache.entries())
  const now = Date.now()
  
  return {
    totalEntries: entries.length,
    fresh: entries.filter(([_, e]) => (now - e.fetchedAt) <= DEFAULT_TTL).length,
    stale: entries.filter(([_, e]) => {
      const age = now - e.fetchedAt
      return age > DEFAULT_TTL && age <= DEFAULT_MAX_AGE
    }).length,
    memorySize: JSON.stringify(Array.from(cache.entries())).length,
    inFlightRequests: inFlight.size
  }
}

/**
 * Save entry to localStorage with LRU eviction
 */
function saveToStorage<T>(key: string, entry: CacheEntry<T>) {
  if (typeof window === 'undefined') return
  
  try {
    const storageKey = STORAGE_PREFIX + key
    localStorage.setItem(storageKey, JSON.stringify(entry))
    
    // Implement LRU eviction if too many items
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX))
    if (keys.length > MAX_STORAGE_ITEMS) {
      // Remove oldest entries
      const entries = keys
        .map(k => {
          try {
            const item = localStorage.getItem(k)
            return { key: k, entry: item ? JSON.parse(item) : null }
          } catch {
            return null
          }
        })
        .filter((e): e is { key: string; entry: CacheEntry<any> } => e !== null && e.entry !== null)
        .sort((a, b) => a.entry.fetchedAt - b.entry.fetchedAt)
      
      const toRemove = entries.slice(0, keys.length - MAX_STORAGE_ITEMS + 10)
      toRemove.forEach(({ key }) => localStorage.removeItem(key))
    }
  } catch (err) {
    // localStorage might be full or disabled
    if (err instanceof Error && err.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old cache')
      clearOldestStorageEntries(20)
    } else {
      console.warn('Failed to save to storage:', err)
    }
  }
}

/**
 * Remove entry from localStorage
 */
function removeFromStorage(key: string) {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch (err) {
    console.warn('Failed to remove from storage:', err)
  }
}

/**
 * Clear all cache from localStorage
 */
function clearAllCache() {
  if (typeof window === 'undefined') return
  
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX))
    keys.forEach(k => localStorage.removeItem(k))
  } catch (err) {
    console.warn('Failed to clear cache:', err)
  }
}

/**
 * Remove oldest entries from storage
 */
function clearOldestStorageEntries(count: number) {
  if (typeof window === 'undefined') return
  
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX))
    const entries = keys
      .map(k => {
        try {
          const item = localStorage.getItem(k)
          return { key: k, entry: item ? JSON.parse(item) : null }
        } catch {
          return null
        }
      })
      .filter((e): e is { key: string; entry: CacheEntry<any> } => e !== null && e.entry !== null)
      .sort((a, b) => a.entry.fetchedAt - b.entry.fetchedAt)
    
    entries.slice(0, count).forEach(({ key }) => localStorage.removeItem(key))
  } catch (err) {
    console.warn('Failed to clear oldest entries:', err)
  }
}

/**
 * Cleanup expired entries from memory and storage
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  const keys = Array.from(cache.keys())
  
  keys.forEach(key => {
    const entry = cache.get(key)
    if (entry && (now - entry.fetchedAt) > DEFAULT_MAX_AGE) {
      cache.delete(key)
      removeFromStorage(key)
    }
  })
}

/**
 * Batch fetch multiple keys
 */
export async function batchFetch<T>(
  keys: string[],
  fetcher: (keys: string[]) => Promise<Record<string, T>>,
  opts?: CacheOptions
): Promise<Record<string, T>> {
  const uncachedKeys: string[] = []
  const result: Record<string, T> = {}
  
  // Check cache first
  keys.forEach(key => {
    const cached = getCachedSync<T>(key, opts?.maxAgeMs)
    if (cached !== undefined) {
      result[key] = cached
    } else {
      uncachedKeys.push(key)
    }
  })
  
  // Fetch uncached keys in batch
  if (uncachedKeys.length > 0) {
    try {
      const fetched = await fetcher(uncachedKeys)
      
      Object.entries(fetched).forEach(([key, data]) => {
        const entry: CacheEntry<T> = {
          data,
          fetchedAt: Date.now(),
          version: CACHE_VERSION
        }
        cache.set(key, entry)
        if (opts?.persistToStorage ?? true) {
          saveToStorage(key, entry)
        }
        result[key] = data
      })
    } catch (err) {
      console.error('Batch fetch failed:', err)
      throw err
    }
  }
  
  return result
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  initCache()
}