(function initializeLandingEditor() {
  const state = {
    landing: null,
    loading: false,
    error: "",
    activePersonaIndex: 0,
    selectedInstanceId: "",
    selectedEditable: null,
    projectId: "",
    history: [],
    future: [],
    draggedInstanceId: "",
    draggedTemplateId: "",
    draggedDestination: null,
    draggedRect: null,
    pointerDragging: false,
    copyPrompt: "",
    copyCandidates: [],
    candidateLoading: false,
    candidateError: "",
    imagePrompt: "",
    assetLoading: false,
    assetError: "",
    saveLoading: false,
    saveError: "",
    saveNotice: "",
    previewOpen: false,
    restoreAttempted: false,
    zoom: 0.8,
    previewZoom: 0.7,
    componentQuery: "",
    device: "desktop",
    initialPages: [],
  };

  const zoomMin = 0.5;
  const zoomMax = 1.5;
  const zoomStep = 0.1;
  const componentSpacingOverrides = `<style>
    [data-editable="copy"] {
      word-break: keep-all !important;
      overflow-wrap: break-word !important;
    }
    h1[data-editable="copy"], h2[data-editable="copy"], h3[data-editable="copy"],
    h4[data-editable="copy"], h5[data-editable="copy"], h6[data-editable="copy"] {
      text-wrap: balance;
    }
    [data-component-category]:not(header) {
      width: auto !important;
      margin-inline: 46px !important;
    }
    body > [data-component-category]:not(header) ~ [data-component-category]:not(header) {
      margin-top: 64px !important;
    }
  </style>`;

  function escapeHTML(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function activePage() {
    return state.landing?.pages?.[state.activePersonaIndex] || null;
  }

  function requestRender() {
    window.dispatchEvent(new CustomEvent("landing-editor-change"));
  }

  function clampZoom(value) {
    return Math.min(zoomMax, Math.max(zoomMin, Number(value) || 1));
  }

  function zoomLabel(value) {
    return `${Math.round(value * 100)}%`;
  }

  function zoomControlsMarkup(type, value) {
    return `
      <div class="landing-zoom" aria-label="${type === "preview" ? "미리보기" : "캔버스"} 확대/축소">
        <button type="button" data-zoom="${type}:out" aria-label="축소">−</button>
        <span>${zoomLabel(value)}</span>
        <button type="button" data-zoom="${type}:in" aria-label="확대">＋</button>
        <button type="button" data-zoom="${type}:reset">100%</button>
      </div>`;
  }

  function clonePages(pages = state.landing?.pages || []) {
    return structuredClone(pages);
  }

  function rememberInitialPages() {
    state.initialPages = clonePages();
  }

  function persistDraft() {
    if (!state.landing?.landing_id) return;
    sessionStorage.setItem(
      `landingDraft:${state.landing.landing_id}`,
      JSON.stringify(state.landing.pages),
    );
  }

  function commitMutation(mutator, { preserveSelection = false } = {}) {
    if (!state.landing) return;
    state.history.push(clonePages());
    if (state.history.length > 50) state.history.shift();
    state.future = [];
    mutator();
    state.saveNotice = "";
    state.saveError = "";
    if (!preserveSelection) {
      state.selectedInstanceId = "";
      state.selectedEditable = null;
    }
    persistDraft();
    requestRender();
  }

  function undo() {
    const previous = state.history.pop();
    if (!previous) return;
    state.future.push(clonePages());
    state.landing.pages = previous;
    persistDraft();
    requestRender();
  }

  function redo() {
    const next = state.future.pop();
    if (!next) return;
    state.history.push(clonePages());
    state.landing.pages = next;
    persistDraft();
    requestRender();
  }

  function replaceAssetUrls(html) {
    if (!state.landing) return html;
    return html.replaceAll(/asset:\/\/([^\s"'<>]+)/g, (_, filename) => (
      window.LandingAPI.assetUrl(state.landing.landing_id, decodeURIComponent(filename))
    ));
  }

  function editableImageTargets(source = "") {
    const parsed = new DOMParser().parseFromString(source, "text/html");
    return Array.from(parsed.querySelectorAll('[data-editable="image"]')).map((target) => {
      const background = target.style.backgroundImage.match(/^url\((['"]?)(.*?)\1\)$/i)?.[2] || "";
      return {
        value: target.getAttribute("src")
          || target.dataset.editableImageSrc
          || background,
        alt: target.getAttribute("alt") || target.getAttribute("aria-label") || "",
      };
    });
  }

  function availableImageValues() {
    const values = [];
    const add = (value) => {
      if (value && !values.includes(value)) values.push(value);
    };
    (state.landing?.assets || []).forEach((asset) => add(`asset://${asset.filename}`));
    const active = activePage();
    const pages = [active, ...(state.landing?.pages || []).filter((page) => page !== active)];
    pages.forEach((page) => {
      [...(page?.header_components || []), ...(page?.components || [])].forEach((component) => {
        editableImageTargets(component.html).forEach((target) => add(target.value));
      });
    });
    return values;
  }

  function frameDocument(component) {
    const bridge = `
      <style data-landing-editor-image-cues>
        [data-editable="image"]{cursor:pointer!important}
        [data-editable="image"]:hover{outline:3px solid #0088ff!important;outline-offset:-3px}
      </style>
      <script>
        const sendHeight = () => parent.postMessage({
          type: "landing-frame-height",
          instanceId: ${JSON.stringify(component.instance_id)},
          height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
        }, "*");
        const editableNodes = () => Array.from(document.querySelectorAll("[data-editable]"));
        document.addEventListener("click", (event) => {
          const target = event.target.closest("[data-editable]");
          if (!target) return;
          event.preventDefault();
          parent.postMessage({
            type: "landing-editable-select",
            instanceId: ${JSON.stringify(component.instance_id)},
            editableIndex: editableNodes().indexOf(target),
            editableTypeIndex: editableNodes().filter((item) => item.dataset.editable === target.dataset.editable).indexOf(target),
            editableType: target.dataset.editable,
            value: target.dataset.editable === "image"
              ? target.getAttribute("src") || target.dataset.editableImageSrc || ""
              : target.innerText || "",
            alt: target.getAttribute("alt") || target.getAttribute("aria-label") || "",
            width: Math.round(target.getBoundingClientRect().width),
            height: Math.round(target.getBoundingClientRect().height)
          }, "*");
        });
        new ResizeObserver(sendHeight).observe(document.documentElement);
        window.addEventListener("load", sendHeight);
        setTimeout(sendHeight, 100);
      <\/script>`;
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${componentSpacingOverrides}</head><body>${replaceAssetUrls(component.html)}${bridge}</body></html>`;
  }

  function previewDocument() {
    const page = activePage();
    const content = [
      ...(page?.header_components || []),
      ...(page?.components || []).filter((component) => !component.hidden),
    ]
      .map((component) => replaceAssetUrls(component.html))
      .join("\n");
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${componentSpacingOverrides}</head><body>${content}</body></html>`;
  }

  function exportDocument(page = activePage()) {
    const content = [
      ...(page?.header_components || []),
      ...(page?.components || []).filter((component) => !component.hidden),
    ]
      .map((component) => replaceAssetUrls(component.html))
      .join("\n");
    return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(page?.persona_name || "Landing Page")}</title>
${componentSpacingOverrides}
<!-- AI 의도: ${escapeHTML(page?.ai_intent || "").replaceAll("--", "-")} -->
</head>
<body>${content}</body>
</html>`;
  }

  function fixedHeaderCard(component) {
    return `
      <article class="landing-component landing-component--fixed" aria-label="고정 Header: ${escapeHTML(component.name)}">
        <iframe
          class="landing-component__frame"
          data-component-frame="${escapeHTML(component.instance_id)}"
          title="${escapeHTML(component.name)} 고정 Header 미리보기"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          srcdoc="${escapeHTML(frameDocument(component))}"
        ></iframe>
      </article>`;
  }

  function componentCard(component, index, count) {
    const layoutOptions = component.layout_options?.length ? component.layout_options : ["source"];
    const imageControl = editableImageTargets(component.html).length ? `
      <button type="button" data-component-action="edit-image" title="사진 추가 또는 변경">사진 편집</button>` : "";
    const layoutControl = layoutOptions.length > 1 ? `
      <label class="landing-component__layout">배치
        <select data-component-layout aria-label="${escapeHTML(component.name)} 배치">
          ${layoutOptions.map((option) => `<option value="${escapeHTML(option)}" ${option === component.layout_variant ? "selected" : ""}>${escapeHTML(layoutLabel(option))}</option>`).join("")}
        </select>
      </label>` : "";
    return `
      <article class="landing-component ${component.hidden ? "landing-component--hidden" : ""} ${state.selectedInstanceId === component.instance_id ? "landing-component--selected" : ""}"
        data-landing-component="${escapeHTML(component.instance_id)}" data-component-index="${index}">
        <div class="landing-component__toolbar" aria-label="${escapeHTML(component.name)} 설정">
          <button type="button" class="landing-component__drag-handle" data-component-action="drag" title="끌어서 순서 변경">⠿ ${escapeHTML(component.name)}</button>
          <span class="landing-component__toolbar-separator"></span>
          ${layoutControl}
          ${imageControl}
          <button type="button" data-component-action="up" ${index === 0 ? "disabled" : ""} title="위로 이동">↑</button>
          <button type="button" data-component-action="down" ${index === count - 1 ? "disabled" : ""} title="아래로 이동">↓</button>
          <button type="button" data-component-action="duplicate" title="복제">⧉</button>
          <button type="button" data-component-action="hide" title="숨김">${component.hidden ? "보기" : "숨김"}</button>
          <button type="button" data-component-action="delete" title="삭제">✕</button>
        </div>
        ${component.hidden ? '<div class="landing-component__hidden-message">숨긴 컴포넌트</div>' : `
          <iframe
            class="landing-component__frame"
            data-component-frame="${escapeHTML(component.instance_id)}"
            title="${escapeHTML(component.name)} 미리보기"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            srcdoc="${escapeHTML(frameDocument(component))}"
          ></iframe>`}
      </article>`;
  }

  function layoutLabel(value) {
    const labels = {
      source: "원본", "media-left": "이미지 왼쪽", "media-right": "이미지 오른쪽",
      "media-top": "이미지 위", inline: "가로형", centered: "가운데",
      "proof-first": "근거 우선", cards: "카드형", stacked: "세로형",
      compact: "압축형", spacious: "여백형",
    };
    return labels[value] || value;
  }

  function componentPreviewMarkup(template) {
    const parsed = new DOMParser().parseFromString(template.html || "", "text/html");
    const root = Array.from(parsed.body.children).find((item) => item.tagName !== "STYLE");
    const signature = [
      template.name,
      template.category,
      template.filename,
      root?.className,
      root?.id,
    ].join(" ").toLowerCase();
    const imageCount = root?.querySelectorAll('[data-editable="image"]').length || 0;
    const cardCount = root?.querySelectorAll("article, li").length || 0;
    const hasCTA = Boolean(root?.querySelector("a, button"));
    let type = "content";
    if (/carousel|slider|track/.test(signature) || cardCount >= 3) type = "carousel";
    else if (/bento|masonry/.test(signature)) type = "bento";
    else if (/hero|visual|masthead/.test(signature)) type = "hero";
    else if (/cta|banner/.test(signature) || (hasCTA && !imageCount)) type = "cta";
    else if (imageCount) type = "split";

    const shapes = {
      hero: `
        <i class="landing-preview-shape landing-preview-shape--media"></i>
        <span class="landing-preview-copy"><i></i><i></i><b></b></span>`,
      carousel: `
        <span class="landing-preview-heading"><i></i><b></b></span>
        <span class="landing-preview-cards"><i></i><i></i><i></i></span>`,
      bento: `
        <span class="landing-preview-bento"><i></i><i></i><i></i></span>`,
      cta: `
        <span class="landing-preview-copy"><i></i><i></i></span>
        <b class="landing-preview-button"></b>`,
      split: `
        <i class="landing-preview-shape landing-preview-shape--media"></i>
        <span class="landing-preview-copy"><i></i><i></i>${hasCTA ? "<b></b>" : ""}</span>`,
      content: `
        <span class="landing-preview-copy landing-preview-copy--wide"><i></i><i></i><i></i></span>`,
    };
    return `<span class="landing-library-item__preview landing-library-item__preview--${type}" aria-hidden="true">${shapes[type]}</span>`;
  }

  function libraryMarkup() {
    const query = state.componentQuery.trim().toLowerCase();
    const templates = (state.landing?.component_library || []).filter((template) => (
      !query
      || template.name.toLowerCase().includes(query)
      || template.category.toLowerCase().includes(query)
      || template.filename.toLowerCase().includes(query)
    ));
    if (!templates.length) return '<p class="landing-panel__empty">사용 가능한 컴포넌트가 없습니다.</p>';
    return templates.map((template) => `
      <button type="button" class="landing-library-item" data-add-template="${escapeHTML(template.template_id)}" draggable="true">
        ${componentPreviewMarkup(template)}
        <strong>${escapeHTML(template.name)}</strong>
      </button>`).join("");
  }

  function inspectorMarkup() {
    if (!state.selectedEditable) {
      return `
        <div class="landing-inspector__empty landing-inspector__empty--blank"></div>`;
    }
    const isImage = state.selectedEditable.editableType === "image";
    const selectedImageUrl = isImage ? displayAssetUrl(state.selectedEditable.value) : "";
    const assetItems = availableImageValues().slice(0, 30).map((value, index) => `
      <button type="button" class="landing-asset-item" data-select-image="${escapeHTML(value)}" title="이미지 ${index + 1}">
        <img src="${escapeHTML(displayAssetUrl(value))}" alt="" />
        <span>이미지 ${index + 1}</span>
      </button>`).join("");
    const copyCandidates = state.copyCandidates.map((candidate, index) => `
      <button type="button" class="landing-copy-candidate" data-copy-candidate="${index}">
        <span>후보 ${index + 1}</span>
        <strong>${escapeHTML(candidate)}</strong>
      </button>`).join("");
    return `
      <div class="landing-inspector__header">
        <span>${isImage ? "KV Image" : "Text"}</span>
        <button type="button" data-close-inspector aria-label="속성 패널 닫기">×</button>
      </div>
      <div class="landing-inspector__body">
        ${isImage ? `
          <div class="landing-current-image">
            ${selectedImageUrl
              ? `<img src="${escapeHTML(selectedImageUrl)}" alt="${escapeHTML(state.selectedEditable.alt)}" />`
              : '<div class="landing-current-image__empty">아직 이미지가 없습니다.</div>'}
          </div>
          <label>대체 텍스트
            <textarea data-editable-draft>${escapeHTML(state.selectedEditable.alt)}</textarea>
          </label>
          <button type="button" class="landing-button landing-button--secondary" data-apply-image-alt>대체 텍스트 적용</button>
          <div class="landing-inspector__divider"></div>
          <div class="landing-inspector__section-title"><strong>사용 가능한 이미지</strong><span>선택 즉시 적용</span></div>
          <div class="landing-asset-grid">${assetItems || '<p>사용 가능한 이미지가 없습니다. 아래에서 직접 업로드해 주세요.</p>'}</div>
          <label class="landing-upload-button">
            <span>새 이미지 업로드</span>
            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" data-upload-image />
          </label>
          <div class="landing-inspector__divider"></div>
          <label>AI 이미지 요청
            <textarea data-image-prompt placeholder="예: 자연광이 드는 따뜻한 분위기의 작은 거실">${escapeHTML(state.imagePrompt)}</textarea>
          </label>
          <button type="button" class="landing-button landing-button--primary" data-generate-image ${state.assetLoading ? "disabled" : ""}>
            ${state.assetLoading ? "이미지 생성 중..." : "새 이미지 생성"}
          </button>
          ${state.assetError ? `<p class="landing-inspector__error">${escapeHTML(state.assetError)}</p>` : ""}
        ` : `
          <label>현재 문구
            <textarea data-editable-draft>${escapeHTML(state.selectedEditable.value)}</textarea>
          </label>
          <button type="button" class="landing-button landing-button--primary" data-apply-copy>현재 문구 적용</button>
          <div class="landing-inspector__divider"></div>
          <label>AI에게 추가로 요청하기
            <textarea data-copy-prompt placeholder="예: 조금 더 짧고 위트 있게 작성해 주세요.">${escapeHTML(state.copyPrompt)}</textarea>
          </label>
          <button type="button" class="landing-button landing-button--secondary" data-generate-copy ${state.candidateLoading ? "disabled" : ""}>
            ${state.candidateLoading ? "후보 생성 중..." : "카피 후보 새로고침"}
          </button>
          ${state.candidateError ? `<p class="landing-inspector__error">${escapeHTML(state.candidateError)}</p>` : ""}
          ${copyCandidates ? `<div class="landing-copy-candidates">${copyCandidates}</div>` : ""}
        `}
        ${state.saveError ? `<p class="landing-inspector__error">${escapeHTML(state.saveError)}</p>` : ""}
        ${state.saveNotice ? `<p class="landing-save-status landing-save-status--success">${escapeHTML(state.saveNotice)}</p>` : ""}
        <div class="landing-inspector__actions">
          <button type="button" class="landing-button landing-button--primary" data-save ${state.saveLoading ? "disabled" : ""}>
            ${state.saveLoading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>`;
  }

  function editorMarkup() {
    const page = activePage();
    const tabs = state.landing.pages.map((item, index) => `
      <button type="button" class="landing-persona-tab ${index === state.activePersonaIndex ? "landing-persona-tab--active" : ""}"
        data-landing-persona="${index}" role="tab" aria-selected="${index === state.activePersonaIndex}">
        ${escapeHTML(item.persona_name)}
      </button>`).join("");
    const headerComponents = page.header_components || [];
    const header = headerComponents.length ? `
      <section class="landing-fixed-header" aria-label="공통 고정 Header">
        ${headerComponents.map((component) => fixedHeaderCard(component)).join("")}
      </section>` : "";
    const components = [
      '<div class="landing-drop-zone" data-drop-index="0"><span>여기에 컴포넌트 추가</span></div>',
      ...page.components.flatMap((component, index) => [
        componentCard(component, index, page.components.length),
        `<div class="landing-drop-zone" data-drop-index="${index + 1}"><span>여기에 컴포넌트 추가</span></div>`,
      ]),
    ].join("");
    const preview = state.previewOpen ? `
      <div class="landing-preview" role="dialog" aria-modal="true" aria-label="랜딩 페이지 미리보기">
        <div class="landing-preview__bar">
          <div><strong>${escapeHTML(page.persona_name)}</strong><span>미리보기</span></div>
          ${zoomControlsMarkup("preview", state.previewZoom)}
          <button type="button" data-close-preview>편집기로 돌아가기</button>
        </div>
        <div class="landing-preview__viewport">
          <div class="landing-preview__stage" style="--landing-zoom: ${state.previewZoom}">
        <iframe title="${escapeHTML(page.persona_name)} 랜딩 페이지 전체 미리보기"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          srcdoc="${escapeHTML(previewDocument())}"></iframe>
          </div>
        </div>
      </div>` : "";
    return `
      <section class="landing-editor" aria-label="랜딩 페이지 편집기">
        <header class="landing-page-hero">
          <div class="screen-content">
            <div class="page-header">
              ${window.progressMarkup ? window.progressMarkup([1, 1, 1, 1, 1]) : ""}
              <div class="heading-block">
                <div class="heading-block__titles">
                  <p class="brand-name">IKEA</p>
                  <h1>Landing Page</h1>
                </div>
                <p class="heading-block__description">AI가 페르소나별 랜딩페이지를 생성했어요. 직접 다듬어 완성해보세요.</p>
              </div>
            </div>
          </div>
        </header>
        <div class="landing-editor__workspace">
          <aside class="landing-panel landing-panel--library">
            <div class="landing-panel__title">
              <strong>Component</strong>
              <p>끌어서 페이지에 놓으면 추가돼요. 블록을 잡고 옮기면 순서가 바뀝니다.</p>
            </div>
            <label class="landing-library-search">
              <span>검색</span>
              <input type="search" data-component-search value="${escapeHTML(state.componentQuery)}" placeholder="컴포넌트 검색" />
            </label>
            <div class="landing-library">${libraryMarkup()}</div>
          </aside>
          <main class="landing-center">
            <div class="landing-center__tools">
              <div class="landing-editor__tabs" role="tablist" aria-label="페르소나별 랜딩 페이지">${tabs}</div>
            </div>
            <section class="landing-intent">
              <span>✦ AI 의도</span>
              <p>${escapeHTML(page.ai_intent || "AI가 구성 의도를 제공하지 않았습니다.")}</p>
            </section>
            <div class="landing-canvas-wrap">
              <div class="landing-canvas-stage" style="--landing-zoom: ${state.zoom}">
                <div class="landing-canvas" data-landing-canvas>
                  ${header}
                  ${components}
                </div>
              </div>
            </div>
          </main>
          <aside class="landing-panel landing-panel--inspector">${inspectorMarkup()}</aside>
        </div>
        <nav class="landing-export-actions" aria-label="랜딩 페이지 내보내기">
          <button type="button" class="landing-export-action" data-open-preview>
            <span>웹으로 보기</span><span class="landing-export-action__icon" aria-hidden="true">↗</span>
          </button>
          <button type="button" class="landing-export-action landing-export-action--primary" data-download-html>
            <span>HTML 추출</span><span class="landing-export-action__icon" aria-hidden="true">→</span>
          </button>
        </nav>
      </section>
      ${preview}`;
  }

  function markup() {
    if (state.loading) {
      return `
        <section class="landing-editor-state" aria-live="polite">
          <img src="assets/spinner.svg" alt="" />
          <h1>AI가 랜딩 페이지를 구성하고 있어요</h1>
          <p>페르소나별로 컴포넌트와 카피, 이미지를 선택하고 있습니다.</p>
        </section>`;
    }
    if (state.error) {
      return `
        <section class="landing-editor-state">
          <h1>랜딩 페이지를 만들지 못했습니다</h1>
          <p>${escapeHTML(state.error)}</p>
          <button class="landing-button landing-button--primary" type="button" data-retry-landing>다시 시도</button>
        </section>`;
    }
    if (!state.landing) {
      return `
        <section class="landing-editor-state">
          <h1>생성된 랜딩 페이지가 없습니다</h1>
          <p>최종 검토에서 랜딩 페이지 생성을 시작해 주세요.</p>
        </section>`;
    }
    return editorMarkup();
  }

  let heroScrollBound = false;

  function updateHeroCollapse() {
    const editor = document.querySelector(".landing-editor");
    if (!editor) return;
    const collapse = Math.min(1, Math.max(0, window.scrollY / 166));
    editor.style.setProperty("--hero-height", `${286 - (166 * collapse)}px`);
    editor.style.setProperty("--progress-height", `${20 * (1 - collapse)}px`);
    editor.style.setProperty("--progress-top", `${48 - (32 * collapse)}px`);
    editor.style.setProperty(
      "--progress-opacity",
      Math.max(0, 1 - (collapse * 1.5)).toFixed(3),
    );
    editor.style.setProperty("--progress-offset", `${-12 * collapse}px`);
  }

  function mount(root) {
    if (!heroScrollBound) {
      window.addEventListener("scroll", updateHeroCollapse, { passive: true });
      heroScrollBound = true;
    }
    updateHeroCollapse();
    const landingId = new URLSearchParams(window.location.search).get("landingId")
      || sessionStorage.getItem("landingId");
    if (!state.landing && !state.loading && !state.error && !state.restoreAttempted && landingId) {
      restore(landingId);
      return;
    }
    root.querySelectorAll("[data-component-frame]").forEach((frame) => {
      frame.addEventListener("load", () => {
        frame.style.height = `${frameHeight(frame, frame.contentDocument?.documentElement.scrollHeight)}px`;
      });
    });
  }

  function frameHeight(frame, height) {
    const minimum = frame.closest(".landing-component--fixed") ? 36 : 240;
    return Math.max(minimum, Number(height) || 0);
  }

  async function create(projectId) {
    if (!projectId) {
      state.error = "프로젝트 정보를 찾을 수 없습니다.";
      return;
    }
    state.projectId = projectId;
    state.loading = true;
    state.error = "";
    window.dispatchEvent(new CustomEvent("landing-editor-change"));
    try {
      state.landing = await window.LandingAPI.create(projectId);
      rememberLanding(state.landing.landing_id);
      rememberInitialPages();
      state.activePersonaIndex = 0;
      state.history = [];
      state.future = [];
      state.copyPrompt = "";
      state.copyCandidates = [];
      state.imagePrompt = "";
      state.saveError = "";
      state.saveNotice = "";
      persistDraft();
    } catch (error) {
      state.error = error.message;
    } finally {
      state.loading = false;
      requestRender();
    }
  }

  async function restore(landingId) {
    state.restoreAttempted = true;
    state.loading = true;
    state.error = "";
    requestRender();
    try {
      state.landing = await window.LandingAPI.get(landingId);
      state.projectId = state.landing.project_id;
      rememberInitialPages();
      state.activePersonaIndex = 0;
      const storedDraft = sessionStorage.getItem(`landingDraft:${landingId}`);
      if (storedDraft) {
        try {
          const pages = JSON.parse(storedDraft);
          if (Array.isArray(pages) && pages.length === state.landing.pages.length) {
            state.landing.pages = pages;
          }
        } catch (error) {
          sessionStorage.removeItem(`landingDraft:${landingId}`);
        }
      }
      rememberLanding(landingId);
    } catch (error) {
      state.error = error.message;
    } finally {
      state.loading = false;
      requestRender();
    }
  }

  function rememberLanding(landingId) {
    sessionStorage.setItem("landingId", landingId);
    const url = new URL(window.location.href);
    url.searchParams.set("landingId", landingId);
    window.history.replaceState(null, "", url);
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type === "landing-frame-height") {
      const frame = document.querySelector(`[data-component-frame="${CSS.escape(event.data.instanceId)}"]`);
      if (frame) frame.style.height = `${frameHeight(frame, event.data.height)}px`;
    }
    if (event.data?.type === "landing-editable-select") {
      state.selectedInstanceId = event.data.instanceId;
      state.selectedEditable = event.data;
      state.copyPrompt = "";
      state.copyCandidates = [];
      state.candidateError = "";
      state.imagePrompt = "";
      state.assetError = "";
      requestRender();
    }
  });

  document.addEventListener("click", (event) => {
    const personaTab = event.target.closest("[data-landing-persona]");
    const closeInspector = event.target.closest("[data-close-inspector]");
    const retry = event.target.closest("[data-retry-landing]");
    const historyButton = event.target.closest("[data-history]");
    const componentAction = event.target.closest("[data-component-action]");
    const addTemplate = event.target.closest("[data-add-template]");
    const applyCopy = event.target.closest("[data-apply-copy]");
    const generateCopy = event.target.closest("[data-generate-copy]");
    const copyCandidate = event.target.closest("[data-copy-candidate]");
    const selectAsset = event.target.closest("[data-select-asset]");
    const selectImage = event.target.closest("[data-select-image]");
    const applyImageAlt = event.target.closest("[data-apply-image-alt]");
    const generateImage = event.target.closest("[data-generate-image]");
    const preview = event.target.closest("[data-preview]");
    const closePreview = event.target.closest("[data-close-preview]");
    const save = event.target.closest("[data-save]");
    const zoom = event.target.closest("[data-zoom]");
    const device = event.target.closest("[data-device]");
    const resetPage = event.target.closest("[data-reset-page]");
    const openPreview = event.target.closest("[data-open-preview]");
    const downloadHtml = event.target.closest("[data-download-html]");
    const backFinalCheck = event.target.closest("[data-back-final-check]");
    if (backFinalCheck) {
      window.location.hash = "#final-check";
      return;
    }
    if (device) {
      state.device = device.dataset.device === "mobile" ? "mobile" : "desktop";
      state.zoom = state.device === "mobile" ? 0.5 : 0.8;
      requestRender();
      return;
    }
    if (zoom) {
      const [target, action] = zoom.dataset.zoom.split(":");
      const key = target === "preview" ? "previewZoom" : "zoom";
      if (action === "out") state[key] = clampZoom(state[key] - zoomStep);
      if (action === "in") state[key] = clampZoom(state[key] + zoomStep);
      if (action === "reset") state[key] = 1;
      requestRender();
      return;
    }
    if (resetPage) {
      resetActivePage();
      return;
    }
    if (openPreview) {
      openPreviewTab();
      return;
    }
    if (downloadHtml) {
      downloadCurrentHtml();
      return;
    }
    if (personaTab) {
      state.activePersonaIndex = Number(personaTab.dataset.landingPersona);
      state.selectedInstanceId = "";
      state.selectedEditable = null;
      requestRender();
    }
    if (closeInspector) {
      state.selectedInstanceId = "";
      state.selectedEditable = null;
      requestRender();
    }
    if (retry && state.projectId) create(state.projectId);
    if (historyButton?.dataset.history === "undo") undo();
    if (historyButton?.dataset.history === "redo") redo();
    if (componentAction && componentAction.dataset.componentAction !== "drag") {
      const card = componentAction.closest("[data-landing-component]");
      const components = activePage()?.components;
      const index = components?.findIndex((item) => item.instance_id === card?.dataset.landingComponent);
      if (!components || index < 0) return;
      const action = componentAction.dataset.componentAction;
      if (action === "edit-image") {
        selectComponentImage(components[index]);
        return;
      }
      if (action === "up" && index > 0) {
        commitMutation(() => components.splice(index - 1, 0, components.splice(index, 1)[0]));
      }
      if (action === "down" && index < components.length - 1) {
        commitMutation(() => components.splice(index + 1, 0, components.splice(index, 1)[0]));
      }
      if (action === "duplicate") {
        commitMutation(() => {
          const duplicate = structuredClone(components[index]);
          duplicate.instance_id = crypto.randomUUID();
          components.splice(index + 1, 0, duplicate);
        });
      }
      if (action === "hide") {
        commitMutation(() => { components[index].hidden = !components[index].hidden; });
      }
      if (action === "delete") commitMutation(() => components.splice(index, 1));
    }
    if (addTemplate) addTemplateAt(addTemplate.dataset.addTemplate, activePage()?.components.length || 0);
    if (applyCopy) applySelectedCopy(state.selectedEditable?.value || "");
    if (copyCandidate) {
      const value = state.copyCandidates[Number(copyCandidate.dataset.copyCandidate)];
      if (value !== undefined) applySelectedCopy(value);
    }
    if (generateCopy) generateCopyCandidates();
    if (selectAsset) applySelectedImage(`asset://${selectAsset.dataset.selectAsset}`);
    if (selectImage) applySelectedImage(selectImage.dataset.selectImage);
    if (applyImageAlt) applySelectedImage(state.selectedEditable?.value || "");
    if (generateImage) generateImageAsset();
    if (preview) {
      state.previewOpen = true;
      requestRender();
    }
    if (closePreview) {
      state.previewOpen = false;
      requestRender();
    }
    if (save) saveLanding();
  });

  async function saveLanding() {
    if (!state.landing || state.saveLoading) return;
    state.saveLoading = true;
    state.saveError = "";
    state.saveNotice = "";
    requestRender();
    const pages = state.landing.pages.map((page) => ({
      persona_key: page.persona_key,
      components: page.components.map((component) => ({
        instance_id: component.instance_id,
        template_id: component.template_id,
        html: component.html,
        layout_variant: component.layout_variant || "source",
        hidden: component.hidden,
      })),
    }));
    try {
      state.landing = await window.LandingAPI.save(state.landing.landing_id, pages);
      sessionStorage.removeItem(`landingDraft:${state.landing.landing_id}`);
      state.saveNotice = "모든 페르소나 페이지를 저장했습니다.";
    } catch (error) {
      state.saveError = error.message;
    } finally {
      state.saveLoading = false;
      requestRender();
    }
  }

  function displayAssetUrl(value) {
    if (!value?.startsWith("asset://")) return value || "";
    return window.LandingAPI.assetUrl(
      state.landing.landing_id,
      value.slice("asset://".length),
    );
  }

  function normalizedAssetValue(value) {
    if (value?.startsWith("asset://")) return value;
    try {
      const url = new URL(value, window.location.href);
      const marker = "/assets/";
      const markerIndex = url.pathname.lastIndexOf(marker);
      if (markerIndex >= 0) {
        return `asset://${decodeURIComponent(url.pathname.slice(markerIndex + marker.length))}`;
      }
    } catch (error) {
      return value;
    }
    return value;
  }

  function escapeAttribute(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function setTagAttribute(tag, name, value) {
    const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])[\\s\\S]*?\\1`, "i");
    const attribute = `${name}="${escapeAttribute(value)}"`;
    if (pattern.test(tag)) return tag.replace(pattern, attribute);
    const closing = tag.trimEnd().endsWith("/>") ? "/>" : ">";
    return `${tag.trimEnd().slice(0, -closing.length).trimEnd()} ${attribute}${closing}`;
  }

  function setComponentLayout(source, layoutVariant) {
    return source.replace(/<[a-z][\w:-]*\b[^>]*>/i, (tag) => (
      setTagAttribute(tag, "data-layout-variant", layoutVariant)
    ));
  }

  function setBackgroundImageOnTag(tag, src) {
    const styleMatch = tag.match(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/i);
    const declarations = (styleMatch?.[2] || "")
      .split(";")
      .map((item) => item.trim())
      .filter((item) => item && !/^(background-image|background-size|background-position)\s*:/i.test(item));
    const safeSrc = String(src).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
    declarations.push(`background-image:url('${safeSrc}')`, "background-size:cover", "background-position:center");
    return setTagAttribute(
      setTagAttribute(tag, "data-editable-image-src", src),
      "style",
      declarations.join(";"),
    );
  }

  function replaceImageAt(source, typeIndex, src, alt) {
    const pattern = /<(img|div|figure)\b(?=[^>]*\bdata-editable\s*=\s*['"]image['"])[^>]*>/gi;
    let index = 0;
    let replaced = false;
    const html = source.replace(pattern, (tag, tagName) => {
      if (index++ !== typeIndex) return tag;
      replaced = true;
      if (tagName.toLowerCase() === "img") {
        return setTagAttribute(setTagAttribute(tag, "src", src), "alt", alt);
      }
      return setTagAttribute(setBackgroundImageOnTag(tag, src), "aria-label", alt);
    });
    return replaced ? html : null;
  }

  function selectComponentImage(component) {
    const targets = editableImageTargets(component.html);
    if (!targets.length) return;
    const editableTypeIndex = Math.max(0, targets.findIndex((target) => !target.value));
    const selected = targets[editableTypeIndex];
    state.selectedInstanceId = component.instance_id;
    state.selectedEditable = {
      instanceId: component.instance_id,
      editableIndex: editableTypeIndex,
      editableTypeIndex,
      editableType: "image",
      value: selected.value,
      alt: selected.alt,
      width: 1,
      height: 1,
    };
    state.imagePrompt = "";
    state.assetError = "";
    requestRender();
  }

  function applySelectedImage(value) {
    const selected = state.selectedEditable;
    if (!selected || selected.editableType !== "image") return;
    const component = activePage()?.components.find(
      (item) => item.instance_id === selected.instanceId,
    );
    if (!component) return;
    const assetValue = normalizedAssetValue(value);
    const updated = replaceImageAt(
      component.html,
      selected.editableTypeIndex,
      assetValue,
      selected.alt,
    );
    if (updated === null) {
      state.assetError = "선택한 이미지 영역을 찾을 수 없습니다.";
      requestRender();
      return;
    }
    commitMutation(() => {
      component.html = updated;
      state.selectedEditable.value = assetValue;
      state.assetError = "";
    }, { preserveSelection: true });
  }

  function closestAspectRatio(width, height) {
    const options = [
      ["1:1", 1], ["2:3", 2 / 3], ["3:2", 3 / 2], ["3:4", 3 / 4],
      ["4:3", 4 / 3], ["4:5", 4 / 5], ["5:4", 5 / 4], ["9:16", 9 / 16],
      ["16:9", 16 / 9], ["21:9", 21 / 9],
    ];
    const ratio = width > 0 && height > 0 ? width / height : 16 / 9;
    return options.reduce((closest, option) => (
      Math.abs(option[1] - ratio) < Math.abs(closest[1] - ratio) ? option : closest
    ))[0];
  }

  async function generateImageAsset() {
    const selected = state.selectedEditable;
    const page = activePage();
    if (!selected || selected.editableType !== "image" || !page || state.assetLoading) return;
    if (!state.imagePrompt.trim()) {
      state.assetError = "생성할 이미지에 대한 요청을 입력해 주세요.";
      requestRender();
      return;
    }
    state.assetLoading = true;
    state.assetError = "";
    requestRender();
    try {
      const asset = await window.LandingAPI.generateAsset(
        state.landing.landing_id,
        {
          persona_key: page.persona_key,
          instance_id: selected.instanceId,
          editable_index: selected.editableTypeIndex,
          prompt: state.imagePrompt.trim(),
          alt: selected.alt,
          aspect_ratio: closestAspectRatio(selected.width, selected.height),
        },
      );
      state.landing.assets.push(asset);
      applySelectedImage(`asset://${asset.filename}`);
    } catch (error) {
      state.assetError = error.message;
    } finally {
      state.assetLoading = false;
      requestRender();
    }
  }

  function replaceCopyAt(source, typeIndex, value) {
    const pattern = /(<([a-z][\w:-]*)\b(?=[^>]*\bdata-editable\s*=\s*['"]copy['"])[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi;
    let index = 0;
    let replaced = false;
    const escapedValue = escapeHTML(value)
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .join("<br>");
    const html = source.replace(pattern, (match, opening, tag, content, closing) => {
      if (index++ !== typeIndex) return match;
      replaced = true;
      return `${opening}${escapedValue}${closing}`;
    });
    return replaced ? html : null;
  }

  function applySelectedCopy(value) {
    const selected = state.selectedEditable;
    if (!selected || selected.editableType !== "copy") return;
    const component = activePage()?.components.find(
      (item) => item.instance_id === selected.instanceId,
    );
    if (!component) return;
    const updated = replaceCopyAt(component.html, selected.editableTypeIndex, value);
    if (updated === null) {
      state.candidateError = "선택한 카피 영역을 찾을 수 없습니다.";
      requestRender();
      return;
    }
    commitMutation(() => {
      component.html = updated;
      state.selectedEditable.value = value;
      state.copyCandidates = [];
      state.candidateError = "";
    }, { preserveSelection: true });
  }

  async function generateCopyCandidates() {
    const selected = state.selectedEditable;
    const page = activePage();
    if (!selected || selected.editableType !== "copy" || !page || state.candidateLoading) return;
    state.candidateLoading = true;
    state.candidateError = "";
    requestRender();
    try {
      const response = await window.LandingAPI.copyCandidates(
        state.landing.landing_id,
        {
          persona_key: page.persona_key,
          instance_id: selected.instanceId,
          editable_index: selected.editableTypeIndex,
          current_value: selected.value,
          prompt: state.copyPrompt,
        },
      );
      state.copyCandidates = response.candidates;
    } catch (error) {
      state.candidateError = error.message;
    } finally {
      state.candidateLoading = false;
      requestRender();
    }
  }

  document.addEventListener("input", (event) => {
    if (event.target.matches("[data-editable-draft]") && state.selectedEditable) {
      if (state.selectedEditable.editableType === "copy") {
        state.selectedEditable.value = event.target.value;
      } else {
        state.selectedEditable.alt = event.target.value;
      }
    }
    if (event.target.matches("[data-copy-prompt]")) state.copyPrompt = event.target.value;
    if (event.target.matches("[data-image-prompt]")) state.imagePrompt = event.target.value;
    if (event.target.matches("[data-component-search]")) {
      state.componentQuery = event.target.value;
      const library = event.target
        .closest(".landing-panel--library")
        ?.querySelector(".landing-library");
      if (library) library.innerHTML = libraryMarkup();
    }
  });

  function resetActivePage() {
    const page = activePage();
    const initial = state.initialPages[state.activePersonaIndex];
    if (!page || !initial) return;
    commitMutation(() => {
      state.landing.pages[state.activePersonaIndex] = structuredClone(initial);
    });
  }

  function openPreviewTab() {
    const preview = window.open("", "_blank");
    if (!preview) {
      state.saveError = "팝업이 차단됐습니다. 브라우저 설정을 확인해 주세요.";
      requestRender();
      return;
    }
    preview.document.write(exportDocument());
    preview.document.close();
  }

  function downloadCurrentHtml() {
    const page = activePage();
    const blob = new Blob([exportDocument(page)], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${page?.persona_key || "landing"}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  }

  document.addEventListener("change", async (event) => {
    const layout = event.target.closest("[data-component-layout]");
    if (layout) {
      const card = layout.closest("[data-landing-component]");
      const component = activePage()?.components.find(
        (item) => item.instance_id === card?.dataset.landingComponent,
      );
      if (!component || !(component.layout_options || ["source"]).includes(layout.value)) return;
      commitMutation(() => {
        component.layout_variant = layout.value;
        component.html = setComponentLayout(component.html, layout.value);
      }, { preserveSelection: true });
      return;
    }
    const input = event.target.closest("[data-upload-image]");
    const file = input?.files?.[0];
    if (!file || state.assetLoading) return;
    state.assetLoading = true;
    state.assetError = "";
    requestRender();
    try {
      const asset = await window.LandingAPI.uploadAsset(state.landing.landing_id, file);
      state.landing.assets.push(asset);
      applySelectedImage(`asset://${asset.filename}`);
    } catch (error) {
      state.assetError = error.message;
    } finally {
      state.assetLoading = false;
      requestRender();
    }
  });

  function addTemplateAt(templateId, index) {
    const template = state.landing?.component_library.find((item) => item.template_id === templateId);
    const components = activePage()?.components;
    if (!template || !components) return;
    commitMutation(() => {
      const imagePool = availableImageValues();
      let html = template.html;
      editableImageTargets(html).forEach((target, imageIndex) => {
        if (target.value || !imagePool.length) return;
        html = replaceImageAt(
          html,
          imageIndex,
          imagePool[imageIndex % imagePool.length],
          target.alt || `${template.name} 이미지 ${imageIndex + 1}`,
        ) || html;
      });
      components.splice(index, 0, {
        instance_id: crypto.randomUUID(),
        template_id: template.template_id,
        name: template.name,
        category: template.category,
        html,
        layout_variant: "source",
        layout_options: template.layout_options || ["source"],
        hidden: false,
      });
    });
  }

  document.addEventListener("dragstart", (event) => {
    const template = event.target.closest("[data-add-template]");
    if (template) {
      const rect = template.getBoundingClientRect();
      state.draggedTemplateId = template.dataset.addTemplate;
      state.draggedInstanceId = "";
      state.draggedDestination = null;
      state.draggedRect = {
        width: rect.width,
        height: rect.height,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      event.dataTransfer?.setData("text/plain", state.draggedTemplateId);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
      document.body.classList.add("landing-drag-active");
    }
  });

  function dropTargetAt(element, clientY) {
    const zone = element?.closest("[data-drop-index]");
    if (zone) return { destination: Number(zone.dataset.dropIndex), zone };
    const card = element?.closest("[data-component-index]");
    if (card) {
      const index = Number(card.dataset.componentIndex);
      const destination = clientY < card.getBoundingClientRect().top + card.offsetHeight / 2
        ? index
        : index + 1;
      const adjacentZone = document.querySelector(`[data-drop-index="${destination}"]`);
      return { destination, zone: adjacentZone };
    }
    const canvas = element?.closest("[data-landing-canvas]");
    if (!canvas) return null;
    const cards = Array.from(canvas.querySelectorAll("[data-component-index]"));
    const nextCard = cards.find((item) => (
      clientY < item.getBoundingClientRect().top + item.offsetHeight / 2
    ));
    const destination = nextCard ? Number(nextCard.dataset.componentIndex) : cards.length;
    const adjacentZone = document.querySelector(`[data-drop-index="${destination}"]`);
    return { destination, zone: adjacentZone };
  }

  function overlappingDropTarget(clientX, clientY) {
    const verticalDropTolerance = 30;
    const drag = state.draggedRect;
    const canvas = document.querySelector("[data-landing-canvas]");
    if (!drag || !canvas) return null;
    const draggedBounds = {
      left: clientX - drag.offsetX,
      right: clientX - drag.offsetX + drag.width,
      top: clientY - drag.offsetY,
      bottom: clientY - drag.offsetY + drag.height,
    };
    const canvasBounds = canvas.getBoundingClientRect();
    const overlapsCanvasHorizontally = (
      draggedBounds.right >= canvasBounds.left
      && draggedBounds.left <= canvasBounds.right
    );
    if (!overlapsCanvasHorizontally) return null;
    const candidates = Array.from(canvas.querySelectorAll("[data-drop-index]"))
      .map((zone) => ({
        zone,
        destination: Number(zone.dataset.dropIndex),
        y: zone.getBoundingClientRect().top + zone.offsetHeight / 2,
      }))
      .filter((item) => (
        item.y >= draggedBounds.top - verticalDropTolerance
        && item.y <= draggedBounds.bottom + verticalDropTolerance
      ))
      .sort((a, b) => Math.abs(a.y - clientY) - Math.abs(b.y - clientY));
    return candidates[0] || null;
  }

  document.addEventListener("dragover", (event) => {
    const target = overlappingDropTarget(event.clientX, event.clientY)
      || dropTargetAt(event.target, event.clientY);
    if (!target || (!state.draggedInstanceId && !state.draggedTemplateId)) return;
    event.preventDefault();
    document.querySelectorAll(".landing-drop-zone--active").forEach((item) => {
      item.classList.remove("landing-drop-zone--active");
    });
    state.draggedDestination = target.destination;
    target.zone?.classList.add("landing-drop-zone--active");
    if (event.dataTransfer) event.dataTransfer.dropEffect = state.draggedTemplateId ? "copy" : "move";
  });

  document.addEventListener("drop", (event) => {
    const target = overlappingDropTarget(event.clientX, event.clientY)
      || dropTargetAt(event.target, event.clientY)
      || (state.draggedDestination === null
        ? null
        : { destination: state.draggedDestination, zone: null });
    if (!target) return;
    event.preventDefault();
    const destination = target.destination;
    const transferredTemplateId = event.dataTransfer?.getData("text/plain") || "";
    const templateId = state.draggedTemplateId || transferredTemplateId;
    if (templateId) {
      addTemplateAt(templateId, destination);
    } else if (state.draggedInstanceId) {
      const components = activePage()?.components;
      const source = components?.findIndex((item) => item.instance_id === state.draggedInstanceId);
      if (components && source >= 0) {
        const adjustedDestination = source < destination ? destination - 1 : destination;
        if (source !== adjustedDestination) {
          commitMutation(() => {
            const [component] = components.splice(source, 1);
            components.splice(adjustedDestination, 0, component);
          });
        }
      }
    }
    state.draggedInstanceId = "";
    state.draggedTemplateId = "";
    state.draggedDestination = null;
    state.draggedRect = null;
    document.body.classList.remove("landing-drag-active");
    document.querySelectorAll(".landing-drop-zone--active").forEach((item) => {
      item.classList.remove("landing-drop-zone--active");
    });
  });

  document.addEventListener("dragend", () => {
    state.draggedInstanceId = "";
    state.draggedTemplateId = "";
    state.draggedDestination = null;
    state.draggedRect = null;
    document.body.classList.remove("landing-drag-active");
    document.querySelectorAll(".landing-drop-zone--active").forEach((item) => {
      item.classList.remove("landing-drop-zone--active");
    });
  });

  function clearActiveDropZones() {
    document.querySelectorAll(".landing-drop-zone--active").forEach((item) => {
      item.classList.remove("landing-drop-zone--active");
    });
  }

  function activeDropZoneAt(clientX, clientY) {
    return document.elementFromPoint(clientX, clientY)?.closest("[data-drop-index]");
  }

  function moveDraggedComponent(destination) {
    const components = activePage()?.components;
    const source = components?.findIndex((item) => item.instance_id === state.draggedInstanceId);
    if (!components || source === undefined || source < 0) return;
    const adjustedDestination = source < destination ? destination - 1 : destination;
    if (source === adjustedDestination) return;
    commitMutation(() => {
      const [component] = components.splice(source, 1);
      components.splice(adjustedDestination, 0, component);
    });
  }

  document.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest('[data-component-action="drag"]');
    if (!handle) return;
    state.draggedInstanceId = handle.closest("[data-landing-component]")?.dataset.landingComponent || "";
    state.draggedTemplateId = "";
    state.pointerDragging = Boolean(state.draggedInstanceId);
    if (state.pointerDragging) {
      event.preventDefault();
      handle.setPointerCapture?.(event.pointerId);
    }
  });

  document.addEventListener("pointermove", (event) => {
    if (!state.pointerDragging) return;
    const zone = activeDropZoneAt(event.clientX, event.clientY);
    clearActiveDropZones();
    if (zone) zone.classList.add("landing-drop-zone--active");
  });

  document.addEventListener("pointerup", (event) => {
    if (!state.pointerDragging) return;
    const zone = activeDropZoneAt(event.clientX, event.clientY);
    if (zone) moveDraggedComponent(Number(zone.dataset.dropIndex));
    state.pointerDragging = false;
    state.draggedInstanceId = "";
    clearActiveDropZones();
  });

  window.LandingEditor = { create, markup, mount, state };
}());
