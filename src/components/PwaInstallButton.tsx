import { Icon } from './Icon';
import { usePwaInstall } from '../hooks/usePwaInstall';

/** 모바일 상단·도크 등에 표시하는 PWA 홈 화면 설치 버튼 */
export function PwaInstallButton({ className = '' }: { className?: string }) {
  const { showInstallButton, install, dismiss, iosHintOpen, closeIosHint } = usePwaInstall();

  if (!showInstallButton) return null;

  return (
    <>
      <button
        type="button"
        className={`pwa-install-btn ${className}`.trim()}
        onClick={() => void install()}
        aria-label="앱 설치"
        title="홈 화면에 추가"
      >
        <Icon name="install" size={18} />
        <span className="pwa-install-btn-label">설치</span>
      </button>

      {iosHintOpen && (
        <div className="pwa-ios-hint-backdrop" role="presentation" onClick={closeIosHint}>
          <div
            className="pwa-ios-hint"
            role="dialog"
            aria-labelledby="pwa-ios-hint-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="pwa-ios-hint-title">홈 화면에 추가</h3>
            <ol className="pwa-ios-hint-steps">
              <li>
                Safari 하단 <strong>공유</strong> 버튼을 누릅니다.
              </li>
              <li>
                <strong>홈 화면에 추가</strong>를 선택합니다.
              </li>
              <li>이름을 확인한 뒤 <strong>추가</strong>를 누릅니다.</li>
            </ol>
            <div className="pwa-ios-hint-actions">
              <button type="button" className="pwa-ios-hint-dismiss" onClick={dismiss}>
                다시 보지 않기
              </button>
              <button type="button" className="pwa-ios-hint-ok" onClick={closeIosHint}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
