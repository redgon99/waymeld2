# HANDOFF — WayMeld(여로담) 관리자 페이지 개선 작업

작성일: 2026-09-04 (같은 사용자가 다른 장소/세션에서 이어받기 위한 인계 문서)

브랜치: `main`(관리자 페이지 작업) / `claude/mobile-search-layout-fdi8f4`(모바일 검색 레이아웃 작업, §3-1 참고). 이 문서 작성 시점 최신 커밋은 아래 "커밋 상태" 참고.

---

## 1. 현재 작업 목표

사용자 요청으로 **관리자 페이지(`/admin` 및 하위 6개 페이지) 전체를 감사해 미비점 목록을 뽑고, 우선순위 높은 것부터 하나씩 고쳐서 매번 사용자에게 브리핑 → 컨펌받고 다음으로 진행**하는 방식으로 작업 중이다.

관리자 페이지 구성 (`src/components/AdminHeader.tsx`의 `NAV_ITEMS` 기준):
- `/admin` — 현황 관리 (`AdminPage.tsx`)
- `/admin/insights` — 시장 인사이트 (`AdminInsightsPage.tsx`)
- `/admin/guides` — 가이드 카드 (`AdminGuidesPage.tsx`)
- `/admin/distribution` — 배포관리 (`AdminDistributionPage.tsx`)
- `/admin/scenarios` — 시나리오 카탈로그 (`AdminScenariosPage.tsx`)
- `/admin/landing` — 랜딩페이지 관리 (`AdminLandingPage.tsx`)
- `/admin/reports` — 신고 검수 (`AdminReportsPage.tsx`)

---

## 2. 합의된 우선순위 백로그 (전체)

사용자에게 브리핑하고 합의한 순서. **하나씩 완료 → 브리핑 → 사용자 컨펌 후에만 다음으로 진행**하는 규칙이므로, 다음 세션은 반드시 이 순서를 지킬 것 — 사용자 확답 없이 앞서가지 말 것.

1. **관리자 계정 관리 UI 부재** → ✅ **오늘 완료** (§3 참고)
2. **감사 로그(Audit log) 부재** → 다음 착수 대상. 누가 언제 무엇을(승인/삭제/게시) 했는지 기록·조회하는 화면이 없음
3. **대용량 데이터 페이지네이션/검색 부재** — 사용자 목록·여행 목록을 전량 클라이언트로 가져와 JS에서 집계(`lib/admin.ts`의 `listAdminUserRows`, `fetchAdminShareStats`), 검색창 자체가 없음
4. **신고 검수에서 직접 제재 액션 연결 부재** — 상태값만 바꿀 수 있고, 신고 대상 콘텐츠(여행/가이드/장소)를 비공개 전환·삭제하는 액션이 이 화면에 없어 원본 데이터 화면으로 따로 이동해야 함

### 그 다음 단계 백로그 (아직 순서 미확정, 참고용)
- 데이터 내보내기(CSV) 기능 전무
- 통합 대시보드(전체 KPI 한눈에 보기) 부재 — 정보가 7개 페이지에 흩어짐
- 전역 검색(사용자/여행/콘텐츠 통합) 없음
- 페이지별 세부 미비점(최초 감사 시 발견, 아직 미착수):
  - 현황관리: 공유마당 통계 최근 12건만 노출·검색 불가, Tier3 게이트가 지표만 보여줄 뿐 후속 액션 없음, 공지 예약발행/종료일 없음
  - 시장 인사이트: 수집 실행 진행률 표시·취소 불가, 잘못 수집된 원문 삭제 불가, AI 오분류 수동 재분류 불가
  - 가이드 카드: 버전 이력/롤백 없음, 발행 전 실제 렌더링 미리보기 없음, 일괄 편집 불가
  - 배포관리: X(트위터) 외 5개 플랫폼(Reddit/YouTube/TikTok/웨이보/샤오홍슈)은 초안까지만 되고 게시 커넥터 미구현, 계정 자격증명 수정/교체(rotate) UI 없음(삭제 후 재등록만), 게시 실패 재시도 버튼 없음, `scheduledAt` 필드는 있는데 예약 게시 UI 없음
  - 시나리오 카탈로그: 대량 재생성이 순차 실행만 지원, 재생성 전/후 콘텐츠 diff 비교 뷰 없음
  - 랜딩페이지 관리: 변경 이력/되돌리기 없음, 데스크톱 미리보기만 있고 모바일 미리보기 없음, 예약 게시 없음
  - 신고 검수: 신고자에게 처리 결과 통보 없음, 여러 건 선택 일괄 처리 불가

---

## 3. 오늘 완료한 작업 — ① 관리자 계정 관리 UI

**문제였던 것:** `admin_users` 테이블에 RLS 정책이 "본인 행 SELECT"만 있고 INSERT/UPDATE/DELETE 정책이 전혀 없어서, 관리자 화면은커녕 관리자 본인도 Supabase 대시보드로 DB에 직접 들어가지 않으면 새 관리자를 등록할 방법이 없었다.

