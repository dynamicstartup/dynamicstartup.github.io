// hooks/useMultiSupabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState, useCallback, useMemo } from 'react'

export interface SupabaseAccount {
  alias: string
  url: string
  anonKey: string
  displayName?: string
}

export interface MultiSupabaseConfig {
  accounts: SupabaseAccount[]
  defaultAccount?: string
  urlParamName?: string
  pathParamName?: string
}

export interface MultiSupabaseHookReturn {
  client: SupabaseClient | null
  currentAccount: SupabaseAccount | null
  accounts: SupabaseAccount[]
  switchAccount: (alias: string) -> void
  isLoading: boolean
  error: string | null
}

// Client instances cache to avoid recreating clients
const clientCache = new Map<string, SupabaseClient>()

export function useMultiSupabase(config: MultiSupabaseConfig): MultiSupabaseHookReturn {
  const [currentAccount, setCurrentAccount] = useState<SupabaseAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    accounts,
    defaultAccount,
    urlParamName = 'account',
    pathParamName = 'account'
  } = config

  // Get current URL and search params
  const getCurrentUrlParams = useCallback(() => {
    if (typeof window === 'undefined') return { searchParam: null, pathParam: null }
    
    const url = new URL(window.location.href)
    const searchParam = url.searchParams.get(urlParamName)
    
    // Extract path parameter (e.g., /account/work/dashboard -> 'work')
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const accountIndex = pathSegments.findIndex(segment => segment === pathParamName)
    const pathParam = accountIndex !== -1 && pathSegments[accountIndex + 1] 
      ? pathSegments[accountIndex + 1] 
      : null

    return { searchParam, pathParam }
  }, [urlParamName, pathParamName])

  // Get Supabase client for account
  const getClient = useCallback((account: SupabaseAccount): SupabaseClient => {
    const cacheKey = `${account.url}-${account.anonKey}`
    
    if (!clientCache.has(cacheKey)) {
      const client = createClient(account.url, account.anonKey, {
        auth: {
          persistSession: true,
          storageKey: `supabase-auth-${account.alias}`,
        }
      })
      clientCache.set(cacheKey, client)
    }
    
    return clientCache.get(cacheKey)!
  }, [])

  // Switch account function
  const switchAccount = useCallback((alias: string) => {
    const account = accounts.find(acc => acc.alias === alias)
    if (!account) {
      setError(`Account with alias '${alias}' not found`)
      return
    }

    setError(null)
    setCurrentAccount(account)
    
    // Update URL without page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set(urlParamName, alias)
      window.history.replaceState({}, '', url.toString())
    }
  }, [accounts, urlParamName])

  // Initialize current account based on URL or default
  useEffect(() => {
    setIsLoading(true)
    
    const { searchParam, pathParam } = getCurrentUrlParams()
    const urlAlias = searchParam || pathParam
    
    let targetAccount: SupabaseAccount | null = null

    if (urlAlias) {
      targetAccount = accounts.find(acc => acc.alias === urlAlias) || null
    }

    if (!targetAccount && defaultAccount) {
      targetAccount = accounts.find(acc => acc.alias === defaultAccount) || null
    }

    if (!targetAccount && accounts.length > 0) {
      targetAccount = accounts[0]
    }

    if (targetAccount) {
      setCurrentAccount(targetAccount)
      setError(null)
    } else {
      setError('No valid account found')
    }

    setIsLoading(false)
  }, [accounts, defaultAccount, getCurrentUrlParams])

  // Listen to URL changes (for navigation)
  useEffect(() => {
    const handleUrlChange = () => {
      const { searchParam, pathParam } = getCurrentUrlParams()
      const urlAlias = searchParam || pathParam
      
      if (urlAlias && currentAccount?.alias !== urlAlias) {
        const account = accounts.find(acc => acc.alias === urlAlias)
        if (account) {
          setCurrentAccount(account)
          setError(null)
        }
      }
    }

    // Listen to popstate for back/forward navigation
    window.addEventListener('popstate', handleUrlChange)
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange)
    }
  }, [currentAccount, accounts, getCurrentUrlParams])

  // Memoized client
  const client = useMemo(() => {
    if (!currentAccount) return null
    return getClient(currentAccount)
  }, [currentAccount, getClient])

  return {
    client,
    currentAccount,
    accounts,
    switchAccount,
    isLoading,
    error
  }
}

// Utility function to create account configurations
export function createSupabaseAccount(
  alias: string,
  url: string,
  anonKey: string,
  displayName?: string
): SupabaseAccount {
  return { alias, url, anonKey, displayName }
}

// Account switcher component (optional utility)
export interface AccountSwitcherProps {
  accounts: SupabaseAccount[]
  currentAccount: SupabaseAccount | null
  onAccountSwitch: (alias: string) => void
  className?: string
}

export function AccountSwitcher({ 
  accounts, 
  currentAccount, 
  onAccountSwitch,
  className = ''
}: AccountSwitcherProps) {
  return (
    <select 
      value={currentAccount?.alias || ''} 
      onChange={(e) => onAccountSwitch(e.target.value)}
      className={className}
    >
      {accounts.map(account => (
        <option key={account.alias} value={account.alias}>
          {account.displayName || account.alias}
        </option>
      ))}
    </select>
  )
}