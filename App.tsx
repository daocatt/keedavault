import React, { useState, useEffect } from 'react';
import { Launcher } from './components/Launcher';
import { VaultWorkspace } from './components/VaultWorkspace';
import { AboutModal } from './components/AboutModal';
import { AboutWindow } from './components/AboutWindow';
import { VaultAuthWindow } from './components/VaultAuthWindow';
import { LargeTypeWindow } from './components/LargeTypeWindow';
import { MarkdownPreviewWindow } from './components/MarkdownPreviewWindow';
import { SettingsWindow } from './components/SettingsWindow';
import { VaultProvider } from './context/VaultContext';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { ThemeManager } from './components/ThemeManager';

import { PasswordGenerator } from './components/PasswordGenerator';

const AppContent: React.FC = () => {
  const [authPath, setAuthPath] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('path') || undefined;
  });

  const [mode, setMode] = useState<'launcher' | 'vault' | 'about' | 'auth' | 'create' | 'large-type' | 'markdown-preview' | 'generator' | 'settings'>(() => {
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
    if (modeParam === 'settings') return 'settings';

    if (actionParam === 'unlock' || (actionParam === null && pathParam)) return 'auth';
    if (actionParam === 'create') return 'create';
    if (actionParam === 'browse') return 'launcher';

    return 'launcher';
  });

  // Show window after content is ready to prevent flash
  useEffect(() => {
    const showWindow = async () => {
      // Delay to ensure the background is fully painted and stable
      setTimeout(async () => {
        const window = getCurrentWebviewWindow();
        await window.show();
        await window.setFocus();
      }, 200);
    };
    showWindow();
  }, []);

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

  if (mode === 'settings') {
    return <SettingsWindow />;
  }

  if (mode === 'generator') {
    return (
      <div className="h-screen w-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="h-8 backdrop-blur-sm border-b flex items-center justify-center drag-region select-none"
          data-tauri-drag-region
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border-light)',
            opacity: 0.95
          }}
        >
          <span className="text-xs font-medium pointer-events-none" style={{ color: 'var(--color-text-secondary)' }}>Password Generator</span>
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
      <ThemeManager />
      <AppContent />
    </VaultProvider>
  );
};

export default App;