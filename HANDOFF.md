# HANDOFF — WayMeld(여로담) 관리자 페이지 개선 작업

작성일: 2026-09-04 (같은 사용자가 다른 장소/세션에서 이어받기 위한 인계 문서)

브랜치: `main` / 이 문서 작성 시점 최신 커밋은 아래 "커밋 상태" 참고(이 문서 자체가 포함된 커밋이 최신).

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

1. **관리자 계정 관리 UI 부재** → ✅ **완료 + 실사용 검증됨** (§3, §3-1, §3-2 참고. 후속으로 발견된 `is_admin()` 무한재귀까지 수정 완료)
2. **감사 로그(Audit log) 부재** → ✅ **완료** (§3-3 참고)
3. **대용량 데이터 페이지네이션/검색 부재** → ✅ **완료** (§3-4 참고)
4. **신고 검수에서 직접 제재 액션 연결 부재** → ✅ **완료** (§3-5 참고)

**→ 합의된 우선순위 4건 모두 완료.**

### 그 다음 단계 백로그
사용자가 "순차적으로 진행"을 지시해 아래 순서로 착수 중이다.
- ~~보안 어드바이저 점검~~ → ✅ 완료 (§3-6)
- ~~통합 대시보드~~ → ✅ 완료 (§3-7)
- ~~전역 검색(사용자/여행/콘텐츠 통합)~~ → ✅ 완료 (§3-8)
- 데이터 내보내기(CSV) → ✅ 완료 (§3-9)
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

### 3-1. 후속 세션(2026-09-04) 확인 결과 — 전부 해소됨

- **마이그레이션 적용 확인됨.** `admin_users_select_admin` / `admin_users_admin_insert` / `admin_users_admin_delete` 3개 정책 모두 라이브에 존재.
- **환경변수 블로커는 애초에 없었음.** `.env.local`의 `VITE_ADMIN_EMAILS`는 여전히 비어 있지만, `admin_users`에 `redgon999@gmail.com`이 등록돼 있어 DB 경로로 관리자 인정된다(`isCurrentUserAdmin()`은 env → DB 순으로 확인). 로컬에서 그냥 로그인하면 `/admin` 접근된다.
- **실사용 확인됨.** 2026-09-04 두 번째 관리자(`redgon99@korea.kr`)가 UI로 추가됐고 목록이 정상 조회된다.

### 3-2. 이 과정에서 발견·수정한 결함 — is_admin() 무한재귀

`20260904000000`이 `admin_users`의 SELECT 정책에서 `is_admin()`을 호출하도록 바꿨는데, `is_admin()`은 SECURITY DEFINER가 아니라 호출자 권한으로 `admin_users`를 읽었다. 그래서 **정책 → is_admin() → admin_users 조회 → 정책 → …** 로 순환했다.

- 관리자가 1명이고 그 행이 본인 이메일일 때만 `OR` 첫 조건에서 단락돼 우연히 동작했다.
- **두 번째 관리자를 추가하는 순간** 무필터로 전체를 조회하는 `listAdminUserAccounts()`가 남의 행을 스캔하며 `is_admin()`을 실행 → `stack depth limit exceeded`(54001)로 관리자 목록 화면이 깨진다. 즉 이 기능의 핵심 시나리오가 바로 실패하는 상태였다.
- 비관리자 JWT로 `select count(*) from admin_users` 실행해 실제 에러를 재현·확인했다.
- 수정: `supabase/migrations/20260904010000_fix_admin_is_admin_recursion.sql` — 저장소 기존 해법(`20260812000000`의 `is_trip_collaborator`)과 동일하게 `security definer` + `set search_path = public`. 반환값이 boolean뿐이라 데이터 유출 없음.
- 적용 방식: MCP `apply_migration`으로 원격에 직접 적용(사용자 승인). 적용 후 재검증 — 비관리자 조회는 에러 대신 0건, 관리자 2명 상태 목록 조회도 재귀 없이 정상(롤백 트랜잭션으로 확인).
- `is_admin()`을 참조하는 정책 24개가 전부 WayMeld 테이블임을 확인했다(소방·volmgr·inv·autodist 등 같은 DB의 다른 앱은 사용하지 않음) — 공유 DB지만 영향 범위는 WayMeld 한정.

**→ 우선순위 ①은 완료.**

---

## 3-3. 우선순위 ② — 감사 로그 (완료)

**설계 판단:** 호출부마다 로깅 코드를 넣는 대신 **DB 트리거**로 붙였다. 관리자 변경 지점이 9개 테이블·7개 lib 파일에 흩어져 있어 호출부 방식은 새 기능을 추가할 때 빠뜨리기 쉽고, 대시보드에서 직접 고친 변경은 아예 못 잡는다. 트리거는 앱·대시보드·엣지함수 어느 경로든 빠짐없이 남기고 호출부 수정이 0이다.

**변경한 파일:**
1. `supabase/migrations/20260904020000_admin_audit_log.sql` (신규) — `admin_audit_log` 테이블 + `audit_redact()` + `log_admin_action()` 트리거 함수 + 9개 테이블에 트리거 부착
2. `src/lib/adminAudit.ts` (신규) — 조회·필터·키셋 페이지네이션, 로그 한 줄을 사람 문장으로 바꾸는 `describeAuditEntry()`
3. `src/pages/AdminAuditPage.tsx` (신규) — `/admin/audit`
4. `src/components/AdminHeader.tsx` — 내비에 "감사 로그" 추가 (`AdminPageKey`에 `audit`)
5. `src/App.tsx` — 라우트 추가
6. `src/styles/app.css` — `.audit-op`, `.audit-detail`

