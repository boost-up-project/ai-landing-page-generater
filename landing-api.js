(function initializeLandingApi() {
  const metaBaseUrl = document
    .querySelector('meta[name="api-base-url"]')
    ?.getAttribute("content");
  const localBaseUrl = ["127.0.0.1", "localhost"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000/api"
    : "";
  const configuredBaseUrl = window.BRAND_API_BASE_URL || metaBaseUrl || localBaseUrl;
  const baseUrl = configuredBaseUrl?.replace(/\/$/, "");

  async function request(path, options = {}) {
    if (!baseUrl) throw new Error("API 기본 주소가 설정되지 않았습니다.");
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, options);
    } catch (error) {
      throw new Error("백엔드 서버에 연결할 수 없습니다.", { cause: error });
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

  window.LandingAPI = {
    async create(projectId) {
      return request("/landings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
    },

    async get(landingId) {
      return request(`/landings/${landingId}`);
    },

    async save(landingId, pages) {
      return request(`/landings/${landingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages }),
      });
    },

    async copyCandidates(landingId, payload) {
      return request(`/landings/${landingId}/copy-candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },

    async uploadAsset(landingId, file) {
      const formData = new FormData();
      formData.append("file", file, file.name);
      return request(`/landings/${landingId}/assets/upload`, {
        method: "POST",
        body: formData,
      });
    },

    async generateAsset(landingId, payload) {
      return request(`/landings/${landingId}/assets/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },

    assetUrl(landingId, filename) {
      if (!baseUrl) return "";
      return `${baseUrl}/landings/${encodeURIComponent(landingId)}/assets/${encodeURIComponent(filename)}`;
    },
  };
}());
