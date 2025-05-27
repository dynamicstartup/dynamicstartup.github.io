// =============================================================================
// 1. NEXT.JS IMPLEMENTATION
// =============================================================================

// pages/_app.tsx (Pages Router) or app/layout.tsx (App Router)
import { useMultiSupabase, createSupabaseAccount } from '../hooks/useMultiSupabase'

const accounts = [
  createSupabaseAccount(
    'personal',
    'https://your-personal-project.supabase.co',
    'your-personal-anon-key',
    'Personal Account'
  ),
  createSupabaseAccount(
    'work',
    'https://your-work-project.supabase.co',
    'your-work-anon-key',
    'Work Account'
  ),
  createSupabaseAccount(
    'client',
    'https://your-client-project.supabase.co',
    'your-client-anon-key',
    'Client Project'
  )
]

// pages/dashboard.tsx (Pages Router)
export default function Dashboard() {
  const { client, currentAccount, switchAccount, isLoading, error } = useMultiSupabase({
    accounts,
    defaultAccount: 'personal',
    urlParamName: 'account' // URL: /dashboard?account=work
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!client) return <div>No client available</div>

  return (
    <div>
      <h1>Dashboard - {currentAccount?.displayName}</h1>
      
      <div>
        <label>Switch Account: </label>
        <select 
          value={currentAccount?.alias || ''} 
          onChange={(e) => switchAccount(e.target.value)}
        >
          {accounts.map(account => (
            <option key={account.alias} value={account.alias}>
              {account.displayName}
            </option>
          ))}
        </select>
      </div>

      <SupabaseData client={client} />
    </div>
  )
}

// app/account/[accountAlias]/dashboard/page.tsx (App Router)
export default function AccountDashboard({ params }: { params: { accountAlias: string } }) {
  const { client, currentAccount, switchAccount, isLoading, error } = useMultiSupabase({
    accounts,
    defaultAccount: 'personal',
    pathParamName: 'account' // URL: /account/work/dashboard
  })

  // ... rest of component
}

// =============================================================================
// 2. REACT ROUTER IMPLEMENTATION
// =============================================================================

// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/account/:accountAlias/dashboard" element={<AccountDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

// Dashboard.tsx
import { useMultiSupabase, createSupabaseAccount, AccountSwitcher } from '../hooks/useMultiSupabase'
import { useNavigate } from 'react-router-dom'

const accounts = [
  createSupabaseAccount('personal', 'https://personal.supabase.co', 'key1', 'Personal'),
  createSupabaseAccount('work', 'https://work.supabase.co', 'key2', 'Work'),
]

export function Dashboard() {
  const navigate = useNavigate()
  const { client, currentAccount, switchAccount, accounts: allAccounts, isLoading } = useMultiSupabase({
    accounts,
    defaultAccount: 'personal'
  })

  const handleAccountSwitch = (alias: string) => {
    switchAccount(alias)
    // Optionally navigate to account-specific route
    // navigate(`/account/${alias}/dashboard`)
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h1>Dashboard</h1>
      <AccountSwitcher
        accounts={allAccounts}
        currentAccount={currentAccount}
        onAccountSwitch={handleAccountSwitch}
        className="mb-4 p-2 border rounded"
      />
      
      {client && <DataComponent client={client} />}
    </div>
  )
}

// AccountDashboard.tsx (for path-based routing)
import { useParams } from 'react-router-dom'

export function AccountDashboard() {
  const { accountAlias } = useParams<{ accountAlias: string }>()
  
  const { client, currentAccount, isLoading } = useMultiSupabase({
    accounts,
    pathParamName: 'account' // This will pick up the accountAlias from URL
  })

  // ... component logic
}

// =============================================================================
// 3. TANSTACK ROUTER IMPLEMENTATION
// =============================================================================

// router.tsx
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

const rootRoute = createRootRoute()

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  validateSearch: (search) => ({
    account: (search.account as string) || 'personal',
  }),
  component: Dashboard,
})

const accountDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account/$accountAlias/dashboard',
  component: AccountDashboard,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  accountDashboardRoute,
])

export const router = createRouter({ routeTree })

// Dashboard.tsx (with search params)
import { useSearch, useNavigate } from '@tanstack/react-router'

export function Dashboard() {
  const search = useSearch({ from: '/dashboard' })
  const navigate = useNavigate()
  
  const { client, currentAccount, switchAccount, isLoading } = useMultiSupabase({
    accounts,
    defaultAccount: search.account || 'personal'
  })

  const handleAccountSwitch = (alias: string) => {
    switchAccount(alias)
    navigate({ 
      to: '/dashboard', 
      search: { account: alias },
      replace: true 
    })
  }

  // ... rest of component
}

// AccountDashboard.tsx (with path params)
import { useParams } from '@tanstack/react-router'

export function AccountDashboard() {
  const { accountAlias } = useParams({ from: '/account/$accountAlias/dashboard' })
  
  const { client, currentAccount, isLoading } = useMultiSupabase({
    accounts,
    pathParamName: 'account'
  })

  // ... component logic
}

// =============================================================================
// 4. SHARED DATA COMPONENT EXAMPLE
// =============================================================================

// components/SupabaseData.tsx
import { useEffect, useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'

interface SupabaseDataProps {
  client: SupabaseClient
}

export function SupabaseData({ client }: SupabaseDataProps) {
  const [user, setUser] = useState(null)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await client.auth.getUser()
      setUser(user)

      // Fetch some data (example)
      const { data: tableData } = await client
        .from('your_table')
        .select('*')
        .limit(10)
      
      setData(tableData || [])
      setLoading(false)
    }

    fetchData()

    // Listen to auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [client])

  if (loading) return <div>Loading data...</div>

  return (
    <div>
      <div>
        <strong>Current User:</strong> {user?.email || 'Not authenticated'}
      </div>
      
      <div>
        <strong>Data Count:</strong> {data.length} records
      </div>

      <button 
        onClick={() => client.auth.signInWithOAuth({ provider: 'google' })}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Sign In with Google
      </button>
    </div>
  )
}

// =============================================================================
// 5. USAGE PATTERNS & EXAMPLES
// =============================================================================

// Pattern 1: URL Query Parameter
// URL: /dashboard?account=work
// Hook config: { urlParamName: 'account' }

// Pattern 2: Path Parameter  
// URL: /account/work/dashboard
// Hook config: { pathParamName: 'account' }

// Pattern 3: Mixed approach
// You can use both and the hook will check both (path takes precedence)

// Pattern 4: Programmatic switching
function MyComponent() {
  const { switchAccount } = useMultiSupabase({ accounts })
  
  return (
    <button onClick={() => switchAccount('work')}>
      Switch to Work Account
    </button>
  )
}

// Pattern 5: Account-specific components
function AccountSpecificFeature({ accountAlias }: { accountAlias: string }) {
  const workOnlyAccounts = accounts.filter(acc => acc.alias === 'work')
  
  const { client } = useMultiSupabase({
    accounts: workOnlyAccounts,
    defaultAccount: accountAlias
  })

  // This component only works with work account
  return client ? <WorkFeature client={client} /> : <div>Access denied</div>
}