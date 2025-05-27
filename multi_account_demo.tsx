import React, { useState, useEffect, useCallback, useMemo } from 'react'

// Mock Supabase client for demo
const createMockClient = (account) => ({
  auth: {
    getUser: () => Promise.resolve({ 
      data: { user: { email: `user@${account.alias}.com`, id: account.alias } }
    }),
    signInWithOAuth: (options) => {
      console.log(`Signing in with ${options.provider} for ${account.alias}`)
      return Promise.resolve()
    },
    onAuthStateChange: (callback) => {
      // Mock subscription
      const subscription = { unsubscribe: () => {} }
      return { data: { subscription } }
    }
  },
  from: (table) => ({
    select: () => ({
      limit: () => Promise.resolve({ 
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `${account.alias}-${i}`,
          name: `${account.displayName} Item ${i + 1}`,
          account: account.alias
        }))
      })
    })
  })
})

// Multi-Supabase Hook
function useMultiSupabase(config) {
  const [currentAccount, setCurrentAccount] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const {
    accounts,
    defaultAccount,
    urlParamName = 'account',
    pathParamName = 'account'
  } = config

  const getCurrentUrlParams = useCallback(() => {
    if (typeof window === 'undefined') return { searchParam: null, pathParam: null }
    
    const url = new URL(window.location.href)
    const searchParam = url.searchParams.get(urlParamName)
    
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const accountIndex = pathSegments.findIndex(segment => segment === pathParamName)
    const pathParam = accountIndex !== -1 && pathSegments[accountIndex + 1] 
      ? pathSegments[accountIndex + 1] 
      : null

    return { searchParam, pathParam }
  }, [urlParamName, pathParamName])

  const switchAccount = useCallback((alias) => {
    const account = accounts.find(acc => acc.alias === alias)
    if (!account) {
      setError(`Account with alias '${alias}' not found`)
      return
    }

    setError(null)
    setCurrentAccount(account)
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set(urlParamName, alias)
      window.history.replaceState({}, '', url.toString())
    }
  }, [accounts, urlParamName])

  useEffect(() => {
    setIsLoading(true)
    
    const { searchParam, pathParam } = getCurrentUrlParams()
    const urlAlias = searchParam || pathParam
    
    let targetAccount = null

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

  const client = useMemo(() => {
    if (!currentAccount) return null
    return createMockClient(currentAccount)
  }, [currentAccount])

  return {
    client,
    currentAccount,
    accounts,
    switchAccount,
    isLoading,
    error
  }
}

// Account creation helper
function createSupabaseAccount(alias, url, anonKey, displayName) {
  return { alias, url, anonKey, displayName }
}

// Account Switcher Component
function AccountSwitcher({ accounts, currentAccount, onAccountSwitch, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="font-medium text-gray-700">Account:</label>
      <select 
        value={currentAccount?.alias || ''} 
        onChange={(e) => onAccountSwitch(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {accounts.map(account => (
          <option key={account.alias} value={account.alias}>
            {account.displayName || account.alias}
          </option>
        ))}
      </select>
    </div>
  )
}

// Data Display Component
function DataDisplay({ client, currentAccount }) {
  const [user, setUser] = useState(null)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      
      try {
        const { data: { user } } = await client.auth.getUser()
        setUser(user)

        const { data: tableData } = await client
          .from('items')
          .select('*')
          .limit(10)
        
        setData(tableData || [])
      } catch (err) {
        console.error('Error fetching data:', err)
      }
      
      setLoading(false)
    }

    if (client) {
      fetchData()
    }
  }, [client])

  if (loading) return <div className="text-center py-4">Loading data...</div>

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">Current User</h3>
        <p className="text-gray-600">
          {user?.email || 'Not authenticated'} (ID: {user?.id})
        </p>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">Account Data</h3>
        <p className="text-sm text-gray-600 mb-3">
          Found {data.length} items from {currentAccount?.displayName}
        </p>
        
        <div className="space-y-2">
          {data.map(item => (
            <div key={item.id} className="bg-white p-3 rounded border">
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-gray-500">ID: {item.id}</div>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={() => client.auth.signInWithOAuth({ provider: 'google' })}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Sign In with Google
      </button>
    </div>
  )
}

// Main Demo Component
export default function MultiAccountSupabaseDemo() {
  // Define your accounts
  const accounts = [
    createSupabaseAccount(
      'personal',
      'https://personal-project.supabase.co',
      'personal-anon-key',
      'Personal Account'
    ),
    createSupabaseAccount(
      'work',
      'https://work-project.supabase.co',
      'work-anon-key',
      'Work Account'
    ),
    createSupabaseAccount(
      'client',
      'https://client-project.supabase.co',
      'client-anon-key',
      'Client Project'
    )
  ]

  const { client, currentAccount, switchAccount, isLoading, error } = useMultiSupabase({
    accounts,
    defaultAccount: 'personal',
    urlParamName: 'account'
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading accounts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No Supabase client available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Multi-Account Supabase Demo
          </h1>
          
          <div className="mb-6">
            <AccountSwitcher
              accounts={accounts}
              currentAccount={currentAccount}
              onAccountSwitch={switchAccount}
              className="mb-4"
            />
            
            {currentAccount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="font-semibold text-blue-800 mb-2">
                  Active Account: {currentAccount.displayName}
                </h2>
                <p className="text-blue-600 text-sm">
                  Alias: {currentAccount.alias} | URL: {currentAccount.url}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              URL-Based Account Switching
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {accounts.map(account => (
                <button
                  key={account.alias}
                  onClick={() => switchAccount(account.alias)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    currentAccount?.alias === account.alias
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{account.displayName}</div>
                  <div className="text-sm opacity-60">{account.alias}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <DataDisplay client={client} currentAccount={currentAccount} />
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">How it works:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Click account buttons to switch between different Supabase instances</li>
              <li>• Check the URL - it updates with ?account=alias parameter</li>
              <li>• Refresh the page - the selected account persists via URL</li>
              <li>• Each account has its own authentication state and data</li>
              <li>• Perfect for multi-tenant applications or managing multiple projects</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}