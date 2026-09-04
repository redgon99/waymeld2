# HANDOFF — WayMeld(여로담) 작업 인계 문서

최신 갱신: 2026-09-04 / 브랜치 `main`

이 문서는 같은 사용자가 다른 장소·다른 세션에서 작업을 이어받기 위한 인계 문서다. 아래 순서대로 읽으면 된다: **0(지금 상태) → 1(주의사항) → 필요한 상세는 2~5에서 찾아보기**.

---

## 0. 지금 상태 한눈에 보기

두 작업 트랙이 진행 중이다.

1. **관리자 페이지 개선** (§2) — 사용자가 요청한 감사에서 나온 우선순위 4건 전부 완료, 확장 백로그도 대부분 완료. 남은 건 페이지별 세부 미비점(§5-1, 아직 착수 안 함).
2. **동선짜기 UX 검토** (§3) — 발견 5건 중 3건 완료. **다음 착수 대상은 4번("핀 순서" 모드인데 동선 패널에서 순서 변경 불가)** — §3 표 참고.

**작업 방식 (반드시 지킬 것):** 사용자와 "하나씩 완료 → 브리핑 → 컨펌 → 다음"으로 진행하기로 합의했다. 사용자 확답 없이 다음 항목으로 앞서가지 말 것.

**커밋 정책 (2026-09-04 사용자 지시):** git commit/push는 **사용자가 명시적으로 요청할 때만** 한다. 항목을 하나 완료했다고 자동으로 커밋하지 말 것 — 완료 확인과 커밋 요청은 별개다.

---

## 1. ⚠️ 반드시 알아야 할 주의사항

### 1-1. 🔴 Anthropic API 크레딧 소진 — 실서비스 장애, 미해결

2026-09-04 Playwright로 AI 체류시간 추천을 테스트하다가 발견. `route-stay-suggest` Edge Function이 **502**를 반환하고, 실제 응답 본문은:

> `"claude api failed: 400 ... Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."`

이 Supabase 프로젝트가 쓰는 **Anthropic API 키의 크레딧이 소진**된 상태다. 코드 문제가 아니라 결제 문제라 세션에서 고칠 수 없다. 같은 키를 쓰는 다른 Edge Function도 전부 막혀 있을 가능성이 크다(확인 필요): `tour-scenario`, `tour-scenario-catalog-generate`, `insight-analyze`, `insight-guide-draft`, `distribution-draft`, `link-places-extract`, `youtube-places-extract`, `route-stay-suggest`, `_shared/scenarioGen.ts`를 참조하는 곳 전부. **사실상 이 앱의 AI 기능 대부분.**

→ **사용자가 Anthropic 콘솔에서 크레딧을 충전해야 한다.** 다음 세션에서 해결됐는지 먼저 확인할 것.

### 1-2. Supabase 마이그레이션 이력이 CLI와 어긋나 있음

`supabase db push --dry-run`을 시도하다가 발견. **스키마 변경을 배포하려 할 때마다 똑같이 막힐 것이므로 반드시 인지하고 시작할 것.**

- 프로젝트 ref `ainftwifvclgiookzrwm`(`.env.local`의 `VITE_SUPABASE_URL`과 일치, 올바른 프로젝트 맞음)에 CLI로 연결하면, 원격 DB의 마이그레이션 이력 테이블에 **213개** 버전이 기록돼 있는데 로컬 `supabase/migrations/`의 파일과 **단 하나도 일치하지 않는다.** 반대로 로컬 파일 중 원격에 "적용됨"으로 기록된 것도 없다.
- 앱이 정상 동작하는 것으로 보아 실제 스키마(테이블/RLS 정책)는 DB에 존재할 가능성이 높다 — 즉 지금까지 배포는 `supabase db push`가 아니라 **Supabase 대시보드 SQL 에디터로 SQL을 직접 실행**하는 방식으로 이뤄져 온 것으로 추정된다(CLI 이력 테이블에는 기록이 안 남는 방식).
- CLI가 자동으로 제안하는 해결책(`supabase migration repair --status reverted <213개 id>`)은 **실행하지 않았다** — 그대로 따르면 이후 `db push`가 로컬 마이그레이션 전체를 "미적용"으로 보고 프로덕션 DB에 처음부터 다시 실행하려 들 위험이 있다(이미 존재하는 테이블/컬럼을 다시 만들다 에러 or 예기치 않은 부작용).
- **당분간 새 마이그레이션은 `supabase db push`를 쓰지 말고** 아래 둘 중 하나로 적용한다:
  1. Supabase 대시보드 SQL 에디터에 직접 붙여넣어 실행 (사용자가 직접 하거나)
  2. MCP `apply_migration`으로 원격에 직접 적용 (세션 안에서 적용 후 즉시 재검증까지 가능해 편하다 — 이번 세션에서 실제로 여러 번 이 경로로 적용·검증했다)
  - 공유 DB(다른 실서비스가 같은 프로젝트에 있음)이므로 **적용 전 영향 범위를 확인하고 사용자 승인을 받을 것.**
