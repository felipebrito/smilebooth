import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileCard from '../components/ProfileCard';
import { generateMultipleProfiles, GeneratedProfile } from '../utils/nameGenerator';

interface CapturedImage {
  id: string;
  filename: string;
  timestamp: string;
  faceProcessed: boolean;
  imageUrl: string;
}

const GalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [profiles, setProfiles] = useState<GeneratedProfile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load images from backend
  useEffect(() => {
    const loadImages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:3002/api/captures?limit=100');
        if (response.ok) {
          const result = await response.json();
          const loadedImages = result.data.map((capture: any) => ({
            id: capture.id,
            filename: capture.original_path,
            timestamp: capture.timestamp,
            faceProcessed: capture.face_coordinates ? true : false,
            imageUrl: `http://localhost:3002/captures/${capture.original_path}`
          }));
          setImages(loadedImages);
          
          // Generate profiles for each image
          if (loadedImages.length > 0) {
            const generatedProfiles = generateMultipleProfiles(loadedImages.length);
            setProfiles(generatedProfiles);
          }
        } else {
          setError('Erro ao carregar imagens');
        }
      } catch (err) {
        setError('Erro de conexão com o servidor');
        console.error('Error loading images:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, []);

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
  };

  const handlePrevious = () => {
    setSelectedIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
  };

  const handleNext = () => {
    setSelectedIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
  };

  const handleContactClick = (profile: GeneratedProfile) => {
    console.log(`Contacting ${profile.name} (@${profile.handle})`);
    alert(`Contatando ${profile.name} (@${profile.handle})`);
  };

  const handleDownload = () => {
    if (images[selectedIndex]) {
      const link = document.createElement('a');
      link.href = images[selectedIndex].imageUrl;
      link.download = images[selectedIndex].filename;
      link.click();
    }
  };

  const handleCopyUrl = () => {
    if (images[selectedIndex]) {
      navigator.clipboard.writeText(images[selectedIndex].imageUrl);
      alert('URL copiada para a área de transferência!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando galeria...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Erro ao carregar galeria</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📸</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Nenhuma foto capturada ainda
          </h2>
          <p className="text-gray-600 mb-6">
            Sorria para a câmera ou pressione espaço para capturar!
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Voltar para Câmera
          </button>
        </div>
      </div>
    );
  }

  const selectedImage = images[selectedIndex];
  const selectedProfile = profiles[selectedIndex];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Galeria de Sorrisos</h1>
              <p className="text-gray-600">
                {images.length} foto{images.length !== 1 ? 's' : ''} capturada{images.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Voltar para Câmera
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Display Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Navigation Controls */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handlePrevious}
                      className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      disabled={images.length <= 1}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-sm text-gray-600">
                      {selectedIndex + 1} de {images.length}
                    </span>
                    <button
                      onClick={handleNext}
                      className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      disabled={images.length <= 1}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleDownload}
                      className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                    >
                      📥 Baixar
                    </button>
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      📋 Copiar URL
                    </button>
                  </div>
                </div>
              </div>

              {/* ProfileCard Display */}
              <div className="p-6">
                {selectedImage && selectedProfile && (
                  <div className="flex justify-center">
                    <ProfileCard
                      avatarUrl={selectedImage.imageUrl}
                      name={selectedProfile.name}
                      title={selectedProfile.title}
                      handle={selectedProfile.handle}
                      status={selectedProfile.status}
                      contactText="Ver Detalhes"
                      showUserInfo={true}
                      enableTilt={true}
                      enableMobileTilt={false}
                      onContactClick={() => handleContactClick(selectedProfile)}
                      className="w-full max-w-sm"
                    />
                  </div>
                )}
              </div>

              {/* Image Info */}
              <div className="p-4 border-t bg-gray-50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Arquivo:</span>
                    <p className="text-gray-600">{selectedImage?.filename}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Data:</span>
                    <p className="text-gray-600">
                      {selectedImage ? new Date(selectedImage.timestamp).toLocaleString('pt-BR') : ''}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Processado:</span>
                    <p className="text-gray-600">
                      {selectedImage?.faceProcessed ? '✅ Sim' : '❌ Não'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">ID:</span>
                    <p className="text-gray-600">{selectedImage?.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Thumbnail Gallery */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Miniaturas</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {images.map((image, index) => {
                  const profile = profiles[index];
                  return (
                    <div
                      key={image.id}
                      className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                        index === selectedIndex
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleThumbnailClick(index)}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={image.imageUrl}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {profile?.name || `Foto ${index + 1}`}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {profile?.title || 'Captura'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(image.timestamp).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GalleryPage;