**감사 대상 9개 테이블:** `admin_users` / `admin_notices` / `admin_user_verifications` / `guide_articles` / `scenario_catalog` / `landing_promo` / `distribution_accounts` / `insight_keywords` / `content_reports`(관리자 조치인 UPDATE·DELETE만 — INSERT는 일반 사용자의 신고라 제외).
`insight_raw_items`·`distribution_posts`는 수집·발행 파이프라인이 대량으로 써서 로그가 넘치므로 **일부러 제외**했다.

**설계상 지켜진 것 (검증 완료):**
- **append-only** — SELECT 정책만 두고 UPDATE/DELETE 정책을 만들지 않아 관리자도 자기 흔적을 못 지운다. 실제로 관리자 JWT로 UPDATE/DELETE 시도 시 0행 영향 확인.
- **비관리자 차단** — 비관리자 JWT 조회 0건 확인.
- **대용량 컬럼 자동 생략** — `scenario_catalog.content`(9개 언어) 같은 컬럼은 1000바이트 초과 시 크기만 남긴다. 컬럼명 하드코딩 없이 길이로 판단. 실제 게시중지 UPDATE 로그가 19바이트로 남는 것 확인.
- **UPDATE는 바뀐 컬럼만** 기록. `updated_at`만 바뀐 no-op UPDATE는 아예 기록하지 않음(확인 완료).
- 서비스 롤(엣지함수·크론) 변경은 JWT가 없어 `actor_email`이 null → UI에서 "시스템"으로 표기.

**확인한 것:** `npx tsc --noEmit`, `npm run build` 클린 통과. `/admin/audit` 라우트가 미인증 시 로그인으로 리다이렉트되고 JS 오류 없음(Playwright). RLS 4종(관리자 조회/수정차단/삭제차단/비관리자 차단)은 롤백 트랜잭션으로 검증.

**⚠️ 다음 세션에서 알아둘 것:** 트리거는 설치 시점부터 기록하므로 **그 이전 변경 이력은 없다.** 화면을 처음 열면 비어 있는 게 정상이고, 관리자 액션을 한 번 하면 그때부터 쌓인다. 브라우저에서 실제 목록·필터·더보기 동작은 아직 사용자 확인 전이다.

---

## 3-4. 우선순위 ③ — 목록 페이지네이션·검색 (완료)

**무엇이 문제였나:** `lib/admin.ts`가 `waymeld_trips` 전량을 브라우저로 가져와 JS에서 집계했다. 특히 `fetchAdminShareStats()`는 자료 개수를 세려고 **`payload` 컬럼까지 통째로** 받아왔다 — 현재 19건에 297KB(최대 1건 151KB)지만 1,000건이면 15MB, 10,000건이면 150MB를 매 조회마다 내려받는 구조였다. 검색창은 아예 없었고, 사용자 목록은 `owner_id`(UUID)만 보여줘 검색을 붙여도 쓸모가 없었다.

*(참고: PostgREST `db_max_rows`는 미설정이라 조용히 잘려 집계가 틀리는 문제는 없었다 — 순수 전송량 문제였다.)*

**변경한 파일:**
1. `supabase/migrations/20260904030000_admin_pagination_search.sql` (신규) — RPC 3개
   - `admin_user_rows(p_search, p_limit, p_offset)` — 여행 수 집계 + `auth.users` 이메일 조인 + 이메일/메모/UUID 검색 + 페이지네이션
   - `admin_share_stats()` — 카운트를 전부 SQL에서 계산. 자료 수는 `jsonb_array_length(payload->'materials')`로 세므로 payload가 브라우저로 나가지 않는다
   - `admin_plaza_listings(p_search, p_limit, p_offset)` — 최근 12건 고정이던 것을 검색·페이지네이션으로
   - 셋 다 `security definer`라 **첫 줄에서 `is_admin()`을 직접 확인**한다(RLS를 우회하므로 필수)
2. `src/lib/admin.ts` — 위 RPC 호출로 교체. `AdminUserRow`에 `email` 추가, `AdminShareStats`에서 `recentListed` 분리, `AdminPage<T>`(rows+totalCount)·`AdminListQuery`·`ADMIN_PAGE_SIZE`(25) 추가. JS 집계 코드와 `readMaterialsCount()` 삭제
3. `src/pages/AdminPage.tsx` — 사용자/공유마당 각각 검색창(250ms 디바운스) + `Pager` 컴포넌트. 사용자 목록에 이메일 노출(UUID는 아래 작게)
4. `src/styles/app.css` — `.admin-search-input`, `.admin-pager`, `.admin-subheading`

**검증:** RPC 3개를 관리자 JWT로 직접 호출해 값이 기존 집계와 일치함을 확인(총 19건·공개 2건·사용자 2명). 검색 `test` → `redgontest@gmail.com` 1건이며 `total_count`도 필터 기준으로 갱신됨. 비관리자 JWT 호출은 `42501`로 거부됨. `tsc`·`npm run build` 클린.

**⚠️ 남은 확인:** 브라우저에서 검색·페이지 이동 실제 동작은 사용자 확인 전.

*(2026-09-04 추가: 이후 목업 계정 시드로 데이터가 사용자 32명·공유마당 33건·여행 54건으로 늘었다. 25건을 넘으므로 이제 `Pager`가 보이는 것이 정상이다 — 이전 문장의 "숨겨진 상태가 정상"은 데이터가 적던 시점 기준이었다.)*

---

## 3-5. 우선순위 ④ — 신고 검수 직접 제재 (완료)

**무엇이 문제였나:** `/admin/reports`에서 할 수 있는 건 상태값 변경과 메모뿐이었다. "조치 완료"로 바꿔도 신고당한 콘텐츠는 그대로 공개돼 있었고, 실제로 내리려면 다른 화면으로 가야 했다. `trip`·`plaza_listing` 대상은 관리자 화면 자체가 없어 Supabase 대시보드로 들어가야 했다.

