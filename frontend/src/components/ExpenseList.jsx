export default function ExpenseList({ expenses }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="text-slate-400 text-center py-8">
        No expenses yet
      </div>
    )
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">History</h2>

      <div className="space-y-2">
        {expenses.map(exp => (
          <div key={exp.id} className="bg-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{exp.description || 'Expense'}</div>
                <div className="text-sm text-slate-400">
                  {exp.paid_by_name} • {exp.category} • {formatDate(exp.created_at)}
                </div>
                {exp.splits && exp.splits.length > 0 && (
                  <div className="text-xs text-blue-400 mt-1">
                    Split {exp.splits.length + 1} ways
                  </div>
                )}
              </div>
              <div className="text-xl font-bold">${exp.amount.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
