# HANDOFF — WayMeld(여로담) TourAPI 통합 작업

작성일: 2026-08-17 (다른 컴퓨터의 새 Claude Code 세션에서 이어받기 위한 인계 문서)

브랜치: `main` / 최신 커밋: `2fc3fcc 20260817_한국여행정보 지역 방문자 통계 탭 추가`

---

## 1. 현재 개발 목표

WayMeld는 한국 여행 일정을 짜는 앱(핀 수집 → Day별 동선 구성이 핵심)이다. 이번 작업 트랙은 **한국관광공사 TourAPI 4.0 전면 통합**이며, 큰 원칙은 하나:

> **핀업 가능한(장소 단위) TourAPI 서비스 → 기존 AI 테마-시나리오 시스템에 통합**
> **핀업 불가능한(열람 전용) 서비스 → 별도 `/info`(한국여행정보) 페이지에 통합**

이 원칙에 따라 TourAPI가 제공하는 여러 하위 서비스(웰니스, 고캠핑, 반려동물, 무장애, 오디오가이드, 두루누비, 관광사진, 관광빅데이터 등)를 하나씩 검증·통합해왔다.

---

## 2. 완료된 작업

### 2-1. 시나리오(핀업) 계열 — AI 테마 트립에 후보로 편입
- **WellnessTursmService**(웰니스): 명상/웰빙 테마 후보로 병합.
- **GoCampingService**(고캠핑): 캠핑 테마 후보로 병합. `contentId`가 KorService2와 다른 별도 ID 공간이라 `gocamping:<id>` 접두사로 네임스페이싱, `sourceApi` 필드로 외부 링크(`gocamping.or.kr`) 분기.
- **KorPetTourService2 / KorWithService2**(반려동물·무장애): 이미 AI가 선정한 시나리오 스팟에 대해 `detailCommon2` 단건 조회로 "반려동반 가능"/"무장애 시설" 배지를 부착(새 후보 소스가 아니라 태그 강화).

### 2-2. `/info`(한국여행정보) 페이지 — 열람 전용 탭 5개
`src/pages/KoreaInfoPage.tsx`에 순서대로 추가:
1. **관광사진** — `PhotoGalleryService1`, 테마 키워드 검색(야경/축제/한옥/자연/해변/사찰).
2. **걷기 코스** — `Durunubi`(두루누비), 4개 코리아둘레길 브랜드(해파랑/남파랑/서해랑/DMZ)로 클라이언트 필터, GPX 경로를 Google Maps로 시각화(`TrailRouteModal.tsx`).
3. **오디오 가이드** — `Odii`, 장소 검색 → 이야기(대본+음성) 목록 모달(`OdiiStoriesModal.tsx`).
4. **지역 방문자 통계** — `DataLabService`, 광역(시도)/기초(시군구) 단위 방문자수 순위(현지인/외지인/외국인 분해).
5. **반려동물 동반여행 / 무장애 여행** — `KorPetTourService2` / `KorWithService2` 목록 브라우징, `contentTypeId` 업종 필터.

모든 탭에 탭 설명 문구(`tabs.desc.*`)와 하위분류 칩(`info-subcats`)이 있고, 4개 언어(ko/en/ja/zh) 로케일이 전부 채워져 있다.

### 2-3. 방금 조사만 하고 착수 안 한 것
사용자가 "tourapi 다국어서비스 적용현황"을 물어봐서 조사한 결과를 아래 §8에 정리. **아직 코드 변경은 하지 않음.**

---

## 3. 미완료 작업 (우선순위 순)

1. **다국어 전용 TourAPI 서비스 미통합** (§8 참고) — UI는 ko/en/ja/zh 4개 로케일을 지원하지만, 장소명·주소·사진·트레일·오디오가이드 등 원천 데이터는 전부 한국어(KorService2 계열) 고정. AI 시나리오의 서술 텍스트만 번역됨. `EngService2/JpnService2/ChsService2/ChtService2/GerService2/FreService2/SpnService2/RusService2` 중 어느 것도 코드에서 호출되지 않음.
2. **일본어(JpnService2) 매뉴얼 미확보** — `docs/tourAPI/manual/org/`에 영/중간/중번/독/불/서/노 7개 언어 매뉴얼은 있는데 일본어만 없음. UI는 ja를 지원하므로 우선순위 있음.
3. **ChsService2/ChtService2 업그레이드**: 현재 중국어 내레이션은 Claude 번역만 사용. 별도 서비스 도입 시 품질 개선 가능(낮은 우선순위, 미착수).
4. **MdclTursmService**(의료관광): 니치 판단으로 보류.
5. **동시 진행 중인 다른 세션(랜딩페이지 관리자 CMS)의 미커밋 작업**: 이 저장소에서 별도 세션이 `App.tsx`/`AdminHeader.tsx`/`LandingPage.tsx`/`app.css`/`landing.css` 및 `LandingCms.tsx`, `AdminLandingPage.tsx`, `landingMenu.ts`, `landingPromo.ts`, 마이그레이션 3개, 디자인 제안 이미지 등을 작업 중이며 **아직 커밋되지 않은 상태로 워킹트리에 남아있다.** 이 파일들은 TourAPI 작업과 무관하니 손대지 말 것(§6 참고).