**신고 대상별 실제 레버** (`ReportButton` 사용처를 추적해 확인):
| 대상 | 식별자 | 제재 |
|---|---|---|
| `trip` | `waymeld_trips.id` | `is_public=false` **+ `listed_in_plaza=false`** (비공개면 마당에 남으면 안 됨) |
| `plaza_listing` | `waymeld_trips.id` | `listed_in_plaza=false`만 (소유자 공유 링크는 유지) |
| `guide` | `guide_articles.id` | `status='draft'` |
| `place` | — | **신고를 만드는 UI가 어디에도 없다.** 타입만 존재하고 내릴 콘텐츠도 없어 제재 액션 없음으로 표시 |

**변경한 파일:**
1. `supabase/migrations/20260904050000_admin_report_moderation.sql` (신규)
   - `admin_report_target_states()` — 신고별 대상의 현재 상태(공개중/내려짐/삭제됨 등). 버튼 활성화와 "이미 조치됨" 표시용
   - `admin_moderate_report(p_report_id)` — 제재 + 신고 `resolved` 전환을 **한 트랜잭션**으로. 대상 유형을 신고 행에서 직접 읽으므로 호출자가 어긋나게 지정할 수 없다
2. `src/lib/contentReports.ts` — `fetchReportTargetStates()`, `moderateReport()`, `MODERATABLE_TARGETS`, `MODERATION_ACTION_LABEL`
3. `src/pages/AdminReportsPage.tsx` — "대상 상태 · 제재" 열 추가, 확인 대화상자 후 실행
4. `src/styles/app.css` — `.admin-moderate-btn`

**설계 판단 두 가지:**
- **관리자에게 `waymeld_trips` UPDATE 권한을 주지 않았다.** RLS는 컬럼 단위 제한이 안 되므로 정책을 열면 관리자가 남의 여행 내용 전체를 고칠 수 있게 된다. SECURITY DEFINER RPC로 필요한 플래그만 뒤집는다.
- **`waymeld_trips`에는 감사 트리거를 달지 않았다.** 자동저장 때문에 모든 사용자의 모든 저장이 로그로 쏟아진다. 대신 제재 RPC 안에서만 `admin_audit_log`에 직접 기록한다(트리거와 같은 형식이라 감사 로그 화면에서 동일하게 렌더된다). `guide_articles`는 이미 트리거가 있어 자동 기록된다.

**검증(롤백 트랜잭션):** 실제 마당 게시 여행에 테스트 신고를 만들어 전 과정 확인 —
`plaza_listing`: "마당 게시중"→제재→"내려짐", `is_public`은 true 유지, 신고 `resolved`+`reviewed_at` 설정, 감사 로그에 `waymeld_trips UPDATE fields=listed_in_plaza` 기록.
`trip`: 두 플래그 모두 false로, 상태 "비공개".
비관리자 호출은 `42501` 거부. `tsc`·`npm run build` 클린.

**⚠️ 남은 확인:** 현재 실제 신고가 **0건**이라 브라우저에서는 빈 화면이다. 확인하려면 `/plaza`나 공유 여행 페이지에서 신고를 하나 접수한 뒤 `/admin/reports`를 보면 된다.

---

## 3-6. 보안 어드바이저 점검 및 강화 (완료)

②~④에서 SECURITY DEFINER 함수를 6개 추가했으므로 Supabase security advisor를 돌려 검증했다.

**결과:** 전체 214건 중 **WayMeld 테이블의 ERROR는 0건.** ERROR 40여 건은 전부 같은 프로젝트를 쓰는 다른 앱(`category_columns`, `transfer_results`, `getphnum_*` 뷰 등) 것이다. 이 DB가 여러 실서비스와 공유된다는 점을 다시 확인.

**고친 것 두 가지** (`supabase/migrations/20260904060000_admin_function_hardening.sql`):
1. `audit_redact()`에 `set search_path = public`이 빠져 있었다(다른 함수엔 전부 넣었는데 이것만 누락).
2. Postgres가 함수 EXECUTE를 PUBLIC에 기본 부여하므로 관리자 전용 RPC 5개가 **로그아웃(anon) 상태에서도 호출 가능**했다. `is_admin()` 게이트로 막히긴 하지만 호출 자체를 못 하게 PUBLIC/anon 회수 후 `authenticated`에만 부여했다. 적용 후 anon 호출은 `permission denied for function`으로 막히는 것을 확인.

**⚠️ 건드리면 안 되는 것 (§3-6):** `is_admin()`의 EXECUTE 권한은 회수하면 안 된다. RLS 정책 본문에서 호출되므로 호출자(anon 포함)에게 EXECUTE가 없으면 **정책 평가 자체가 실패해 관련 테이블이 전부 접근 불가**가 된다. 트리거 함수 `log_admin_action()`도 같은 이유로 그대로 뒀다. 어드바이저가 이 둘을 계속 WARN으로 표시하지만 의도된 것이다.

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

후속 세션(2026-09-04)에서 §3-2의 재귀 수정 마이그레이션과 이 문서 갱신분을 추가 커밋했다.

### 참고 — 마이그레이션 배포 경로가 하나 늘었다

§4의 CLI 이력 불일치는 그대로다(`db push` / `migration repair`는 여전히 쓰지 말 것). 다만 이번에 **MCP `apply_migration`으로 원격에 직접 적용**하는 경로가 실제로 동작함을 확인했다 — 대시보드 SQL 에디터에 붙여넣는 것과 같은 효과이며, 세션에서 적용 후 즉시 재검증까지 할 수 있어 편하다. 공유 DB(다른 실서비스가 같은 프로젝트에 있음)이므로 **적용 전 영향 범위를 확인하고 사용자 승인을 받을 것.**

---

## 3-7. 통합 대시보드 (완료)

