import { useState } from 'react';
import { audio } from '../utils/audio';
import { loadConfig, saveConfig, loadMuted, saveMuted } from '../utils/scoring';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const config = loadConfig();
  const [threshold, setThreshold] = useState(config.jumpThreshold);
  const [keyboardMode, setKeyboardMode] = useState(config.keyboardMode);
  const [muted, setMuted] = useState(audio.isMuted);

  const handleThresholdChange = (value: number) => {
    setThreshold(value);
    saveConfig({ jumpThreshold: value, keyboardMode });
  };

  const handleKeyboardToggle = () => {
    const next = !keyboardMode;
    setKeyboardMode(next);
    saveConfig({ jumpThreshold: threshold, keyboardMode: next });
  };

  const handleMuteToggle = () => {
    setMuted(audio.toggleMute());
    saveMuted(!muted);
  };

  const handleClose = () => {
    saveConfig({ jumpThreshold: threshold, keyboardMode });
    onClose();
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="card card--settings">
        <h2 id="settings-title" className="card__title">Settings</h2>

        <div className="setting">
          <label className="setting__label" htmlFor="sens-slider">
            Jump sensitivity
          </label>
          <div className="setting__row">
            <span className="setting__hint">Low</span>
            <input
              id="sens-slider"
              type="range"
              min="0.08"
              max="0.4"
              step="0.01"
              value={threshold}
              onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
              className="setting__slider"
              aria-describedby="sens-desc"
            />
            <span className="setting__hint">High</span>
          </div>
          <span id="sens-desc" className="setting__value">
            {Math.round((1 - threshold / 0.4) * 100)}%
          </span>
        </div>

        <div className="setting">
          <label className="setting__label">Keyboard mode</label>
          <div className="setting__row">
            <span className="setting__hint">Use camera</span>
            <button
              className={`toggle ${keyboardMode ? 'toggle--on' : ''}`}
              onClick={handleKeyboardToggle}
              role="switch"
              aria-checked={keyboardMode}
              aria-label="Toggle keyboard mode"
            >
              <span className="toggle__knob" />
            </button>
            <span className="setting__hint">Space bar</span>
          </div>
          <p className="setting__desc">
            {keyboardMode
              ? 'Press Space to jump. Useful for testing or if no camera is available.'
              : 'Jump in real life — your webcam tracks your movement.'}
          </p>
        </div>

        <div className="setting">
          <label className="setting__label">Sound</label>
          <div className="setting__row">
            <span className="setting__hint">On</span>
            <button
              className={`toggle ${muted ? 'toggle--on' : ''}`}
              onClick={handleMuteToggle}
              role="switch"
              aria-checked={muted}
              aria-label="Toggle sound"
            >
              <span className="toggle__knob" />
            </button>
            <span className="setting__hint">Off</span>
          </div>
        </div>

        <button className="btn btn--primary" onClick={handleClose}>
          Done
        </button>
      </div>
    </div>
  );
}
