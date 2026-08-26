(function initializeBrandApi() {
  const metaBaseUrl = document
    .querySelector('meta[name="api-base-url"]')
    ?.getAttribute("content");
  const baseUrl = (
    window.BRAND_API_BASE_URL
    || metaBaseUrl
    || "http://127.0.0.1:8000/api"
  ).replace(/\/$/, "");

  async function request(path, options = {}) {
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
    async analyze(files) {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file, file.name));
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