**무엇이 문제였나:** 관리자 지표가 8개 페이지에 흩어져 있어 "지금 뭘 봐야 하는지" 알려면 전부 눌러봐야 했다.

**변경한 파일:**
1. `supabase/migrations/20260904070000_admin_dashboard.sql` (신규) — `admin_dashboard_summary()` RPC. 여행·신고·가이드·시나리오·인사이트·배포·공지·감사 카운트를 jsonb 하나로 돌려준다(왕복 1회). 다른 관리자 RPC와 같이 `is_admin()` 게이트 + PUBLIC/anon 회수.
2. `src/lib/adminDashboard.ts` (신규) — 타입 + `deriveAlerts()`. 숫자만 늘어놓으면 8개 페이지를 도는 것과 다를 게 없어서, **지금 손대야 할 것**을 규칙으로 뽑아낸다.
3. `src/pages/AdminDashboardPage.tsx` (신규) — `/admin/dashboard`. "조치가 필요한 것" 목록(각 항목에 바로가기 버튼) + 영역별 KPI 카드 8개(클릭 시 해당 화면으로).
4. `AdminHeader.tsx` 내비 **맨 앞**에 "대시보드" 추가, `App.tsx` 라우트.

**경보 규칙:** 미처리 신고 / 배포 실패 / 배포 초안은 있는데 계정 0개 / 트렌드 수집 14일 이상 정체 / 수집 원문은 있는데 장소 연결 0건 / 시나리오 테마 미커버 / 시나리오·가이드 초안 대기 / 관리자 1명뿐.

**첫 실행에서 실제로 잡힌 것들** (기능이 의도대로 동작함을 보여줌):
- 배포 초안 9건이 있는데 연결된 계정이 0개 → 게시 불가 상태
- 트렌드 수집이 2026-08-12 이후 멈춤
- 수집 원문 597건이 장소와 연결되지 않음 (§2 백로그의 `insight_place_mentions` 0건 문제와 동일)
- 시나리오 테마 6/10만 커버

**검증:** RPC를 관리자 JWT로 호출해 값 확인(여행 54·사용자 32·마당 33·감사 31). `tsc`·`npm run build` 클린.

**⚠️ 남은 확인:** 브라우저 실동작은 사용자 확인 전.

---

## 3-8. 전역 검색 (완료)

**무엇이 문제였나:** ③에서 각 목록 화면에 검색을 붙였지만 그 화면 안에서만 찾을 수 있었다. "이 이메일이 누구지", "이 제목이 어느 화면에 있지"를 알려면 여전히 화면을 하나씩 돌아야 했다.

**변경한 파일:**
1. `supabase/migrations/20260904080000_admin_global_search.sql` (신규) — `admin_global_search(p_query, p_limit)`. 사용자(이메일·관리메모) / 여행(제목) / 가이드(제목·요약·slug) / 시나리오(한국어 제목·지역·테마) / 공지(제목·본문)를 UNION ALL로 훑고 `(kind, id, title, subtitle, status, url)`로 정규화해 돌려준다. 영역마다 `p_limit`씩.
2. `src/lib/adminSearch.ts` (신규) — 타입, `searchAdmin()`, `groupByKind()`
3. `src/pages/AdminSearchPage.tsx` (신규) — `/admin/search?q=`. 종류별로 묶어 표시
4. `src/components/AdminHeader.tsx` — **모든 관리자 화면 상단에 전역 검색창**. 나열형 내비에 항목을 더 넣는 대신 헤더에 붙였다(9개로 이미 빽빽하다). 검색 결과 화면에서는 현재 검색어가 입력창에 남는다
5. `src/pages/AdminPage.tsx` — `/admin?q=` 로 들어오면 사용자 검색창을 채운다(검색 결과의 사용자 항목이 여기로 연결됨)

**결과에 넣은 것:** 여행은 소유자 이메일을 부제로 보여주고, 공개된 여행은 `/trip/<slug>` 링크가 붙어 바로 열어볼 수 있다. 비공개면 링크 없이 "비공개"로 표시.

**검증:** `"제주"` → 여행 5건(소유자 이메일·공유링크 포함) + 시나리오 1건, `"user3"` → 사용자 2건(`user3@`, `user30@`). `tsc`·`npm run build` 클린.

**⚠️ 남은 확인:** 브라우저 실동작은 사용자 확인 전.

---

## 4-1. 커밋 분리에 대한 메모 (다음 세션 주의)

2026-09-04 오후 시점에 **사용자가 직접 진행 중인 작업**(목업 메일 로그인 `mock-email-login`·`mockMailUsers.ts`, 약관 모달 `LegalModal.tsx`·`LegalDocuments.tsx`, `AuthContext`·로그인·약관 페이지·9개 로케일)이 미커밋 상태로 있었다. `src/styles/app.css`와 `src/pages/AdminPage.tsx`는 **양쪽 변경이 한 파일에 섞여** 있어서, 내 작업분만 hunk 단위로 분리해 커밋했다(`git apply --cached`로 해당 hunk만 스테이징). 그 작업들은 그대로 미커밋으로 남겨뒀으니 사용자가 마무리 후 커밋하면 된다.

---

## 3-9. 데이터 내보내기 (CSV) (완료)

**변경한 파일:**
1. `src/lib/csv.ts` (신규) — `toCsv()` / `downloadCsv()` / `csvFilename()`
2. `src/pages/AdminPage.tsx` — 사용자 목록·공유마당 목록에 내보내기 버튼
3. `src/pages/AdminAuditPage.tsx` — 감사 로그 내보내기(이전/이후 JSON 포함)

**두 가지를 반드시 처리해야 실제로 쓸 수 있는 파일이 나온다:**
- **CSV 수식 인젝션 방지** — 내보내는 값에 사용자가 입력한 텍스트(관리 메모, 여행 제목, 이메일)가 섞인다. Excel은 셀이 `=` `+` `-` `@` 로 시작하면 수식으로 실행하므로 앞에 작은따옴표를 붙여 무력화한다.
- **UTF-8 BOM** — BOM이 없으면 Excel이 시스템 인코딩으로 읽어 한글이 전부 깨진다.

