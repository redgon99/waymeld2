import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { LegalLinks } from '../components/LegalLinks';
import i18n from '../lib/i18n';
import { normalizeLocale } from '../lib/locale';
import { plannerPath } from '../lib/routes';
import '../styles/app.css';

/**
 * 시험 운영용 개인정보처리방침. 결제 대행·구독 관련 수집은 포함하지 않습니다.
 * 법률 자문을 대체하지 않는 최소 운영 버전입니다.
 */
export default function PrivacyPage() {
  const planPath = plannerPath(normalizeLocale(i18n.language));

  return (
    <div className="static-page legal-page">
      <header className="static-page-header">
        <Link to={planPath} className="static-page-back">
          <Icon name="chevronLeft" /> 돌아가기
        </Link>
        <h1>개인정보처리방침</h1>
        <p className="static-page-lead">시행일: 2026-09-01 · 한국어가 정본입니다</p>
      </header>

      <p className="legal-notice">
        본 서비스는 시험 운영 중입니다. 아래 내용은 현재 실제로 제공하는 기능(로그인, 일정 저장,
        지도 검색, 공유마당, 서비스 개선을 위한 이용 기록)을 기준으로 합니다.
      </p>

      <section>
        <h2>1. 수집하는 개인정보 항목</h2>
        <ul>
          <li>회원 가입·로그인: 이메일, Google 등 소셜 로그인 식별자</li>
          <li>서비스 이용: 여행 계획(핀 장소, 일정, 메모), 검색어</li>
          <li>
            위치: 이용자가 브라우저에서 허용한 경우에 한해, 지도 표시·주변 검색을 위한 대략적인
            좌표. 이동 경로를 상시 추적하지 않습니다.
          </li>
          <li>
            공유마당 등록 시: 이용자가 입력한 사용자명, 이메일(게시에 포함한 경우), 공개 일정 내용
          </li>
          <li>
            서비스 개선: 기능 사용 여부 등 이벤트 기록(외부 광고 SDK가 아닌 서비스 자체 기록)
          </li>
        </ul>
      </section>

      <section>
        <h2>2. 개인정보의 이용 목적</h2>
        <ul>
          <li>회원 인증 및 여행 계획의 저장·동기화</li>
          <li>지도 검색, 장소 정보 표시, 동선 구성</li>
          <li>공유 링크·공유마당을 통한 일정 공개(이용자가 선택한 경우에 한함)</li>
          <li>서비스 안정화 및 기능 개선</li>
        </ul>
      </section>

      <section>
        <h2>3. 개인정보의 보유 및 이용 기간</h2>
        <p>
          회원 탈퇴 또는 삭제 요청 시 지체 없이 파기하는 것을 원칙으로 합니다. 다만 시험 운영
          특성상 서버 이전·초기화가 있을 수 있으며, 관계 법령에 따라 보관이 필요한 정보는 해당
          기간 동안 보관합니다. 로그인하지 않고 이 기기에만 저장한 일정은 브라우저 저장소에 남으며
          이용자가 삭제하거나 저장소를 지우면 제거됩니다.
        </p>
      </section>

      <section>
        <h2>4. 개인정보의 제3자 제공</h2>
        <p>
          회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 따른 요청이
          있는 경우에는 예외로 합니다.
        </p>
      </section>

      <section>
        <h2>5. 처리 위탁 및 국외 이전</h2>
        <p>
          서비스 제공을 위해 다음 사업자에게 처리가 위탁되거나, 처리 과정에서 국외 이전이 발생할 수
          있습니다.
        </p>
        <ul>
          <li>Supabase: 회원 인증, 여행 계획·이용 기록의 저장</li>
          <li>카카오: 국내 지도 표시 및 장소 검색</li>
          <li>Google: 해외 지도·장소 정보, Google 로그인(이용한 경우)</li>
          <li>한국관광공사(TourAPI): 공공 관광 정보 조회</li>
        </ul>
        <p>
          검색어·좌표·장소 식별자는 지도·장소 기능을 제공하는 데 필요한 범위에서 위 사업자에게
          전달됩니다.
        </p>
      </section>

      <section>
        <h2>6. 쿠키 및 로컬 저장소</h2>
        <p>
          서비스는 로그인 세션 유지, 언어·지도 설정, 로컬 일정 저장, 이용 기록 버퍼를 위해 브라우저의
          쿠키 또는 로컬 저장소를 사용합니다. 광고 목적의 제3자 쿠키는 사용하지 않습니다.
        </p>
      </section>

      <section>
        <h2>7. 이용자의 권리</h2>
        <p>
          이용자는 자신의 개인정보 열람·정정·삭제를 요청할 수 있으며, 회원 가입 시 동의한 내용을
          철회할 수 있습니다. 로그인하지 않은 기기의 일정은 해당 브라우저에서 직접 삭제할 수
          있습니다.
        </p>
      </section>

      <section>
        <h2>8. 문의</h2>
        <p>
          시험 운영 중 개인정보 관련 안내는 서비스 내 도움말 페이지를 통해 제공합니다. 별도의 연락처는
          추후 안내합니다.
        </p>
      </section>

      <section>
        <h2>부칙</h2>
        <p>이 방침은 2026-09-01부터 시행합니다. 2026-08-27 방침은 본 방침으로 대체됩니다.</p>
      </section>

      <LegalLinks className="static-page-legal-links" />
    </div>
  );
}