- CLI 이력 정리(`migration repair`)는 별도로 사용자와 충분히 논의한 뒤에만 시도할 것 — 세션 혼자 판단으로 진행하지 말 것.

### 1-3. app.css / AdminPage.tsx / 로케일 파일 커밋 시 사용자 작업과 섞임 주의

2026-09-04 동안 **사용자가 직접 진행 중인 작업**(목업 메일 로그인, 약관 모달 `LegalModal.tsx`/`LegalDocuments.tsx`, `AuthContext`, 로그인·약관 페이지, 9개 로케일의 `auth.json`)이 여러 차례 워킹트리에 미커밋 상태로 섞여 있었다. `src/styles/app.css`와 `src/pages/AdminPage.tsx`는 양쪽 변경이 같은 파일에 섞이는 일이 반복됐다.

**`git diff -U0`로 hunk를 쪼개 커밋하는 방식은 쓰지 말 것** — 새 CSS 블록을 기존 블록 바로 앞에 삽입하면 git이 "이동"으로 정렬하면서 **기존에 커밋된 CSS를 삭제하는 패치**가 나온 적이 실제로 있었다(커밋 전에 발견해서 걸렀다).

안전한 절차:
1. 작업트리에서 내가 추가한 블록만 잘라낸 사본을 만든다
2. `git show HEAD:src/styles/app.css` 등 기존 커밋본과 **셀렉터/키 집합을 비교**해 "사라지는 것 0건"을 확인한다
3. `git hash-object -w` + `git update-index --cacheinfo`로 그 사본만 스테이징해 커밋한다
4. 커밋 후 워킹트리를 다시 전체(내 것 + 사용자 것) 버전으로 복원한다

`git add -A`로 통째로 담지 말 것 — 사용자의 미완성 작업이 섞여 들어간다. `git add`는 항상 파일을 명시적으로 나열할 것.

### 1-4. 커밋 상태 (최신)

이 문서를 갱신하는 시점의 워킹트리 변경사항과 실제 커밋 여부는 세션마다 다르다 — `git log --oneline -20`과 `git status --short`로 직접 확인할 것. 과거 커밋 이력(관리자 페이지 개선 전체)은 `git log`에서 `20260904_` 접두어 커밋들로 확인 가능하다.

---

## 2. 관리자 페이지 개선

### 2-0. 배경

사용자 요청으로 **관리자 페이지(`/admin` 및 하위 페이지) 전체를 감사해 미비점 목록을 뽑고, 우선순위 높은 것부터 하나씩 고치는** 작업이었다.

관리자 페이지 구성 (`src/components/AdminHeader.tsx`의 `NAV_ITEMS` 기준): `/admin`(현황 관리) · `/admin/insights`(시장 인사이트) · `/admin/guides`(가이드 카드) · `/admin/distribution`(배포관리) · `/admin/scenarios`(시나리오 카탈로그) · `/admin/landing`(랜딩페이지 관리) · `/admin/reports`(신고 검수) · `/admin/audit`(감사 로그, 이번에 추가) · `/admin/dashboard`(대시보드, 이번에 추가) · `/admin/search`(전역 검색, 이번에 추가).

