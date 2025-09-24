import React, { useState, useEffect } from 'react';
import ProfileCard from './ProfileCard';
import { generateMultipleProfiles, GeneratedProfile } from '../utils/nameGenerator';

interface CapturedImage {
  id: string;
  filename: string;
  timestamp: string;
  faceProcessed: boolean;
  imageUrl: string;
}

interface GalleryProps {
  images: CapturedImage[];
  onRefresh?: () => void;
}

const Gallery: React.FC<GalleryProps> = ({ images, onRefresh }) => {
  const [profiles, setProfiles] = useState<GeneratedProfile[]>([]);
  const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Generate profiles for each image
  useEffect(() => {
    if (images.length > 0) {
      const generatedProfiles = generateMultipleProfiles(images.length);
      setProfiles(generatedProfiles);
      setIsLoading(false);
    }
  }, [images]);

  const handleImageClick = (image: CapturedImage) => {
    setSelectedImage(image);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleContactClick = (profile: GeneratedProfile) => {
    console.log(`Contacting ${profile.name} (@${profile.handle})`);
    // Aqui você pode implementar a lógica de contato
    alert(`Contatando ${profile.name} (@${profile.handle})`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando galeria...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📸</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Nenhuma foto capturada ainda
        </h3>
        <p className="text-gray-500 mb-4">
          Sorria para a câmera ou pressione espaço para capturar!
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Atualizar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Galeria de Sorrisos
          </h2>
          <p className="text-gray-600">
            {images.length} foto{images.length !== 1 ? 's' : ''} capturada{images.length !== 1 ? 's' : ''}
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        )}
      </div>

      {/* Grid de ProfileCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((image, index) => {
          const profile = profiles[index];
          if (!profile) return null;

          return (
            <div
              key={image.id}
              className="cursor-pointer transform transition-transform hover:scale-105"
              onClick={() => handleImageClick(image)}
            >
              <ProfileCard
                avatarUrl={image.imageUrl}
                name={profile.name}
                title={profile.title}
                handle={profile.handle}
                status={profile.status}
                contactText="Ver Detalhes"
                showUserInfo={true}
                enableTilt={true}
                enableMobileTilt={false}
                onContactClick={() => handleContactClick(profile)}
                className="w-full h-80"
              />
            </div>
          );
        })}
      </div>

      {/* Modal para visualização detalhada */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Detalhes da Captura</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <img
                    src={selectedImage.imageUrl}
                    alt="Captured smile"
                    className="w-full h-64 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700">Informações</h4>
                    <div className="mt-2 space-y-2 text-sm text-gray-600">
                      <p><strong>ID:</strong> {selectedImage.id}</p>
                      <p><strong>Arquivo:</strong> {selectedImage.filename}</p>
                      <p><strong>Data:</strong> {new Date(selectedImage.timestamp).toLocaleString('pt-BR')}</p>
                      <p><strong>Processado:</strong> {selectedImage.faceProcessed ? 'Sim' : 'Não'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700">Ações</h4>
                    <div className="mt-2 space-y-2">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = selectedImage.imageUrl;
                          link.download = selectedImage.filename;
                          link.click();
                        }}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        📥 Baixar Imagem
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedImage.imageUrl);
                          alert('URL copiada para a área de transferência!');
                        }}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        📋 Copiar URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
