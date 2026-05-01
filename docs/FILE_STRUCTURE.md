# File Structure

이 문서는 유지보수 시 어떤 파일을 봐야 하는지 빠르게 찾기 위한 설명서입니다.

## 루트

```text
.
├─ public/                         Firebase Hosting public root
├─ docs/                           유지보수 문서
├─ firebase.json                   Firebase Hosting 설정
├─ DEPLOY_NOTES.md                 초기 preview 배포 메모
├─ README.md                       프로젝트 개요
├─ CHANGELOG.md                    변경기록
└─ supabase-*.sql                  Supabase SQL 스크립트
```

## Firebase 설정

- `firebase.json`
  - Hosting public root: `public`
  - `/members`, `/members.html`은 마이페이지로 redirect
  - HTML은 `no-cache`
  - CSS/JS/이미지는 immutable cache

## 고객용 HTML

```text
public/index.html        메인
public/knowhow.html      택스쿡 소개
public/vatax.html        부가가치세 신고
public/gitax.html        종합소득세 신고
public/office.html       스마일워크
public/login.html        로그인
public/signup.html       회원가입
public/mypage.html       My 택스쿡
```

## 관리자 HTML

```text
public/admin.html               통합 관리자
public/admin-vatax.html         부가세 목록 전용 관리자
public/admin-gitax.html         종소세 목록 전용 관리자
public/application-detail.html  신청 상세/처리
```

## 현재 핵심 JavaScript

HTML에서 현재 연결 중인 핵심 JS입니다. 과거 버전 파일도 많이 남아 있으므로 유지보수 시 HTML에 연결된 최신 파일을 먼저 확인하세요.

```text
public/site-renewal-20260501-supabase-config.js
  Supabase URL/anon key 설정

public/site-renewal-20260501-supabase-core-v7.js
  공통 Supabase client, 로그인/관리자 확인, 공통 유틸

public/site-renewal-20260501-auth-email-v2.js
  로그인 페이지

public/site-renewal-20260501-auth-email-v1.js
  회원가입 페이지

public/site-renewal-20260501-mypage-profile-v3.js
  마이페이지 프로필/신청 내역

public/site-renewal-20260502-supabase-forms-discount-v4.js
  부가세/종소세 신청 폼 저장 및 할인코드 처리

public/site-renewal-20260502-admin-dashboard-popup-v9.js
  통합 관리자
  - 신청 목록
  - 회원 목록
  - 메인 팝업
  - 할인코드
  - 권한 관리

public/site-renewal-20260502-admin-detail-discount-v3.js
  신청 상세/처리 페이지

public/site-renewal-20260502-home-popup-v1.js
  메인 페이지 팝업 표시
```

## 현재 핵심 CSS

```text
public/styles-renewal-20260501-service-button-cursor.css
  메인 및 공통 고객 페이지 기본 스타일

public/styles-renewal-20260501-nav-mobile-fix.css
  모바일 네비게이션 보정

public/styles-renewal-20260501-forms-checkbox-24.css
  부가세/종소세 신청 페이지 스타일

public/styles-renewal-20260501-auth-title.css
public/styles-renewal-20260501-authcompact.css
  로그인/회원가입 스타일

public/styles-renewal-20260501-ops-wrap.css
public/styles-renewal-20260501-mypage-mobilecards.css
  마이페이지 스타일

public/styles-renewal-20260501-admin-clean.css
public/styles-renewal-20260501-admin-dashboard-v3.css
public/styles-renewal-20260502-admin-popup-manager.css
public/styles-renewal-20260502-admin-column-filters-v5.css
  관리자 스타일

public/styles-renewal-20260501-admin-detail-legacy-v12.css
public/styles-renewal-20260502-admin-detail-grid-coords.css
  신청 상세/처리 스타일
```

## 이미지/정적 자산

로고, 프로필 사진, 소개 페이지 이미지 등은 `public/image/` 아래에 있습니다.

대표적으로 사용 중인 파일:

```text
public/image/logo-taxcook-20260430-kong-crop.png
```

## Supabase SQL

```text
supabase-schema-20260501.sql
  profiles, applications 기본 테이블과 RLS 정책

supabase-profile-trigger-20260501.sql
  회원가입 후 profiles 생성/보강

supabase-grants-20260501.sql
  authenticated/service_role 권한

supabase-set-admin-20260501.sql
  최초 관리자 지정

supabase-homepage-popups-20260502.sql
  homepage_popups 테이블과 정책

supabase-discount-codes-20260502.sql
  discount_codes 테이블과 정책

supabase-discount-application-trigger-v2-20260502.sql
  신청 저장 시 할인코드 금액 반영

supabase-owner-role-management-20260502.sql
  대표 비밀번호 기반 role 변경 RPC
```

## 유지보수 원칙

1. CSS/JS 수정 시 새 파일명으로 복사합니다.
2. HTML에서 새 CSS/JS 파일명을 연결합니다.
3. Firebase preview 채널에 배포합니다.
4. Supabase SQL 변경이 필요한 경우 SQL Editor에서 별도로 실행합니다.
5. 기능 변경 후 GitHub에 커밋/푸시합니다.

## 배포 명령

```powershell
npx.cmd firebase hosting:channel:deploy renewal-test --project taxcook-vat --expires 30d
```