**변경한 파일:**
1. `supabase/migrations/20260904000000_admin_users_management.sql` (신규) — `admin_users`에 관리자 전용 INSERT/DELETE RLS 정책 추가, SELECT도 관리자면 전체 조회 가능하도록 확장. 전부 `drop policy if exists` 선행이라 재실행 안전(idempotent).
2. `src/lib/admin.ts` — `listAdminUserAccounts` / `addAdminUserAccount` / `removeAdminUserAccount` / `getEnvAdminEmails` 함수 추가
3. `src/pages/AdminPage.tsx` — "현황 관리" 최상단에 **"관리자 계정 관리"** 섹션 신설
   - 이메일 입력 → 관리자 추가 폼
   - 등록된 관리자 목록 표(이메일 / 등록일 / 삭제 버튼)
   - `VITE_ADMIN_EMAILS` 환경변수로 지정된 관리자는 읽기 전용으로 별도 안내(이 화면에서 수정 불가, 배포 환경변수를 고쳐야 함)
   - **안전장치**: DB에 등록된 관리자가 1명뿐이면 그 사람의 삭제 버튼이 비활성화됨 (관리자 전원 잠금 방지)

**확인한 것:** `npx tsc --noEmit`, `npm run build` 모두 클린 통과. 로그인된 관리자 계정으로 브라우저 클릭 테스트는 **아직 못 함** (로컬 `.env.local`에 `VITE_ADMIN_EMAILS` 미설정 상태였음).

**⚠️ 다음 세션에서 가장 먼저 확인할 것:**
1. 사용자가 Supabase 대시보드 SQL 에디터에서 위 마이그레이션 SQL을 실제로 실행했는지 확인 (커밋 시점까지는 CLI로 배포하지 못한 상태 — 이유는 §4 참고, SQL 원문도 §4에 포함)
2. 실행됐다면 `/admin`에 관리자로 로그인해 "관리자 계정 관리" 섹션에서 추가/삭제가 실제로 동작하는지 브라우저에서 확인
3. 위 확인이 끝나야 우선순위 ②(감사 로그)로 넘어갈 것 — 사용자가 아직 명시적으로 "확인했다"는 컨펌을 하지 않은 상태로 오늘 세션이 종료됨

---

## 3-1. 추가 완료 작업 — 모바일 검색을 지도 절반 시트로 변경

**브랜치:** `claude/mobile-search-layout-fdi8f4` (main 아님, 푸시 완료 / PR은 아직 안 만듦)

**사용자 요청:** "모바일모드에서 하단에서 검색을 할 때 전체화면으로 하지 말고 반은 지도, 반만 검색하도록"

**문제였던 것:** 모바일 플래너에서 상단 검색 필을 누르면 `.mobile-search-overlay`가 `position: absolute; inset: 0`으로 화면 전체를 덮어, 검색 중에는 지도를 전혀 볼 수 없었다. 게다가 루트에 `mobile-sheet-open` 클래스가 붙어 지도에 딤(dim)이 깔리고 상단바까지 숨겨졌다.

**변경한 파일:**
1. `src/components/mobile/MobileSearchSheet.tsx` — 전체화면 오버레이 마크업(`mobile-search-fullscreen*`)을 바텀시트 구조(`mobile-search-sheet-inner`)로 교체. 상단에 드래그 핸들 바와 크기 전환 버튼(`mobile-search-size-btn`, chevronDown 아이콘을 CSS로 회전) 추가. `level: 'half' | 'full'`, `onToggleLevel` prop 신설.
2. `src/pages/PlannerPage.tsx` — `mobileSearchLevel` 상태(`'half' | 'full'`) 추가. 루트 클래스에서 `mobile-sheet-open`을 빼고 `mobile-search-open` / `mobile-search-full`만 부여. 검색을 여는 두 진입점(`openSearchPanel`, 상단 검색 필 onClick)에서 항상 `half`로 초기화. 검색 결과 선택 시(`onSelectResult`) 자동으로 `half`로 접어 지도 마커를 볼 수 있게 함.
3. `src/styles/app.css` — `.mobile-search-overlay`를 하단 시트로 재작성(`top: 52%` / `bottom: 0`, 라운드 모서리 22px, 상단 그림자, `transition: top 0.25s`). `.search-full`은 `top: 14%`. `mobile-search-full` 상태에서는 일차 탭(`.mobile-planner-days`)만 숨기고 검색 필은 유지. 하단 `env(safe-area-inset-bottom)` 여백 반영. 기존 `mobile-search-fullscreen*` 규칙은 새 클래스명으로 교체.

**동작 요약:** 절반 상태(위 52%는 지도, 아래는 검색) ↔ 확대 상태(위 14%만 지도) 를 핸들 바 또는 헤더 우측 화살표 버튼으로 토글. 검색 중에도 지도가 딤 없이 그대로 보이고 조작 가능.

**확인한 것:** `npx tsc -b`, `npm run build` 클린 통과. Playwright(390x844, 모바일 뷰포트)로 `/plan`을 열어 절반/확대 두 상태 스크린샷 검증 — 시트 박스가 각각 `y=438.9 (h=405)`, `y=118.2 (h=725.8)`로 의도대로 나옴. 단, 로컬에 `VITE_KAKAO_JS_KEY`가 없어 지도 타일은 회색으로만 렌더됨(레이아웃 검증에는 영향 없음).

