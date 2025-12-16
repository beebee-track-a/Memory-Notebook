import React from 'react';
import { X, Upload, Check, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UploadedPhoto } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedPhotos: UploadedPhoto[];
  selectedCustomPhotoId: string | null;
  onPhotoUpload: (file: File) => void;
  onPhotoSelect: (photoId: string | null) => void;
  onPhotoDelete: (photoId: string) => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  uploadedPhotos,
  selectedCustomPhotoId,
  onPhotoUpload,
  onPhotoSelect,
  onPhotoDelete,
}: SettingsPanelProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onPhotoUpload(file);
      // Reset input so same file can be selected again
      event.target.value = '';
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    if (selectedCustomPhotoId === photoId) {
      // Unselect - revert to default
      onPhotoSelect(null);
    } else {
      // Select this photo
      onPhotoSelect(photoId);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-black/90 backdrop-blur-xl border-l border-white/10 z-50 p-6 overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-serif text-white">{t('settings:title')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} className="text-white/60" />
          </button>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wider">{t('settings:sections.customPhotos')}</h3>

          {/* Upload Button */}
          <label className="group cursor-pointer relative px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-lg overflow-hidden backdrop-blur-sm flex items-center justify-center gap-2">
            <Upload size={16} className="text-white/80" />
            <span className="text-sm text-white/80 font-medium">{t('settings:actions.uploadPhoto')}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </label>

          <p className="text-xs text-white/40 mt-2">
            {t('settings:instructions.uploadLimit')}
          </p>
        </div>

        {/* Photo Grid */}
        {uploadedPhotos.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wider">{t('settings:sections.yourPhotos')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {uploadedPhotos.map((photo) => {
                const isSelected = selectedCustomPhotoId === photo.id;
                return (
                  <div
                    key={photo.id}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer group ${
                      isSelected
                        ? 'border-emerald-400 shadow-lg shadow-emerald-400/30'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    onClick={() => togglePhotoSelection(photo.id)}
                  >
                    <img
                      src={photo.previewUrl}
                      alt={t('settings:tooltips.customBackground')}
                      className="w-full h-full object-cover"
                    />

                    {/* Selection Checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-black" />
                      </div>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onPhotoDelete(photo.id);
                      }}
                      className="absolute bottom-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-500 rounded-full opacity-100 transition-all z-10"
                      title={t('settings:tooltips.deletePhoto')}
                    >
                      <Trash2 size={12} className="text-white" />
                    </button>

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Default Background Info */}
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-sm text-white/60 mb-2 uppercase tracking-wider">{t('settings:sections.defaultBackground')}</h3>
          <p className="text-sm text-white/80">
            {selectedCustomPhotoId
              ? t('settings:instructions.usingCustom')
              : t('settings:instructions.usingDefault')}
          </p>
        </div>

        {/* Instructions */}
        <div className="mt-8 space-y-2 text-xs text-white/40">
          <p>{t('settings:instructions.clickToUse')}</p>
          <p>{t('settings:instructions.clickToRevert')}</p>
          <p>{t('settings:instructions.hoverToDelete')}</p>
        </div>
      </div>
    </>
  );
}
