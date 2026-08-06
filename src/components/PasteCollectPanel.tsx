import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { extractPlaceCandidates } from '../lib/pasteCollect';

interface Props {
  onSearchCandidate: (query: string) => void;
  onPinCandidate?: (name: string) => void;
  disabled?: boolean;
}

export function PasteCollectPanel({ onSearchCandidate, onPinCandidate, disabled }: Props) {
  const { t } = useTranslation('planner');
  const [text, setText] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);

  const handleExtract = () => {
    const found = extractPlaceCandidates(text);
    setCandidates(found);
  };

  return (
    <div className="paste-collect-panel">
      <label className="paste-collect-label" htmlFor="paste-collect-input">
        <Icon name="attach" size={14} /> {t('collect.pasteLabel')}
      </label>
      <textarea
        id="paste-collect-input"
        className="paste-collect-input"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('collect.pastePlaceholder')}
        disabled={disabled}
      />
      <button
        type="button"
        className="paste-collect-btn"
        onClick={handleExtract}
        disabled={disabled || !text.trim()}
      >
        {t('collect.extract')}
      </button>
      {candidates.length > 0 && (
        <ul className="paste-collect-candidates">
          {candidates.map((name) => (
            <li key={name} className="paste-collect-candidate">
              <span>{name}</span>
              <div className="paste-collect-candidate-actions">
                <button type="button" onClick={() => onSearchCandidate(name)}>
                  {t('collect.search')}
                </button>
                {onPinCandidate && (
                  <button type="button" onClick={() => onPinCandidate(name)}>
                    {t('collect.save')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
