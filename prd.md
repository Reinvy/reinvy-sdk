# 📄 PRD: `reinvy-sdk`

> **Bagian dari:** Reinvy AI Systems Ecosystem
> **Tipe:** Shared Library — npm Package
> **Versi:** 2.0.0
> **Last Updated:** April 2026
> **Referensi Utama:** Lihat root [`prd.md`](../prd.md) §5 untuk konteks ekosistem lengkap.

---

## 1. Repo Overview

`reinvy-sdk` adalah **syaraf** yang menghubungkan interface projects ke `reinvy-core`. Dipublish sebagai npm package private, package ini menjadi single source of truth untuk API contract antara semua interface projects dan Core Engine.

### Posisi dalam Ekosistem

```
reinvy-core  (AI Engine — HTTP REST API)
      ▲
      │  HTTP request via axios + retry logic
      │
  reinvy-sdk  (@reinvy/sdk — npm package)
      │
      │  di-install sebagai dependency
      ▼
reinvy-discord  /  reinvy-telegram  /  reinvy-gateway
```

**Dependency position:**

- **Depends on:** API contract `reinvy-core` (endpoint URLs, request/response shape)
- **Consumed by:** `reinvy-discord`, `reinvy-telegram`, `reinvy-gateway`, dan semua interface project masa depan

---

## 2. Scope

### Yang TERMASUK Tanggung Jawab Repo Ini

| Area                        | Detail                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| HTTP Client Abstraction     | Sembunyikan detail `axios`/`fetch`, URL base, header dari consumer                       |
| API Method Wrappers         | `chat()`, `getMemory()`, `deleteMemory()`, `getConfig()`, `updateConfig()`, `getUsage()` |
| Retry & Timeout Logic       | Auto-retry 3x dengan exponential backoff untuk error jaringan                            |
| Standardized Error Types    | Error class yang konsisten — interface project tidak parse HTTP error sendiri            |
| TypeScript Type Definitions | `index.d.ts` untuk semua request/response shapes                                         |
| Contract Testing            | Test suite SDK berfungsi sebagai contract test terhadap reinvy-core                      |
| Versioning Management       | Semantic versioning; breaking change → major bump                                        |

### Yang TIDAK Termasuk Tanggung Jawab Repo Ini

| Yang Dikecualikan                         | Siapa yang Bertanggung Jawab           |
| ----------------------------------------- | -------------------------------------- |
| Business logic AI                         | `reinvy-core`                          |
| Platform-spesifik formatting              | `reinvy-discord`, `reinvy-telegram`    |
| Public authentication (JWT)               | `reinvy-gateway`                       |
| Bot command handling                      | `reinvy-discord`, `reinvy-telegram`    |
| Koneksi langsung ke PostgreSQL atau Redis | ❌ Dilarang keras — hanya HTTP ke Core |

---

## 3. Tech Stack

| Layer            | Teknologi                                    | Keterangan                                          |
| ---------------- | -------------------------------------------- | --------------------------------------------------- |
| Runtime          | Node.js 20+                                  |                                                     |
| HTTP Client      | axios                                        | Dengan interceptor untuk retry dan header injection |
| Type Definitions | TypeScript (`.d.ts`)                         | Definitions only — source tetap JavaScript          |
| Testing          | Jest                                         |                                                     |
| Registry         | GitHub Packages atau Verdaccio (self-hosted) | Private npm registry                                |

---

## 4. Folder Structure

```
reinvy-sdk/
├── src/
│   ├── client.js           # ReinvyClient class — public API
│   ├── http.js             # Axios instance + retry + timeout logic
│   ├── errors.js           # Custom error classes
│   └── types/
│       └── index.d.ts      # TypeScript type definitions
├── index.js                # Entry point: export ReinvyClient + error types
├── package.json
└── README.md
```

---

## 5. Public API — `ReinvyClient`

### Inisialisasi

```js
const { ReinvyClient } = require("@reinvy/sdk");

const client = new ReinvyClient({
  baseUrl: process.env.REINVY_CORE_URL, // URL internal reinvy-core
  serviceKey: process.env.REINVY_SERVICE_KEY, // Service key unik per interface
  source: "discord", // Identifier platform ini
  timeout: 10000, // Optional: ms, default 10000
});
```