**내보내는 범위:** 화면에 보이는 페이지가 아니라 **현재 검색·필터 조건에 맞는 전체**(최대 5000건). 서버 페이지네이션을 쓰므로 큰 limit으로 한 번 더 호출한다. 버튼에 건수를 함께 표시한다.

**검증:** `esbuild`로 `csv.ts`를 번들해 실제 함수를 직접 호출, 수식 인젝션(`=1+1`→`'=1+1`, `@mention`→`'@mention`) / 따옴표 이중화 / 쉼표·줄바꿈 감싸기 / null 처리가 모두 정확함을 확인. `tsc`·`npm run build` 클린.

**⚠️ 남은 확인:** 브라우저에서 실제 다운로드는 사용자 확인 전.

---

## 3-10. 버전 이력 되돌리기 (완료)

**왜 별도 버전 테이블을 안 만들었나:** ②의 감사 로그가 이미 변경 전/후를 갖고 있다. 감사 로그 항목 하나를 골라 그 시점으로 되돌리면 되므로 새 테이블이 필요 없고, 되돌리기 자체도 트리거가 다시 기록해 이력이 이어진다. 백로그의 "가이드 버전 이력/롤백 없음", "랜딩 변경 이력/되돌리기 없음"이 한 번에 해결된다.

**⚠️ 이 기능의 핵심 위험과 대응:** `audit_redact()`는 1000바이트 넘는 값을 잘라낸다. 그대로 복원하면 **가이드 본문(`body_md`) 자리에 자리표시자 문자열이 덮어써져 원본이 파괴된다.** 그래서 두 가지를 했다.
1. 잘림 마커를 문자열이 아니라 구조화된 jsonb(`{"__audit_omitted_bytes__": N}`)로 바꿨다 — 사용자가 입력한 텍스트와 절대 헷갈리지 않는다.
2. 복원 시 잘린 필드가 하나라도 있으면 **필드명을 알려주며 거부**한다. UI도 버튼을 막고 이유를 보여준다.

**변경한 파일:**
1. `supabase/migrations/20260904090000_admin_audit_restore.sql` (신규) — `audit_redact()` 마커 구조화, `audit_omitted_fields()`, `admin_restore_audit_entry(p_audit_id)`
2. `src/lib/adminAudit.ts` — `RESTORABLE_TABLES`, `restoreBlockReason()`(버튼 사전 차단 + 이유), `restoreAuditEntry()`
3. `src/pages/AdminAuditPage.tsx` — 상세 펼침 안에 되돌리기 버튼
4. `src/styles/app.css` — `.audit-restore-row`

**허용 테이블:** `guide_articles` / `landing_promo` / `admin_notices` / `scenario_catalog`. `admin_users`(권한 부여)·`content_reports`(신고 처리)는 되돌리면 안 되므로 **서버에서 거부**한다(UI만 막지 않는다). INSERT 되돌리기도 거부한다 — 해당 화면에서 삭제하면 된다.

**동작 방식:** UPDATE는 `before`에 담긴 컬럼만 되돌린다(`jsonb_populate_record`로 컬럼 타입에 맞게 캐스팅). DELETE는 전체 행을 원래 id 그대로 다시 넣는다.

**검증(롤백 트랜잭션) 4종:**
- 가이드 제목 변경 → 되돌리기 → 원래 제목 복구 ✅
- 본문(2000바이트) 변경 후 되돌리기 시도 → `되돌릴 수 없습니다: body_md`로 거부 ✅
- 공지 삭제 → 되살리기 → 원래 id로 복원 ✅
- `admin_user_verifications` 되돌리기 시도 → 거부 ✅

`tsc`·`npm run build` 클린.

**⚠️ 남은 확인:** 브라우저 실동작은 사용자 확인 전.

---

## 3-11. 🔴 회귀 버그 수정 — 남의 여행이 "내 여행" 목록에 섞이던 문제

**증상:** 관리자로 로그인하면 플래너의 "내 여행" 드롭다운에 목업 계정들의 공유마당 여행이 전부 들어와 있었다.

**원인 (2026-09-01 공동편집 Tier 1 작업에서 유입된 회귀):** 그때 `listRemote`/`readRemoteById`/`readRemoteLatest`에서 `.eq('owner_id', userId)` 필터를 제거하고 아래 주석을 달았다.

> RLS가 owner_id=나 OR trip_collaborators에 내가 있는 행만 돌려주므로 여기서 owner_id 필터를 걸면 공유받은 여행이 목록에서 빠진다.

**이 전제가 틀렸다.** `waymeld_trips`에는 SELECT 정책이 4개 있고 PostgreSQL은 permissive 정책을 **OR로 합친다**:
`owner_select`(소유·협업) / `public_slug_select`(**is_public=true**) / `plaza_list_select` / `waymeld_trips_admin_select`(**is_admin()**).
필터를 빼는 순간 뒤의 세 개까지 열린다.

**실측 영향 (관리자만의 문제가 아니었다):**
| 대상 | 수정 전 | 수정 후 |
|---|---|---|
| 관리자 | 55건(전체) | 19건(본인 것만) |
| 여행 없는 일반 사용자 | **34건(공개 여행 전부)** | 0건 |
| 여행 1건 보유 사용자 | 36건 | 3건(본인 것만) |
| 협업자(본인1+공유받음1) | 36건 | **2건** ✅ |

또한 `readRemoteLatest()`는 "전체에서 가장 최근 수정된 여행 1건"을 집어오므로, **남의 여행이 더 최근이면 앱을 열자마자 남의 여행이 내 플래너로 열린다.**

