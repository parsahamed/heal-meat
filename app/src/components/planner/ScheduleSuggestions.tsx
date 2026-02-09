import { ScheduleSuggestion } from './types';
import { formatDate } from '../../utils/format';

type ScheduleSuggestionsProps = {
  suggestions: ScheduleSuggestion[];
  loading: boolean;
  onAddClient: (clientId: string) => void;
};

export default function ScheduleSuggestions({
  suggestions,
  loading,
  onAddClient,
}: ScheduleSuggestionsProps) {
  const skeletons = Array.from({ length: 3 });
  return (
    <div className="card-sub">
      <div className="card-sub__header">
        <span>Suggested Clients</span>
        <span className="muted">Last 4 weeks</span>
      </div>
      {loading ? (
        <div className="list compact suggestion-list">
          {skeletons.map((_, index) => (
            <div className="list-item compact suggestion-item" key={`suggestion-${index}`}>
              <div className="suggestion-text">
                <div className="skeleton skeleton-text" />
                <div className="skeleton skeleton-text short" />
              </div>
              <div className="suggestion-actions">
                <div className="skeleton skeleton-pill" />
              </div>
            </div>
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="muted">No suggestions yet.</div>
      ) : (
        <div className="list compact suggestion-list">
          {suggestions.slice(0, 8).map((suggestion) => (
            <div className="list-item compact suggestion-item" key={suggestion.client.id}>
              <div className="suggestion-text">
                <div className="list-title">
                  {suggestion.client.firstName} {suggestion.client.lastName}
                </div>
                <div className="list-subtitle">
                  File {suggestion.client.fileNumber || 'â€”'} Â· {suggestion.count} sessions Â·
                  last {formatDate(suggestion.lastDate)}
                </div>
              </div>
              <div className="suggestion-actions">
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => onAddClient(suggestion.client.id)}
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
