const axios = require("axios");

const DEFAULT_TIMEOUT = 30000; // 30 seconds

class ReinvyClient {
  /**
   * @param {{ baseUrl: string, serviceKey: string, timeout?: number }} options
   */
  constructor({ baseUrl, serviceKey, timeout = DEFAULT_TIMEOUT }) {
    if (!baseUrl) throw new Error("ReinvyClient: baseUrl is required");
    if (!serviceKey) throw new Error("ReinvyClient: serviceKey is required");

    this._http = axios.create({
      baseURL: baseUrl.replace(/\/$/, ""),
      timeout,
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": serviceKey,
      },
    });

    // Response interceptor for consistent error shapes
    this._http.interceptors.response.use(
      (res) => res,
      (err) => {
        const status = err.response?.status || 0;
        const code = err.response?.data?.error?.code || "NETWORK_ERROR";
        const message = err.response?.data?.error?.message || err.message;
        const error = new Error(message);
        error.code = code;
        error.status = status;
        return Promise.reject(error);
      },
    );
  }

  /**
   * Send a chat message to reinvy-core.
   * @param {{ user_id: string, source: string, message: string, model?: string, personality?: string, language?: string }} params
   * @returns {Promise<{ reply: string, model_used: string, tokens: object, session_id: string }>}
   */
  async chat({ user_id, source, message, model, personality, language }) {
    const res = await this._http.post("/api/v1/chat", {
      user_id,
      source,
      message,
      model,
      personality,
      language,
    });
    return res.data.data;
  }

  /**
   * Get conversation history for a user.
   * @param {{ user_id: string, source?: string, limit?: number }} params
   * @returns {Promise<{ messages: Array, summary: string|null, total_messages: number }>}
   */
  async getMemory({ user_id, source, limit = 20 }) {
    const params = { limit };
    if (source) params.source = source;
    const res = await this._http.get(
      `/api/v1/memory/${encodeURIComponent(user_id)}`,
      { params },
    );
    return res.data.data;
  }

  /**
   * Clear conversation history for a user.
   * @param {{ user_id: string, source?: string }} params
   */
  async clearMemory({ user_id, source }) {
    const params = source ? { source } : {};
    const res = await this._http.delete(
      `/api/v1/memory/${encodeURIComponent(user_id)}`,
      { params },
    );
    return res.data;
  }

  /**
   * Get user config.
   * @param {{ user_id: string, source?: string }} params
   */
  async getConfig({ user_id, source = "default" }) {
    const res = await this._http.get(
      `/api/v1/config/${encodeURIComponent(user_id)}`,
      { params: { source } },
    );
    return res.data.data;
  }

  /**
   * Update user config.
   * @param {{ user_id: string, source?: string, model?: string, personality?: string, max_context?: number, language?: string }} params
   */
  async setConfig({ user_id, source = "default", ...configFields }) {
    const res = await this._http.put(
      `/api/v1/config/${encodeURIComponent(user_id)}`,
      configFields,
      { params: { source } },
    );
    return res.data.data;
  }

  /**
   * Get token usage stats for a user (current month).
   * @param {{ user_id: string }} params
   */
  async getUsage({ user_id }) {
    const res = await this._http.get(
      `/api/v1/usage/${encodeURIComponent(user_id)}`,
    );
    return res.data.data;
  }

  /**
   * Check reinvy-core health.
   * @returns {Promise<{ status: string, redis: string, database: string, latency_ms: number }>}
   */
  async health() {
    const res = await this._http.get("/api/v1/health");
    return res.data;
  }
}

module.exports = { ReinvyClient };