### 2-1. 합의된 우선순위 4건 — 전부 완료

| # | 항목 | 상태 |
|---|---|---|
| 1 | 관리자 계정 관리 UI 부재 | ✅ 완료 + 실사용 검증됨 (§2-2) |
| 2 | 감사 로그(Audit log) 부재 | ✅ 완료 (§2-3) |
| 3 | 대용량 데이터 페이지네이션/검색 부재 | ✅ 완료 (§2-4) |
| 4 | 신고 검수에서 직접 제재 액션 연결 부재 | ✅ 완료 (§2-5) |

### 2-2. ① 관리자 계정 관리 UI

**문제였던 것:** `admin_users` 테이블에 RLS 정책이 "본인 행 SELECT"만 있고 INSERT/UPDATE/DELETE 정책이 전혀 없어서, 관리자 본인도 Supabase 대시보드로 DB에 직접 들어가지 않으면 새 관리자를 등록할 방법이 없었다.

**변경한 파일:**
- `supabase/migrations/20260904000000_admin_users_management.sql` — 관리자 전용 INSERT/DELETE RLS 정책 추가, SELECT도 관리자면 전체 조회 가능하도록 확장
- `src/lib/admin.ts` — `listAdminUserAccounts` / `addAdminUserAccount` / `removeAdminUserAccount` / `getEnvAdminEmails`
- `src/pages/AdminPage.tsx` — "관리자 계정 관리" 섹션 신설(이메일로 추가, 목록+삭제, `VITE_ADMIN_EMAILS` 환경변수 관리자는 읽기 전용 안내, **마지막 관리자 1명은 삭제 버튼 비활성화**로 전원 잠금 방지)

**후속 확인·수정 (같은 날):**
- 마이그레이션 적용 확인됨, 실사용(두 번째 관리자 추가)까지 확인됨.
- **버그 발견·수정: `is_admin()` 무한재귀.** `admin_users` SELECT 정책이 `is_admin()`을 호출하는데, `is_admin()`이 SECURITY DEFINER가 아니라 호출자 권한으로 `admin_users`를 다시 읽어 **정책 → is_admin() → admin_users 조회 → 정책 → …** 로 순환했다. 관리자가 1명일 때는 `OR` 첫 조건에서 단락돼 우연히 동작했지만, **두 번째 관리자를 추가하는 순간** 전체 스캔 중 `stack depth limit exceeded`(54001)로 목록 화면이 깨졌다. 수정: `supabase/migrations/20260904010000_fix_admin_is_admin_recursion.sql` — 저장소 기존 해법(`is_trip_collaborator`)과 동일하게 `security definer` + `set search_path = public`. `is_admin()`을 참조하는 정책 24개 전부 WayMeld 테이블 전용임을 확인(공유 DB지만 영향 범위는 WayMeld 한정).

### 2-3. ② 감사 로그 (Audit log)

**설계 판단:** 호출부마다 로깅 코드를 넣는 대신 **DB 트리거**로 붙였다. 관리자 변경 지점이 9개 테이블·여러 lib 파일에 흩어져 있어 호출부 방식은 새 기능 추가 시 빠뜨리기 쉽고, 대시보드에서 직접 고친 변경은 아예 못 잡는다.

**변경한 파일:**
- `supabase/migrations/20260904020000_admin_audit_log.sql` — `admin_audit_log` 테이블 + `audit_redact()` + `log_admin_action()` 트리거 함수 + 9개 테이블에 트리거 부착
- `src/lib/adminAudit.ts` — 조회·필터·키셋 페이지네이션, `describeAuditEntry()`(로그 한 줄을 사람 문장으로)
- `src/pages/AdminAuditPage.tsx` — `/admin/audit`
- `src/components/AdminHeader.tsx`, `src/App.tsx`, `src/styles/app.css`(`.audit-op`, `.audit-detail`)

**감사 대상 9개 테이블:** `admin_users` / `admin_notices` / `admin_user_verifications` / `guide_articles` / `scenario_catalog` / `landing_promo` / `distribution_accounts` / `insight_keywords` / `content_reports`(관리자 조치인 UPDATE·DELETE만). `insight_raw_items`·`distribution_posts`는 파이프라인이 대량으로 써서 로그가 넘치므로 **일부러 제외**.

