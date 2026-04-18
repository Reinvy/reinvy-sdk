# 🗺️ reinvy-sdk — Implementation Plan

> **Tipe:** Shared Library — npm Package  
> **Posisi:** Depends on `reinvy-core` API contract. Consumed by semua interface projects.  
> **Referensi:** [Root plan.md](../plan.md) | [PRD](prd.md)

---

## Status Progres

| Fase | Deskripsi       | Status         |
| ---- | --------------- | -------------- |
| 7    | SDK npm Package | ⬜ Not Started |

---

## Prerequisites

- `reinvy-core` sudah selesai Fase 4 (endpoint `/chat` berjalan)
- `reinvy-core` sudah selesai Fase 6 (endpoint `/memory`, `/config`, `/usage` berjalan)

---

## Fase 7 — Build SDK Package

**Test saat selesai:**

```js
// test-sdk.js
const { ReinvyClient } = require("./index");
const client = new ReinvyClient({
  baseUrl: "http://localhost:3000",
  serviceKey: "disc_devkey123",
  source: "discord",
});
const res = await client.chat({ user_id: "test_1", message: "halo!" });
console.log(res.data.reply); // harus print AI reply
```

### Struktur Folder Target

```
reinvy-sdk/
├── src/
│   ├── client.js
│   ├── http.js
│   ├── errors.js
│   └── types/
│       └── index.d.ts
├── index.js
├── package.json
├── .env.example
└── README.md
```

### Checklist

#### Setup Package

- [ ] Hapus express-generator scaffold (bin/, public/, routes/, app.js)
- [ ] Update `package.json`:
  ```json
  {
    "name": "@reinvy/sdk",
    "version": "1.0.0",
    "description": "Official SDK for Reinvy AI Systems",
    "main": "index.js",
    "types": "src/types/index.d.ts",
    "scripts": {
      "test": "jest"
    },
    "dependencies": {
      "axios": "^1.6.0"
    },
    "devDependencies": {
      "jest": "^29.0.0"
    }
  }
  ```

#### `src/errors.js`

- [ ] Implementasi 5 error classes:
  ```js
  class ReinvyError extends Error {
    constructor(message, code, statusCode) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  }
  class ReinvyCoreError extends ReinvyError {} // Error dari Core (4xx/5xx)
  class AuthError extends ReinvyError {} // 401 — service key tidak valid
  class RateLimitError extends ReinvyError {} // 429 — rate limit
  class NetworkError extends ReinvyError {} // Network/timeout error
  class ValidationError extends ReinvyError {} // 400 — input tidak valid
  ```

#### `src/http.js`

- [ ] Axios instance factory dengan:
  ```js
  // createHttpClient({ baseUrl, serviceKey, source })
  // Headers default: X-Service-Key, Content-Type: application/json, X-Source: source
  // Timeout: 30000 ms
  // Interceptors:
  //   Response error → convert ke error class yang sesuai (401→AuthError, 429→RateLimitError, dll)
  //   Request retry: 3x untuk network error / 5xx, exponential backoff (1s, 2s, 4s)
  //   Jangan retry untuk 4xx (client error)
  ```

#### `src/client.js`

- [ ] Class `ReinvyClient`:

  ```js
  class ReinvyClient {
    constructor({ baseUrl, serviceKey, source }) {
      // validasi params, init http client
    }

    // POST /api/v1/chat
    async chat({ user_id, message, personality, model, options }) {}

    // GET /api/v1/memory/:user_id
    async getMemory(user_id, { limit = 20, source } = {}) {}

    // DELETE /api/v1/memory/:user_id
    async deleteMemory(user_id) {}

    // GET /api/v1/config/:user_id
    async getConfig(user_id) {}

    // PUT /api/v1/config/:user_id
    async updateConfig(user_id, config) {}

    // GET /api/v1/usage/:user_id
    async getUsage(user_id) {}
  }
  ```

#### `src/types/index.d.ts`

- [ ] TypeScript definitions:

  ```ts
  export interface ReinvyClientOptions {
    baseUrl: string;
    serviceKey: string;
    source: string;
  }

  export interface ChatRequest {
    user_id: string;
    message: string;
    personality?: "friendly" | "formal" | "expert" | "concise";
    model?: string;
    options?: { max_context?: number; response_style?: string };
  }

  export interface ChatResponse {
    success: boolean;
    data: {
      reply: string;
      model_used: string;
      tokens: { input: number; output: number; total: number };
      session_id: string;
    };
  }

  export interface MemoryResponse {
    success: boolean;
    data: {
      user_id: string;
      messages: Array<{ role: string; content: string; created_at: string }>;
      summary: string | null;
      total_messages: number;
    };
  }
  export interface ConfigResponse {
    success: boolean;
    data: {
      model: string;
      personality: string;
      max_context: number;
      language: string;
    };
  }
  export interface UsageResponse {
    success: boolean;
    data: {
      user_id: string;
      total_tokens: number;
      total_requests: number;
      estimated_cost_usd: number;
      period: string;
    };
  }

  export class ReinvyCoreError extends Error {
    code: string;
    statusCode: number;
  }
  export class AuthError extends ReinvyCoreError {}
  export class RateLimitError extends ReinvyCoreError {}
  export class NetworkError extends ReinvyCoreError {}
  export class ValidationError extends ReinvyCoreError {}

  export class ReinvyClient {
    constructor(options: ReinvyClientOptions);
    chat(request: ChatRequest): Promise<ChatResponse>;
    getMemory(
      userId: string,
      options?: { limit?: number; source?: string },
    ): Promise<MemoryResponse>;
    deleteMemory(
      userId: string,
    ): Promise<{ success: boolean; message: string }>;
    getConfig(userId: string): Promise<ConfigResponse>;
    updateConfig(
      userId: string,
      config: Partial<ConfigResponse["data"]>,
    ): Promise<ConfigResponse>;
    getUsage(userId: string): Promise<UsageResponse>;
  }
  ```

#### `index.js`

- [ ] Export public API:
  ```js
  const { ReinvyClient } = require("./src/client");
  const {
    ReinvyError,
    ReinvyCoreError,
    AuthError,
    RateLimitError,
    NetworkError,
    ValidationError,
  } = require("./src/errors");
  module.exports = {
    ReinvyClient,
    ReinvyError,
    ReinvyCoreError,
    AuthError,
    RateLimitError,
    NetworkError,
    ValidationError,
  };
  ```

#### Setup Local Development

- [ ] Di `reinvy-sdk/`: `npm link`
- [ ] Di `reinvy-discord/`: `npm link @reinvy/sdk`
- [ ] Di `reinvy-telegram/`: `npm link @reinvy/sdk`
- [ ] Di `reinvy-gateway/`: `npm link @reinvy/sdk`
- [ ] Atau alternatif: di setiap interface project `package.json` tambahkan `"@reinvy/sdk": "file:../reinvy-sdk"` lalu `npm install`

---

## Catatan Versioning

- Semua interface project lock ke `"@reinvy/sdk": "^1.0.0"`
- Breaking change (ubah method signature, hapus method) → bump major version → update semua interface
- Non-breaking change (tambah method, tambah optional param) → bump minor version
