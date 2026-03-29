import { useState } from 'react'

const API = import.meta.env.VITE_API_URL || '/api'

export default function Balance({ balance, users, onSettle }) {
  const [settling, setSettling] = useState(false)

  if (!balance || !balance.simplified) {
    return <div className="text-slate-400 text-center">Loading...</div>
  }

  const userMap = Object.fromEntries(users.map(u => [u.id, u.name]))

  const handleSettle = async (fromId, toId, amount) => {
    setSettling(true)
    await fetch(`${API}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_user: fromId, to_user: toId, amount })
    })
    setSettling(false)
    onSettle()
  }

  // Find who owes whom
  const debts = []
  if (balance.detailed) {
    Object.entries(balance.detailed).forEach(([userId, data]) => {
      Object.entries(data.owes).forEach(([owedTo, amount]) => {
        if (amount > 0.01) {
          debts.push({
            from: parseInt(userId),
            to: parseInt(owedTo),
            amount: amount.toFixed(2)
          })
        }
      })
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Balance</h2>

      {/* Net positions */}
      <div className="bg-slate-800 rounded-lg p-4 space-y-2">
        {Object.entries(balance.simplified).map(([userId, data]) => (
          <div key={userId} className="flex justify-between items-center">
            <span className="font-medium">{data.name}</span>
            <span className={`font-bold ${data.net > 0 ? 'text-green-400' : data.net < 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {data.net > 0 ? '+' : ''}{data.net.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Outstanding debts */}
      {debts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-slate-300">Outstanding</h3>
          {debts.map((debt, i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 flex justify-between items-center">
              <div>
                <span className="text-red-400">{userMap[debt.from]}</span>
                <span className="text-slate-400"> owes </span>
                <span className="text-green-400">{userMap[debt.to]}</span>
                <span className="font-bold ml-2">${debt.amount}</span>
              </div>
              <button
                onClick={() => handleSettle(debt.from, debt.to, parseFloat(debt.amount))}
                disabled={settling}
                className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
              >
                Settle
              </button>
            </div>
          ))}
        </div>
      )}

      {debts.length === 0 && (
        <div className="text-slate-400 text-center py-4">
          All settled up!
        </div>
      )}
    </div>
  )
}