**설계상 지켜진 것 (검증 완료):** append-only(관리자도 자기 흔적 못 지움) · 비관리자 차단 · 대용량 컬럼(예: `scenario_catalog.content`)은 1000바이트 초과 시 크기만 남김 · UPDATE는 바뀐 컬럼만 기록(no-op UPDATE는 기록 안 함) · 서비스 롤 변경은 "시스템"으로 표기.

**⚠️ 알아둘 것:** 트리거는 설치 시점부터 기록하므로 그 이전 변경 이력은 없다. 화면을 처음 열면 비어 있는 게 정상.

### 2-4. ③ 목록 페이지네이션·검색

**무엇이 문제였나:** `lib/admin.ts`가 `waymeld_trips` 전량을 브라우저로 가져와 JS에서 집계했다. 특히 자료 개수를 세려고 `payload` 컬럼(여행 1건 최대 151KB)까지 통째로 받아왔다 — 데이터가 늘면 매 조회마다 수십~수백 MB. 검색창도 없었고 사용자 목록은 UUID만 보여줘 검색해도 쓸모없었다.

**변경한 파일:**
- `supabase/migrations/20260904030000_admin_pagination_search.sql` — RPC 3개: `admin_user_rows`(집계+이메일조인+검색+페이지네이션), `admin_share_stats`(카운트 전부 SQL에서, `jsonb_array_length`로 자료 수 세서 payload 자체는 브라우저로 안 나감), `admin_plaza_listings`(최근 12건 고정 → 검색+페이지네이션). 셋 다 `security definer`라 **함수 첫 줄에서 `is_admin()` 직접 확인**(RLS 우회하므로 필수).
- `src/lib/admin.ts` — RPC 호출로 교체, `AdminPage<T>`(rows+totalCount)·`AdminListQuery`·`ADMIN_PAGE_SIZE`(25) 추가, JS 집계 코드 삭제
- `src/pages/AdminPage.tsx` — 검색창(250ms 디바운스) + `Pager` 컴포넌트, 사용자 목록에 이메일 노출

**검증:** RPC 3개를 관리자 JWT로 직접 호출해 기존 집계와 값 일치 확인, 비관리자 호출은 `42501` 거부.

### 2-5. ④ 신고 검수 직접 제재

**무엇이 문제였나:** `/admin/reports`에서 상태값 변경·메모만 가능했다. "조치 완료"로 바꿔도 신고당한 콘텐츠는 그대로 공개돼 있었다.

**신고 대상별 실제 레버:**

| 대상 | 식별자 | 제재 |
|---|---|---|
| `trip` | `waymeld_trips.id` | `is_public=false` + `listed_in_plaza=false` |
| `plaza_listing` | `waymeld_trips.id` | `listed_in_plaza=false`만 |
| `guide` | `guide_articles.id` | `status='draft'` |
| `place` | — | 신고 생성 UI 자체가 없어 제재 액션 없음으로 표시 |

**변경한 파일:**
- `supabase/migrations/20260904050000_admin_report_moderation.sql` — `admin_report_target_states()`(대상 현재 상태), `admin_moderate_report(p_report_id)`(제재+신고 resolved 전환을 한 트랜잭션으로, 대상 유형을 신고 행에서 직접 읽어 호출자가 어긋나게 지정 불가)
- `src/lib/contentReports.ts`, `src/pages/AdminReportsPage.tsx`, `src/styles/app.css`(`.admin-moderate-btn`)

**설계 판단:** 관리자에게 `waymeld_trips` UPDATE 권한을 주지 않고(컬럼 단위 제한이 안 되므로) SECURITY DEFINER RPC로 필요한 플래그만 뒤집음. `waymeld_trips`엔 감사 트리거 안 닮(자동저장이 로그를 뒤덮으므로) — 제재 RPC 안에서만 직접 `admin_audit_log`에 기록.

