# TaxCook Renewal

택스쿡 리뉴얼 정적 웹사이트와 Supabase 기반 신청/회원/관리자 기능입니다.

현재 운영 배포는 아직 하지 않았고, Firebase Hosting preview 채널에서만 확인 중입니다.

## Preview

- Firebase project: `taxcook-vat`
- Preview channel: `renewal-test`
- Preview URL: https://taxcook-vat--renewal-test-s5q3egt6.web.app
- Deploy command:

```powershell
npx.cmd firebase hosting:channel:deploy renewal-test --project taxcook-vat --expires 30d
```

## 중요한 캐시 규칙

`firebase.json`에서 CSS, JS, 이미지 파일은 아래 정책으로 배포됩니다.

```text
Cache-Control: public, max-age=31536000, immutable
```

따라서 CSS/JS/이미지를 수정할 때는 기존 파일을 덮어쓰지 말고 새 파일명으로 복사한 뒤 HTML 링크를 변경해야 합니다.

HTML은 `no-cache`로 설정되어 있어 HTML 링크 변경은 바로 반영됩니다.

## 주요 화면

- `public/index.html`: 메인 페이지
- `public/knowhow.html`: 택스쿡 소개
- `public/vatax.html`: 부가가치세 신고 신청
- `public/gitax.html`: 종합소득세 신고 신청
- `public/office.html`: 스마일워크 소개
- `public/login.html`: 로그인
- `public/signup.html`: 회원가입
- `public/mypage.html`: 고객 마이페이지
- `public/admin.html`: 통합 관리자
- `public/application-detail.html`: 신청 상세/처리

## 현재 주요 기능

- Supabase 이메일 회원가입/로그인
- 고객 마이페이지에서 프로필 및 신청 내역 조회
- 부가가치세/종합소득세 신청 저장
- 관리자 통합 목록 조회
- 신청 상세 처리 상태, 결제 상태, 고객 안내 메모, 관리자 내부 메모 관리
- 메인 팝업 관리
- 할인코드 관리
- 권한 관리
  - 대표 비밀번호 확인 후 `customer/admin` 변경
  - `chaewoon83@gmail.com` 계정은 권한 변경 불가

## Supabase SQL 파일

루트에 있는 SQL 파일은 Supabase SQL Editor에서 직접 실행하는 용도입니다.

- `supabase-schema-20260501.sql`: 기본 테이블, 함수, RLS 정책
- `supabase-profile-trigger-20260501.sql`: 회원 프로필 자동 생성/보강
- `supabase-grants-20260501.sql`: 권한 grant
- `supabase-set-admin-20260501.sql`: 최초 관리자 지정
- `supabase-homepage-popups-20260502.sql`: 메인 팝업 관리
- `supabase-discount-codes-20260502.sql`: 할인코드 관리
- `supabase-discount-application-trigger-v2-20260502.sql`: 부가세 할인 계산 트리거
- `supabase-owner-role-management-20260502.sql`: 대표 비밀번호 기반 권한 관리

## 관리 주의사항

- 운영 사이트와 기존 Nuxt 원본 소스는 이 저장소에 없습니다.
- 기존 사이트 API/DB와 직접 연동하지 않고 새 Supabase 구조로 구축 중입니다.
- TossPayments 실제 결제 연결은 아직 구현 전입니다.
- 권한 관리 SQL 실행 전에는 관리자 UI가 보여도 RPC가 동작하지 않을 수 있습니다.
- 대표 비밀번호는 코드에 고정하지 말고 Supabase SQL Editor에서 해시로 저장합니다.

