(function initializeCampaignApi() {
  const metaBaseUrl = document
    .querySelector('meta[name="api-base-url"]')
    ?.getAttribute("content");
  const configuredBaseUrl = window.BRAND_API_BASE_URL || metaBaseUrl;
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

  window.CampaignAPI = {
    async analyze({ projectId, strategyFile, componentFiles, assetFiles }) {
      const formData = new FormData();
      formData.append("project_id", projectId);
      formData.append("strategy_file", strategyFile, strategyFile.name);
      componentFiles.forEach((file) => {
        formData.append("component_files", file, file.name);
      });
      assetFiles.forEach((file) => {
        formData.append("asset_files", file, file.name);
      });
      return request("/campaigns", { method: "POST", body: formData });
    },

    async get(campaignId) {
      return request(`/campaigns/${campaignId}`);
    },

    async review(campaignId, data) {
      return request(`/campaigns/${campaignId}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
    },

    async finalize(campaignId) {
      return request(`/campaigns/${campaignId}/finalize`, { method: "POST" });
    },

    async getMarkdown(campaignId) {
      return request(`/campaigns/${campaignId}/markdown`);
    },
  };
}());