**⚠️ 남은 확인:** 세션 시점 실제 신고가 0건이라 브라우저에서는 빈 화면. `/plaza`나 공유 여행 페이지에서 신고를 접수한 뒤 확인할 것.

### 2-6. 확장 백로그 — 완료된 것들

사용자가 "순차적으로 진행"을 지시해 아래도 이어서 처리했다.

**보안 어드바이저 점검 및 강화** — ②~④에서 SECURITY DEFINER 함수 6개를 추가해 Supabase security advisor로 검증. 전체 214건 중 WayMeld 테이블 ERROR는 0건(나머지는 같은 프로젝트의 다른 앱 것). 고친 것 둘(`20260904060000_admin_function_hardening.sql`): `audit_redact()`에 빠져 있던 `set search_path = public` 추가, 관리자 전용 RPC 5개가 로그아웃(anon) 상태에서도 호출 가능하던 것을 PUBLIC/anon 회수 후 `authenticated`에만 부여.
**⚠️ 건드리면 안 되는 것:** `is_admin()`과 트리거 함수 `log_admin_action()`의 EXECUTE 권한은 회수하면 안 된다 — RLS 정책 본문에서 호출되므로 회수하면 관련 테이블이 전부 접근 불가가 된다. 어드바이저가 WARN으로 계속 표시하지만 의도된 것.

**통합 대시보드** — 지표가 8개 페이지에 흩어져 있던 문제. `supabase/migrations/20260904070000_admin_dashboard.sql`의 `admin_dashboard_summary()` RPC(왕복 1회) + `src/lib/adminDashboard.ts`의 `deriveAlerts()`(숫자 나열이 아니라 "지금 손대야 할 것"을 규칙으로 추출) + `/admin/dashboard`. 경보 규칙: 미처리 신고 / 배포 실패 / 배포 초안은 있는데 계정 0개 / 트렌드 수집 정체 / 수집 원문-장소 미연결 / 시나리오 테마 미커버 / 초안 대기 / 관리자 1명뿐. 첫 실행에서 실제로 여러 건 잡혀 기능이 의도대로 동작함을 확인(배포 초안 9건인데 계정 0개, 트렌드 수집 정체, 수집 원문 597건 미연결, 시나리오 테마 6/10 커버 등).

**전역 검색** — `supabase/migrations/20260904080000_admin_global_search.sql`의 `admin_global_search(p_query, p_limit)`(사용자/여행/가이드/시나리오/공지를 UNION ALL로 훑어 정규화) + `src/lib/adminSearch.ts` + `/admin/search`. 모든 관리자 화면 상단(`AdminHeader.tsx`)에 검색창 배치. 공개된 여행은 결과에서 바로 `/trip/<slug>` 링크로 열람 가능.

**데이터 내보내기 (CSV)** — `src/lib/csv.ts`(`toCsv`/`downloadCsv`/`csvFilename`). 사용자 목록·공유마당 목록·감사 로그에 내보내기 버튼. 필수 처리 두 가지: **CSV 수식 인젝션 방지**(`=`/`+`/`-`/`@`로 시작하는 값 앞에 작은따옴표) + **UTF-8 BOM**(없으면 Excel에서 한글 깨짐). 화면에 보이는 페이지가 아니라 현재 검색·필터 조건에 맞는 전체(최대 5000건)를 내보낸다.

**버전 이력 되돌리기** — 별도 버전 테이블 없이 감사 로그(②)의 전/후 값을 재사용. `supabase/migrations/20260904090000_admin_audit_restore.sql`의 `admin_restore_audit_entry(p_audit_id)`. **핵심 위험 대응:** `audit_redact()`가 1000바이트 넘는 값을 자리표시자로 자르는데, 그대로 복원하면 원본이 파괴된다 — 잘림 마커를 구조화된 jsonb(`{"__audit_omitted_bytes__": N}`)로 만들고, 잘린 필드가 있으면 필드명을 알려주며 복원을 **서버에서 거부**한다(UI도 버튼을 막음). 허용 테이블: `guide_articles`/`landing_promo`/`admin_notices`/`scenario_catalog`. `admin_users`(권한 부여)·`content_reports`(신고 처리)는 되돌리면 안 되므로 서버에서 거부. INSERT 되돌리기(=행 자체를 지우는 것)도 거부 — 해당 화면에서 삭제하면 됨.

