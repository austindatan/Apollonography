/**
 * src/context/LightboxContext.tsx
 *
 * Global Lightbox Context & Provider for Apollonography.
 * Allows any component or WebView bridge in the app to open enlarged, zoomable,
 * pannable images in a shared neobrutalist lightbox overlay.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ImageLightbox } from '../components/ImageLightbox';

export interface LightboxData {
  source: any;
  title?: string;
}

interface LightboxContextType {
  openLightbox: (source: any, title?: string) => void;
  closeLightbox: () => void;
  isOpen: boolean;
  activeSource: any;
  activeTitle?: string;
}

const LightboxContext = createContext<LightboxContextType>({
  openLightbox: () => {},
  closeLightbox: () => {},
  isOpen: false,
  activeSource: null,
  activeTitle: undefined,
});

export const useLightbox = () => useContext(LightboxContext);

export const LightboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<any>(null);
  const [activeTitle, setActiveTitle] = useState<string | undefined>(undefined);

  const openLightbox = useCallback((source: any, title?: string) => {
    if (!source) return;
    setActiveSource(source);
    setActiveTitle(title);
    setIsOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <LightboxContext.Provider
      value={{
        openLightbox,
        closeLightbox,
        isOpen,
        activeSource,
        activeTitle,
      }}
    >
      {children}
      <ImageLightbox
        visible={isOpen}
        source={activeSource}
        title={activeTitle}
        onClose={closeLightbox}
      />
    </LightboxContext.Provider>
  );
};

export default LightboxContext;
