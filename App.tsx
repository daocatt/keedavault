import React, { useState, useEffect } from 'react';
import { Launcher } from './components/Launcher';
import { VaultWorkspace } from './components/VaultWorkspace';
import { AboutModal } from './components/AboutModal';
import { AboutWindow } from './components/AboutWindow';
import { VaultAuthWindow } from './components/VaultAuthWindow';
import { LargeTypeWindow } from './components/LargeTypeWindow';
import { MarkdownPreviewWindow } from './components/MarkdownPreviewWindow';
import { VaultProvider } from './context/VaultContext';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';

import { PasswordGenerator } from './components/PasswordGenerator';

const AppContent: React.FC = () => {
  const [authPath, setAuthPath] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('path') || undefined;
  });

  const [mode, setMode] = useState<'launcher' | 'vault' | 'about' | 'auth' | 'create' | 'large-type' | 'markdown-preview' | 'generator'>(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const actionParam = params.get('action');
    const pathParam = params.get('path');

    console.log('App initializing, params:', Object.fromEntries(params.entries()));

    if (modeParam === 'vault') return 'vault';
    if (modeParam === 'auth') return 'auth';
    if (modeParam === 'create') return 'create';
    if (modeParam === 'about') return 'about';
    if (modeParam === 'large-type') return 'large-type';
    if (modeParam === 'markdown-preview') return 'markdown-preview';
    if (modeParam === 'generator') return 'generator';

    if (actionParam === 'unlock' || (actionParam === null && pathParam)) return 'auth';
    if (actionParam === 'create') return 'create';

    return 'launcher';
  });

  // If in about mode, only show AboutWindow
  if (mode === 'about') {
    return <AboutWindow />;
  }

  if (mode === 'large-type') {
    return <LargeTypeWindow />;
  }

  if (mode === 'markdown-preview') {
    return <MarkdownPreviewWindow />;
  }

  if (mode === 'generator') {
    return (
      <div className="h-screen w-screen bg-white">
        <div className="h-8 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center justify-center drag-region" data-tauri-drag-region>
          <span className="text-xs font-medium text-gray-500">Password Generator</span>
        </div>
        <div className="p-4">
          <PasswordGenerator
            isOpen={true}
            onClose={() => getCurrentWebviewWindow().close()}
            onGenerate={() => { }}
            showCopyButton={true}
            className="shadow-none border-0 p-0"
            closeOnOutsideClick={false}
            showUseButton={false}
          />
        </div>
      </div>
    );
  }

  // If in auth/create mode, show VaultAuthWindow
  if (mode === 'auth' || mode === 'create') {
    return (
      <VaultAuthWindow
        mode={mode === 'create' ? 'create' : 'unlock'}
        path={authPath}
        onSuccess={async () => {
          // Resize window BEFORE switching to vault mode
          try {
            const win = getCurrentWebviewWindow();
            console.log('App: Resizing window for vault mode...');
            await win.hide(); // Hide window to prevent flash during resize
            await win.setResizable(true);
            await win.setSize(new LogicalSize(1200, 700));
            await win.center();
            console.log('App: Window resized to 1200x700');
          } catch (e) {
            console.error('App: Failed to resize window:', e);
          }
          setMode('vault');
        }}
      />
    );
  }

  return (
    <>
      <AboutModal />
      {mode === 'vault' ? <VaultWorkspace /> : <Launcher />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <VaultProvider>
      <AppContent />
    </VaultProvider>
  );
};

export default App;