**🔴 회귀 버그 수정 — 남의 여행이 "내 여행" 목록에 섞이던 문제 (관리자 페이지 밖 이슈지만 이 작업 중 발견):** 2026-09-01 공동편집 작업에서 `listRemote`/`readRemoteById`/`readRemoteLatest`가 `owner_id` 필터를 제거하면서, `waymeld_trips`의 SELECT 정책 4개(소유·협업 / **공개** / 마당등록 / **관리자**)가 전부 OR로 합쳐져 **일반 사용자에게도 공개 여행 전부가 "내 여행"으로 보이는** 문제였다(관리자 55건→19건, 여행 없는 사용자 34건→0건 등 실측). 데이터 손상·소유권 탈취는 없었음(UPDATE 정책은 그대로 소유자/편집자 한정). 수정: 쿼리에서 명시적으로 `or(owner_id.eq.나, id.in.(협업 여행들))`로 좁힘. **교훈: RLS에 "내 것 판별"을 맡기지 말 것** — RLS는 "접근 가능한가"만 정하고, 화면 목록은 그보다 좁은 질의여야 한다. 정책이 하나 추가될 때마다 조용히 넓어진다.

**협업 초대 알림 (A안 — 초대 링크 복사, 관리자 페이지 밖):** 초대해도 상대에게 알림이 안 가던 문제(이메일 발송 수단이 저장소에 없음). A안으로 링크 복사 방식 채택. `supabase/migrations/20260904100000_trip_invite_preview.sql`의 `get_trip_invite_preview()`(SECURITY DEFINER, 이메일 마스킹해서 anon도 미리보기 가능) + `InviteBanner.tsx`(`/plan?invite=<id>` 진입 시 4가지 상태: 미로그인/다른계정로그인/연결중/이미참여). **B안(실제 이메일 발송)은 미착수** — 외부 서비스 가입 + 발신 도메인 인증(SPF/DKIM) 필요.

### 2-7. 미착수 — 페이지별 세부 미비점

최초 감사 시 발견했지만 아직 손 안 댐. 우선순위 미정, 필요시 사용자에게 확인 후 착수:
- **현황관리**: Tier3 게이트가 지표만 보여줄 뿐 후속 액션 없음, 공지 예약발행/종료일 없음
- **시장 인사이트**: 수집 실행 진행률 표시·취소 불가, 잘못 수집된 원문 삭제 불가, AI 오분류 수동 재분류 불가
- **가이드 카드**: 발행 전 실제 렌더링 미리보기 없음(버전 되돌리기는 §2-6에서 해결됨), 일괄 편집 불가
- **배포관리**: X(트위터) 외 5개 플랫폼(Reddit/YouTube/TikTok/웨이보/샤오홍슈)은 초안까지만 되고 게시 커넥터 미구현, 계정 자격증명 수정/교체(rotate) UI 없음(삭제 후 재등록만), 게시 실패 재시도 버튼 없음, `scheduledAt` 필드는 있는데 예약 게시 UI 없음
- **시나리오 카탈로그**: 대량 재생성이 순차 실행만 지원, 재생성 전/후 콘텐츠 diff 비교 뷰 없음
- **랜딩페이지 관리**: 데스크톱 미리보기만 있고 모바일 미리보기 없음, 예약 게시 없음(버전 되돌리기는 §2-6에서 해결됨)
- **신고 검수**: 신고자에게 처리 결과 통보 없음, 여러 건 선택 일괄 처리 불가

---

## 3. 동선짜기 UX 검토

사용자 요청으로 플래너의 동선 패널(`RouteOptionsPanel.tsx`)을 사용자 입장에서 검토해 발견한 5건. **"차례대로 진행하고 매번 컨펌"** 방식으로 합의했으므로 순서를 지킬 것 — 사용자 확답 없이 앞서가지 말 것.