---

## 4. 변경한 파일과 변경 이유

### 백엔드 (Supabase Edge Functions)
| 파일 | 이유 |
|---|---|
| `supabase/functions/_shared/tourScenario.ts` | Wellness/GoCamping 후보 소스 추가, `sourceApi` 필드 확장 |
| `supabase/functions/_shared/tourTags.ts` | 시나리오 스팟에 반려동물/무장애 태그 부착(단건 조회) |
| `supabase/functions/_shared/tourPetWith.ts` | `/info` 반려동물·무장애 탭용 목록 브라우징(`areaBasedList2`/`searchKeyword2`) |
| `supabase/functions/_shared/tourPhotos.ts` | `PhotoGalleryService1` 프록시 |
| `supabase/functions/_shared/tourTrails.ts` | `Durunubi` `courseList` 프록시. `brdDiv` 파라미터가 서버에서 무시되는 버그 발견 후 제거 |
| `supabase/functions/_shared/tourTrailGpx.ts` | GPX 파일 프록시+파서, SSRF 방지 화이트리스트(`durunubi.kr`만 허용) |
| `supabase/functions/_shared/tourOdii.ts` | `Odii`(오디오가이드) 프록시 — 장소 검색 + 이야기 목록 |
| `supabase/functions/_shared/tourDataLab.ts` | `DataLabService` 프록시 — 시도/시군구별 방문자수 집계·정렬 |
| `supabase/functions/tour-scenario/index.ts`, `tour-scenario-catalog-generate/index.ts` | 위 shared 모듈들을 파이프라인에 연결(후보 병합, 태그 부착, 4개 로케일 카탈로그 생성) |
| `supabase/functions/tour-filtered-places/index.ts` | 반려동물/무장애 목록 API |
| `supabase/functions/tour-odii/index.ts` | 오디오가이드 API (`mode: 'sites'\|'stories'`) |
| `supabase/functions/tour-datalab/index.ts` | 방문자 통계 API |

### 프런트엔드
| 파일 | 이유 |
|---|---|
| `src/lib/tourScenario.ts` | `ScenarioStop`에 `sourceApi`/`petFriendly`/`accessible` 추가, `scenarioStopDetailUrl()` 소스별 외부 링크 헬퍼 |
| `src/lib/tourInfo.ts` | `/info` 페이지 데이터 레이어 전체(사진/트레일/GPX/필터목록/오디오가이드/데이터랩) |
| `src/pages/KoreaInfoPage.tsx` | `/info` 페이지 본체, 5개 탭 |
| `src/pages/AdminScenariosPage.tsx` | 관리자 미리보기에 반려동물/무장애 표시 |
| `src/components/ThemeScenarioPanel.tsx` | 사용자 플래너에 반려동물/무장애 배지 |
| `src/components/TrailRouteModal.tsx` | GPX 경로 지도 모달 |
| `src/components/OdiiStoriesModal.tsx` | 오디오가이드 이야기 목록 모달 |
| `src/styles/app.css` | 위 모든 UI에 대응하는 CSS (`.info-*`, `.trail-route-*`, `.odii-*`, `.theme-scenario-stop-badge*`) — **주의: 이 파일은 동시 세션과 충돌 중, §6 참고** |
| `src/locales/{ko,en,ja,zh}/korInfo.json` | `/info` 페이지 전체 번역 |
| `src/locales/{ko,en,ja,zh}/planner.json` | 시나리오 배지 번역 |

---

## 5. 중요한 설계 결정

