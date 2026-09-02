# ai-landing-page-generater

## 로컬 실행

브라우저의 CORS 정책 때문에 HTML 파일을 직접 열지 않고 로컬 웹 서버로
실행한다.

```bash
python3 -m http.server 5500
```

브라우저에서 `http://127.0.0.1:5500`에 접속한다. 로컬 브랜드 분석 API를
사용하려면 `runtime-config.js`에 `http://127.0.0.1:8000/api`를 지정하고
백엔드 서버도 함께 실행해야 한다.

```bash
cd ../ai-landing-page-generater-server
uv run uvicorn app.main:app --reload
```

API 주소는 `runtime-config.js`에서 지정한다.

```js
window.BRAND_API_BASE_URL = "http://127.0.0.1:8000/api";
```

## Coolify 배포

프런트엔드는 저장소의 `Dockerfile`로 배포한다.

- Build Pack: `Dockerfile`
- Dockerfile Location: `/Dockerfile`
- Ports Exposes: `80`
- Domain: `https://blanki.ynana.xyz`
- Environment Variable:

```env
BRAND_API_BASE_URL=https://landing-api.ynana.xyz/api
```

컨테이너가 시작될 때 환경변수 값으로 `runtime-config.js`를 생성한다.
백엔드의 `CORS_ORIGINS`에도 `https://blanki.ynana.xyz`가 포함되어야 한다.

## 브랜드 연결 범위

- PDF 파일 선택 및 클라이언트 유효성 검사
- Logo·Icon SVG/PNG/JPG/JPEG 업로드
- Typography TTF 업로드
- HEX 색상 입력, 팔레트 미리보기 및 스포이트 지원
- 브랜드 PDF 분석 요청
- 분석 결과와 출처 페이지 표시
- 분석 내용 수정 및 검토 저장
- 최종 `brand.md` 생성 요청

## 캠페인 연결 범위

- 캠페인 전략 PDF 1개 업로드 및 분석 요청
- HTML 웹 컴포넌트 다중 업로드
- PNG/JPG/JPEG/GIF/WEBP 이미지 다중 업로드
- 브랜드 분석 응답의 `project_id`를 캠페인 분석 요청에 전달
- Campaign Knowledge 8개 항목과 출처 페이지 표시
- 분석 내용 수정 및 검토 저장
- 최종 `campaign.md` 생성 요청

캠페인 입력은 PDF 1개가 필수이며 HTML과 이미지는 선택 입력이다.
캠페인 분석은 브랜드 분석 후 생성된 `project_id`가 있어야 진행된다.

브랜드 분석에는 Brand Identity 또는 Verbal Guideline PDF가 한 개 이상 필요하다.
시각 자산과 색상은 PDF 분석 결과의 Visual Guideline에 함께 저장된다. 스포이트는
EyeDropper API를 지원하는 브라우저에서 동작하며, 그 외 브라우저에서는 기본 색상
선택기를 사용할 수 있다.

## 프론트엔드 실행 방법

프런트엔드 저장소 루트에서 다음 명령어를 실행한다.

```bash
python3 -m http.server 5500
```

브라우저에서 `http://127.0.0.1:5500`에 접속한다. 브랜드 분석 기능을 사용하려면
백엔드 서버가 `http://127.0.0.1:8000`에서 실행 중이어야 한다.

서버를 종료할 때는 실행 중인 터미널에서 `Ctrl+C`를 누른다.