**데이터 손상은 없었다.** UPDATE 정책은 여전히 `소유자 OR 편집자`뿐이고, 2026-09-01에 넣은 `ownerId: trip.ownerId ?? userId` 방어도 살아 있어 소유권 탈취는 불가능했다. 조회 범위만 새는 문제였다(대신 저장이 조용히 실패하는 UX 문제는 있었다).

**수정:** 쿼리에서 명시적으로 좁힌다. 협업 여행이 있으면 `or(owner_id.eq.나, id.in.(협업 여행 id들))`, 없으면 `eq(owner_id, 나)`. `readRemoteById`는 협업 대상이 아니면 소유자 조건을 걸어 남의 여행이 내 플래너로 열리지 않게 했다(공개 여행 열람은 `/trip/:slug`와 "끌어오기"가 담당하므로 기능 손실 없음).

**교훈 (다음 세션이 꼭 기억할 것):** **RLS에 "내 것 판별"을 맡기지 말 것.** RLS는 "접근해도 되는가"를 정하고, 화면 목록은 대개 그보다 의도적으로 좁은 질의다. 정책이 하나 추가되면 조용히 넓어진다.

**검증:** PostgREST에 실제 요청을 보내 `.or()` 필터 문법이 200으로 파싱되는지 확인(문법 오류는 타입체크로 안 잡힌다). 위 표의 4가지 사용자 유형을 롤백 트랜잭션으로 각각 검증. `tsc`·`npm run build` 클린.

---

## 3-12. 초대 알림 — 초대 링크 방식 (A안, 완료)

**문제:** 협업자 초대는 `trip_invites`에 행을 넣는 게 전부였고, **초대받은 사람에게 알림이 전혀 가지 않았다.** 저장소 전체에 이메일 발송 수단(Resend·SendGrid·SMTP 등)이 없다. 초대받은 사람이 그 이메일로 로그인해야 `accept_trip_invites()`가 연결하는데, 로그인하게 만들 방법 자체가 없었다.

**선택:** 사용자와 논의해 **A안(초대 링크 복사)**으로 진행. 외부 서비스 없이 오늘 해결되고, 나중에 이메일 발송(B안)을 붙일 때 링크를 본문에 그대로 넣으면 되므로 버려지는 작업이 없다.

**변경한 파일:**
1. `supabase/migrations/20260904100000_trip_invite_preview.sql` (신규) — `mask_email()`, `get_trip_invite_preview(p_invite_id)`. `trip_invites`의 SELECT 정책은 소유자 전용이라 **초대받은 사람이 자기 초대를 못 읽는다.** SECURITY DEFINER로 최소 정보만 돌려준다.
2. `src/lib/trips.ts` — `buildInviteLink()`, `fetchInvitePreview()`
3. `src/components/CollaboratorsModal.tsx` — 대기 중 초대마다 "링크 복사"
4. `src/components/InviteBanner.tsx` (신규) — `/plan?invite=<id>` 진입 시 안내 배너
5. `src/pages/PlannerPage.tsx` — 배너 배치
6. `src/locales/*/share.json` (9개) — `collab.copyLink/linkCopied/copyFailed`, `invite.*` 8키
7. `src/styles/app.css` — `.invite-banner*`, `.collab-copy-link-btn`

**보안 설계:**
- **링크만으로는 권한이 생기지 않는다.** 연결은 여전히 `accept_trip_invites()`가 로그인 계정 이메일과 `trip_invites.email`이 일치할 때만 수행한다. 링크는 "알림" 역할일 뿐이다.
- 미리보기는 로그아웃 상태(anon)에서도 봐야 하므로 anon에 실행 권한을 준다. 대신 **이메일을 마스킹**(`gwf***@gmail.com`)하고 여행 제목·권한 외에는 아무것도 반환하지 않는다. 여행 내용·소유자 id는 노출되지 않는다.
- `trip_invites` 원본 테이블 직접 조회는 여전히 anon에게 0건이다(확인함).

**배너가 다루는 4가지 상태:** 미로그인(로그인 CTA) / **다른 계정으로 로그인**(초대 대상 이메일을 알려줌 — 이게 없으면 조용히 실패한다) / 연결 중 / 이미 참여 중. 취소·잘못된 링크는 "초대를 찾을 수 없습니다".

**검증:** 로그아웃 상태 브라우저(Playwright)로 실제 초대 링크 진입 → `red***@gmail.com님이 «춘천여행» 여행에 초대했습니다. gwf***@gmail.com 계정으로 로그인하면…` 정상 표시, 잘못된 id → "초대를 찾을 수 없습니다", JS 오류 없음. 9개 로케일 키 존재 확인. `tsc`·`npm run build` 클린.

**⚠️ 남은 것:** B안(실제 이메일 발송)은 미착수. 외부 서비스 가입 + 발신 도메인 인증(SPF/DKIM)이 선행되어야 한다.

---

## 3-13. 지도 핀업 애니메이션 (플래너 UX)

지도 말풍선에서 핀업하면 목록에 조용히 한 줄이 추가될 뿐이라, 특히 다른 탭을 보고 있으면 방금 누른 것이 어디로 갔는지 알기 어려웠다. 누른 자리에서 **핀 탭까지 포물선으로 날아가 착지하며 탭 개수가 튀는** 연출을 넣었다.

**변경한 파일:** `src/lib/pinFlyAnimation.ts`(신규) / `src/pages/PlannerPage.tsx`(`handleTogglePinFromInfo`에서 호출) / `src/components/PlannerSidePanel.tsx`(`data-tab` 훅) / `src/styles/app.css`(`.pin-fly-ghost*`, `pin-tab-pop`)