1. **핀업 가능 vs 열람 전용의 이분법** — TourAPI 하위 서비스를 통합할 때 가장 먼저 판단하는 기준. "장소가 KorService2와 같은 `contentId` 공간을 쓰는가"가 아니라 "사용자가 이 데이터를 일정에 핀으로 찍을 의미가 있는가"로 판단한다(예: 오디오가이드/통계는 애초에 장소가 아니라 콘텐츠/숫자라 핀업 대상이 될 수 없음).
2. **ID 공간은 서비스마다 다를 수 있다 — 항상 라이브로 검증** — WellnessTursmService/KorPetTourService2/KorWithService2는 KorService2와 `contentId`를 공유하지만, **GoCamping과 Odii는 자체 ID 공간**을 쓴다. 이를 사전에 확인하지 않고 통합하면 깨진 외부 링크가 생긴다. `detailCommon2?contentId=X`로 크로스 조회해 totalCount 0/1을 확인하는 패턴을 사용했다.
3. **매뉴얼을 맹신하지 않는다** — 두루누비 `courseList`의 `brdDiv`(걷기/자전거 필터) 파라미터는 공식 매뉴얼에 명시돼 있지만 **서버에서 실제로는 무시된다**(라이브 테스트로 발견). 매뉴얼의 파라미터도 배포 전 반드시 라이브 호출로 검증할 것.
4. **"검증용 Edge Function 배포 → 라이브 curl 테스트 → 삭제" 워크플로우** — `TOUR_API_KEY`는 Edge Function 환경에서만 접근 가능(로컬에 없음)하므로, 새 API를 통합하기 전에 `tour-api-probe`라는 임시 함수를 배포해 실제 응답 구조를 확인하고, 확인 후 반드시 삭제한다(`npx supabase functions delete tour-api-probe --project-ref ainftwifvclgiookzrwm`).
5. **AI 시나리오 카탈로그는 "장소 선정"과 "서술 번역"을 분리** — 장소(제목/주소/좌표/contentId)는 KorService2에서 **한 번만 한국어로 확정**하고, Claude가 그 확정된 장소에 대한 소개문만 4개 로케일(en/ja/zh + 원본 ko)로 번역한다. 이렇게 해야 언어별로 다른 장소가 뽑히는 일이 없다(`tour-scenario-catalog-generate/index.ts` 상단 주석 참고, 메모리 `scenario_catalog_architecture.md`에도 기록됨).
6. **동시 편집 중인 `app.css` 등 공유 파일은 "수술적 격리" 후 커밋** — 다른 세션이 같은 파일(`app.css`, `App.tsx`, `LandingPage.tsx` 등)을 동시에 건드리고 있을 때, `git show HEAD:파일` + 내가 추가한 블록만 Python으로 재조립 → `git diff --stat`로 정확히 내 추가분만 남았는지 확인 → `git add` → 커밋 → 워킹트리를 다시 전체(내 것+상대방 것) 버전으로 복원. 이 패턴을 이번 세션에서 최소 6회 반복했다. 앞으로도 `app.css`를 커밋할 때는 반드시 이 절차를 따를 것 — 그냥 `git add -A`로 커밋하면 다른 세션의 미완성 작업(랜딩 관리자 CMS)이 섞여 들어간다.

---

## 6. 실행 및 테스트 명령

```bash
# 개발 서버
npm run dev

# 타입체크 (배포 전 항상 실행)
npx tsc --noEmit

# 프로덕션 빌드 (배포 전 항상 실행)
npm run build

# 린트
npm run lint

# Edge Function 배포 (예: tour-datalab)
npx supabase functions deploy tour-datalab --project-ref ainftwifvclgiookzrwm

# Edge Function 라이브 테스트 (anon key는 .env.local의 VITE_SUPABASE_ANON_KEY)
ANON=$(grep VITE_SUPABASE_ANON_KEY .env.local | cut -d= -f2)
curl -s "https://ainftwifvclgiookzrwm.supabase.co/functions/v1/tour-datalab" \
  -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -d '{"level":"metco","ymd":"20260713"}'

# 검증용 임시 함수 삭제 (probe 함수 사용 후 반드시)
npx supabase functions delete tour-api-probe --project-ref ainftwifvclgiookzrwm
```

**필수 환경변수**(`.env.local`에 이미 설정돼 있음, 값은 노출하지 않음):
`VITE_KAKAO_JS_KEY`, `VITE_KAKAO_REST_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_MAP_PROVIDER_FORCE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AUTH_GOOGLE_ENABLED`, `VITE_ADMIN_EMAILS`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.

