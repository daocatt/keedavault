import React, { useState, useEffect } from 'react';
import { Launcher } from './components/Launcher';
import { VaultWorkspace } from './components/VaultWorkspace';

const App: React.FC = () => {
  const [mode, setMode] = useState<'launcher' | 'vault'>('launcher');

  useEffect(() => {
    // Check URL params to decide mode
    // If we have ?mode=vault, we are in a vault window
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'vault') {
      setMode('vault');
    } else {
      setMode('launcher');
    }
  }, []);

  if (mode === 'vault') {
    return <VaultWorkspace />;
  }

  return <Launcher />;
};

export default App;