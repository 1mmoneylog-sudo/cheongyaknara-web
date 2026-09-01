# 청약나라 — 배포 가이드

컴퓨터에 아무것도 설치하지 않고, **브라우저만으로** 배포할 수 있게 순서를 정리했습니다.

## 준비물 (전부 무료)
- GitHub 계정
- Vercel 계정 (GitHub 계정으로 바로 가입 가능)
- LH·GH 인증키 (이미 발급받으셨음)

---

## 1단계. GitHub에 저장소 만들고 이 폴더 올리기

1. github.com 가입 후 로그인
2. 우측 상단 `+` → `New repository` → 이름을 `cheongyaknara-web`으로 입력 → `Create repository`
3. 생성된 빈 저장소 화면에서 `uploading an existing file` 링크 클릭
4. 이 `cheongyaknara-web` 폴더 전체를 통째로 드래그해서 업로드창에 놓기 (하위 폴더까지 한 번에 올라갑니다)
5. 하단 `Commit changes` 클릭

> ⚠️ 만약 `.github` 폴더(자동수집 워크플로우)가 드래그 업로드로 안 올라가면, 저장소 화면에서 `Add file > Create new file`로 `.github/workflows/collect.yml` 경로를 직접 입력하면서 이 프로젝트의 해당 파일 내용을 그대로 복사해 붙여넣으세요.

## 2단계. 인증키를 GitHub에 안전하게 등록하기

인증키를 코드에 직접 넣지 않고, GitHub의 "비밀 저장소"에 등록합니다.

1. 저장소 화면 → `Settings` 탭
2. 왼쪽 메뉴 `Secrets and variables` → `Actions`
3. `New repository secret` 클릭
4. 이름 `LH_SERVICE_KEY`, 값에는 발급받은 LH 인증키(디코딩된 값) 붙여넣기 → 저장
5. 같은 방식으로 `GH_SERVICE_KEY`도 등록

## 3단계. GH 연동 코드 완성하기 (중요)

`lib/collectors/gh.js` 파일을 열어서, 상단의 `여기에_..._붙여넣으세요` 부분 4곳을 **직접 확인하신 GH 각 API의 실제 요청주소**로 교체해야 합니다. GitHub 웹사이트에서 파일을 열고 연필 아이콘(✏️ Edit)을 누르면 바로 수정할 수 있습니다.

또한 실제 응답을 한 번 받아보시고, `normalizeGhNotice` 함수 안의 `noticeRow["공고번호"]` 같은 부분이 실제 JSON의 key 이름과 정확히 일치하는지 확인해서 다르면 맞게 고쳐주세요.

## 4단계. 데이터 수집 한 번 실행해보기

1. 저장소 화면 → `Actions` 탭
2. `청약 데이터 자동 수집` 워크플로우 클릭 → `Run workflow` 버튼 클릭
3. 1~2분 후 초록색 체크가 뜨면 성공 — `data/notices.json` 파일이 최신 공고로 갱신되고 자동으로 커밋됩니다

## 5단계. Vercel로 사이트 띄우기

1. vercel.com 접속 → `Continue with GitHub`로 로그인
2. `Add New` → `Project` → 방금 만든 `cheongyaknara-web` 저장소 선택 → `Import`
3. 별다른 설정 변경 없이 `Deploy` 클릭 (Next.js 프로젝트는 자동으로 인식됩니다)
4. 1~2분 후 배포 완료 — `cheongyaknara-web.vercel.app` 같은 무료 주소가 생깁니다

## 이후로는?

`.github/workflows/collect.yml`이 **매일 2번(새벽 2시, 낮 12시) 자동으로** 최신 공고를 수집해서 저장소에 반영하고, Vercel은 저장소가 바뀔 때마다 **자동으로 재배포**합니다. 즉 한 번 배포해두면 그 다음부터는 아무것도 안 하셔도 사이트가 계속 최신 상태로 유지됩니다.

## 나중에 도메인을 연결하고 싶다면

Vercel 프로젝트 설정 → `Domains`에서 구매한 도메인(예: cheongyaknara.kr)을 연결할 수 있습니다 (도메인 구매 자체는 별도 비용 필요, Vercel 연결은 무료).

## 로컬에서 미리 확인해보고 싶다면 (선택사항, 개발자용)

```bash
npm install
npm run dev
# http://localhost:3000 에서 확인

# 데이터 수집만 테스트
LH_SERVICE_KEY=키값 GH_SERVICE_KEY=키값 npm run collect
```
