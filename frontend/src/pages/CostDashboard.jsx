import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { api } from '../utils/api'
import { formatCost, formatNumber } from '../utils/format'
import Card from '../components/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const MODEL_COLORS = {
  'claude-sonnet-4': '#0ea5e9',
  'claude-sonnet-4-20250514': '#0ea5e9',
  'claude-opus-4': '#d946ef',
  'claude-opus-4-20250514': '#d946ef',
  'gpt-4o': '#10b981',
  'gpt-o1': '#f59e0b',
}

export default function CostDashboard() {
  const { novels } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    byNovel: [],
    byModel: [],
    byChapter: []
  })
  
  useEffect(() => {
    loadStats()
  }, [novels])
  
  const loadStats = async () => {
    try {
      // Calculate aggregate stats from novels
      const getCost = (n) => n.totalCost || n.total_cost || 0
      const getWords = (n) => n.currentWordCount || n.current_word_count || n.wordCount || 0
      const getModel = (n) => n.modelName || n.model_name || n.model || 'unknown'
      
      const total = novels.reduce((sum, novel) => sum + getCost(novel), 0)
      
      const byNovel = novels
        .map(novel => ({
          name: novel.title,
          cost: getCost(novel),
          wordCount: getWords(novel),
          model: getModel(novel)
        }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 10)
      
      // Group by model
      const modelMap = {}
      novels.forEach(novel => {
        const model = getModel(novel)
        if (!modelMap[model]) {
          modelMap[model] = { name: model, cost: 0, novels: 0 }
        }
        modelMap[model].cost += getCost(novel)
        modelMap[model].novels += 1
      })
      const byModel = Object.values(modelMap)
      
      // Mock chapter-level data (in real app, fetch from API)
      const byChapter = []
      
      setStats({ total, byNovel, byModel, byChapter })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading cost data...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Cost Analytics
        </h1>
        <p className="text-slate-400 text-lg">
          Track your AI generation spending
        </p>
      </motion.div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card gradient className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-400">Total Spend</div>
              <div className="text-3xl font-bold text-white">
                {formatCost(stats.total)}
              </div>
            </div>
          </div>
        </Card>
        
        <Card gradient className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-400">Novels Generated</div>
              <div className="text-3xl font-bold text-white">
                {novels.length}
              </div>
            </div>
          </div>
        </Card>
        
        <Card gradient className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-slate-400">Avg Cost/Novel</div>
              <div className="text-3xl font-bold text-white">
                {novels.length > 0 ? formatCost(stats.total / novels.length) : '$0.00'}
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cost by Novel */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            Cost by Novel
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.byNovel}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8' }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value) => formatCost(value)}
              />
              <Bar dataKey="cost" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        
        {/* Cost by Model */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary-400" />
            Cost by Model
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.byModel}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="cost"
              >
                {stats.byModel.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={MODEL_COLORS[entry.name] || '#6366f1'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value) => formatCost(value)}
              />
              <Legend
                wrapperStyle={{ color: '#94a3b8' }}
                formatter={(value) => value}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      
      {/* Novel Breakdown Table */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-white mb-6">Detailed Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Novel</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Model</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Words</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Cost</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">$/1K Words</th>
              </tr>
            </thead>
            <tbody>
              {stats.byNovel.map((novel, index) => {
                const costPer1K = novel.wordCount > 0 
                  ? (novel.cost / novel.wordCount) * 1000 
                  : 0
                
                return (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-all"
                  >
                    <td className="py-3 px-4 text-white">{novel.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded text-xs font-medium" style={{
                        backgroundColor: `${MODEL_COLORS[novel.model] || '#6366f1'}20`,
                        color: MODEL_COLORS[novel.model] || '#6366f1'
                      }}>
                        {novel.model}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {formatNumber(novel.wordCount)}
                    </td>
                    <td className="py-3 px-4 text-right text-white font-medium">
                      {formatCost(novel.cost)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {formatCost(costPer1K)}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
