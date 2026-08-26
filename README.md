# ai-landing-page-generater

## 로컬 실행

브라우저의 CORS 정책 때문에 HTML 파일을 직접 열지 않고 로컬 웹 서버로
실행한다.

```bash
python3 -m http.server 5500
```

브라우저에서 `http://127.0.0.1:5500`에 접속한다. 브랜드 분석 API는 기본적으로
`http://127.0.0.1:8000/api`를 사용하므로 백엔드 서버도 함께 실행해야 한다.

```bash
cd ../ai-landing-page-generater-server
uv run uvicorn app.main:app --reload
```

API 주소를 변경해야 할 경우 `index.html`의 `api-base-url` 메타 태그 값을
수정한다.

## 브랜드 연결 범위

- PDF 파일 선택 및 클라이언트 유효성 검사
- Logo·Icon SVG/PNG/JPG/JPEG 업로드
- Typography TTF 업로드
- HEX 색상 입력, 팔레트 미리보기 및 스포이트 지원
- 브랜드 PDF 분석 요청
- 분석 결과와 출처 페이지 표시
- 분석 내용 수정 및 검토 저장
- 최종 `brand.md` 생성 요청

캠페인 화면은 현재 UI 초안이며 API와 연결되어 있지 않다.

브랜드 분석에는 Brand Identity 또는 Verbal Guideline PDF가 한 개 이상 필요하다.
시각 자산과 색상은 PDF 분석 결과의 Visual Guideline에 함께 저장된다. 스포이트는
EyeDropper API를 지원하는 브라우저에서 동작하며, 그 외 브라우저에서는 기본 색상
선택기를 사용할 수 있다.
