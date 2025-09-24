import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import WebcamView from './components/WebcamView'
import GalleryPage from './pages/GalleryPage'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link to="/" className="text-3xl font-bold text-gray-800 hover:text-blue-600 transition-colors">
                SmileBooth
              </Link>
              <nav className="flex space-x-4">
                <Link
                  to="/"
                  className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  📷 Câmera
                </Link>
                <Link
                  to="/gallery"
                  className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  🖼️ Galeria
                </Link>
              </nav>
            </div>
          </div>
        </header>
        
        <main>
          <Routes>
            <Route 
              path="/" 
              element={
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <ErrorBoundary>
                        <WebcamView />
                      </ErrorBoundary>
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold text-gray-700">Instruções</h2>
                      <div className="bg-white rounded-lg shadow p-6 space-y-4">
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">📸</div>
                          <div>
                            <h3 className="font-semibold text-gray-800">Captura Manual</h3>
                            <p className="text-gray-600 text-sm">Pressione a tecla <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Espaço</kbd> para capturar uma foto</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">😊</div>
                          <div>
                            <h3 className="font-semibold text-gray-800">Captura Automática</h3>
                            <p className="text-gray-600 text-sm">Sorria para a câmera e a foto será capturada automaticamente</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">🎨</div>
                          <div>
                            <h3 className="font-semibold text-gray-800">Processamento</h3>
                            <p className="text-gray-600 text-sm">As fotos são processadas com remoção de fundo em tempo real</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">🖼️</div>
                          <div>
                            <h3 className="font-semibold text-gray-800">Galeria</h3>
                            <p className="text-gray-600 text-sm">Visualize todas as fotos capturadas na galeria interativa</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              } 
            />
            <Route 
              path="/gallery" 
              element={
                <ErrorBoundary>
                  <GalleryPage />
                </ErrorBoundary>
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App