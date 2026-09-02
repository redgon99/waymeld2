import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { LegalLinks } from '../components/LegalLinks';
import i18n from '../lib/i18n';
import { normalizeLocale } from '../lib/locale';
import { plannerPath } from '../lib/routes';
import '../styles/app.css';

/**
 * 시험 운영용 이용약관. 유료 결제·구독 조항은 포함하지 않습니다.
 * 법률 자문을 대체하지 않는 최소 운영 버전입니다.
 */
export default function TermsPage() {
  const planPath = plannerPath(normalizeLocale(i18n.language));

  return (
    <div className="static-page legal-page">
      <header className="static-page-header">
        <Link to={planPath} className="static-page-back">
          <Icon name="chevronLeft" /> 돌아가기
        </Link>
        <h1>이용약관</h1>
        <p className="static-page-lead">시행일: 2026-09-01 · 한국어가 정본입니다</p>
      </header>

      <p className="legal-notice">
        본 서비스는 시험 운영 중입니다. 기능·데이터는 예고 없이 변경되거나 초기화될 수 있으며,
        운영이 일시 중단될 수 있습니다.
      </p>

      <section>
        <h2>제1조 (목적)</h2>
        <p>
          이 약관은 WayMeld(여로담, 이하 “회사”)가 제공하는 여행 동선 계획 서비스(이하 “서비스”)의
          이용과 관련하여 회사와 이용자의 권리·의무 및 책임사항을 정함을 목적으로 합니다.
        </p>
      </section>

      <section>
        <h2>제2조 (시험 운영)</h2>
        <ol>
          <li>
            서비스는 현재 시험 운영 단계이며, 정식 서비스와 기능·안정성·데이터 보존이 다를 수
            있습니다.
          </li>
          <li>
            회사는 시험 운영 목적 달성을 위해 서비스의 전부 또는 일부를 수정·중단하거나, 저장된
            여행 계획 등 데이터를 초기화할 수 있습니다.
          </li>
          <li>시험 운영 기간에는 유료 결제 기능을 제공하지 않습니다.</li>
        </ol>
      </section>

      <section>
        <h2>제3조 (서비스의 내용)</h2>
        <ol>
          <li>
            서비스는 장소를 검색·저장하고 일정·동선을 구성하는 도구입니다. 항공·숙박·투어 등 여행
            상품의 예약이나 결제를 대행하지 않습니다.
          </li>
          <li>
            로그인 없이 이 기기에 저장하거나, 이메일 매직 링크 또는 Google 계정으로 로그인해
            클라우드에 동기화할 수 있습니다.
          </li>
          <li>
            장소 정보(영업시간·평점·사진 등)는 카카오, Google, 한국관광공사 공공데이터 등 외부
            자료를 기반으로 하며 실제와 다를 수 있습니다.
          </li>
        </ol>
      </section>

      <section>
        <h2>제4조 (회원가입)</h2>
        <ol>
          <li>
            회원은 이메일 또는 Google 계정으로 인증하여 서비스를 이용할 수 있습니다. 가입 시 이
            약관과 개인정보 수집·이용에 동의해야 합니다.
          </li>
          <li>
            이용자는 정확한 정보를 제공해야 하며, 계정 및 인증 수단을 제3자에게 양도하거나 공유해서는
            안 됩니다.
          </li>
        </ol>
      </section>

      <section>
        <h2>제5조 (공유마당 및 게시물)</h2>
        <ol>
          <li>
            이용자가 공유마당 등에 일정을 공개하면 여행명, 장소 목록, 선택한 프로필 정보(사용자명·이메일
            등)가 다른 이용자에게 보일 수 있습니다.
          </li>
          <li>
            이용자는 타인의 권리를 침해하거나 법령에 위배되는 내용을 게시해서는 안 됩니다. 회사는
            신고된 게시물을 비공개·삭제할 수 있습니다.
          </li>
          <li>
            게시물에 대한 저작권은 해당 이용자에게 있으며, 회사는 서비스 운영·개선·홍보를 위해
            필요한 범위에서 이를 이용할 수 있습니다.
          </li>
        </ol>
      </section>

      <section>
        <h2>제6조 (이용자의 의무)</h2>
        <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul>
          <li>서비스의 정상적인 운영을 방해하는 행위</li>
          <li>다른 이용자 또는 제3자의 개인정보를 무단으로 수집·공개하는 행위</li>
          <li>지도·장소 API 등 외부 서비스를 약관 또는 법령에 반하여 이용하는 행위</li>
        </ul>
      </section>

      <section>
        <h2>제7조 (면책)</h2>
        <ol>
          <li>
            회사는 천재지변, 외부 API 제공업체의 장애 등 회사의 합리적인 통제 범위를 벗어난 사유로
            발생한 서비스 중단에 대해 책임을 지지 않습니다.
          </li>
          <li>
            시험 운영 특성상 데이터 손실·기능 오류가 발생할 수 있으며, 회사는 법령이 허용하는 범위에서
            이에 대한 책임을 제한합니다.
          </li>
          <li>외부 지도·관광 정보의 정확성, 이용자가 실제로 방문·예약하는 행위의 결과는 회사가 보증하지 않습니다.</li>
        </ol>
      </section>

      <section>
        <h2>제8조 (약관의 변경)</h2>
        <p>
          회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일자 및
          개정 사유를 명시하여 서비스 내에 공지합니다. 이용자에게 불리한 변경은 적용일 30일 전부터
          공지합니다.
        </p>
      </section>

      <section>
        <h2>제9조 (준거법)</h2>
        <p>이 약관은 대한민국 법령에 따라 해석됩니다.</p>
      </section>

      <section>
        <h2>부칙</h2>
        <p>이 약관은 2026-09-01부터 시행합니다.</p>
      </section>

      <LegalLinks className="static-page-legal-links" />
    </div>
  );
}
