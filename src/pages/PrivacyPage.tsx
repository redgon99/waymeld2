import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import '../styles/app.css';

/**
 * 최소 리스크 버전 개인정보처리방침 — 결제 연동(포트원/토스페이먼츠) 반영.
 * 참고: docs/Waymeld_수익화_실행계획_2026-08-27.md §2
 */
export default function PrivacyPage() {
  return (
    <div className="static-page legal-page">
      <header className="static-page-header">
        <Link to="/plan" className="static-page-back">
          <Icon name="chevronLeft" /> 돌아가기
        </Link>
        <h1>개인정보처리방침</h1>
        <p className="static-page-lead">시행일: 2026-08-27</p>
      </header>

      <section>
        <h2>1. 수집하는 개인정보 항목</h2>
        <ul>
          <li>회원가입 시: 이메일, 소셜 로그인 식별자(Google 등)</li>
          <li>서비스 이용 시: 여행 계획(핀 장소, 일정), 위치 검색 기록</li>
          <li>
            유료 결제 시: 결제 대행사(포트원/토스페이먼츠)를 통해 처리되며, <strong>카드번호 등
            결제수단 정보 자체는 회사 서버에 저장하지 않습니다.</strong> 회사는 결제 대행사가
            발급한 토큰(빌링키)만 보관합니다.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. 개인정보의 이용 목적</h2>
        <ul>
          <li>서비스 제공(여행 계획 저장·동기화·공유)</li>
          <li>Plus 구독 결제 처리 및 구독 상태 관리</li>
          <li>고객 문의 대응</li>
        </ul>
      </section>

      <section>
        <h2>3. 개인정보의 보유 및 이용 기간</h2>
        <p>
          회원 탈퇴 시 지체 없이 파기합니다. 다만 결제 기록은 전자상거래법 등 관계 법령에 따라
          일정 기간(대금결제 및 재화 등의 공급에 관한 기록: 5년) 보관할 수 있습니다.
        </p>
      </section>

      <section>
        <h2>4. 개인정보의 제3자 제공</h2>
        <p>
          회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 결제 처리를
          위해 결제 대행사(포트원, 토스페이먼츠)에 결제에 필요한 최소한의 정보가 전달됩니다.
        </p>
      </section>

      <section>
        <h2>5. 이용자의 권리</h2>
        <p>
          이용자는 언제든지 자신의 개인정보 열람·정정·삭제를 요청할 수 있으며, 회원 탈퇴를 통해
          동의를 철회할 수 있습니다.
        </p>
      </section>

      <section>
        <h2>6. 문의처</h2>
        <p>개인정보 관련 문의는 고객센터를 통해 접수합니다.</p>
      </section>

      <section>
        <h2>부칙</h2>
        <p>이 방침은 2026-08-27부터 시행합니다.</p>
      </section>
    </div>
  );
}