**설계 메모:**
- 착지 지점을 "목록 끝"이 아니라 **핀 탭**으로 잡았다. 목록은 다른 탭을 보고 있으면 렌더되지 않아 좌표가 없지만, 탭은 패널이 열려 있으면 항상 있고 **개수가 바뀌는 자리**라 시선이 자연스럽게 이어진다.
- 출발점은 지도 SDK가 그리는 오버레이(React 밖)라 좌표를 props로 넘기기 어렵다. 클릭 시점에 `.map-place-bubble-pin`의 rect를 직접 읽는다 — 말풍선이 핀업 직후 닫히므로 **`handleTogglePin`보다 먼저** 재야 한다.
- 해제할 때는 연출하지 않는다(날아갈 곳이 없다).
- 장소명은 외부 API에서 오므로 `textContent`로 넣는다(HTML 주입 방지). `prefers-reduced-motion`이면 비행을 건너뛰고 탭 팝만 준다.

**검증:** 실제 브라우저에서 검색 → 결과 클릭 → 말풍선 핀업까지 수행. 비행 중 고스트(`우성닭갈비 퇴계점`) 확인, 핀 탭 `핀 0 → 핀 1`, 착지 후 고스트 잔존 0건, JS 오류 없음.

### ⚠️ app.css 커밋 시 주의 (실제로 사고 날 뻔한 것)
사용자 진행 중 작업과 한 파일에 섞여 있어 hunk를 쪼개 커밋해 왔는데, **`git diff -U0`로 쪼갠 패치가 기존에 커밋된 CSS를 삭제하는 형태로 나온 적이 있다.** 새 블록을 기존 블록 바로 앞에 삽입하면 git이 "이동"으로 정렬하면서 삭제 hunk가 생기기 때문이다. 커밋 전 반드시 **셀렉터 집합을 HEAD와 비교해 "사라지는 셀렉터 0건"을 확인**할 것. (이번에는 확인해서 걸러냈고, 스테이징할 내용을 직접 만들어 `git hash-object`+`update-index`로 올렸다.)

---

## 3-14. 동선짜기 UX 검토 — 발견 5건 (진행 중)

사용자 요청으로 동선 패널을 사용자 입장에서 검토했다. 코드로 확인한 것만 적는다.
**"차례대로 진행하고 매번 컨펌"** 방식으로 합의했으므로 순서를 지킬 것.

| # | 문제 | 상태 |
|---|---|---|
| 1 | **최적화 3버튼이 아무 일도 안 함** | ✅ 완료 (§3-15) |
| 2 | Preview의 "13분"과 "ends 20:10"이 서로 다른 기준 | ✅ 완료 (§3-17) |
| 3 | AI 자동 추천이 기본 ON이라 두 번 눌러야 실제 호출 | **다음 착수 대상** |
| 4 | "핀 순서" 모드인데 동선 패널에서 순서 변경 불가 | 미착수 |
| 5 | 날짜를 비우면 영업시간 검증이 조용히 꺼짐 | 미착수 |

**2번 상세:** `previewStats`가 `minutes: preview.totalTravelMinutes` — **이동시간만**이다. 체류시간 합(예: 210분)은 빠져 있는데 `ends`는 체류를 **포함한** 종료 시각이라, 한 줄에 기준이 다른 두 값이 나란히 있다. 라벨이 "분"뿐이라 무엇의 분인지도 알 수 없다.

**3번 상세:** `DEFAULT_ROUTE_OPTIONS.autoStayTime = true`. 그래서 처음 열면 버튼이 이미 노란색(active)이고 각 항목에 "식사 60분 추천"이 뜨지만 **AI는 호출된 적이 없다** — `stayReasonLabel()`의 카테고리 고정 상수다. 이 상태에서 버튼을 누르면 `handleToggleAutoStay`가 early return으로 **꺼버린다**. AI를 쓰려면 껐다 켜야 한다. 호출 실패 시에도 조용히 카테고리 고정값으로 돌아가 실패를 알 수 없다.

**4번 상세:** `RouteOptionsPanel`에 `DndContext`가 0건, `PinupBar`에만 13건. 번호 붙은 카드가 세로로 늘어서 있어 끌 수 있어 보이지만 안 되고, 핀 탭으로 이동해야 한다.

**5번 상세:** `options.date`의 유일한 소비처가 `annotateOpeningHours()`다. 비면 요일을 못 구해 "휴무일·오픈 전" 경고가 통째로 안 뜨는데 안내가 없다.

---

## 3-15. 우선순위 ① — 최적화 3버튼을 실제로 연결 (완료)

**문제:** `optimizeBy`의 전체 등장이 패널·기본값·타입 선언 4곳뿐이고 **읽는 곳이 없었다.** `useHighway`·`useRealTimeTraffic`도 같다. 눌러도 동선이 안 바뀌는데 하나가 노란색으로 선택돼 있어 적용 중인 것처럼 보였다.

**해법:** 이미 카카오모빌리티 길찾기를 쓰고 있었고(`refineRouteWithRealLegs`) 그 API가 `priority`/`avoid`를 받는데 `priority:'RECOMMEND'`가 하드코딩돼 있었다. `optimizeBy`를 `fetchLegs → fetchLeg → fetchCarLegFromKakao`까지 넘겨 실제 파라미터로 만들었다.
`최단거리→DISTANCE` / `최소시간→TIME` / `무료도로→RECOMMEND + avoid=toll`

**실제 API 검증(서울시청→춘천시청):** RECOMMEND 101.5km·107분·톨 3900원 / DISTANCE 90.1km·123분·톨 5300원 / avoid=toll 100.7km·121분·**톨 0원**.

도보·자전거·대중교통 API는 이 파라미터를 받지 않으므로 **자동차가 아니면 버튼을 비활성화**하고 안내를 띄운다(값만 저장되고 아무 일도 안 하는 상태를 또 만들지 않기 위함). 커밋 `d6d32a6`.

