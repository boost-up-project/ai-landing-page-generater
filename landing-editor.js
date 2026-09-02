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
    copyPrompt: "",
    copyCandidates: [],
    candidateLoading: false,
    candidateError: "",
  };

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

  function clonePages(pages = state.landing?.pages || []) {
    return structuredClone(pages);
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

  function frameDocument(component) {
    const bridge = `
      <script>
        const sendHeight = () => parent.postMessage({
          type: "landing-frame-height",
          instanceId: ${JSON.stringify(component.instance_id)},
          height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
        }, "*");
        const editableNodes = () => Array.from(document.querySelectorAll("[data-editable]"));
        document.addEventListener("dblclick", (event) => {
          const target = event.target.closest("[data-editable]");
          if (!target) return;
          event.preventDefault();
          parent.postMessage({
            type: "landing-editable-select",
            instanceId: ${JSON.stringify(component.instance_id)},
            editableIndex: editableNodes().indexOf(target),
            editableTypeIndex: editableNodes().filter((item) => item.dataset.editable === target.dataset.editable).indexOf(target),
            editableType: target.dataset.editable,
            value: target.dataset.editable === "image" ? target.getAttribute("src") || "" : target.textContent || "",
            alt: target.getAttribute("alt") || ""
          }, "*");
        });
        new ResizeObserver(sendHeight).observe(document.documentElement);
        window.addEventListener("load", sendHeight);
        setTimeout(sendHeight, 100);
      <\/script>`;
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${replaceAssetUrls(component.html)}${bridge}</body></html>`;
  }

  function componentCard(component, index, count) {
    return `
      <article class="landing-component ${component.hidden ? "landing-component--hidden" : ""} ${state.selectedInstanceId === component.instance_id ? "landing-component--selected" : ""}"
        data-landing-component="${escapeHTML(component.instance_id)}">
        <div class="landing-component__label">${escapeHTML(component.name)}</div>
        <div class="landing-component__toolbar" aria-label="${escapeHTML(component.name)} 설정">
          <button type="button" data-component-action="drag" draggable="true" title="드래그해서 이동">⋮⋮</button>
          <button type="button" data-component-action="up" ${index === 0 ? "disabled" : ""} title="위로 이동">↑</button>
          <button type="button" data-component-action="down" ${index === count - 1 ? "disabled" : ""} title="아래로 이동">↓</button>
          <button type="button" data-component-action="duplicate" title="복제">복제</button>
          <button type="button" data-component-action="hide" title="숨김">${component.hidden ? "표시" : "숨김"}</button>
          <button type="button" data-component-action="delete" title="삭제">삭제</button>
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

  function libraryMarkup() {
    const templates = state.landing?.component_library || [];
    if (!templates.length) return '<p class="landing-panel__empty">사용 가능한 컴포넌트가 없습니다.</p>';
    return templates.map((template) => `
      <button type="button" class="landing-library-item" data-add-template="${escapeHTML(template.template_id)}" draggable="true">
        <span class="landing-library-item__preview">${escapeHTML(template.category || "Component")}</span>
        <strong>${escapeHTML(template.name)}</strong>
      </button>`).join("");
  }

  function inspectorMarkup() {
    if (!state.selectedEditable) {
      return `
        <div class="landing-inspector__empty">
          <strong>편집할 요소를 선택하세요</strong>
          <p>캔버스의 이미지나 텍스트를 더블클릭하면 여기에서 변경할 수 있습니다.</p>
        </div>`;
    }
    const isImage = state.selectedEditable.editableType === "image";
    const copyCandidates = state.copyCandidates.map((candidate, index) => `
      <button type="button" class="landing-copy-candidate" data-copy-candidate="${index}">
        <span>후보 ${index + 1}</span>
        <strong>${escapeHTML(candidate)}</strong>
      </button>`).join("");
    return `
      <div class="landing-inspector__header">
        <span>${isImage ? "이미지" : "카피"} 편집</span>
        <button type="button" data-close-inspector aria-label="속성 패널 닫기">×</button>
      </div>
      <div class="landing-inspector__body">
        ${isImage ? `
          <label>대체 텍스트
            <textarea data-editable-draft>${escapeHTML(state.selectedEditable.alt)}</textarea>
          </label>
          <p>이미지 교체 기능은 다음 구현 단위에서 연결됩니다.</p>
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
      </div>`;
  }

  function editorMarkup() {
    const page = activePage();
    const tabs = state.landing.pages.map((item, index) => `
      <button type="button" class="landing-persona-tab ${index === state.activePersonaIndex ? "landing-persona-tab--active" : ""}"
        data-landing-persona="${index}" role="tab" aria-selected="${index === state.activePersonaIndex}">
        ${escapeHTML(item.persona_name)}
      </button>`).join("");
    const components = [
      '<div class="landing-drop-zone" data-drop-index="0"><span>여기에 컴포넌트 추가</span></div>',
      ...page.components.flatMap((component, index) => [
        componentCard(component, index, page.components.length),
        `<div class="landing-drop-zone" data-drop-index="${index + 1}"><span>여기에 컴포넌트 추가</span></div>`,
      ]),
    ].join("");
    return `
      <section class="landing-editor" aria-label="랜딩 페이지 편집기">
        <header class="landing-editor__topbar">
          <div class="landing-editor__title">
            <strong>Landing Page Editor</strong>
            <span>${escapeHTML(page.persona_name)} 맞춤 페이지</span>
          </div>
          <div class="landing-editor__history">
            <button type="button" data-history="undo" title="되돌리기" ${state.history.length ? "" : "disabled"}>↶</button>
            <button type="button" data-history="redo" title="다시 실행" ${state.future.length ? "" : "disabled"}>↷</button>
          </div>
          <div class="landing-editor__actions">
            <button type="button" class="landing-button landing-button--secondary" data-preview>미리보기</button>
            <button type="button" class="landing-button landing-button--primary" data-save>저장</button>
          </div>
        </header>
        <div class="landing-editor__tabs" role="tablist" aria-label="페르소나별 랜딩 페이지">${tabs}</div>
        <div class="landing-editor__workspace">
          <aside class="landing-panel landing-panel--library">
            <div class="landing-panel__title"><strong>Components</strong><span>${state.landing.component_library.length}</span></div>
            <div class="landing-library">${libraryMarkup()}</div>
          </aside>
          <main class="landing-canvas-wrap">
            <div class="landing-canvas" data-landing-canvas>
              ${components}
            </div>
          </main>
          <aside class="landing-panel landing-panel--inspector">${inspectorMarkup()}</aside>
        </div>
      </section>`;
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

  function mount(root) {
    root.querySelectorAll("[data-component-frame]").forEach((frame) => {
      frame.addEventListener("load", () => {
        frame.style.height = `${Math.max(240, frame.contentDocument?.documentElement.scrollHeight || 0)}px`;
      });
    });
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
      state.activePersonaIndex = 0;
      state.history = [];
      state.future = [];
      state.copyPrompt = "";
      state.copyCandidates = [];
      persistDraft();
    } catch (error) {
      state.error = error.message;
    } finally {
      state.loading = false;
      requestRender();
    }
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type === "landing-frame-height") {
      const frame = document.querySelector(`[data-component-frame="${CSS.escape(event.data.instanceId)}"]`);
      if (frame) frame.style.height = `${Math.max(240, Number(event.data.height) || 0)}px`;
    }
    if (event.data?.type === "landing-editable-select") {
      state.selectedInstanceId = event.data.instanceId;
      state.selectedEditable = event.data;
      state.copyPrompt = "";
      state.copyCandidates = [];
      state.candidateError = "";
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
  });

  function replaceCopyAt(source, typeIndex, value) {
    const pattern = /(<([a-z][\w:-]*)\b(?=[^>]*\bdata-editable\s*=\s*['"]copy['"])[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi;
    let index = 0;
    let replaced = false;
    const escapedValue = escapeHTML(value);
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
  });

  function addTemplateAt(templateId, index) {
    const template = state.landing?.component_library.find((item) => item.template_id === templateId);
    const components = activePage()?.components;
    if (!template || !components) return;
    commitMutation(() => {
      components.splice(index, 0, {
        instance_id: crypto.randomUUID(),
        template_id: template.template_id,
        name: template.name,
        category: template.category,
        html: template.html,
        hidden: false,
      });
    });
  }

  document.addEventListener("dragstart", (event) => {
    const handle = event.target.closest('[data-component-action="drag"]');
    const template = event.target.closest("[data-add-template]");
    if (handle) {
      state.draggedInstanceId = handle.closest("[data-landing-component]")?.dataset.landingComponent || "";
      state.draggedTemplateId = "";
      event.dataTransfer?.setData("text/plain", state.draggedInstanceId);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    }
    if (template) {
      state.draggedTemplateId = template.dataset.addTemplate;
      state.draggedInstanceId = "";
      event.dataTransfer?.setData("text/plain", state.draggedTemplateId);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
    }
  });

  document.addEventListener("dragover", (event) => {
    const zone = event.target.closest("[data-drop-index]");
    if (!zone || (!state.draggedInstanceId && !state.draggedTemplateId)) return;
    event.preventDefault();
    document.querySelectorAll(".landing-drop-zone--active").forEach((item) => {
      item.classList.remove("landing-drop-zone--active");
    });
    zone.classList.add("landing-drop-zone--active");
    if (event.dataTransfer) event.dataTransfer.dropEffect = state.draggedTemplateId ? "copy" : "move";
  });

  document.addEventListener("drop", (event) => {
    const zone = event.target.closest("[data-drop-index]");
    if (!zone) return;
    event.preventDefault();
    const destination = Number(zone.dataset.dropIndex);
    if (state.draggedTemplateId) {
      addTemplateAt(state.draggedTemplateId, destination);
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
    document.querySelectorAll(".landing-drop-zone--active").forEach((item) => {
      item.classList.remove("landing-drop-zone--active");
    });
  });

  document.addEventListener("dragend", () => {
    state.draggedInstanceId = "";
    state.draggedTemplateId = "";
    document.querySelectorAll(".landing-drop-zone--active").forEach((item) => {
      item.classList.remove("landing-drop-zone--active");
    });
  });

  window.LandingEditor = { create, markup, mount, state };
}());
