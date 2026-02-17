import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from './stores/useAppStore'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NewNovel from './pages/NewNovel'
import OutlineReview from './pages/OutlineReview'
import GenerationView from './pages/GenerationView'
import NovelReader from './pages/NovelReader'
import StoryBible from './pages/StoryBible'
import Settings from './pages/Settings'
import CostDashboard from './pages/CostDashboard'

export default function App() {
  const theme = useAppStore((state) => state.theme)
  
  useEffect(() => {
    // Apply theme class to html element
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/new" element={<Layout><NewNovel /></Layout>} />
        <Route path="/novel/:id" element={<Layout><NovelReader /></Layout>} />
        <Route path="/novel/:id/outline" element={<Layout><OutlineReview /></Layout>} />
        <Route path="/novel/:id/generate" element={<Layout><GenerationView /></Layout>} />
        <Route path="/novel/:id/bible" element={<Layout><StoryBible /></Layout>} />
        <Route path="/costs" element={<Layout><CostDashboard /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
