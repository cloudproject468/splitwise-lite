import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Stats({ stats }) {
  if (!stats) {
    return <div className="text-slate-400 text-center">Loading...</div>
  }

  const categoryData = Object.entries(stats.by_category || {}).map(([name, value]) => ({
    name,
    value
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Stats</h2>

      <div className="bg-slate-800 rounded-lg p-4 text-center">
        <div className="text-slate-400 text-sm">Total Spent</div>
        <div className="text-3xl font-bold">${(stats.total || 0).toFixed(2)}</div>
      </div>

      {/* By category chart */}
      {categoryData.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">By Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* By user */}
      {stats.by_user && Object.keys(stats.by_user).length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">By Person</h3>
          <div className="space-y-2">
            {Object.entries(stats.by_user).map(([name, amount]) => (
              <div key={name} className="flex justify-between">
                <span>{name}</span>
                <span className="font-bold">${amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
