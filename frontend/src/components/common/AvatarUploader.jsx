import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { uploadProfileAvatar } from '../../api/barberApi';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB

const SIZE_CLASSES = {
  sm: {
    container: 'w-12 h-12',
    text: 'text-base',
    button: 'w-6 h-6',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'w-14 h-14 sm:w-16 sm:h-16',
    text: 'text-xl',
    button: 'w-7 h-7',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'w-24 h-24 sm:w-28 sm:h-28',
    text: 'text-3xl',
    button: 'w-8 h-8 sm:w-9 sm:h-9',
    icon: 'w-4 h-4',
  },
};

export default function AvatarUploader({
  size = 'lg',
  currentImage = null,
  showHint = false,
  onUploadSuccess,
  onError,
  className = '',
}) {
  const { user, updateUser } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);
  const [localError, setLocalError] = useState(null);

  const dims = SIZE_CLASSES[size] || SIZE_CLASSES.lg;

  // Revoke object URL on unmount or when previewUrl changes to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resolvedAvatarUrl = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (currentImage) return currentImage;
    if (user?.avatar) return user.avatar;
    if (
      user?.profile_photo_url &&
      !user.profile_photo_url.includes('ui-avatars.com')
    ) {
      return user.profile_photo_url;
    }
    return null;
  }, [previewUrl, currentImage, user?.avatar, user?.profile_photo_url]);

  // First letter fallback from user.name
  const initialLetter = useMemo(() => {
    const trimmed = (user?.name || 'B').trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'B';
  }, [user?.name]);

  const triggerPicker = () => {
    if (uploading) return;
    setLocalError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError(null);

    // Client-side validation (MIME & 2MB limit)
    if (!ALLOWED_TYPES.includes(file.type)) {
      const msg = isAr
        ? 'يرجى اختيار صورة بصيغة JPEG أو PNG أو WEBP.'
        : 'Format invalide. Choisissez une image JPEG, PNG ou WEBP.';
      setLocalError(msg);
      if (onError) onError(msg);
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      const msg = isAr
        ? 'الحد الأقصى لحجم الصورة هو 2 ميغابايت.'
        : 'La taille de l’image ne doit pas dépasser 2 Mo.';
      setLocalError(msg);
      if (onError) onError(msg);
      e.target.value = '';
      return;
    }

    // 1. Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setImgBroken(false);
    setPreviewUrl(objectUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await uploadProfileAvatar(formData);
      const uploadedUrl = res?.avatar_url || res?.user?.avatar;

      // 2. Immediately update user.avatar inside AuthContext
      if (updateUser) {
        updateUser({
          ...(res?.user || {}),
          avatar: uploadedUrl,
          profile_photo_url: uploadedUrl,
        });
      }

      if (onUploadSuccess) {
        onUploadSuccess(res);
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setPreviewUrl(null);
      let msg = isAr
        ? 'تعذر رفع الصورة. يرجى المحاولة مرة أخرى.'
        : 'Échec de l’envoi de la photo. Veuillez réessayer.';

      if (err.response?.data?.errors?.avatar?.[0]) {
        msg = err.response.data.errors.avatar[0];
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }

      setLocalError(msg);
      if (onError) onError(msg);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const buttonTitle = isAr ? 'تغيير صورة الملف الشخصي' : 'Changer la photo de profil';

  return (
    <div className={`inline-flex flex-col items-start gap-2 ${className}`}>
      <div className="relative inline-block shrink-0">
        {/* Circular Avatar Display */}
        <button
          type="button"
          onClick={triggerPicker}
          disabled={uploading}
          title={buttonTitle}
          aria-label={buttonTitle}
          className={`${dims.container} rounded-full bg-[#10151F] border-2 border-[#D9822B] p-0.5 shadow-lg shadow-[#D9822B]/15 overflow-hidden relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D9822B]/60 disabled:cursor-wait`}
        >
          {resolvedAvatarUrl && !imgBroken ? (
            <img
              src={resolvedAvatarUrl}
              alt={user?.name || 'Avatar'}
              onError={() => setImgBroken(true)}
              className="w-full h-full rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className={`w-full h-full rounded-full bg-gradient-to-br from-[#182030] to-[#10151F] text-[#D9822B] font-black flex items-center justify-center select-none ${dims.text}`}
            >
              {initialLetter}
            </div>
          )}

          {/* Subtle Hover Tint */}
          <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg className={`${dims.icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          {/* Uploading Spinner Overlay */}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-[#10151F]/80 backdrop-blur-[1px] flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#D9822B]/30 border-t-[#D9822B] rounded-full animate-spin" />
            </div>
          )}
        </button>

        {/* Camera Overlay Badge Button */}
        <button
          type="button"
          onClick={triggerPicker}
          disabled={uploading}
          title={buttonTitle}
          aria-label={buttonTitle}
          className={`${dims.button} absolute bottom-0 end-0 rounded-full bg-[#10151F] border-2 border-[#D9822B] text-[#D9822B] hover:bg-[#D9822B] hover:text-[#10151F] flex items-center justify-center shadow-lg transition-colors cursor-pointer disabled:opacity-50`}
        >
          <svg className={dims.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Hidden File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {showHint && (
        <p className="text-[11px] text-slate-400">
          {isAr ? 'JPEG، PNG أو WEBP • الحد الأقصى 2MB' : 'JPEG, PNG ou WEBP • Max 2 Mo'}
        </p>
      )}

      {localError && (
        <p className="text-xs text-red-400 font-medium max-w-xs">{localError}</p>
      )}
    </div>
  );
}

