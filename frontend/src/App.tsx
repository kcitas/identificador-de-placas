import { Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import { Dashboard } from './pages/Dashboard'
import { Scanner } from './pages/Scanner'
import { History } from './pages/History'
import { RecognitionDetail } from './pages/RecognitionDetail'
import { Statistics } from './pages/Statistics'

function App() {
  return (
    <div className="flex min-h-dvh flex-col sm:flex-col-reverse">
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4 sm:pb-8 sm:pt-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/history" element={<History />} />
          <Route path="/recognitions/:id" element={<RecognitionDetail />} />
          <Route path="/statistics" element={<Statistics />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
