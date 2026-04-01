import { useState, useEffect, useCallback } from 'react'
import AddExpense from './components/AddExpense'
import Balance from './components/Balance'
import ExpenseList from './components/ExpenseList'
import Stats from './components/Stats'

const API = import.meta.env.VITE_API_URL || '/api'
const VERSION = '1.1.0'

function App() {
  const [view, setView] = useState('balance')
  const [users, setUsers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [balance, setBalance] = useState(null)
  const [stats, setStats] = useState(null)
  const [pin, setPin] = useState(localStorage.getItem('budget-pin') || '')
  const [authed, setAuthed] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  const headers = { 'X-Budget-Pin': pin }

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, expensesRes, balanceRes, statsRes] = await Promise.all([
        fetch(`${API}/users`, { headers }),
        fetch(`${API}/expenses`, { headers }),
        fetch(`${API}/balance`, { headers }),
        fetch(`${API}/stats`, { headers })
      ])
      if (usersRes.status === 401) {
        setAuthed(false)
        localStorage.removeItem('budget-pin')
        return
      }
      setUsers(await usersRes.json())
      setExpenses(await expensesRes.json())
      setBalance(await balanceRes.json())
      setStats(await statsRes.json())
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }, [pin])

  // Try stored PIN on mount
  useEffect(() => {
    if (pin) {
      fetch(`${API}/auth/verify`, { method: 'POST', headers: { 'X-Budget-Pin': pin } })
        .then(res => {
          if (res.ok) {
            setAuthed(true)
          } else {
            setAuthed(false)
            localStorage.removeItem('budget-pin')
            setPin('')
          }
        })
        .catch(() => setAuthed(false))
    }
  }, [])

  useEffect(() => {
    if (authed) fetchData()
  }, [authed, fetchData])

  const handleLogin = async (e) => {
    e.preventDefault()
    setPinError('')
    try {
      const res = await fetch(`${API}/auth/verify`, {
        method: 'POST',
        headers: { 'X-Budget-Pin': pinInput }
      })
      if (res.ok) {
        setPin(pinInput)
        localStorage.setItem('budget-pin', pinInput)
        setAuthed(true)
      } else {
        setPinError('Wrong PIN')
      }
    } catch {
      setPinError('Could not connect to server')
    }
  }

  const initUsers = async () => {
    await fetch(`${API}/users`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Catherine' })
    })
    await fetch(`${API}/users`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'tuzi' })
    })
    fetchData()
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-xs">
          <h1 className="text-2xl font-bold text-center mb-8">Budget Tracker</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter PIN"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-full bg-slate-800 rounded-lg p-4 text-center text-2xl tracking-widest"
              autoFocus
            />
            {pinError && (
              <div className="text-red-400 text-center text-sm">{pinError}</div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
            >
              Unlock
            </button>
          </form>
          <div className="text-center text-slate-600 text-xs mt-8">v{VERSION}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <h1 className="text-2xl font-bold text-center mb-6">Budget Tracker</h1>

      {users.length === 0 && (
        <button
          onClick={initUsers}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mb-6"
        >
          Set Up (tuzi & Catherine)
        </button>
      )}

      {view === 'balance' && <Balance balance={balance} users={users} onSettle={fetchData} pin={pin} />}
      {view === 'add' && <AddExpense users={users} onAdd={fetchData} pin={pin} />}
      {view === 'history' && <ExpenseList expenses={expenses} />}
      {view === 'stats' && <Stats stats={stats} />}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700">
        <div className="max-w-md mx-auto flex items-center">
          {['balance', 'add', 'history', 'stats'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-4 text-sm font-medium ${
                view === v ? 'text-blue-400 border-t-2 border-blue-400' : 'text-slate-400'
              }`}
            >
              {v === 'add' ? '+ Add' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          <span className="text-slate-700 text-[10px] pr-2">v{VERSION}</span>
        </div>
      </nav>
    </div>
  )
}

export default App