| # | 문제 | 상태 |
|---|---|---|
| 1 | 최적화 3버튼(최단거리/최소시간/무료도로)이 아무 일도 안 함 | ✅ 완료 (§3-1) |
| 2 | Preview의 "13분"과 "ends 20:10"이 서로 다른 시간 기준 | ✅ 완료 (§3-2) |
| 3 | AI 자동 추천이 기본 ON이라 두 번 눌러야 실제 호출 | ✅ 완료 (§3-3) |
| 4 | "핀 순서" 모드인데 동선 패널에서 순서 변경 불가 | **다음 착수 대상** |
| 5 | 날짜를 비우면 영업시간 검증이 조용히 꺼짐 | 미착수 |

**4번 상세:** `RouteOptionsPanel`에 `DndContext`가 0건, `PinupBar`에만 있음. 번호 붙은 카드가 세로로 늘어서 있어 끌 수 있어 보이지만 안 되고, 핀 탭으로 이동해야 순서를 바꿀 수 있다.

**5번 상세:** `options.date`의 유일한 소비처가 `annotateOpeningHours()`다. 비면 요일을 못 구해 "휴무일·오픈 전" 경고가 통째로 안 뜨는데 안내가 없다.

### 3-1. ① 최적화 3버튼을 실제로 연결

**문제:** `optimizeBy`가 패널·기본값·타입 선언에만 등장하고 **읽는 곳이 없었다.** `useHighway`·`useRealTimeTraffic`도 같은 상태. 눌러도 동선이 안 바뀌는데 하나가 선택된 것처럼 보였다.

**해법:** 이미 쓰던 카카오모빌리티 길찾기(`refineRouteWithRealLegs`)의 `priority`/`avoid` 파라미터가 `'RECOMMEND'`로 하드코딩돼 있던 것을 `optimizeBy`로 실제 전달: 최단거리→DISTANCE / 최소시간→TIME / 무료도로→RECOMMEND+avoid=toll. 도보·자전거·대중교통 API는 이 파라미터를 안 받으므로 자동차가 아니면 버튼을 비활성화.

**실제 API 검증(서울시청→춘천시청):** RECOMMEND 101.5km·107분·톨 3900원 / DISTANCE 90.1km·123분·톨 5300원 / avoid=toll 100.7km·121분·톨 0원.

이어서 사용자 추가 요청으로 **최적화 3종 경로 미리보기 + 통행료 표시**도 붙였다. 카카오 경유지 길찾기(`/v1/waypoints/directions`)는 전체 경로를 1회 호출로 돌려주므로 3종 비교가 3회로 끝난다(`src/lib/routeCompare.ts`, `comparisonKey()`로 좌표·이동수단이 같으면 재호출 안 함). 통행료는 무료도로를 뺀 두 기준에만 표시. 안동 4지점 실호출로 경로가 실제로 갈리는 것 확인(최단거리 88.9km·130분, 최소시간 103.2km·115분).

### 3-2. ② Preview 시간 표기 기준 통일

**문제:** Preview 줄의 `{{minutes}}분`은 **이동시간만**(`totalTravelMinutes`)이고 `ends {{time}}`은 **이동+체류를 다 더한** 종료시각이라 두 숫자 기준이 달랐다.

**원인:** `planner.ts`의 `generateRoute()`가 이미 `totalStayMinutes`를 계산해 갖고 있었는데 `RouteOptionsPanel.tsx`가 읽지 않고 있었을 뿐 — 새 합산 로직은 필요 없었다.

**해법:** `stayMinutes: preview.totalStayMinutes`를 i18n 호출에 추가하고, 9개 로케일의 `previewStats`를 "이동 {{minutes}}분 · 체류 {{stayMinutes}}분 · {{time}} 끝" 형태로 분리. 새 단어를 짓지 않고 이미 앱에 있던 표현(`detailTravel`, `pillNext`의 종료 표현, `stayMinutesAria`의 체류 명사)을 재사용. 부수적으로 ja/zh-CN/zh-TW에 번역 안 된 채 남아있던 영어 "ends"도 함께 고침.

**변경한 파일:** `RouteOptionsPanel.tsx`, `src/locales/{9개 언어}/planner.json`

