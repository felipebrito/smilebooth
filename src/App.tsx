import WebcamView from './components/WebcamView'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-center py-4 text-gray-800">
            SmileBooth
          </h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <WebcamView />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Capture Gallery</h2>
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              <p>Your captured smiles will appear here</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