**Constructor Options:**

| Parameter    | Type   | Required | Default | Keterangan                                         |
| ------------ | ------ | -------- | ------- | -------------------------------------------------- |
| `baseUrl`    | string | ✅       | —       | URL reinvy-core, contoh: `http://reinvy-core:3000` |
| `serviceKey` | string | ✅       | —       | Service API key untuk autentikasi ke Core          |
| `source`     | string | ✅       | —       | Identifier platform: `discord`, `telegram`, `api`  |
| `timeout`    | number | ❌       | `10000` | Timeout HTTP request dalam ms                      |

---

### Method: `client.chat(payload)`

Kirim pesan user ke Core untuk diproses AI.

**Parameter:**

```js
await client.chat({
  user_id: "user_123", // Required: string
  message: "Halo!", // Required: string
  model: "openai/gpt-4o", // Optional: override model
  personality: "friendly", // Optional: override personality
  options: {
    // Optional
    max_context: 10,
    response_style: "short",
  },
});
```

**Return:**

```js
{
  success: true,
  data: {
    reply: 'Halo! Ada yang bisa dibantu?',
    model_used: 'openai/gpt-4o',
    tokens: { input: 450, output: 120, total: 570 },
    session_id: 'sess_abc123'
  }
}
```

---

### Method: `client.getMemory(userId, options?)`

Ambil conversation history user.

**Parameter:**

```js
await client.getMemory("user_123", {
  limit: 10, // Optional: number, default 20
  source: "discord", // Optional: filter by platform
});
```

**Return:**

```js
{
  success: true,
  data: {
    user_id: 'user_123',
    messages: [
      { role: 'user', content: 'Halo', created_at: '2026-04-18T10:00:00Z' },
      { role: 'assistant', content: 'Halo!', created_at: '2026-04-18T10:00:01Z' }
    ],
    summary: 'User menanyakan tentang ML dasar.',
    total_messages: 42
  }
}
```

---

### Method: `client.deleteMemory(userId)`

Reset semua conversation history user.

**Parameter:**

```js
await client.deleteMemory("user_123");
```

**Return:**

```js
{
  success: true,
  message: 'Memory cleared for user_123'
}
```

---

### Method: `client.getConfig(userId)`

Ambil konfigurasi AI user.

**Parameter:**

```js
await client.getConfig("user_123");
```

**Return:**

```js
{
  success: true,
  data: {
    model: 'openai/gpt-4o',
    personality: 'friendly',
    max_context: 10,
    language: 'id'
  }
}
```

---

### Method: `client.updateConfig(userId, config)`

Update konfigurasi AI user (partial update didukung).

**Parameter:**

```js
await client.updateConfig("user_123", {
  model: "anthropic/claude-3-opus", // Optional
  personality: "expert", // Optional
  max_context: 15, // Optional
  language: "en", // Optional
});
```

**Return:**

```js
{
  success: true,
  data: {
    model: 'anthropic/claude-3-opus',
    personality: 'expert',
    max_context: 15,
    language: 'en'
  }
}
```

---

### Method: `client.getUsage(userId)`

Ambil statistik penggunaan token user bulan ini.

**Parameter:**

```js
await client.getUsage("user_123");
```

**Return:**

```js
{
  success: true,
  data: {
    user_id: 'user_123',
    total_tokens: 15420,
    total_requests: 87,
    estimated_cost_usd: 0.0231,
    period: '2026-04'
  }
}
```

---

## 6. Error Handling

SDK melempar custom error classes — interface project tidak perlu parse raw HTTP response.

### Error Classes

```js
const {
  ReinvyError,
  ReinvyAuthError,
  ReinvyRateLimitError,
  ReinvyNetworkError,
} = require("@reinvy/sdk");
```

