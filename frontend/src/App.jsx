import { useState, useEffect } from 'react'
import AddExpense from './components/AddExpense'
import Balance from './components/Balance'
import ExpenseList from './components/ExpenseList'
import Stats from './components/Stats'

const API = '/api'

function App() {
  const [view, setView] = useState('balance')
  const [users, setUsers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [balance, setBalance] = useState(null)
  const [stats, setStats] = useState(null)

  const fetchData = async () => {
    try {
      const [usersRes, expensesRes, balanceRes, statsRes] = await Promise.all([
        fetch(`${API}/users`),
        fetch(`${API}/expenses`),
        fetch(`${API}/balance`),
        fetch(`${API}/stats`)
      ])
      setUsers(await usersRes.json())
      setExpenses(await expensesRes.json())
      setBalance(await balanceRes.json())
      setStats(await statsRes.json())
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const initUsers = async () => {
    await fetch(`${API}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'tuzi' })
    })
    await fetch(`${API}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Catherine' })
    })
    fetchData()
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

      {view === 'balance' && <Balance balance={balance} users={users} onSettle={fetchData} />}
      {view === 'add' && <AddExpense users={users} onAdd={fetchData} />}
      {view === 'history' && <ExpenseList expenses={expenses} />}
      {view === 'stats' && <Stats stats={stats} />}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700">
        <div className="max-w-md mx-auto flex">
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
        </div>
      </nav>
    </div>
  )
}

export default App
