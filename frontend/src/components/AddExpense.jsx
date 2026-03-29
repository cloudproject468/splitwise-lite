import { useState, useRef } from 'react'

const API = '/api'

const CATEGORIES = ['groceries', 'dining', 'utilities', 'transport', 'entertainment', 'other']

export default function AddExpense({ users, onAdd }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')
  const [paidBy, setPaidBy] = useState(users[0]?.id || '')
  const [splitWith, setSplitWith] = useState([])
  const [loading, setLoading] = useState(false)
  const [receiptMode, setReceiptMode] = useState(false)
  const fileRef = useRef()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || !paidBy) return

    setLoading(true)
    await fetch(`${API}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(amount),
        description,
        category,
        paid_by: parseInt(paidBy),
        split_with: splitWith.map(Number)
      })
    })
    setLoading(false)
    setAmount('')
    setDescription('')
    setSplitWith([])
    onAdd()
  }

  const handleReceipt = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('paid_by', paidBy)
    formData.append('split_with', splitWith.join(','))
    formData.append('category', category)

    const res = await fetch(`${API}/expenses/receipt`, {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    setLoading(false)

    if (data.error) {
      alert(`OCR failed: ${data.error}`)
    } else {
      alert(`Added expense: $${data.amount}`)
      onAdd()
    }
  }

  const toggleSplit = (userId) => {
    if (splitWith.includes(userId)) {
      setSplitWith(splitWith.filter(id => id !== userId))
    } else {
      setSplitWith([...splitWith, userId])
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Add Expense</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setReceiptMode(false)}
          className={`flex-1 py-2 rounded-lg font-medium ${!receiptMode ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
          Manual
        </button>
        <button
          onClick={() => setReceiptMode(true)}
          className={`flex-1 py-2 rounded-lg font-medium ${receiptMode ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
          Receipt
        </button>
      </div>

      {!receiptMode ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-slate-800 rounded-lg p-3 text-xl font-bold"
            required
          />

          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-slate-800 rounded-lg p-3"
          />

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-slate-800 rounded-lg p-3"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div>
            <label className="text-sm text-slate-400">Paid by</label>
            <select
              value={paidBy}
              onChange={e => setPaidBy(e.target.value)}
              className="w-full bg-slate-800 rounded-lg p-3 mt-1"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400">Split with</label>
            <div className="flex gap-2 mt-1">
              {users.filter(u => u.id !== parseInt(paidBy)).map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleSplit(u.id)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    splitWith.includes(u.id) ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400">Paid by</label>
            <select
              value={paidBy}
              onChange={e => setPaidBy(e.target.value)}
              className="w-full bg-slate-800 rounded-lg p-3 mt-1"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-400">Split with</label>
            <div className="flex gap-2 mt-1">
              {users.filter(u => u.id !== parseInt(paidBy)).map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleSplit(u.id)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    splitWith.includes(u.id) ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-slate-800 rounded-lg p-3"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceipt}
            className="hidden"
          />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-lg font-bold disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Snap Receipt'}
          </button>
        </div>
      )}
    </div>
  )
}
