import React, { useState, useRef } from 'react';
import { editImage } from '../services/geminiService';
import { Image as ImageIcon, Wand2, Upload, Download, X } from 'lucide-react';

export const VisualEditor: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Keep the full data URL for display, split for API if needed (API wrapper handles parsing)
        setSelectedImage(base64String);
        setGeneratedImage(null); // Reset generated image when new one selected
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!selectedImage || !prompt.trim()) return;

    setIsLoading(true);
    try {
        // Strip the data:image/xyz;base64, prefix for the API call
        const base64Data = selectedImage.split(',')[1];
        const mimeType = selectedImage.substring(selectedImage.indexOf(':') + 1, selectedImage.indexOf(';'));
        
        const result = await editImage(base64Data, prompt, mimeType);
        if (result) {
            setGeneratedImage(result);
        } else {
            alert('No se pudo generar la imagen. Intenta de nuevo.');
        }
    } catch (error) {
        console.error(error);
        alert('Error conectando con la IA.');
    } finally {
        setIsLoading(false);
    }
  };

  const clearAll = () => {
    setSelectedImage(null);
    setGeneratedImage(null);
    setPrompt('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-purple-950/50 p-6 rounded-2xl border-2 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-urban text-green-400 tracking-wider">ESTUDIO VISUAL (BETA)</h2>
        <Wand2 className="text-pink-400 w-6 h-6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Section */}
        <div className="space-y-4">
          <div 
            className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center relative overflow-hidden transition-all ${selectedImage ? 'border-green-500/50' : 'border-purple-600 hover:bg-purple-900/20'}`}
          >
            {selectedImage ? (
              <>
                <img src={selectedImage} alt="Original" className="w-full h-full object-contain" />
                <button 
                    onClick={clearAll}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                    <X size={16} />
                </button>
              </>
            ) : (
              <div 
                className="text-center cursor-pointer p-8 w-full h-full flex flex-col items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-purple-400 mb-2" />
                <p className="text-purple-200 font-bold">Sube tu foto o flyer</p>
                <p className="text-purple-400 text-xs mt-2">Haz click para seleccionar</p>
              </div>
            )}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-purple-300">INSTRUCCIÓN MÁGICA (IA)</label>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: 'Añade un fondo de ciudad futurista morada', 'Ponle un filtro de cómic', 'Añade humo y luces de neón'..."
                className="w-full bg-black/40 border border-purple-600 rounded-lg p-3 text-white placeholder-purple-500/50 focus:border-green-400 focus:outline-none min-h-[100px]"
            />
          </div>

          <button
            onClick={handleEdit}
            disabled={!selectedImage || !prompt.trim() || isLoading}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                !selectedImage || !prompt.trim() || isLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/30'
            }`}
          >
            {isLoading ? (
                <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    GENERANDO...
                </>
            ) : (
                <>
                    <Wand2 size={20} />
                    TRANSFORMAR IMAGEN
                </>
            )}
          </button>
        </div>

        {/* Output Section */}
        <div className="bg-black/40 rounded-xl border border-purple-700/50 p-4 flex flex-col h-full min-h-[300px]">
            <h3 className="text-purple-300 font-bold mb-4 flex items-center gap-2">
                <ImageIcon size={18} />
                RESULTADO
            </h3>
            
            <div className="flex-1 flex items-center justify-center bg-black/20 rounded-lg border border-purple-900 overflow-hidden relative">
                {generatedImage ? (
                    <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                ) : (
                    <div className="text-center text-purple-600/50">
                        <p className="font-urban text-2xl mb-2">?</p>
                        <p className="text-sm">El resultado aparecerá aquí</p>
                    </div>
                )}
            </div>

            {generatedImage && (
                <a 
                    href={generatedImage} 
                    download="flyer-freestyle.png"
                    className="mt-4 bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors"
                >
                    <Download size={18} />
                    DESCARGAR
                </a>
            )}
        </div>

      </div>
    </div>
  );
};