`TOUR_API_KEY`는 **Supabase Edge Function 시크릿**으로만 존재하고 로컬 `.env.local`에는 없다 — 로컬에서 TourAPI를 직접 테스트할 방법이 없으므로, 반드시 Edge Function을 배포한 뒤 위 curl 패턴으로 검증할 것.

Supabase 프로젝트 ref: `ainftwifvclgiookzrwm`

---

## 7. 현재 오류와 주의사항

- **워킹트리에 미커밋 상태로 다른 세션의 랜딩 관리자 CMS 작업이 섞여 있음** (`git status --short` 결과 §3-5 참고). TourAPI 작업과 전혀 무관하니 **절대 stage/commit/revert하지 말 것**. `git add`는 항상 파일을 명시적으로 나열해서 사용(`git add -A` 금지).
- **DataLab(관광빅데이터) 데이터는 최신까지 약 한 달의 시차**가 있다. 라이브 확인 결과 2026-08-17 기준 2026-07-18까지만 데이터 존재, 그 이후 날짜는 빈 결과(totalCount 0)를 반환한다 — 버그 아님, `/info` 날짜 선택기 기본값을 35일 전으로 맞춰둔 이유.
- **두루누비 `brdDiv`(걷기/자전거 구분) 필터는 서버에서 무시됨** — 클라이언트 측 코스명 접두어 매칭(`TRAIL_BRANDS`)으로 대체 완료. 매뉴얼에는 여전히 파라미터가 존재하는 것처럼 나와 있으니 재통합 시도 시 다시 낚이지 않도록 주의.
- **GoCamping의 `contentId`는 KorService2와 다른 ID 공간** — `gocamping:<id>` 접두사로 구분 중. 이 접두사가 포함된 ID를 KorService2 API(`detailCommon2` 등)에 그대로 넘기면 안 됨(`tourTags.ts`에서 `:` 포함 ID는 스킵하도록 이미 처리됨, 새 코드 작성 시 동일하게 주의).
- **알려진 타입 에러/빌드 에러 없음** — 마지막 커밋 시점 `npx tsc --noEmit`, `npm run build` 모두 클린 통과 확인됨.
- **크레딧/사용량 경고**: 이번 세션 중 `/usage-credits` 명령이 실행된 이력이 있음(사용자가 크레딧 관리 페이지를 열어봄) — 작업량이 많은 세션이었으니 다음 세션에서도 API 호출량(특히 probe 함수 반복 배포)에 유의할 것.

---

## 8. 다음 세션에서 가장 먼저 할 작업

직전 턴에서 사용자가 "tourapi 다국어서비스 적용현황"을 질문해서 조사만 완료한 상태이고, **사용자에게 다음 3가지 중 방향을 물어본 채로 세션이 끊겼다**:

1. `/info` 페이지의 사진/장소명을 실제 다국어 TourAPI 서비스로 전환
2. 일본어(JpnService2) 매뉴얼부터 확보해서 다국어 통합 조사 시작
3. 현재 상태 유지, 다른 작업으로 이동

**→ 다음 세션은 이 질문에 대한 사용자 답변부터 확인하고 시작할 것.** 답변이 없다면 사용자에게 다시 물어볼 것(추측해서 진행하지 말 것).

참고로 조사 결과 요약:
- 코드베이스 어디에도 `EngService2/JpnService2/ChsService2/ChtService2/GerService2/FreService2/SpnService2/RusService2` 호출 없음.
- `tourOdii.ts`에만 `langCode` 파라미터가 등장하는데 값이 `'ko'`로 하드코딩되어 있음(UI 로케일과 무관).
- AI 시나리오는 서술 텍스트만 번역되고 장소 데이터는 항상 한국어 원본(§5-5 설계 결정 참고).
- `docs/tourAPI/manual/org/`에 7개 언어(영/중간/중번/독/불/서/노) 매뉴얼 확보돼 있으나 일본어만 없음.

---

## 참고: 세션 메모리

이 프로젝트에 대한 장기 기억은 `~/.claude/projects/d--project-waymeld/memory/`에 저장되어 있다(Claude Code의 auto-memory 기능). 현재 등록된 항목:
- `scenario_catalog_architecture.md` — AI 시나리오 카탈로그가 4개 로케일을 사전 생성하고 라이브 개인화 생성을 하지 않는 이유와 구조.

새 컴퓨터에서 세션을 시작할 경우 이 메모리는 공유되지 않으므로(로컬 파일 시스템 기반), 이 HANDOFF.md가 사실상의 인계 문서 역할을 한다.
