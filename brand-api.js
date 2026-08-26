(function initializeBrandApi() {
  const metaBaseUrl = document
    .querySelector('meta[name="api-base-url"]')
    ?.getAttribute("content");

  const configuredBaseUrl = window.BRAND_API_BASE_URL || metaBaseUrl;
  const baseUrl = configuredBaseUrl?.replace(/\/$/, "");

  async function request(path, options = {}) {
    if (!baseUrl) {
      throw new Error(
        "BRAND_API_BASE_URL 환경변수가 설정되지 않았습니다.",
      );
    }

    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, options);
    } catch (error) {
      throw new Error(
        "백엔드 서버에 연결할 수 없습니다. FastAPI 서버가 실행 중인지 확인해 주세요.",
        { cause: error },
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const detail = body?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg).join(" / ")
        : detail || body || `요청에 실패했습니다. (${response.status})`;
      throw new Error(message);
    }

    return body;
  }

  window.BrandAPI = {
    async analyze({ documents, logos, icons, fonts, colors }) {
      const formData = new FormData();
      documents.forEach((file) => formData.append("files", file, file.name));
      logos.forEach((file) => formData.append("logo_files", file, file.name));
      icons.forEach((file) => formData.append("icon_files", file, file.name));
      fonts.forEach((file) => formData.append("font_files", file, file.name));
      colors.forEach((color) => formData.append("colors", color));
      return request("/brands/analyze", {
        method: "POST",
        body: formData,
      });
    },

    async review(brandId, data) {
      return request(`/brands/${brandId}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
    },

    async finalize(brandId) {
      return request(`/brands/${brandId}/finalize`, { method: "POST" });
    },
  };
}());