**✅ 브라우저 확인됨 (§3-3에서 같이 확인):** "7.7 km · 이동 18분 · 체류 420분 · 18:43 끝"으로 정확히 표시.

### 3-3. ③ AI 자동 추천 기본 ON 문제

**문제:** `DEFAULT_ROUTE_OPTIONS.autoStayTime = true`였다. `true`는 실제로는 "AI가 추천을 마쳤다"는 뜻인데, 새 여행/새 날짜를 열면 AI를 호출한 적도 없이 버튼이 이미 켜진 것처럼 보이고 카테고리 고정 문구가 AI 추천인 것처럼 떴다. `handleToggleAutoStay()`는 이미 `true`인 상태에서 첫 클릭 시 그냥 꺼버리기만 해서, 실제 AI 호출은 두 번째 클릭에서야 일어났다. 이 상태에서는 체류시간 수동 입력창도 숨겨졌다. AI 호출이 실패해도 조용히 카테고리 기본값으로 대체하며 `autoStayTime`을 `true`로 바꿔버려, 실패를 알 수 없고 재시도도 안 되고 **사용자가 직접 넣어둔 체류시간까지 덮어써지는** 부작용까지 있었다.

**해법:**
- `src/lib/tripRouteOptions.ts` — `DEFAULT_ROUTE_OPTIONS.autoStayTime`을 `false`로. 새 여행/새 날짜에서 시작 상태가 정직해지고, 입력창이 처음부터 편집 가능해지며, 첫 클릭이 곧바로 실제 AI 호출로 이어진다. 기존 저장된 트립에는 영향 없음(`normalizeTrip`이 미저장 날짜에만 기본값 채움).
- `RouteOptionsPanel.tsx` — 실패 시 더 이상 `autoStayTime`을 `true`로 바꾸지 않고(입력창 계속 편집 가능), 기존 체류시간을 덮어쓰던 로직 제거(어차피 `generateRoute()`가 미지정 스톱에 카테고리 기본값을 자동 적용하므로 불필요했음). 새 상태 `aiStayError`로 실패를 화면에 알림.
- 9개 로케일에 `aiSuggestError` 키 추가, `app.css`에 `.route-ai-suggest-error`.

**✅ 브라우저 실동작 확인 완료 (Playwright, 2026-09-04):** `npm install --no-save playwright`로 설치(프로젝트에 안 남음, `.pw-scratch/`는 `.gitignore`에 추가돼 있음). user1@mail.com 목업 계정 → 기존 "춘천여행" 트립에서 확인:
- Preview 줄 정상 분리 표시(§3-2와 함께 확인)
- AI 버튼 처음부터 비활성, 체류시간 입력창 바로 편집 가능
- 버튼 1회 클릭 → 네트워크 로그로 `route-stay-suggest` 호출이 **정확히 1회**만 발생(두 번 눌러야 하던 문제 해소 확인)
- 이 클릭이 마침 §1-1의 Anthropic 크레딧 소진과 겹쳐 **실전 실패를 그대로 재현** — `aiStayError` 안내 문구가 정확히 뜨고 버튼이 active로 안 바뀌는 것까지 확인됨

---

## 4. 실행 명령 · 프로젝트 정보

```bash
npx tsc --noEmit   # 타입체크 (배포 전 항상)
npm run build      # 프로덕션 빌드 (배포 전 항상)
npm run dev         # 개발 서버
```

Supabase 프로젝트 ref: `ainftwifvclgiookzrwm` (대시보드: `https://supabase.com/dashboard/project/ainftwifvclgiookzrwm`)

**브라우저 자동화 검증이 필요할 때:** `npm install --no-save playwright && npx playwright install chromium`로 세션 내 설치 가능(프로젝트 파일에 안 남음). 목업 로그인은 `/login`에서 이메일 `user1@mail.com`~`user30@mail.com`(약관 체크박스 2개 동의 필요) — 이미 여러 계정에 샘플 여행이 시드돼 있다(§1-1처럼 실제 네트워크 실패도 그대로 재현되니 참고).

**주의:** `supabase db push` / `supabase migration repair`는 §1-2 때문에 그대로 쓰면 안 됨.