| Error Class             | HTTP Status | Kapan Dilempar                                         |
| ----------------------- | ----------- | ------------------------------------------------------ |
| `ReinvyAuthError`       | 401         | Service key tidak valid                                |
| `ReinvyRateLimitError`  | 429         | Rate limit user atau service terlampaui                |
| `ReinvyValidationError` | 400         | Request body tidak valid / prompt injection terdeteksi |
| `ReinvyNetworkError`    | —           | Timeout atau koneksi gagal setelah semua retry habis   |
| `ReinvyServerError`     | 500         | Internal error di reinvy-core                          |
| `ReinvyError`           | any         | Base class — error lain yang tidak terklasifikasi      |

### Contoh Error Handling di Interface Project

```js
const { ReinvyRateLimitError, ReinvyNetworkError } = require("@reinvy/sdk");

try {
  const response = await client.chat({ user_id, message });
  // handle success
} catch (err) {
  if (err instanceof ReinvyRateLimitError) {
    // Informasikan user bahwa terlalu banyak request
  } else if (err instanceof ReinvyNetworkError) {
    // Core tidak tersedia — berikan fallback message
  } else {
    // Error tak terduga
    logger.error(err);
  }
}
```

---

## 7. HTTP Layer Detail

### Retry Logic

**File:** `src/http.js`

| Kondisi                        | Retry? | Jumlah Retry | Strategi              |
| ------------------------------ | ------ | ------------ | --------------------- |
| Network timeout                | ✅     | 3x           | Exponential backoff   |
| HTTP 503 (service unavailable) | ✅     | 3x           | Exponential backoff   |
| HTTP 429 (rate limit)          | ❌     | —            | Langsung lempar error |
| HTTP 4xx lainnya               | ❌     | —            | Langsung lempar error |
| HTTP 5xx lainnya               | ✅     | 2x           | Fixed delay 1s        |

### Headers yang Ditambahkan Otomatis

Setiap request dari SDK secara otomatis menyertakan header berikut (tidak perlu dikonfigurasi ulang di interface project):

```
X-Service-Key: <serviceKey dari constructor>
X-Source: <source dari constructor>
X-Request-ID: <uuid auto-generated per request>
Content-Type: application/json
```

---

## 8. TypeScript Definitions

**File:** `src/types/index.d.ts`

Semua tipe tersedia untuk interface project yang menggunakan TypeScript:

```typescript
export interface ReinvyClientOptions {
  baseUrl: string;
  serviceKey: string;
  source: "discord" | "telegram" | "api" | string;
  timeout?: number;
}

export interface ChatPayload {
  user_id: string;
  message: string;
  model?: string;
  personality?: "friendly" | "formal" | "expert" | "concise";
  options?: {
    max_context?: number;
    response_style?: "short" | "detailed";
  };
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

export interface UserConfig {
  model: string;
  personality: "friendly" | "formal" | "expert" | "concise";
  max_context: number;
  language: string;
}

export interface UsageData {
  user_id: string;
  total_tokens: number;
  total_requests: number;
  estimated_cost_usd: number;
  period: string;
}

export class ReinvyClient {
  constructor(options: ReinvyClientOptions);
  chat(payload: ChatPayload): Promise<ChatResponse>;
  getMemory(
    userId: string,
    options?: { limit?: number; source?: string },
  ): Promise<any>;
  deleteMemory(userId: string): Promise<any>;
  getConfig(userId: string): Promise<{ success: boolean; data: UserConfig }>;
  updateConfig(
    userId: string,
    config: Partial<UserConfig>,
  ): Promise<{ success: boolean; data: UserConfig }>;
  getUsage(userId: string): Promise<{ success: boolean; data: UsageData }>;
}

export class ReinvyError extends Error {}
export class ReinvyAuthError extends ReinvyError {}
export class ReinvyRateLimitError extends ReinvyError {}
export class ReinvyValidationError extends ReinvyError {}
export class ReinvyNetworkError extends ReinvyError {}
export class ReinvyServerError extends ReinvyError {}
```

---

## 9. Versioning Strategy

SDK menggunakan **Semantic Versioning (semver)**:

| Tipe Perubahan                  | Version Bump | Contoh            |
| ------------------------------- | ------------ | ----------------- |
| Bug fix, tidak ada API change   | PATCH        | `1.0.0` → `1.0.1` |
| Fitur baru, backward compatible | MINOR        | `1.0.0` → `1.1.0` |
| Breaking change API             | MAJOR        | `1.0.0` → `2.0.0` |

