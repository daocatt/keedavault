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
import { UpdateModal } from './components/UpdateModal';
import { checkForUpdates, GitHubRelease } from './services/updateService';

type AppMode = 'launcher' | 'vault' | 'about' | 'auth' | 'create' | 'large-type' | 'markdown-preview' | 'generator' | 'settings';

const AppContent: React.FC = () => {
  const [authPath, setAuthPath] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    const pathParam = params.get('path');
    return pathParam || undefined;
  });

  const [updateModal, setUpdateModal] = useState<{ isOpen: boolean; release?: GitHubRelease; currentVersion?: string }>({
    isOpen: false
  });

  const [mode, setMode] = useState<AppMode>(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    const actionParam = params.get('action');
    const pathParam = params.get('path');

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

    // Optimized delays for fast but reliable window showing:
    // - Auth/create: 20ms (simple forms, minimal rendering)
    // - Launcher: 30ms (moderate complexity)
    // - Vault: 150ms (complex data loading and rendering)
    // - Others: 50ms (settings, about, etc.)
    const delay = (mode === 'auth' || mode === 'create') ? 20 : (mode === 'launcher' ? 30 : (mode === 'vault' ? 150 : 50));

    const timer = setTimeout(async () => {
      try {
        const window = getCurrentWebviewWindow();

        const isVisible = await window.isVisible();

        if (!isVisible) {
          await window.show();
        }

        await window.setFocus();
      } catch (error) {
        console.error(`[App] Failed to show window for mode ${mode}:`, error);
        // Try one more time after a delay
        setTimeout(async () => {
          try {
            const window = getCurrentWebviewWindow();
            await window.show();
            await window.setFocus();
          } catch (retryError) {
            console.error('[App] Retry failed:', retryError);
          }
        }, 500);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [mode]);

  // Listen for check-updates event from menu
  useEffect(() => {
    const unlisten = getCurrentWebviewWindow().listen('check-updates', async () => {
      try {
        const result = await checkForUpdates();
        if (result.hasUpdate && result.latestRelease) {
          setUpdateModal({
            isOpen: true,
            release: result.latestRelease,
            currentVersion: result.currentVersion
          });
        } else {
          // Show "You're up to date" message
          alert(`You're up to date!\n\nCurrent version: ${result.currentVersion}`);
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
        alert('Failed to check for updates. Please try again later.');
      }
    });

    return () => {
      unlisten.then(f => f());
    };
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
            // Don't hide - just resize
            await win.setResizable(true);
            await win.setSize(new LogicalSize(1200, 700));
            await win.center();
          } catch (e) {
            console.error('App: Failed to resize window:', e);
          }

          // Switch to vault mode - useEffect will show the window
          setMode('vault');
        }}
      />
    );
  }

  return (
    <>
      <AboutModal />
      {updateModal.isOpen && updateModal.release && updateModal.currentVersion && (
        <UpdateModal
          isOpen={updateModal.isOpen}
          onClose={() => setUpdateModal({ isOpen: false })}
          release={updateModal.release}
          currentVersion={updateModal.currentVersion}
        />
      )}
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