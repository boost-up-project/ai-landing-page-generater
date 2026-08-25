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

const visualFiles = [
  { label: "Logo", file: "logo_IKEA.pdf" },
  { label: "Icon", file: "icon_IKEA.pdf" },
  { label: "Typography", file: "typography_IKEA.pdf" },
];

const app = document.querySelector("#app");
const navigation = document.querySelector("#pageNavigation");
const previousButton = document.querySelector("#previousButton");
const nextButton = document.querySelector("#nextButton");

let currentIndex = getIndexFromHash();
let loadingTimer;

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
        ${progress
          .map(
            (value) => `
              <span class="progress__segment">
                <span class="progress__value" style="width:${value * 100}%"></span>
              </span>`,
          )
          .join("")}
      </div>
    </div>`;
}

function headerMarkup(title, description, progress) {
  return `
    <header class="page-header">
      ${progressMarkup(progress)}
      <div class="heading-block">
        <div class="heading-block__titles">
          <p class="brand-name">IKEA</p>
          <h1>${title}</h1>
        </div>
        <p class="heading-block__description">${description}</p>
      </div>
    </header>`;
}

function emptyFileInput(caption = "어떤 파일을 넣어야 하는지에 대한 설명 (파일 형식, 파일 관련 도움말)") {
  return `
    <label class="file-input">
      <span class="file-input__control">
        <img src="assets/file.svg" alt="" />
        <span class="file-input__placeholder">파일을 첨부하세요.</span>
      </span>
      <span class="field-caption">${caption}</span>
      <input type="file" data-file-input />
    </label>`;
}

function fileRow(name, state = "completed", validation = "") {
  const stateIcon = state === "uploading"
    ? '<img class="file-row__action file-row__spinner" src="assets/spinner.svg" alt="업로드 중" />'
    : '<button class="icon-button" type="button" data-remove-file aria-label="파일 삭제"><img src="assets/cancel.svg" alt="" /></button>';
  const validationMarkup = validation
    ? `<span class="validation validation--${validation}"><img src="assets/validation-${validation}.svg" alt="" />Validation message</span>`
    : "";

  return `
    <div class="completed-file-wrap">
      <div class="file-row ${state === "error" ? "file-row--error" : ""}">
        <img class="file-row__icon" src="assets/file-bold.svg" alt="" />
        <span class="file-row__body">
          <strong>${name}</strong>
          <small>16MB</small>
        </span>
        ${stateIcon}
      </div>
      ${state === "error" ? '<span class="validation validation--red"><img src="assets/validation-red.svg" alt="" />Validation message</span>' : validationMarkup}
    </div>`;
}

function addFileButton() {
  return `
    <button class="add-file-button" type="button" data-add-file>
      <img src="assets/add-file.svg" alt="" />
      <span>파일 추가</span>
    </button>`;
}

function colorInput() {
  return `
    <div class="color-input" aria-label="브랜드 색상">
      <img class="color-input__swatches" src="assets/color-swatches.svg" alt="" />
      <button class="color-input__add" type="button" aria-label="색상 추가">
        <img src="assets/add-color.svg" alt="" />
      </button>
    </div>`;
}

function brandInputMarkup(isUploaded) {
  const brandIdentity = isUploaded
    ? `${fileRow("Brand Identity_IKEA.pdf", "completed", "blue")}${addFileButton()}`
    : emptyFileInput();
  const verbal = isUploaded
    ? `${fileRow("Verbal Guideline(1)_IKEA.pdf", "uploading")}${fileRow("Verbal Guideline(2)_IKEA.pdf", "error")}${addFileButton()}`
    : emptyFileInput();
  const visual = visualFiles
    .map(
      (item) => `
        <li class="visual-field">
          <span class="visual-field__name">${item.label}</span>
          ${isUploaded ? `${fileRow(item.file, "completed", "blue")}${addFileButton()}` : emptyFileInput()}
        </li>`,
    )
    .join("");

  return `
    <div class="screen-content">
      ${headerMarkup("Brand Knowledge Input", "브랜드 정보를 입력 어쩌구저쩌구 해주세요.", [0.5, 0, 0, 0, 0])}
      <form class="input-form ${isUploaded ? "input-form--uploaded" : ""}">
        <section class="file-section"><h2>Brand Identity</h2><div class="file-section__body">${brandIdentity}</div></section>
        <section class="file-section"><h2>Verbal Guideline</h2><div class="file-section__body">${verbal}</div></section>
        <section class="file-section file-section--visual">
          <h2>Visual Identity</h2>
          <ol class="visual-fields">
            ${visual}
            <li class="visual-field">
              <span class="visual-field__name">Color</span>
              ${colorInput()}
              <span class="field-caption">브랜드명, 브랜드철학, 포지셔닝, 코어벨류 등 자세할 수록 좋아요.</span>
            </li>
          </ol>
        </section>
      </form>
    </div>`;
}

function loadingMarkup(type) {
  const isBrand = type === "brand";
  const rows = isBrand
    ? [
        ["done", "읽기 완료 · Brand Identity_IKEA.pdf"],
        ["done", "읽기 완료 · Brand Identity_IKEA.pdf"],
        ["loading", "문서 읽는 중 · Verbal Guideline(2)_IKEA.pdf"],
        ["waiting", "대기 중 · logo_IKEA.pdf"],
        ["waiting", "대기 중 · logo_IKEA.pdf"],
        ["waiting", "대기 중 · logo_IKEA.pdf"],
        ["waiting", "대기 중 · logo_IKEA.pdf"],
        ["waiting", "대기 중 · logo_IKEA.pdf"],
      ]
    : [
        ["done", "읽기 완료 · Brand Identity_IKEA.pdf"],
        ["done", "읽기 완료 · Brand Identity_IKEA.pdf"],
        ["loading", "문서 읽는 중 · Verbal Guideline(2)_IKEA.pdf"],
      ];
  const rowMarkup = rows
    .map(([state, text]) => {
      const icon = state === "done" ? "status-check.svg" : state === "loading" ? "spinner.svg" : "status-dot.svg";
      return `<li class="loading-row loading-row--${state}"><img src="assets/${icon}" alt="" /><span>${text}</span></li>`;
    })
    .join("");

  return `
    <section class="loading-screen" aria-live="polite">
      <div class="loading-card">
        <div class="loading-card__header"><h1>AI가 문서를 읽고 있어요</h1><p>보통 10초 안에 끝나요</p></div>
        <div class="loading-card__body"><ul class="loading-list">${rowMarkup}</ul><div class="loading-progress"><span></span></div></div>
      </div>
    </section>`;
}

function chipMarkup(name = "Brand Identity_IKEA.pdf") {
  return `
    <span class="file-chip">
      <span><img src="assets/chip-file.svg" alt="" />${name}</span>
      <button type="button" data-remove-chip aria-label="첨부 파일 삭제"><img src="assets/chip-cancel.svg" alt="" /></button>
    </span>`;
}

function reviewItem(index, options = {}) {
  const chips = options.chips ? `<div class="inline-chips">${chipMarkup()}</div>` : "";
  const invalid = options.invalid ? '<span class="validation validation--red"><img src="assets/validation-red.svg" alt="" />Validation message</span>' : "";
  return `
    <div class="review-item">
      <div class="review-item__header">
        <span>${index}. 소제목</span>
        <span class="review-item__actions">
          <button class="refresh-button" type="button" data-refresh><img src="assets/refresh.svg" alt="" /><span>다시정리</span></button>
          <button class="remove-item-button" type="button" data-remove-item aria-label="항목 삭제"><img src="assets/circle-x.svg" alt="" /></button>
        </span>
      </div>
      ${chips}
      <div class="textarea-wrap">
        <textarea class="review-textarea ${options.focused ? "review-textarea--focused" : ""}">정리된 내용</textarea>
        <img class="textarea-grip" src="assets/grip.svg" alt="" />
      </div>
      ${invalid}
    </div>`;
}

function reviewSection(title, count, options = {}) {
  const files = options.files === false ? "" : `<div class="section-files">${Array.from({ length: options.fileCount || 5 }, () => chipMarkup()).join("")}</div>`;
  const items = Array.from({ length: count }, (_, index) => reviewItem(index + 1, {
    focused: options.focused === index,
    invalid: options.invalid === index,
    chips: options.itemChips?.includes(index),
  })).join("");
  return `
    <section class="review-section">
      <div class="review-section__title"><h2>${title}</h2>${files}</div>
      <div class="review-section__items">${items}</div>
    </section>`;
}

function checkMarkup(type) {
  const isBrand = type === "brand";
  const title = isBrand ? "Brand Knowledge Check" : "Campaign Knowledge Check";
  const progress = isBrand ? [1, 0, 0, 0, 0] : [1, 1, 0, 0, 0];
  const sections = isBrand
    ? [
        reviewSection("Brand Identity", 4, { focused: 1, invalid: 3 }),
        reviewSection("Verbal Guideline", 3),
        reviewSection("Visual Identity", 3, { files: false, invalid: 1, itemChips: [0, 1, 2] }),
        `<section class="review-section review-section--color"><div class="numbered-color"><span>4. Color</span>${colorInput()}</div></section>`,
      ]
    : [
        reviewSection("Campaign Knowledge", 4, { focused: 1, invalid: 3 }),
        reviewSection("Component Structure", 1),
        reviewSection("Product Library", 1),
      ];
  return `
    <div class="screen-content screen-content--review">
      ${headerMarkup(title, "AI가 분석 및 정리한 정보를 확인해 주세요.", progress)}
      <div class="review-area">${sections.join("")}</div>
    </div>`;
}

function campaignInputMarkup(isUploaded) {
  const sections = [
    { title: "Campaign Knowledge", question: false, file: "Campaign Knowledge_IKEA.pdf", state: "uploading" },
    { title: "Component Structure", question: true, file: "Component Structure_IKEA.pdf", state: "completed" },
    { title: "Product Library", question: false, file: "Product Library_IKEA.pdf", state: "completed" },
  ];
  const sectionMarkup = sections
    .map((section) => `
      <section class="file-section">
        <div class="file-section__heading"><h2>${section.title}</h2>${section.question ? '<img class="question-icon" src="assets/question.svg" alt="도움말" />' : ""}</div>
        <div class="file-section__body">${isUploaded ? `${fileRow(section.file, section.state, section.state === "completed" ? "blue" : "")}${addFileButton()}` : emptyFileInput()}</div>
      </section>`)
    .join("");
  return `
    <div class="screen-content">
      ${headerMarkup("Campaign Knowledge Input", "캠페인 정보를 입력 어쩌구저쩌구 해주세요.", [1, 0.5, 0, 0, 0])}
      <form class="input-form campaign-form ${isUploaded ? "input-form--uploaded" : ""}">${sectionMarkup}</form>
    </div>`;
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
  if (screen.endsWith("-loading")) loadingTimer = window.setTimeout(() => routeTo(currentIndex + 1), 6000);
}

function updateNavigation(screen) {
  navigation.hidden = screen.endsWith("-loading");
  previousButton.hidden = currentIndex < 2;
  previousButton.disabled = false;
  nextButton.disabled = false;
}

previousButton.addEventListener("click", () => {
  const previousIndex = screens[currentIndex - 1]?.endsWith("-loading") ? currentIndex - 2 : currentIndex - 1;
  routeTo(previousIndex);
});
nextButton.addEventListener("click", () => {
  if (currentIndex < screens.length - 1) routeTo(currentIndex + 1);
});

app.addEventListener("click", (event) => {
  const removeFile = event.target.closest("[data-remove-file]");
  const removeChip = event.target.closest("[data-remove-chip]");
  const removeItem = event.target.closest("[data-remove-item]");
  const refresh = event.target.closest("[data-refresh]");
  const addFile = event.target.closest("[data-add-file]");
  if (removeFile) removeFile.closest(".completed-file-wrap")?.remove();
  if (removeChip) removeChip.closest(".file-chip")?.remove();
  if (removeItem) removeItem.closest(".review-item")?.remove();
  if (refresh) {
    const textarea = refresh.closest(".review-item")?.querySelector("textarea");
    if (textarea) textarea.value = "정리된 내용";
  }
  if (addFile) addFile.closest(".file-section__body")?.querySelector("input[type='file']")?.click();
});

app.addEventListener("change", (event) => {
  const input = event.target.closest("[data-file-input]");
  if (!input?.files?.length) return;
  const placeholder = input.closest(".file-input")?.querySelector(".file-input__placeholder");
  if (placeholder) placeholder.textContent = input.files[0].name;
});

window.addEventListener("hashchange", () => {
  currentIndex = getIndexFromHash();
  render();
});

if (!window.location.hash) window.history.replaceState(null, "", `#${screens[0]}`);
render();
