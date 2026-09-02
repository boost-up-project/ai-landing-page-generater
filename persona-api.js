(function initializePersonaApi() {
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

  window.PersonaAPI = {
    async analyze(projectId, inputs) {
      return request("/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, inputs }),
      });
    },

    async get(personaId) {
      return request(`/personas/${personaId}`);
    },

    async review(personaId, data) {
      return request(`/personas/${personaId}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
    },

    async finalize(personaId) {
      return request(`/personas/${personaId}/finalize`, { method: "POST" });
    },

    async getMarkdown(personaId) {
      return request(`/personas/${personaId}/markdown`);
    },
  };
}());
