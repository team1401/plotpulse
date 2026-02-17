export function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatCost(cost) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(cost)
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export function truncate(str, length) {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getStatusColor(status) {
  const colors = {
    outlining: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    drafting: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    reviewing: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    complete: 'text-green-400 bg-green-400/10 border-green-400/20',
    paused: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    error: 'text-red-400 bg-red-400/10 border-red-400/20',
  }
  return colors[status] || colors.outlining
}

export function getStatusIcon(status) {
  const icons = {
    outlining: 'PenTool',
    drafting: 'Pencil',
    reviewing: 'Eye',
    complete: 'CheckCircle2',
    paused: 'PauseCircle',
    error: 'AlertCircle',
  }
  return icons[status] || 'FileText'
}
