import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('vc-install-dismissed') === '1'
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const install = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setDeferredPrompt(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem('vc-install-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="install-prompt">
      <div className="install-prompt__icon">🎤</div>
      <div className="install-prompt__text">
        <strong>Install VoiceCraft</strong>
        <span>Add to home screen for offline use</span>
      </div>
      <button className="install-prompt__btn install-prompt__btn--install" onClick={install}>
        Install
      </button>
      <button className="install-prompt__btn install-prompt__btn--dismiss" onClick={dismiss}>
        ✕
      </button>
    </div>
  );
}
