const screens = [
  "brand-input",
  "brand-uploaded",
  "brand-loading",
  "brand-check",
  "campaign-input",
  "campaign-uploaded",
  "campaign-loading",
  "campaign-check",
];

const brandUploadFields = [
  {
    key: "brand_identity",
    title: "Brand Identity",
    accept: "application/pdf,.pdf",
    extensions: [".pdf"],
    placeholder: "PDF 파일을 첨부하세요.",
    caption: "브랜드 정체성과 철학을 확인할 수 있는 PDF를 첨부해 주세요.",
    formatLabel: "PDF",
  },
  {
    key: "verbal_guideline",
    title: "Verbal Guideline",
    accept: "application/pdf,.pdf",
    extensions: [".pdf"],
    placeholder: "PDF 파일을 첨부하세요.",
    caption: "브랜드 보이스와 문체를 확인할 수 있는 PDF를 첨부해 주세요.",
    formatLabel: "PDF",
  },
  {
    key: "logo",
    title: "Logo",
    accept: "image/svg+xml,image/png,image/jpeg,.svg,.png,.jpg,.jpeg",
    extensions: [".svg", ".png", ".jpg", ".jpeg"],
    placeholder: "SVG, PNG, JPG 또는 JPEG 파일을 첨부하세요.",
    caption: "로고 원본 또는 미리보기 이미지를 첨부해 주세요.",
    formatLabel: "SVG, PNG, JPG, JPEG",
  },
  {
    key: "icon",
    title: "Icon",
    accept: "image/svg+xml,image/png,image/jpeg,.svg,.png,.jpg,.jpeg",
    extensions: [".svg", ".png", ".jpg", ".jpeg"],
    placeholder: "SVG, PNG, JPG 또는 JPEG 파일을 첨부하세요.",
    caption: "아이콘 원본 또는 미리보기 이미지를 첨부해 주세요.",
    formatLabel: "SVG, PNG, JPG, JPEG",
  },
  {
    key: "fonts",
    title: "Typography",
    accept: "font/ttf,.ttf",
    extensions: [".ttf"],
    placeholder: "TTF 폰트 파일을 첨부하세요.",
    caption: "브랜드에서 사용하는 TTF 폰트 파일을 첨부해 주세요.",
    formatLabel: "TTF",
  },
];

const brandReviewFields = {
  brand_identity: {
    title: "Brand Identity",
    fields: [
      ["brand_overview", "Brand Overview"],
      ["brand_philosophy", "Brand Philosophy"],
      ["brand_positioning", "Brand Positioning"],
      ["brand_target", "Brand Target"],
      ["brand_personality", "Brand Personality"],
    ],
  },
  verbal_guideline: {
    title: "Verbal Guideline",
    fields: [
      ["brand_voice", "Brand Voice"],
      ["tone_of_voice", "Tone of Voice"],
      ["writing_style", "Writing Style"],
      ["messaging_principles", "Messaging Principles"],
      ["vocabulary_and_expressions", "Vocabulary & Expressions"],
      ["copy_rules", "Copy Rules"],
    ],
  },
  visual_guideline: {
    title: "Visual Guideline",
    fields: [
      ["logo", "Logo"],
      ["icon", "Icon"],
      ["color", "Color"],
      ["fonts", "Fonts"],
    ],
  },
};

const campaignUploadFields = [
  {
    key: "strategy",
    title: "Campaign Strategy",
    accept: "application/pdf,.pdf",
    extensions: [".pdf"],
    placeholder: "캠페인 전략 PDF 1개를 첨부하세요.",
    caption: "캠페인 배경, 목표, 아이디어와 CTA가 포함된 PDF를 첨부해 주세요.",
    formatLabel: "PDF",
    multiple: false,
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  },
  {
    key: "components",
    title: "Web Components",
    accept: "text/html,.html,.htm",
    extensions: [".html", ".htm"],
    placeholder: "HTML 웹 컴포넌트를 첨부하세요.",
    caption: "저장할 HTML 웹 컴포넌트를 여러 개 첨부할 수 있습니다.",
    formatLabel: "HTML",
    multiple: true,
    maxFiles: 20,
    maxSize: 5 * 1024 * 1024,
  },
  {
    key: "assets",
    title: "Image Assets",
    accept: "image/png,image/jpeg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp",
    extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    placeholder: "이미지 파일을 첨부하세요.",
    caption: "PNG, JPG, JPEG, GIF 또는 WEBP 이미지를 여러 개 첨부할 수 있습니다.",
    formatLabel: "PNG, JPG, JPEG, GIF, WEBP",
    multiple: true,
    maxFiles: 50,
    maxSize: 20 * 1024 * 1024,
  },
];

