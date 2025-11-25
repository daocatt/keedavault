import React, { useState, useEffect } from 'react';
import { Launcher } from './components/Launcher';
import { VaultWorkspace } from './components/VaultWorkspace';
import { AboutModal } from './components/AboutModal';
import { AboutWindow } from './components/AboutWindow';
import { VaultAuthWindow } from './components/VaultAuthWindow';
import { VaultProvider } from './context/VaultContext';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { PhysicalSize } from '@tauri-apps/api/dpi';

const AppContent: React.FC = () => {
  const [authPath, setAuthPath] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('path') || undefined;
  });

  const [mode, setMode] = useState<'launcher' | 'vault' | 'about' | 'auth' | 'create'>(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const actionParam = params.get('action');
    const pathParam = params.get('path');

    console.log('App initializing, params:', Object.fromEntries(params.entries()));

    if (modeParam === 'vault') return 'vault';
    if (modeParam === 'auth') return 'auth';
    if (modeParam === 'create') return 'create';
    if (modeParam === 'about') return 'about';

    if (actionParam === 'unlock' || (actionParam === null && pathParam)) return 'auth';
    if (actionParam === 'create') return 'create';

    return 'launcher';
  });

  // If in about mode, only show AboutWindow
  if (mode === 'about') {
    return <AboutWindow />;
  }

  // If in auth/create mode, show VaultAuthWindow
  if (mode === 'auth' || mode === 'create') {
    return (
      <VaultAuthWindow
        mode={mode === 'create' ? 'create' : 'unlock'}
        path={authPath}
        onSuccess={() => {
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