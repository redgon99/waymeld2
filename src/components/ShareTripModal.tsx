import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export interface ShareTripModalSubmit {
  listInPlaza: boolean;
  displayName: string;
  email: string;
}

interface Props {
  open: boolean;
  tripTitle: string;
  userEmail: string | null;
  authConfigured: boolean;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (opts: ShareTripModalSubmit) => void | Promise<void>;
}

export function ShareTripModal({
  open,
  tripTitle,
  userEmail,
  authConfigured,
  saving = false,
  onClose,
  onConfirm,
}: Props) {
  const [listInPlaza, setListInPlaza] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [plazaHelpOpen, setPlazaHelpOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setListInPlaza(false);
    setDisplayName('');
    setEmail(userEmail ?? '');
    setPlazaHelpOpen(false);
  }, [open, userEmail]);

  if (!open) return null;

  const plazaDisabled = authConfigured && !userEmail;
  const emailReadOnly = !!userEmail;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listInPlaza && !email.trim()) return;
    void onConfirm({
      listInPlaza: listInPlaza && !!email.trim(),
      displayName: displayName.trim(),
      email: email.trim(),
    });
  };

  return (
    <div className="share-trip-modal-backdrop" role="presentation" onClick={onClose}>
      <form
        className="share-trip-modal"
        role="dialog"
        aria-labelledby="share-trip-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="share-trip-modal-header">
          <h2 id="share-trip-modal-title">여행 공유</h2>
          <button type="button" className="share-trip-modal-close" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </header>

        <div className="share-trip-modal-body">
          <label className="share-trip-modal-field">
            <span>여행명</span>
            <input type="text" value={tripTitle} readOnly className="share-trip-modal-readonly" />
          </label>

          <p className="share-trip-modal-hint">
            공개 링크가 생성됩니다. 다른 사람이 링크로 여행 일정을 볼 수 있습니다.
          </p>

          <div className="share-trip-modal-check-row">
            <label className="share-trip-modal-check">
              <input
                type="checkbox"
                checked={listInPlaza}
                disabled={plazaDisabled || saving}
                onChange={(e) => setListInPlaza(e.target.checked)}
              />
              <span>공유마당에도 등록</span>
            </label>
            <button
              type="button"
              className="share-trip-modal-help-btn"
              aria-label="공유마당 안내"
              onClick={() => setPlazaHelpOpen(true)}
            >
              <Icon name="help" />
            </button>
          </div>
          {plazaDisabled && (
            <p className="share-trip-modal-warn">
              공유마당 등록은 로그인 후 이용할 수 있습니다.
            </p>
          )}

          {listInPlaza && (
            <>
              <label className="share-trip-modal-field">
                <span>사용자명 (선택)</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="익명으로 표시됩니다"
                  maxLength={40}
                  disabled={saving}
                />
              </label>
              <label className="share-trip-modal-field">
                <span>이메일</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={emailReadOnly}
                  required
                  disabled={saving || emailReadOnly}
                  className={emailReadOnly ? 'share-trip-modal-readonly' : undefined}
                />
              </label>
              <p className="share-trip-modal-warn share-trip-modal-warn--muted">
                공유마당 게시판에 이메일이 표시됩니다. 등록 전 내용을 확인해 주세요.
              </p>
            </>
          )}
        </div>

        {plazaHelpOpen && (
          <div
            className="plaza-help-modal-backdrop"
            role="presentation"
            onClick={() => setPlazaHelpOpen(false)}
          >
            <div
              className="plaza-help-modal"
              role="dialog"
              aria-labelledby="plaza-help-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="plaza-help-title">공유마당이란?</h3>
              <p>
                다른 여행자와 일정을 나누는 <strong>공개 게시판</strong>입니다. 등록하면
                사용자명(선택), 이메일, 여행명, 장소 목록이 마당에 올라갑니다.
              </p>
              <ul className="plaza-help-list">
                <li>게시판에서 다른 사람의 여행 일정을 둘러볼 수 있습니다.</li>
                <li>전국 지도에서 여행 중심 위치를 한눈에 볼 수 있습니다.</li>
                <li>마음에 드는 일정은 「끌어오기」로 내 여행에 복사할 수 있습니다.</li>
              </ul>
              <p className="plaza-help-note">
                링크 공유와 별도로, 마당에 올린 내용은 로그인한 사용자에게 공개됩니다.
              </p>
              <button
                type="button"
                className="share-trip-modal-btn primary plaza-help-ok"
                onClick={() => setPlazaHelpOpen(false)}
              >
                확인
              </button>
            </div>
          </div>
        )}

        <footer className="share-trip-modal-footer">
          <button type="button" className="share-trip-modal-btn secondary" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button type="submit" className="share-trip-modal-btn primary" disabled={saving}>
            {saving ? '저장 중…' : '공유하기'}
          </button>
        </footer>
      </form>
    </div>
  );
}