const campaignReviewFields = [
  ["campaign_overview", "Campaign Overview"],
  ["objective", "Objective"],
  ["campaign_opportunity", "Campaign Opportunity"],
  ["audience_insight", "Audience Insight"],
  ["campaign_idea", "Campaign Idea"],
  ["offering", "Offering"],
  ["communication_strategy", "Communication Strategy"],
  ["cta_map", "CTA Map"],
];

const brandState = {
  files: Object.fromEntries(brandUploadFields.map(({ key }) => [key, []])),
  colors: [],
  colorDraft: "",
  analysis: null,
  markdown: "",
  error: "",
  notice: "",
};
const campaignState = {
  files: Object.fromEntries(campaignUploadFields.map(({ key }) => [key, []])),
  analysis: null,
  markdown: "",
  error: "",
  notice: "",
};
const flowState = {
  projectId: sessionStorage.getItem("projectId") || "",
};
const assetPreviewUrls = new WeakMap();

const app = document.querySelector("#app");
const navigation = document.querySelector("#pageNavigation");
const previousButton = document.querySelector("#previousButton");
const nextButton = document.querySelector("#nextButton");

let currentIndex = getIndexFromHash();
let loadingTimer;

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getIndexFromHash() {
  const slug = window.location.hash.replace(/^#\/?/, "");
  const index = screens.indexOf(slug);
  return index < 0 ? 0 : index;
}

function routeTo(index) {
  const safeIndex = Math.max(0, Math.min(screens.length - 1, index));
  const nextHash = `#${screens[safeIndex]}`;
  if (window.location.hash === nextHash) {
    currentIndex = safeIndex;
    render();
    return;
  }
  window.location.hash = nextHash;
}

function progressMarkup(progress) {
  return `
    <div class="progress" aria-label="5단계 중 진행 상태">
      <span class="progress__label">Step 1/5</span>
      <div class="progress__track" aria-hidden="true">
        ${progress.map((value) => `
          <span class="progress__segment">
            <span class="progress__value" style="width:${value * 100}%"></span>
          </span>`).join("")}
      </div>
    </div>`;
}

function brandWorkspaceLabel() {
  const sourceName = brandState.analysis?.source_files?.[0]
    || allBrandFiles()[0]?.name;
  return sourceName
    ? sourceName.replace(/\.(pdf|svg|png|jpe?g|ttf)$/i, "")
    : "New Brand";
}

function workspaceLabel() {
  if (currentIndex >= screens.indexOf("campaign-input")) {
    const sourceName = campaignState.analysis?.source_file
      || campaignState.files.strategy[0]?.name;
    return sourceName ? sourceName.replace(/\.pdf$/i, "") : "New Campaign";
  }
  return brandWorkspaceLabel();
}

function headerMarkup(title, description, progress) {
  return `
    <header class="page-header">
      ${progressMarkup(progress)}
      <div class="heading-block">
        <div class="heading-block__titles">
          <p class="brand-name">${escapeHTML(workspaceLabel())}</p>
          <h1>${title}</h1>
        </div>
        <p class="heading-block__description">${description}</p>
      </div>
    </header>`;
}

function feedbackMarkup() {
  const state = currentIndex >= screens.indexOf("campaign-input")
    ? campaignState
    : brandState;
  if (state.error) {
    return `<div class="api-feedback api-feedback--error" role="alert">${escapeHTML(state.error)}</div>`;
  }
  if (state.notice) {
    return `<div class="api-feedback api-feedback--success" role="status">${escapeHTML(state.notice)}</div>`;
  }
  return "";
}

function emptyFileInput(
  caption = "브랜드 정보를 확인할 수 있는 PDF 파일을 첨부해 주세요.",
  group = "",
) {
  const config = brandUploadFields.find((field) => field.key === group);
  const groupAttribute = group ? `data-brand-group="${group}"` : "";
  const accept = config?.accept || "application/pdf,.pdf";
  const placeholder = config?.placeholder || "PDF 파일을 첨부하세요.";
  const resolvedCaption = config?.caption || caption;
  return `
    <label class="file-input">
      <span class="file-input__control">
        <img src="assets/file.svg" alt="" />
        <span class="file-input__placeholder">${placeholder}</span>
      </span>
      <span class="field-caption">${resolvedCaption}</span>
      <input type="file" accept="${accept}" multiple data-file-input ${groupAttribute} />
    </label>`;
}

function formatFileSize(size) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

function fileRow(name, options = {}) {
  const {
    state = "completed",
    validation = "",
    size = "",
    group = "",
    index = -1,
  } = options;
  const stateIcon = state === "uploading"
    ? '<img class="file-row__action file-row__spinner" src="assets/spinner.svg" alt="업로드 중" />'
    : `<button class="icon-button" type="button" data-remove-file data-brand-group="${group}" data-file-index="${index}" aria-label="파일 삭제"><img src="assets/cancel.svg" alt="" /></button>`;
  const validationMarkup = validation
    ? `<span class="validation validation--${validation}"><img src="assets/validation-${validation}.svg" alt="" />업로드 준비 완료</span>`
    : "";

  return `
    <div class="completed-file-wrap">
      <div class="file-row ${state === "error" ? "file-row--error" : ""}">
        <img class="file-row__icon" src="assets/file-bold.svg" alt="" />
        <span class="file-row__body">
          <strong>${escapeHTML(name)}</strong>
          ${size ? `<small>${escapeHTML(size)}</small>` : ""}
        </span>
        ${stateIcon}
      </div>
      ${state === "error" ? '<span class="validation validation--red"><img src="assets/validation-red.svg" alt="" />PDF 파일만 업로드할 수 있습니다.</span>' : validationMarkup}
    </div>`;
}

function addFileButton(group = "") {
  return `
    <button class="add-file-button" type="button" data-add-file data-brand-group="${group}">
      <img src="assets/add-file.svg" alt="" />
      <span>파일 추가</span>
    </button>`;
}

function hiddenFileInput(group) {
  const config = brandUploadFields.find((field) => field.key === group);
  return `<input class="visually-hidden" type="file" accept="${config.accept}" multiple data-file-input data-brand-group="${group}" />`;
}

function colorInput() {
  const palette = brandState.colors.length
    ? `<div class="brand-color-palette" aria-label="선택한 브랜드 색상">
        ${brandState.colors.map((color, index) => `
          <div class="brand-color-chip">
            <span class="brand-color-chip__swatch" style="background:${color}" aria-hidden="true"></span>
            <span class="brand-color-chip__value">${color}</span>
            <button type="button" data-remove-color data-color-index="${index}" aria-label="${color} 색상 삭제">×</button>
          </div>`).join("")}
      </div>`
    : '<p class="color-empty">아직 추가한 색상이 없습니다.</p>';
  return `
    <div class="brand-color-input" aria-label="브랜드 색상">
      <div class="brand-color-input__controls">
        <input
          class="brand-color-input__hex"
          type="text"
          value="${escapeHTML(brandState.colorDraft)}"
          placeholder="#1F4D3A"
          maxlength="7"
          autocomplete="off"
          spellcheck="false"
          data-color-hex
          aria-label="HEX 색상값"
        />
        <button class="brand-color-input__add" type="button" data-add-color>색상 추가</button>
        <label class="brand-color-input__picker" title="색상 선택기 열기">
          <span aria-hidden="true"></span>
          <input type="color" value="#1F4D3A" data-native-color aria-label="색상 선택기" />
        </label>
        <button class="brand-color-input__eyedropper" type="button" data-eyedropper>스포이트</button>
      </div>
      ${palette}
    </div>`;
}

function brandFilesMarkup(group) {
  const files = brandState.files[group];
  if (!files.length) return emptyFileInput(undefined, group);
  return `
    ${files.map((file, index) => fileRow(file.name, {
      validation: "blue",
      size: formatFileSize(file.size),
      group,
      index,
    })).join("")}
    ${addFileButton(group)}
    ${hiddenFileInput(group)}`;
}

function brandInputMarkup(isUploaded) {
  const visual = [
    ["Logo", "logo"],
    ["Icon", "icon"],
    ["Typography", "fonts"],
  ].map(([label, key]) => `
      <li class="visual-field">
        <span class="visual-field__name">${label}</span>
        ${brandFilesMarkup(key)}
      </li>`).join("");

  return `
    <div class="screen-content">
      ${headerMarkup("Brand Knowledge Input", "브랜드 가이드 PDF를 업로드하면 AI가 검토 가능한 항목으로 정리합니다.", [0.5, 0, 0, 0, 0])}
      ${feedbackMarkup()}
      <form class="input-form ${isUploaded ? "input-form--uploaded" : ""}" onsubmit="return false">
        <section class="file-section"><h2>Brand Identity</h2><div class="file-section__body">${brandFilesMarkup("brand_identity")}</div></section>
        <section class="file-section"><h2>Verbal Guideline</h2><div class="file-section__body">${brandFilesMarkup("verbal_guideline")}</div></section>
        <section class="file-section file-section--visual">
          <h2>Visual Identity</h2>
          <ol class="visual-fields">
            ${visual}
            <li class="visual-field">
              <span class="visual-field__name">Color</span>
              ${colorInput()}
              <span class="field-caption">HEX 값을 입력하거나 색상 선택기·스포이트로 브랜드 색상을 추가해 주세요.</span>
            </li>
          </ol>
        </section>
      </form>
    </div>`;
}

function allBrandFiles() {
  return Object.values(brandState.files).flat();
}

function brandDocumentFiles() {
  return [
    ...brandState.files.brand_identity,
    ...brandState.files.verbal_guideline,
  ];
}

function brandVisualFiles() {
  return [
    ...brandState.files.logo,
    ...brandState.files.icon,
    ...brandState.files.fonts,
  ];
}

function loadingMarkup(type) {
  const brandRows = allBrandFiles().map((file, index) => [
    index === 0 ? "loading" : "waiting",
    `${index === 0 ? "문서 읽는 중" : "대기 중"} · ${file.name}`,
  ]);
  if (type === "brand" && brandState.colors.length) {
    brandRows.push(["waiting", `색상 정리 중 · ${brandState.colors.join(", ")}`]);
  }
  const campaignRows = Object.values(campaignState.files).flat().map((file, index) => [
    index === 0 ? "loading" : "waiting",
    `${index === 0 ? "PDF 분석 중" : "저장 대기 중"} · ${file.name}`,
  ]);
  const rows = type === "brand" ? brandRows : campaignRows;
  const rowMarkup = rows.map(([state, text]) => {
    const icon = state === "done" ? "status-check.svg" : state === "loading" ? "spinner.svg" : "status-dot.svg";
    return `<li class="loading-row loading-row--${state}"><img src="assets/${icon}" alt="" /><span>${escapeHTML(text)}</span></li>`;
  }).join("");

  return `
    <section class="loading-screen" aria-live="polite">
      <div class="loading-card">
        <div class="loading-card__header"><h1>AI가 문서를 읽고 있어요</h1><p>PDF 분량에 따라 시간이 걸릴 수 있어요.</p></div>
        <div class="loading-card__body"><ul class="loading-list">${rowMarkup}</ul><div class="loading-progress"><span></span></div></div>
      </div>
    </section>`;
}

function chipMarkup(name = "Brand Identity_IKEA.pdf", removable = false) {
  return `
    <span class="file-chip">
      <span><img src="assets/chip-file.svg" alt="" />${escapeHTML(name)}</span>
      ${removable ? '<button type="button" data-remove-chip aria-label="첨부 파일 삭제"><img src="assets/chip-cancel.svg" alt="" /></button>' : ""}
    </span>`;
}

function extractHexColors(content) {
  return [...new Set(content.match(/#[0-9A-Fa-f]{6}\b/g) || [])]
    .map((color) => color.toUpperCase());
}

function reviewColorPalette(content) {
  const colors = extractHexColors(content);
  if (!colors.length) return "";
  return `
    <div class="review-color-palette" aria-label="분석된 브랜드 색상">
      ${colors.map((color) => `
        <div class="review-color-swatch">
          <span style="background:${color}" aria-hidden="true"></span>
          <small>${color}</small>
        </div>`).join("")}
    </div>`;
}

function previewUrlFor(file) {
  if (!assetPreviewUrls.has(file)) {
    assetPreviewUrls.set(file, URL.createObjectURL(file));
  }
  return assetPreviewUrls.get(file);
}

function visualAssetPreview(group) {
  const files = brandState.files[group] || [];
  if (!files.length) return "";
  const label = group === "logo" ? "로고" : "아이콘";
  return `
    <div class="visual-asset-preview" aria-label="업로드한 ${label} 미리보기">
      ${files.map((file) => `
        <figure class="visual-asset-preview__card">
          <div class="visual-asset-preview__canvas">
            <img src="${previewUrlFor(file)}" alt="${escapeHTML(file.name)} 미리보기" />
          </div>
          <figcaption>${escapeHTML(file.name)}</figcaption>
        </figure>`).join("")}
    </div>`;
}

function reviewItem(index, options = {}) {
  const {
    title = "소제목",
    content = "정리된 내용",
    references = [],
    path = "",
    assetGroup = "",
    pathAttribute = "data-brand-path",
  } = options;
  const directAssets = assetGroup ? brandState.files[assetGroup] : [];
  const chips = references.length
    ? `<div class="inline-chips">${references.map((reference) => chipMarkup(`${reference.filename} · p.${reference.page}`)).join("")}</div>`
    : `<span class="field-caption">${directAssets.length ? "직접 업로드한 원본 파일입니다." : "PDF에서 확인된 출처가 없습니다."}</span>`;
  const assetPreview = assetGroup ? visualAssetPreview(assetGroup) : "";
  const colorPalette = path === "visual_guideline.color"
    ? reviewColorPalette(content)
    : "";
  return `
    <div class="review-item">
      <div class="review-item__header">
        <span>${index}. ${escapeHTML(title)}</span>
        <span class="review-item__actions">
          <button class="refresh-button" type="button" data-refresh><img src="assets/refresh.svg" alt="" /><span>원문 복원</span></button>
        </span>
      </div>
      ${chips}
      ${assetPreview}
      ${colorPalette}
      <div class="textarea-wrap">
        <textarea class="review-textarea" ${pathAttribute}="${path}" data-original-value="${escapeHTML(content)}">${escapeHTML(content)}</textarea>
        <img class="textarea-grip" src="assets/grip.svg" alt="" />
      </div>
    </div>`;
}

function actualBrandReviewMarkup() {
  if (!brandState.analysis?.data) {
    return '<div class="api-feedback api-feedback--error" role="alert">분석 결과를 찾을 수 없습니다. PDF를 다시 업로드해 주세요.</div>';
  }
  return Object.entries(brandReviewFields).map(([groupKey, group]) => {
    const items = group.fields.map(([fieldKey, label], index) => {
      const section = brandState.analysis.data[groupKey][fieldKey];
      return reviewItem(index + 1, {
        title: label,
        content: section.content,
        references: section.source_references,
        path: `${groupKey}.${fieldKey}`,
        assetGroup: groupKey === "visual_guideline" && ["logo", "icon"].includes(fieldKey)
          ? fieldKey
          : "",
      });
    }).join("");
    return `
      <section class="review-section">
        <div class="review-section__title"><h2>${group.title}</h2></div>
        <div class="review-section__items">${items}</div>
      </section>`;
  }).join("");
}

function sampleReviewSection(title, count) {
  const items = Array.from({ length: count }, (_, index) => reviewItem(index + 1)).join("");
  return `<section class="review-section"><div class="review-section__title"><h2>${title}</h2></div><div class="review-section__items">${items}</div></section>`;
}

function actualCampaignReviewMarkup() {
  if (!campaignState.analysis?.data) {
    return '<div class="api-feedback api-feedback--error" role="alert">분석 결과를 찾을 수 없습니다. PDF를 다시 업로드해 주세요.</div>';
  }
  const items = campaignReviewFields.map(([fieldKey, label], index) => {
    const section = campaignState.analysis.data[fieldKey];
    return reviewItem(index + 1, {
      title: label,
      content: section.content,
      references: section.source_references,
      path: fieldKey,
      pathAttribute: "data-campaign-path",
    });
  }).join("");
  return `
    <section class="review-section">
      <div class="review-section__title"><h2>Campaign Knowledge</h2></div>
      <div class="review-section__items">${items}</div>
    </section>`;
}

function checkMarkup(type) {
  const isBrand = type === "brand";
  const title = isBrand ? "Brand Knowledge Check" : "Campaign Knowledge Check";
  const progress = isBrand ? [1, 0, 0, 0, 0] : [1, 1, 0, 0, 0];
  const sections = isBrand
    ? actualBrandReviewMarkup()
    : actualCampaignReviewMarkup();
  return `
    <div class="screen-content screen-content--review">
      ${headerMarkup(title, "AI가 분석한 정보를 확인하고 필요한 내용을 수정해 주세요.", progress)}
      ${feedbackMarkup()}
      <div class="review-area">${sections}</div>
    </div>`;
}

function campaignInputMarkup(isUploaded) {
  const sectionMarkup = campaignUploadFields.map((field) => `
    <section class="file-section">
      <div class="file-section__heading"><h2>${field.title}</h2></div>
      <div class="file-section__body">${campaignFilesMarkup(field, isUploaded)}</div>
    </section>`).join("");
  return `
    <div class="screen-content">
      ${headerMarkup("Campaign Knowledge Input", "캠페인 정보를 입력해 주세요.", [1, 0.5, 0, 0, 0])}
      ${feedbackMarkup()}
      <form class="input-form campaign-form ${isUploaded ? "input-form--uploaded" : ""}">${sectionMarkup}</form>
    </div>`;
}

function campaignFilesMarkup(field, isUploaded) {
  const files = campaignState.files[field.key];
  const rows = files.map((file, index) => `
    <div class="completed-file-wrap">
      <div class="file-row">
        <img class="file-row__icon" src="assets/file-bold.svg" alt="" />
        <span class="file-row__body"><strong>${escapeHTML(file.name)}</strong><small>${formatFileSize(file.size)}</small></span>
        <button class="icon-button" type="button" data-remove-campaign-file data-campaign-group="${field.key}" data-file-index="${index}" aria-label="파일 삭제"><img src="assets/cancel.svg" alt="" /></button>
      </div>
      <span class="validation validation--blue"><img src="assets/validation-blue.svg" alt="" />업로드 준비 완료</span>
    </div>`).join("");
  const input = `
    <label class="file-input ${files.length ? "visually-hidden" : ""}">
      <span class="file-input__control"><img src="assets/file.svg" alt="" /><span class="file-input__placeholder">${field.placeholder}</span></span>
      <span class="field-caption">${field.caption}</span>
      <input type="file" accept="${field.accept}" ${field.multiple ? "multiple" : ""} data-campaign-file-input data-campaign-group="${field.key}" />
    </label>`;
  const addButton = files.length && (field.multiple || !files.length)
    ? `<button class="add-file-button" type="button" data-add-campaign-file data-campaign-group="${field.key}"><img src="assets/add-file.svg" alt="" /><span>파일 추가</span></button>`
    : "";
  return `${rows}${input}${isUploaded ? addButton : ""}`;
}

function render() {
  window.clearTimeout(loadingTimer);
  const screen = screens[currentIndex];
  document.body.dataset.screen = screen;
  const renderScreen = {
    "brand-input": () => brandInputMarkup(false),
    "brand-uploaded": () => brandInputMarkup(true),
    "brand-loading": () => loadingMarkup("brand"),
    "brand-check": () => checkMarkup("brand"),
    "campaign-input": () => campaignInputMarkup(false),
    "campaign-uploaded": () => campaignInputMarkup(true),
    "campaign-loading": () => loadingMarkup("campaign"),
    "campaign-check": () => checkMarkup("campaign"),
  }[screen];

  app.innerHTML = renderScreen();
  window.scrollTo(0, 0);
  updateNavigation(screen);
}

function updateNavigation(screen) {
  navigation.hidden = screen.endsWith("-loading");
  previousButton.hidden = currentIndex < 2;
  previousButton.disabled = false;
  nextButton.disabled = false;
  nextButton.querySelector("span").textContent = screen.endsWith("-check") ? "확정" : "Next";
}

async function analyzeBrand() {
  const documents = brandDocumentFiles();
  const visualFiles = brandVisualFiles();
  if (!documents.length) {
    brandState.error = "분석할 PDF 파일을 한 개 이상 첨부해 주세요.";
    routeTo(0);
    return;
  }
  if (documents.length > 10) {
    brandState.error = "PDF 파일은 최대 10개까지 첨부할 수 있습니다.";
    render();
    return;
  }
  if (visualFiles.length > 20) {
    brandState.error = "로고, 아이콘, 폰트 파일은 합쳐서 최대 20개까지 첨부할 수 있습니다.";
    render();
    return;
  }

  brandState.error = "";
  brandState.notice = "";
  routeTo(2);
  try {
    brandState.analysis = await window.BrandAPI.analyze({
      documents,
      logos: brandState.files.logo,
      icons: brandState.files.icon,
      fonts: brandState.files.fonts,
      colors: brandState.colors,
    });
    flowState.projectId = brandState.analysis.project_id;
    sessionStorage.setItem("projectId", flowState.projectId);
    routeTo(3);
  } catch (error) {
    brandState.error = error.message;
    routeTo(1);
  }
}

function collectReviewedBrandData() {
  const data = structuredClone(brandState.analysis.data);
  document.querySelectorAll("[data-brand-path]").forEach((textarea) => {
    const [groupKey, fieldKey] = textarea.dataset.brandPath.split(".");
    data[groupKey][fieldKey].content = textarea.value.trim();
    if (!data[groupKey][fieldKey].content) {
      data[groupKey][fieldKey].source_references = [];
    }
  });
  return data;
}

async function finalizeBrand() {
  if (!brandState.analysis?.brand_id) {
    brandState.error = "분석 결과가 없어 확정할 수 없습니다.";
    render();
    return;
  }
  brandState.error = "";
  navigation.hidden = true;
  try {
    const data = collectReviewedBrandData();
    brandState.analysis = await window.BrandAPI.review(brandState.analysis.brand_id, data);
    const finalized = await window.BrandAPI.finalize(brandState.analysis.brand_id);
    brandState.markdown = finalized.markdown;
    brandState.notice = "Brand Knowledge 검토가 완료되어 brand.md를 생성했습니다.";
    routeTo(4);
  } catch (error) {
    brandState.error = error.message;
    render();
  }
}

async function analyzeCampaign() {
  const strategyFile = campaignState.files.strategy[0];
  const projectId = flowState.projectId || brandState.analysis?.project_id;
  if (!projectId) {
    campaignState.error = "브랜드 분석 후 캠페인 전략을 입력해 주세요.";
    routeTo(4);
    return;
  }
  if (!strategyFile) {
    campaignState.error = "캠페인 전략 PDF 1개를 첨부해 주세요.";
    routeTo(4);
    return;
  }
  campaignState.error = "";
  campaignState.notice = "";
  routeTo(6);
  try {
    campaignState.analysis = await window.CampaignAPI.analyze({
      projectId,
      strategyFile,
      componentFiles: campaignState.files.components,
      assetFiles: campaignState.files.assets,
    });
    routeTo(7);
  } catch (error) {
    campaignState.error = error.message;
    routeTo(5);
  }
}

function collectReviewedCampaignData() {
  const data = structuredClone(campaignState.analysis.data);
  document.querySelectorAll("[data-campaign-path]").forEach((textarea) => {
    const fieldKey = textarea.dataset.campaignPath;
    data[fieldKey].content = textarea.value.trim();
    if (!data[fieldKey].content) data[fieldKey].source_references = [];
  });
  return data;
}

async function finalizeCampaign() {
  if (!campaignState.analysis?.campaign_id) {
    campaignState.error = "분석 결과가 없어 확정할 수 없습니다.";
    render();
    return;
  }
  campaignState.error = "";
  navigation.hidden = true;
  try {
    const data = collectReviewedCampaignData();
    campaignState.analysis = await window.CampaignAPI.review(
      campaignState.analysis.campaign_id,
      data,
    );
    const finalized = await window.CampaignAPI.finalize(
      campaignState.analysis.campaign_id,
    );
    campaignState.markdown = finalized.markdown;
    campaignState.notice = "Campaign Knowledge 검토가 완료되어 campaign.md를 생성했습니다.";
    render();
  } catch (error) {
    campaignState.error = error.message;
    render();
  }
}

function normalizeHexColor(value) {
  let hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = [...hex].map((character) => character.repeat(2)).join("");
  }
  return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex.toUpperCase()}` : null;
}

function addBrandColor(value) {
  const color = normalizeHexColor(value);
  if (!color) {
    brandState.error = "색상은 #1F4D3A처럼 3자리 또는 6자리 HEX 값으로 입력해 주세요.";
    render();
    return;
  }
  if (!brandState.colors.includes(color)) brandState.colors.push(color);
  brandState.colorDraft = "";
  brandState.error = "";
  brandState.notice = "";
  routeTo(1);
}

async function pickColorFromScreen() {
  if (!("EyeDropper" in window)) {
    app.querySelector("[data-native-color]")?.click();
    return;
  }
  try {
    const result = await new window.EyeDropper().open();
    addBrandColor(result.sRGBHex);
  } catch (error) {
    if (error.name !== "AbortError") {
      brandState.error = "화면에서 색상을 선택하지 못했습니다. 색상 선택기를 이용해 주세요.";
      render();
    }
  }
}

previousButton.addEventListener("click", () => {
  const previousIndex = screens[currentIndex - 1]?.endsWith("-loading") ? currentIndex - 2 : currentIndex - 1;
  routeTo(previousIndex);
});

nextButton.addEventListener("click", async () => {
  const screen = screens[currentIndex];
  if (screen === "brand-input") {
    if (!brandDocumentFiles().length) {
      brandState.error = "분석할 PDF 파일을 한 개 이상 첨부해 주세요.";
      render();
      return;
    }
    routeTo(1);
    return;
  }
  if (screen === "brand-uploaded") {
    await analyzeBrand();
    return;
  }
  if (screen === "brand-check") {
    await finalizeBrand();
    return;
  }
  if (screen === "campaign-input") {
    if (!campaignState.files.strategy.length) {
      campaignState.error = "캠페인 전략 PDF 1개를 첨부해 주세요.";
      render();
      return;
    }
    routeTo(5);
    return;
  }
  if (screen === "campaign-uploaded") {
    await analyzeCampaign();
    return;
  }
  if (screen === "campaign-check") {
    await finalizeCampaign();
    return;
  }
  if (currentIndex < screens.length - 1) routeTo(currentIndex + 1);
});

app.addEventListener("click", async (event) => {
  const removeFile = event.target.closest("[data-remove-file]");
  const removeChip = event.target.closest("[data-remove-chip]");
  const removeItem = event.target.closest("[data-remove-item]");
  const removeColor = event.target.closest("[data-remove-color]");
  const refresh = event.target.closest("[data-refresh]");
  const addFile = event.target.closest("[data-add-file]");
  const addColor = event.target.closest("[data-add-color]");
  const eyedropper = event.target.closest("[data-eyedropper]");
  const removeCampaignFile = event.target.closest("[data-remove-campaign-file]");
  const addCampaignFile = event.target.closest("[data-add-campaign-file]");

  if (removeCampaignFile) {
    const group = removeCampaignFile.dataset.campaignGroup;
    campaignState.files[group].splice(Number(removeCampaignFile.dataset.fileIndex), 1);
    campaignState.error = "";
    render();
  }
  if (addCampaignFile) {
    const group = addCampaignFile.dataset.campaignGroup;
    app.querySelector(`[data-campaign-file-input][data-campaign-group="${group}"]`)?.click();
  }

  if (removeFile) {
    const group = removeFile.dataset.brandGroup;
    const index = Number(removeFile.dataset.fileIndex);
    if (group && Number.isInteger(index) && index >= 0) {
      const [removedFile] = brandState.files[group].splice(index, 1);
      const previewUrl = assetPreviewUrls.get(removedFile);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        assetPreviewUrls.delete(removedFile);
      }
      brandState.error = "";
      render();
    } else {
      removeFile.closest(".completed-file-wrap")?.remove();
    }
  }
  if (removeChip) removeChip.closest(".file-chip")?.remove();
  if (removeItem) removeItem.closest(".review-item")?.remove();
  if (removeColor) {
    brandState.colors.splice(Number(removeColor.dataset.colorIndex), 1);
    brandState.error = "";
    render();
  }
  if (refresh) {
    const textarea = refresh.closest(".review-item")?.querySelector("textarea");
    if (textarea) textarea.value = textarea.dataset.originalValue || "";
  }
  if (addFile) {
    const group = addFile.dataset.brandGroup;
    const selector = group
      ? `[data-file-input][data-brand-group="${group}"]`
      : "input[type='file']";
    addFile.closest(".file-section__body")?.querySelector(selector)?.click();
  }
  if (addColor) addBrandColor(brandState.colorDraft);
  if (eyedropper) await pickColorFromScreen();
});

app.addEventListener("change", (event) => {
  const campaignInput = event.target.closest("[data-campaign-file-input]");
  if (campaignInput?.files?.length) {
    const group = campaignInput.dataset.campaignGroup;
    const config = campaignUploadFields.find((field) => field.key === group);
    const selectedFiles = Array.from(campaignInput.files);
    const invalidFile = selectedFiles.find((file) => !config.extensions.some(
      (extension) => file.name.toLowerCase().endsWith(extension),
    ));
    const oversizedFile = selectedFiles.find((file) => file.size > config.maxSize);
    const nextCount = config.multiple
      ? campaignState.files[group].length + selectedFiles.length
      : selectedFiles.length;
    if (invalidFile) {
      campaignState.error = `${invalidFile.name}: ${config.formatLabel} 파일만 첨부할 수 있습니다.`;
      render();
      return;
    }
    if (oversizedFile) {
      campaignState.error = `${oversizedFile.name}: 파일 크기 제한을 초과했습니다.`;
      render();
      return;
    }
    if (nextCount > config.maxFiles) {
      campaignState.error = `${config.title}: 최대 ${config.maxFiles}개까지 첨부할 수 있습니다.`;
      render();
      return;
    }
    campaignState.files[group] = config.multiple
      ? [...campaignState.files[group], ...selectedFiles]
      : selectedFiles.slice(0, 1);
    campaignState.error = "";
    routeTo(5);
    return;
  }

  const input = event.target.closest("[data-file-input]");
  if (!input?.files?.length) return;
  const group = input.dataset.brandGroup;
  if (!group) {
    const placeholder = input.closest(".file-input")?.querySelector(".file-input__placeholder");
    if (placeholder) placeholder.textContent = input.files[0].name;
    return;
  }

  const selectedFiles = Array.from(input.files);
  const config = brandUploadFields.find((field) => field.key === group);
  const invalidFile = selectedFiles.find((file) => {
    const filename = file.name.toLowerCase();
    return !config.extensions.some((extension) => filename.endsWith(extension));
  });
  const oversizedFile = selectedFiles.find((file) => file.size > 20 * 1024 * 1024);
  if (invalidFile) {
    brandState.error = `${invalidFile.name}: ${config.formatLabel} 파일만 첨부할 수 있습니다.`;
    render();
    return;
  }
  if (oversizedFile) {
    brandState.error = `${oversizedFile.name}: 파일 크기는 20MB 이하여야 합니다.`;
    render();
    return;
  }

  brandState.files[group].push(...selectedFiles);
  brandState.error = "";
  routeTo(1);
});

app.addEventListener("input", (event) => {
  if (event.target.matches("[data-brand-path]")) brandState.error = "";
  if (event.target.matches("[data-campaign-path]")) campaignState.error = "";
  if (event.target.matches("[data-color-hex]")) {
    brandState.colorDraft = event.target.value;
    brandState.error = "";
  }
});

app.addEventListener("change", (event) => {
  if (event.target.matches("[data-native-color]")) {
    addBrandColor(event.target.value);
  }
});

app.addEventListener("keydown", (event) => {
  if (event.target.matches("[data-color-hex]") && event.key === "Enter") {
    event.preventDefault();
    addBrandColor(event.target.value);
  }
});

window.addEventListener("hashchange", () => {
  currentIndex = getIndexFromHash();
  render();
});

if (!window.location.hash) window.history.replaceState(null, "", `#${screens[0]}`);
render();
