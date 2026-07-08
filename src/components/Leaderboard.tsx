import { useState } from 'react';
import { loadLeaderboard, clearLeaderboard, type LeaderboardEntry } from '../utils/scoring';

interface LeaderboardProps {
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Leaderboard({ onClose }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(loadLeaderboard);

  const handleClear = () => {
    clearLeaderboard();
    setEntries([]);
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
      <div className="card card--leaderboard">
        <h2 id="leaderboard-title" className="card__title">Leaderboard</h2>

        {entries.length === 0 ? (
          <p className="leaderboard__empty">No scores yet. Jump in and set a record!</p>
        ) : (
          <ol className="leaderboard__list">
            {entries.map((entry, i) => (
              <li key={i} className={`leaderboard__row ${i === 0 ? 'leaderboard__row--top' : ''}`}>
                <span className="leaderboard__rank">{i + 1}</span>
                <span className="leaderboard__score">{entry.score.toLocaleString()}</span>
                <span className="leaderboard__meta">
                  {entry.distance.toLocaleString()} m · {entry.collected} coins
                </span>
                <span className="leaderboard__date">{formatDate(entry.date)}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="leaderboard__actions">
          <button className="btn btn--primary" onClick={onClose}>
            Close
          </button>
          {entries.length > 0 && (
            <button className="btn btn--ghost btn--small" onClick={handleClear}>
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
