/**
 * GameOver — final score card with high-score handling, restart and
 * recalibrate actions.
 */

import type { GameOverPayload } from '../types';

interface GameOverProps {
  result: GameOverPayload;
  onRestart: () => void;
  onRecalibrate: () => void;
}

export function GameOver({ result, onRestart, onRecalibrate }: GameOverProps) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="gameover-title">
      <div className="card card--gameover">
        <h2 id="gameover-title" className="card__title">Game over</h2>
        {result.isNewHighScore && <div className="badge-new">New high score! 🎉</div>}
        <div className="result-grid">
          <div className="result">
            <span className="result__label">Final score</span>
            <span className="result__value">{result.score.toLocaleString()}</span>
          </div>
          <div className="result">
            <span className="result__label">Distance</span>
            <span className="result__value">{result.distance.toLocaleString()} m</span>
          </div>
          <div className="result">
            <span className="result__label">High score</span>
            <span className="result__value">{result.highScore.toLocaleString()}</span>
          </div>
        </div>
        <button className="btn btn--primary" onClick={onRestart} autoFocus>
          Run again
        </button>
        <button className="btn btn--ghost" onClick={onRecalibrate}>
          Recalibrate camera
        </button>
      </div>
    </div>
  );
}
