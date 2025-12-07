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
import { GeneratorWindow } from './components/GeneratorWindow';

const AppContent: React.FC = () => {
  const [authPath, setAuthPath] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    const pathParam = params.get('path');
    console.log('[App] authPath initialization - path param:', pathParam);
    return pathParam || undefined;
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
    // About, Settings, and Generator windows handle their own show() calls with RAF
    // Only launcher needs a timeout because it's the initial window with more setup
    console.log('[App] Mode:', mode, 'Initializing window show');

    // For launcher, use minimal delay to ensure theme is applied
    // For others (Settings, About, etc.), use a small delay as safety net
    // in case component-level RAF fails
    const delay = mode === 'launcher' ? 50 : 100;

    const timer = setTimeout(async () => {
      try {
        console.log(`[App] Showing window for mode: ${mode}`);
        const window = getCurrentWebviewWindow();

        // Ensure window is ready
        const isVisible = await window.isVisible();
        console.log(`[App] Window visible before show: ${isVisible}`);

        if (!isVisible) {
          await window.show();
          console.log('[App] Window.show() called');
        }

        await window.setFocus();
        console.log('[App] Window shown and focused successfully');
      } catch (error) {
        console.error(`[App] Failed to show window for mode ${mode}:`, error);
        // Try one more time after a delay
        setTimeout(async () => {
          try {
            const window = getCurrentWebviewWindow();
            await window.show();
            await window.setFocus();
            console.log('[App] Window shown on retry');
          } catch (retryError) {
            console.error('[App] Retry failed:', retryError);
          }
        }, 500);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [mode]);

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
    return <GeneratorWindow />;
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