---

## 3-16. 최적화 3종 경로 미리보기 + 통행료 (완료)

사용자 추가 요청 — "3종은 미리 경로를 보여주고, 무료도로를 뺀 나머지는 톨비를 하단에 표시".

**핵심 판단(비용):** 카카오 **경유지 길찾기**(`/v1/waypoints/directions`)는 전체 경로를 **1회 호출**로 돌려주므로 3종 비교가 3회면 끝난다. 구간마다 부르는 기존 `fetchLegs` 방식으로 비교했다면 정류장 5곳 기준 15회다. 좌표·이동수단을 `comparisonKey()`로 묶어 같으면 재호출하지 않는다.

**변경:** `src/lib/routeCompare.ts`(신규) / `RouteOptionsPanel`(비교표 + 푸터 통행료) / `MapView`·`GoogleMapView`(비교 폴리라인, 선택된 것만 진하게 6px·0.9, 나머지 4px·0.4) / `PlannerPage`(상태 중계) / 9개 로케일 / CSS.

통행료는 **무료도로를 뺀 두 기준에만** 적는다 — 무료도로는 정의상 0원이라 적을 이유가 없다.

**검증:** 안동 4지점 실호출 — 최단거리 88.9km·130분, 최소시간 103.2km·115분으로 경로가 실제 갈리고 좌표가 2000개씩 온다. `tsc`·`build` 클린. 커밋 `ab69c47`.

**⚠️ 남은 확인:** 폴리라인이 지도에 실제로 그려지는지는 **브라우저 확인 전.**

---

## 3-17. 동선짜기 UX 검토 2번 — Preview 시간 표기 기준 통일 (완료)

**문제:** Preview 한 줄에 "{{km}} km · {{minutes}}분 · ends {{time}}"이 떴는데, `minutes`는 **이동시간만**(`preview.totalTravelMinutes`)이고 `ends`(`preview.finishAt`)는 **이동+체류를 전부 더한** 도착 시각이었다. 라벨이 그냥 "분"이라 뭘 뜻하는지 알 수 없고, 두 숫자가 서로 안 맞는 것처럼 보였다.

**원인 확인:** `src/lib/planner.ts`의 `generateRoute()`가 이미 `totalStayMinutes`(체류시간 합)를 계산해 `GeneratedRoute`에 담고 있었는데(`types/index.ts:234`), `RouteOptionsPanel.tsx`가 그 필드를 읽지 않고 있었을 뿐이었다. 새로 합산 로직을 짤 필요는 없었다.

**해법:** `RouteOptionsPanel.tsx:622-627`에서 `stayMinutes: preview.totalStayMinutes`를 i18n 호출에 추가하고, 9개 로케일의 `route.options.previewStats`를 "이동 {{minutes}}분 · 체류 {{stayMinutes}}분 · {{time}} 끝" 형태로 갈랐다. 새 단어를 지어내지 않고 이미 앱에 있는 표현을 그대로 재사용했다:
- 이동시간 표현은 기존 `detailTravel` 키("이동 {{minutes}}분" 등, `RouteOptionsPanel.tsx`의 스톱별 상세에 이미 쓰이던 문구)와 동일하게
- 종료시각 표현은 기존 `pillNext` 키의 "{{finish}} 끝"/"ends {{finish}}"/"{{finish}} 終了" 패턴과 동일하게
- 체류시간 명사는 기존 `stayMinutesAria`가 쓰던 단어(체류/stay/滞在/停留/estancia/Aufenthalt)를 재사용

부수적으로 ja/zh-CN/zh-TW 세 로케일에 남아있던 번역 누락(영어 "ends"가 그대로 노출)도 함께 고쳤다("終了"/"结束"/"結束").

**변경한 파일:** `src/components/RouteOptionsPanel.tsx`, `src/locales/{ko,en,ja,zh-CN,zh-TW,es,fr,de,ru}/planner.json`

**확인한 것:** 9개 로케일 JSON 전부 `JSON.parse` 통과, `tsc --noEmit`·`npm run build` 클린, `previewStats` 키가 이 한 곳에서만 쓰이는 것 확인(다른 곳에 영향 없음).

**⚠️ 남은 확인:** 이번 세션에는 브라우저 자동화 도구(Playwright 등)가 연결돼 있지 않아 **실제 화면에서 줄이 어떻게 보이는지, 줄바꿈 없이 한 줄에 들어가는지는 직접 확인 못 했다.** 특히 en/es/fr/de/ru는 문구가 길어져서(예: "12.3 km · 25 min travel · 40 min stay · ends 20:10") 좁은 화면에서 잘리거나 줄바꿈될 수 있으니 다음 세션에서 브라우저로 꼭 확인할 것.

---

## 4-2. app.css 커밋 방법 (반드시 읽을 것)

사용자 진행 중 작업(약관 모달 `.legal-modal*`)과 한 파일에 섞여 있어 매번 분리해서 커밋해야 한다. **`git diff -U0` hunk 분할은 쓰지 말 것** — 새 블록을 기존 블록 앞에 넣으면 git이 "이동"으로 정렬해 **기존 CSS를 삭제하는 패치**가 나온다(실제로 한 번 발생, 커밋 전에 걸러냄).

안전한 절차:
1. 작업트리 app.css에서 `.legal-modal {` ~ `legal-modal-body section:last-child` 블록만 잘라낸 사본을 만든다
2. `git show HEAD:src/styles/app.css`와 **셀렉터 집합을 비교**해 "사라지는 셀렉터 0건"을 확인한다
3. `git hash-object -w` + `git update-index --cacheinfo`로 그 사본을 스테이징한다

`src/pages/AdminPage.tsx`, `src/locales/*/auth.json`에도 사용자 작업이 섞여 있으니 `git add`로 통째로 담지 말 것.