**Contoh breaking change:** mengubah nama method, mengubah shape parameter required, menghapus method yang sudah ada.

**Interface projects mengunci versi dengan `^`** (minor update otomatis, major tidak):

```json
{
  "dependencies": {
    "@reinvy/sdk": "^1.0.0"
  }
}
```

**Aturan breaking change:**

1. Buat major version baru
2. Dokumentasikan migration guide di `CHANGELOG.md`
3. Notify semua interface project owners sebelum publish
4. Support versi lama minimal 1 bulan sebelum deprecated

---

## 10. Instalasi di Interface Project

### Dari GitHub Packages

```bash
# Tambahkan ke .npmrc project:
@reinvy:registry=https://npm.pkg.github.com

# Install:
npm install @reinvy/sdk
```

### Dari Verdaccio (Self-hosted)

```bash
# Tambahkan ke .npmrc project:
@reinvy:registry=http://verdaccio:4873

# Install:
npm install @reinvy/sdk
```

### Penggunaan Lengkap

```js
const {
  ReinvyClient,
  ReinvyRateLimitError,
  ReinvyNetworkError,
} = require("@reinvy/sdk");

const client = new ReinvyClient({
  baseUrl: process.env.REINVY_CORE_URL,
  serviceKey: process.env.REINVY_SERVICE_KEY,
  source: "discord",
});

async function handleUserMessage(userId, message) {
  try {
    const response = await client.chat({ user_id: userId, message });
    return response.data.reply;
  } catch (err) {
    if (err instanceof ReinvyRateLimitError) {
      return "Terlalu banyak pesan! Coba lagi dalam 1 menit.";
    }
    if (err instanceof ReinvyNetworkError) {
      return "Layanan AI sedang tidak tersedia. Coba lagi nanti.";
    }
    throw err;
  }
}
```

---

## 11. Testing Strategy

SDK memiliki dua peran testing yang berbeda:

| Jenis Test        | Target                                                       | Tool                                |
| ----------------- | ------------------------------------------------------------ | ----------------------------------- |
| Unit Test         | Semua method `ReinvyClient`, error handling, retry logic     | Jest + axios-mock-adapter           |
| **Contract Test** | Validasi bahwa reinvy-core API tidak berubah secara breaking | Jest + Supertest (pointing ke Core) |

**Contract testing adalah tanggung jawab SDK.** Jika reinvy-core mengubah endpoint shape tanpa bump major version, contract test SDK harus gagal sebagai early warning.

Contract test dijalankan di CI setiap kali ada perubahan di reinvy-core atau reinvy-sdk.

---

## 12. Deployment Notes

`reinvy-sdk` di-publish sebagai npm package — **tidak di-deploy sebagai service tersendiri**.

Lifecycle publish:

```bash
# 1. Update versi di package.json
npm version patch | minor | major

# 2. Build / lint
npm test

# 3. Publish ke registry
npm publish --registry https://npm.pkg.github.com
```

Interface projects mendapatkan update SDK dengan cara `npm update @reinvy/sdk`.

---

## 13. Environment Variables

SDK sendiri tidak memerlukan ENV variables — konfigurasi dilakukan via constructor options.

Interface project yang menggunakan SDK membutuhkan:

```env
REINVY_CORE_URL=http://reinvy-core:3000
REINVY_SERVICE_KEY=<service_key_untuk_platform_ini>
```

---

## 14. Roadmap Ownership

Fase dari roadmap ekosistem (root `prd.md` §17) yang menjadi tanggung jawab repo ini:

| Fase     | Item                                                    | Status     |
| -------- | ------------------------------------------------------- | ---------- |
| Phase 3  | Publish reinvy-sdk ke private npm registry              | ⬜ Todo    |
| Phase 3  | Implementasi semua method (chat, memory, config, usage) | ⬜ Todo    |
| Phase 3  | TypeScript definitions lengkap                          | ⬜ Todo    |
| Phase 3  | Contract test suite terhadap reinvy-core                | ⬜ Todo    |
| Phase 4+ | Tambah method baru seiring fitur Core berkembang        | 🔜 Planned |
