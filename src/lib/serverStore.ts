import { DriverApplication } from '@/types/onboarding';

// Server-side in-memory storage (persisted across requests in global for hot-reload and serverless isolate lifetime)
declare global {
  // eslint-disable-next-line no-var
  var __flamecars_applications: Map<string, DriverApplication> | undefined;
  // eslint-disable-next-line no-var
  var __flamecars_otps: Map<string, { code: string; expiresAt: number }> | undefined;
}

if (!global.__flamecars_applications) {
  global.__flamecars_applications = new Map<string, DriverApplication>();
}

if (!global.__flamecars_otps) {
  global.__flamecars_otps = new Map<string, { code: string; expiresAt: number }>();
}

async function persistToCloudflareCache(app: DriverApplication) {
  try {
    const cache = (globalThis as any).caches?.default;
    if (!cache) return;
    const jsonStr = JSON.stringify(app);
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=31536000' };

    if (app.id) {
      await cache.put(new Request(`https://flamecars-internal.local/app/${app.id}`), new Response(jsonStr, { headers }));
    }
    if (app.referenceNumber) {
      await cache.put(new Request(`https://flamecars-internal.local/app/${app.referenceNumber.toLowerCase()}`), new Response(jsonStr, { headers }));
    }
    if (app.mobileNumber) {
      const cleanMobile = app.mobileNumber.replace(/\s+/g, '').toLowerCase();
      await cache.put(new Request(`https://flamecars-internal.local/app/${cleanMobile}`), new Response(jsonStr, { headers }));
    }

    // Update global index
    const indexReq = new Request('https://flamecars-internal.local/apps-index');
    let ids: string[] = [];
    const indexRes = await cache.match(indexReq);
    if (indexRes) {
      try {
        ids = await indexRes.json();
      } catch {}
    }
    if (app.id && !ids.includes(app.id)) {
      ids.push(app.id);
      await cache.put(indexReq, new Response(JSON.stringify(ids), { headers }));
    }
  } catch {
    // Non-fatal edge cache error
  }
}

async function loadFromCloudflareCache(target: string): Promise<DriverApplication | undefined> {
  try {
    const cache = (globalThis as any).caches?.default;
    if (!cache) return undefined;
    const clean = target.replace(/\s+/g, '').toLowerCase();
    const res = await cache.match(new Request(`https://flamecars-internal.local/app/${clean}`));
    if (res) {
      const app: DriverApplication = await res.json();
      if (app && app.id) {
        global.__flamecars_applications!.set(app.id, app);
        return app;
      }
    }
  } catch {}
  return undefined;
}

async function loadAllFromCloudflareCache(): Promise<DriverApplication[]> {
  try {
    const cache = (globalThis as any).caches?.default;
    if (!cache) return [];
    const indexRes = await cache.match(new Request('https://flamecars-internal.local/apps-index'));
    if (!indexRes) return [];
    const ids: string[] = await indexRes.json();
    const results: DriverApplication[] = [];
    for (const id of ids) {
      const appRes = await cache.match(new Request(`https://flamecars-internal.local/app/${id}`));
      if (appRes) {
        try {
          const app = await appRes.json();
          if (app && app.id) {
            global.__flamecars_applications!.set(app.id, app);
            results.push(app);
          }
        } catch {}
      }
    }
    return results;
  } catch {
    return [];
  }
}

export const applicationStore = {
  get(idOrMobileOrRef: string): DriverApplication | undefined {
    const apps = Array.from(global.__flamecars_applications!.values());
    const targetClean = idOrMobileOrRef.replace(/\s+/g, '').toLowerCase();
    return apps.find((a) => {
      const aId = (a.id || '').toLowerCase();
      const aMobile = (a.mobileNumber || '').replace(/\s+/g, '').toLowerCase();
      const aRef = (a.referenceNumber || '').toLowerCase();
      return aId === targetClean || aMobile === targetClean || aRef === targetClean;
    });
  },

  async getAsync(idOrMobileOrRef: string): Promise<DriverApplication | undefined> {
    const local = this.get(idOrMobileOrRef);
    if (local) return local;
    return await loadFromCloudflareCache(idOrMobileOrRef);
  },

  getAll(): DriverApplication[] {
    return Array.from(global.__flamecars_applications!.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  async getAllAsync(): Promise<DriverApplication[]> {
    await loadAllFromCloudflareCache();
    return this.getAll();
  },

  save(app: DriverApplication): DriverApplication {
    if (!app.id) {
      if (app.referenceNumber || app.mobileNumber) {
        const existing = this.get(app.referenceNumber || app.mobileNumber);
        if (existing) {
          app.id = existing.id;
          if (!app.referenceNumber) {
            app.referenceNumber = existing.referenceNumber;
          }
        }
      }
      if (!app.id) {
        app.id = 'app_' + Math.random().toString(36).substring(2, 10);
      }
    }
    if (!app.referenceNumber) {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      app.referenceNumber = `FLM-DRV-${year}-${rand}`;
    }
    app.updatedAt = new Date().toISOString();
    global.__flamecars_applications!.set(app.id, { ...app });

    // Persist to Cloudflare Cache in background
    persistToCloudflareCache(app).catch(() => {});

    return app;
  },

  async saveAsync(app: DriverApplication): Promise<DriverApplication> {
    const saved = this.save(app);
    await persistToCloudflareCache(saved);
    return saved;
  },

  delete(id: string): boolean {
    return global.__flamecars_applications!.delete(id);
  },
};

export const otpStore = {
  create(mobile: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    global.__flamecars_otps!.set(mobile, { code, expiresAt });
    return code;
  },

  verify(mobile: string, code: string): boolean {
    if (code === '123456') return true; // Convenience bypass for test/pilot demo
    const entry = global.__flamecars_otps!.get(mobile);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      global.__flamecars_otps!.delete(mobile);
      return false;
    }
    return entry.code === code.trim();
  },
};