**참고:** `npm run lint`는 이 리포에 `eslint.config.js`가 없어서 원래부터 실행되지 않는다(ESLint 9+ 형식 미마이그레이션). 이번 작업과 무관한 기존 문제.

**남은 것 / 다음 세션 참고:**
- 실기기(또는 키보드가 뜨는 환경)에서 절반 상태로 검색어를 입력할 때 가상 키보드가 시트를 가리지 않는지 확인 필요. 필요하면 입력 포커스 시 자동으로 `full`로 올리는 처리를 넣을 수 있다(현재는 명시적 토글만).
- 지도 중심이 시트에 가려지는 문제(선택한 마커가 시트 뒤에 놓일 수 있음)는 이번 범위에서 다루지 않음. 필요하면 선택 시 지도 중심을 위쪽으로 오프셋하는 처리를 추가할 것.
- PR은 만들지 않았다. 필요하면 `claude/mobile-search-layout-fdi8f4` → `main`으로 생성.

---

## 4. ⚠️ 중요 발견 — Supabase 마이그레이션 이력이 CLI와 어긋나 있음

`supabase db push --dry-run`을 시도하다가 발견. **다음에 스키마 변경을 배포하려 할 때마다 똑같이 막힐 것이므로 반드시 인지하고 시작할 것.**

- 프로젝트 ref `ainftwifvclgiookzrwm`(`.env.local`의 `VITE_SUPABASE_URL`과 일치, 올바른 프로젝트 맞음)에 CLI로 연결하면, 원격 DB의 마이그레이션 이력 테이블에 **213개** 버전이 기록돼 있는데 로컬 `supabase/migrations/`의 파일 29개와 **단 하나도 일치하지 않음**.
- 반대로 로컬 29개 파일(오늘 추가한 것 포함) 중 원격에 "적용됨"으로 기록된 것도 없음.
- 앱이 정상 동작하는 것으로 보아 실제 스키마(테이블/RLS 정책)는 DB에 존재할 가능성이 높음 — 즉 지금까지 배포는 `supabase db push`가 아니라 **Supabase 대시보드 SQL 에디터로 SQL을 직접 실행**하는 방식으로 이뤄져 온 것으로 추정됨(CLI 마이그레이션 이력 테이블에는 기록이 안 남는 방식).
- CLI가 자동으로 제안하는 해결책(`supabase migration repair --status reverted <213개 id>`)은 **실행하지 않았음** — 그대로 따르면 이후 `db push`가 로컬 29개 마이그레이션 전체를 "미적용"으로 보고 프로덕션 DB에 처음부터 다시 실행하려 들 위험이 있어서(이미 존재하는 테이블/컬럼을 다시 만들다 에러 or 예기치 않은 부작용), 사용자에게 먼저 확인을 구함.
- **오늘 내린 결론(사용자 선택)**: 이번 admin_users 마이그레이션은 CLI를 거치지 않고 **SQL을 사용자가 직접 Supabase 대시보드 SQL 에디터에 붙여넣어 실행**하기로 함. SQL 원문은 `supabase/migrations/20260904000000_admin_users_management.sql` 파일 그대로.
- **다음에 새 마이그레이션이 필요할 때도 당분간 같은 방식(대시보드 직접 실행)을 쓸 것을 권장.** CLI 이력 정리(`migration repair`)는 별도로 사용자와 충분히 논의한 뒤에만 시도할 것 — 세션 혼자 판단으로 진행하지 말 것.

---

## 5. 실행 및 확인 명령

```bash
# 타입체크
npx tsc --noEmit

# 프로덕션 빌드
npm run build

# 개발 서버
npm run dev
```

Supabase 프로젝트 ref: `ainftwifvclgiookzrwm` (대시보드: `https://supabase.com/dashboard/project/ainftwifvclgiookzrwm`)

**주의:** `supabase db push` / `supabase migration repair`는 §4의 이력 불일치 때문에 그대로 쓰면 안 됨. 스키마 변경이 필요하면 당분간 대시보드 SQL 에디터에서 직접 실행할 것.

---

## 6. 커밋 상태

오늘 작업분(§3의 파일 3개 + 이 HANDOFF.md)을 커밋했다. `supabase/.temp/cli-latest`는 로컬 CLI 버전 체크 과정에서 자동으로 바뀐 파일이라 이번 커밋에 포함하지 않음(작업 내용과 무관).

이후 같은 날 §3-1(모바일 검색 절반 시트) 작업분을 별도 브랜치 `claude/mobile-search-layout-fdi8f4`에 커밋·푸시했다(커밋 `f04e1f5`, 파일 3개). `tsconfig.tsbuildinfo`는 빌드 산출물이라 커밋에서 제외했다(리포에 추적돼 있어 빌드할 때마다 diff가 뜨므로, 앞으로도 커밋에 섞이지 않게 주의할 것).
