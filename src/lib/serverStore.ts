import { DriverApplication, DocumentType } from '@/types/onboarding';
import { getEnv } from '@/lib/env';

// Server-side in-memory storage (isolate-level L1 cache)
declare global {
  // eslint-disable-next-line no-var
  var __flamecars_applications: Map<string, DriverApplication> | undefined;
  // eslint-disable-next-line no-var
  var __flamecars_doc_files: Map<string, StoredDocumentFile> | undefined;
  // eslint-disable-next-line no-var
  var __flamecars_d1_init: boolean | undefined;
}

if (!global.__flamecars_applications) {
  global.__flamecars_applications = new Map<string, DriverApplication>();
}

if (!global.__flamecars_doc_files) {
  global.__flamecars_doc_files = new Map<string, StoredDocumentFile>();
}

export interface StoredDocumentFile {
  appId: string;
  docType: string;
  filename: string;
  mimeType: string;
  dataUrl: string;
  updatedAt: string;
}

// Generate cryptographically random ID and high-entropy Reference Number
function generateSecureAppId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'app_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return 'app_' + Math.random().toString(36).substring(2, 12);
}

function generateSecureRefNumber(): string {
  const year = new Date().getFullYear();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 6; i++) {
      suffix += alphabet[bytes[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return `FLM-DRV-${year}-${suffix}`;
}

// Strip oversized base64 dataUrls for ultra-lightweight memory and fast JSON serialization
export function stripOversizedData(app: DriverApplication): DriverApplication {
  const shallowDocs: Record<string, any> = {};
  if (app.documents) {
    for (const [key, doc] of Object.entries(app.documents)) {
      if (doc) {
        shallowDocs[key] = {
          ...doc,
          // Keep full binary data out of the main application list JSON to avoid Cloudflare CPU 1102
          dataUrl: doc.dataUrl && doc.dataUrl.length > 500 ? '[stored-on-server]' : doc.dataUrl,
        };
      } else {
        shallowDocs[key] = null;
      }
    }
  }
  return {
    ...app,
    documents: shallowDocs as any,
  };
}

function getCacheDomain(): string {
  const publicUrl = getEnv('NEXT_PUBLIC_APP_URL', 'https://flamecars-booking-system.rahuldagli.workers.dev');
  return publicUrl.replace(/\/+$/, '');
}

// Detect optional Cloudflare D1 or KV bindings at runtime
async function getCloudflareBindings(): Promise<{ db?: any; kv?: any }> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const cf = await getCloudflareContext({ async: true });
    const env = cf?.env as Record<string, any> | undefined;
    if (!env) return {};
    return {
      db: env.DB || env.FLAMECARS_DB,
      kv: env.FLAMECARS_KV || env.KV,
    };
  } catch {
    return {};
  }
}

async function ensureD1Tables(db: any) {
  if (global.__flamecars_d1_init) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        ref TEXT,
        mobile TEXT,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS document_files (
        doc_key TEXT PRIMARY KEY,
        app_id TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();
  global.__flamecars_d1_init = true;
}

async function persistToCloudflareCache(app: DriverApplication) {
  try {
    const cache = (globalThis as any).caches?.default;
    if (!cache) return;
    const stripped = stripOversizedData(app);
    const jsonStr = JSON.stringify(stripped);
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' };
    const domain = getCacheDomain();

    if (stripped.id) {
      await cache.put(
        new Request(`${domain}/__cache__/app/${encodeURIComponent(stripped.id)}`),
        new Response(jsonStr, { headers })
      );
    }
    if (stripped.referenceNumber) {
      await cache.put(
        new Request(`${domain}/__cache__/app/${encodeURIComponent(stripped.referenceNumber.toLowerCase())}`),
        new Response(jsonStr, { headers })
      );
    }
    if (stripped.mobileNumber) {
      const cleanMobile = stripped.mobileNumber.replace(/\s+/g, '').toLowerCase();
      await cache.put(
        new Request(`${domain}/__cache__/app/${encodeURIComponent(cleanMobile)}`),
        new Response(jsonStr, { headers })
      );
    }

    const allApps = Array.from(global.__flamecars_applications!.values());
    const compactList = allApps.map(stripOversizedData);
    await cache.put(
      new Request(`${domain}/__cache__/apps-list`),
      new Response(JSON.stringify(compactList), { headers })
    );
  } catch {
    // Non-fatal in local dev
  }
}

async function loadFromCloudflareCache(target: string): Promise<DriverApplication | undefined> {
  try {
    const cache = (globalThis as any).caches?.default;
    if (!cache) return undefined;
    const domain = getCacheDomain();
    const clean = encodeURIComponent(target.replace(/\s+/g, '').toLowerCase());
    const res = await cache.match(new Request(`${domain}/__cache__/app/${clean}`));
    if (res) {
      const app: DriverApplication = await res.json();
      if (app && app.id) {
        global.__flamecars_applications!.set(app.id, app);
        return app;
      }
    }
  } catch {
    // Non-fatal
  }
  return undefined;
}

async function loadAllFromCloudflareCache(): Promise<DriverApplication[]> {
  try {
    const cache = (globalThis as any).caches?.default;
    if (!cache) return [];
    const domain = getCacheDomain();
    const res = await cache.match(new Request(`${domain}/__cache__/apps-list`));
    if (res) {
      const list: DriverApplication[] = await res.json();
      if (Array.isArray(list)) {
        for (const app of list) {
          if (app && app.id) {
            const current = global.__flamecars_applications!.get(app.id);
            if (!current || new Date(app.updatedAt || 0).getTime() > new Date(current.updatedAt || 0).getTime()) {
              global.__flamecars_applications!.set(app.id, app);
            }
          }
        }
        return list;
      }
    }
  } catch {
    // Non-fatal
  }
  return [];
}

export const applicationStore = {
  get(idOrMobileOrRef: string): DriverApplication | undefined {
    if (!idOrMobileOrRef) return undefined;
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
    if (!idOrMobileOrRef) return undefined;
    const cleanTarget = idOrMobileOrRef.replace(/\s+/g, '').toLowerCase();

    // 1. Check D1 if bound
    const { db, kv } = await getCloudflareBindings();
    if (db) {
      try {
        await ensureD1Tables(db);
        const row = await db
          .prepare(
            `SELECT data FROM applications WHERE lower(id) = ? OR lower(ref) = ? OR lower(mobile) = ? LIMIT 1`
          )
          .bind(cleanTarget, cleanTarget, cleanTarget)
          .first();
        if (row?.data) {
          const parsed = JSON.parse(row.data) as DriverApplication;
          global.__flamecars_applications!.set(parsed.id, parsed);
          return parsed;
        }
      } catch (e) {
        console.warn('[D1] getAsync error:', e);
      }
    }

    // 2. Check KV if bound
    if (kv) {
      try {
        let appId = await kv.get(`idx:${cleanTarget}`);
        if (!appId) appId = cleanTarget;
        const raw = await kv.get(`app:${appId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as DriverApplication;
          global.__flamecars_applications!.set(parsed.id, parsed);
          return parsed;
        }
      } catch (e) {
        console.warn('[KV] getAsync error:', e);
      }
    }

    // 3. L1 memory + Cloudflare Cache
    const local = this.get(idOrMobileOrRef);
    if (local) return local;
    return await loadFromCloudflareCache(idOrMobileOrRef);
  },

  getAll(): DriverApplication[] {
    return Array.from(global.__flamecars_applications!.values()).sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  },

  async getAllAsync(): Promise<DriverApplication[]> {
    const { db, kv } = await getCloudflareBindings();

    if (db) {
      try {
        await ensureD1Tables(db);
        const { results } = await db
          .prepare(`SELECT data FROM applications ORDER BY updated_at DESC LIMIT 500`)
          .all();
        if (Array.isArray(results)) {
          for (const row of results) {
            if (row?.data) {
              const app = JSON.parse(row.data) as DriverApplication;
              if (app?.id) global.__flamecars_applications!.set(app.id, app);
            }
          }
        }
      } catch (e) {
        console.warn('[D1] getAllAsync error:', e);
      }
    } else if (kv) {
      try {
        const listRaw = await kv.get('apps-list');
        if (listRaw) {
          const list = JSON.parse(listRaw) as DriverApplication[];
          for (const app of list) {
            if (app?.id) global.__flamecars_applications!.set(app.id, app);
          }
        }
      } catch (e) {
        console.warn('[KV] getAllAsync error:', e);
      }
    }

    await loadAllFromCloudflareCache();
    return this.getAll();
  },

  save(app: DriverApplication): DriverApplication {
    let existing: DriverApplication | undefined;
    if (app.id) existing = this.get(app.id);
    if (!existing && app.referenceNumber) existing = this.get(app.referenceNumber);
    if (!existing && app.mobileNumber) existing = this.get(app.mobileNumber);

    if (existing) {
      const originalId = existing.id;
      if (app.id && app.id !== originalId) {
        global.__flamecars_applications!.delete(app.id);
      }
      app.id = originalId;
      if (existing.referenceNumber) {
        app.referenceNumber = existing.referenceNumber;
      }

      // Track if details were modified after initial TBMS sync
      if (existing.tbmsDriverId) {
        app.tbmsDriverId = existing.tbmsDriverId;
        const syncedName = existing.syncedName || existing.legalName;
        app.syncedName = syncedName;

        if (app.legalName && app.legalName.trim() !== syncedName.trim()) {
          app.detailsModifiedAfterSync = true;
          app.lastModifiedFields = [
            `Legal Name updated: "${app.legalName.trim()}" (synced in TBMS as "${syncedName.trim()}")`,
          ];
        } else if (app.detailsModifiedAfterSync === undefined) {
          app.detailsModifiedAfterSync = existing.detailsModifiedAfterSync;
          app.lastModifiedFields = existing.lastModifiedFields;
        }
      }

      // Preserve ACTIVE status & TBMS sync status if already approved and activated
      if (existing.status === 'ACTIVE') {
        app.status = 'ACTIVE';
        app.tbmsDriverId = app.tbmsDriverId || existing.tbmsDriverId;
        app.tbmsSyncStatus = existing.tbmsSyncStatus || 'SYNCED';
      }

      // Preserve approved/rejected document reviews from staff
      if (existing.documents && app.documents) {
        for (const [docKey, existingDoc] of Object.entries(existing.documents)) {
          const k = docKey as DocumentType;
          if (
            existingDoc &&
            existingDoc.status === 'APPROVED' &&
            app.documents[k]?.status !== 'APPROVED'
          ) {
            app.documents[k] = {
              ...app.documents[k],
              ...existingDoc,
            };
          }
        }
      }
    }

    if (!app.id) {
      app.id = generateSecureAppId();
    }
    if (!app.referenceNumber) {
      app.referenceNumber = generateSecureRefNumber();
    }
    app.updatedAt = new Date().toISOString();
    const sanitized = stripOversizedData(app);
    global.__flamecars_applications!.set(sanitized.id, sanitized);

    return sanitized;
  },

  async saveAsync(app: DriverApplication): Promise<DriverApplication> {
    let existing = app.id ? this.get(app.id) : undefined;
    if (!existing && app.referenceNumber) existing = this.get(app.referenceNumber);
    if (!existing && app.mobileNumber) existing = this.get(app.mobileNumber);

    if (!existing) {
      if (app.id) existing = await this.getAsync(app.id);
      if (!existing && app.referenceNumber) existing = await this.getAsync(app.referenceNumber);
      if (!existing && app.mobileNumber) existing = await this.getAsync(app.mobileNumber);
      if (existing && existing.id) {
        global.__flamecars_applications!.set(existing.id, existing);
      }
    }

    const saved = this.save(app);
    const { db, kv } = await getCloudflareBindings();
    const cleanMobile = (saved.mobileNumber || '').replace(/\s+/g, '').toLowerCase();
    const cleanRef = (saved.referenceNumber || '').toLowerCase();
    const jsonStr = JSON.stringify(saved);

    if (db) {
      try {
        await ensureD1Tables(db);
        await db
          .prepare(
            `INSERT INTO applications (id, ref, mobile, data, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET ref=excluded.ref, mobile=excluded.mobile, data=excluded.data, updated_at=excluded.updated_at`
          )
          .bind(saved.id, cleanRef, cleanMobile, jsonStr, saved.updatedAt)
          .run();
      } catch (e) {
        console.warn('[D1] saveAsync error:', e);
      }
    }

    if (kv) {
      try {
        await kv.put(`app:${saved.id}`, jsonStr);
        if (cleanRef) await kv.put(`idx:${cleanRef}`, saved.id);
        if (cleanMobile) await kv.put(`idx:${cleanMobile}`, saved.id);
        const allApps = this.getAll();
        await kv.put('apps-list', JSON.stringify(allApps));
      } catch (e) {
        console.warn('[KV] saveAsync error:', e);
      }
    }

    await persistToCloudflareCache(saved);
    return saved;
  },

  async deleteAsync(id: string): Promise<boolean> {
    const existing = this.get(id);
    const deleted = global.__flamecars_applications!.delete(id);

    const { db, kv } = await getCloudflareBindings();
    if (db) {
      try {
        await ensureD1Tables(db);
        await db.prepare(`DELETE FROM applications WHERE id = ?`).bind(id).run();
      } catch {}
    }
    if (kv) {
      try {
        await kv.delete(`app:${id}`);
        const allApps = this.getAll();
        await kv.put('apps-list', JSON.stringify(allApps));
      } catch {}
    }
    if (existing) {
      try {
        const cache = (globalThis as any).caches?.default;
        const domain = getCacheDomain();
        if (cache) {
          await cache.delete(new Request(`${domain}/__cache__/app/${encodeURIComponent(id)}`));
          if (existing.referenceNumber) {
            await cache.delete(
              new Request(`${domain}/__cache__/app/${encodeURIComponent(existing.referenceNumber.toLowerCase())}`)
            );
          }
          const allApps = this.getAll().map(stripOversizedData);
          await cache.put(
            new Request(`${domain}/__cache__/apps-list`),
            new Response(JSON.stringify(allApps), {
              headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
            })
          );
        }
      } catch {}
    }
    return deleted;
  },
};

/**
 * Per-document file storage (keeps binary base64 images/PDFs isolated from the main application JSON)
 */
export const documentFileStore = {
  async saveAsync(file: StoredDocumentFile): Promise<void> {
    const key = `${file.appId}:${file.docType}`;
    global.__flamecars_doc_files!.set(key, file);

    const { db, kv } = await getCloudflareBindings();
    const jsonStr = JSON.stringify(file);

    if (db) {
      try {
        await ensureD1Tables(db);
        await db
          .prepare(
            `INSERT INTO document_files (doc_key, app_id, doc_type, data, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(doc_key) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`
          )
          .bind(key, file.appId, file.docType, jsonStr, file.updatedAt)
          .run();
      } catch (e) {
        console.warn('[D1] documentFileStore saveAsync error:', e);
      }
    }

    if (kv) {
      try {
        await kv.put(`doc:${key}`, jsonStr);
      } catch (e) {
        console.warn('[KV] documentFileStore saveAsync error:', e);
      }
    }

    try {
      const cache = (globalThis as any).caches?.default;
      if (cache) {
        const domain = getCacheDomain();
        await cache.put(
          new Request(`${domain}/__cache__/doc/${encodeURIComponent(file.appId)}/${encodeURIComponent(file.docType)}`),
          new Response(jsonStr, {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
          })
        );
      }
    } catch {}
  },

  async getAsync(appId: string, docType: string): Promise<StoredDocumentFile | undefined> {
    const key = `${appId}:${docType}`;
    const local = global.__flamecars_doc_files!.get(key);
    if (local) return local;

    const { db, kv } = await getCloudflareBindings();
    if (db) {
      try {
        await ensureD1Tables(db);
        const row = await db
          .prepare(`SELECT data FROM document_files WHERE doc_key = ? LIMIT 1`)
          .bind(key)
          .first();
        if (row?.data) {
          const parsed = JSON.parse(row.data) as StoredDocumentFile;
          global.__flamecars_doc_files!.set(key, parsed);
          return parsed;
        }
      } catch {}
    }

    if (kv) {
      try {
        const raw = await kv.get(`doc:${key}`);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredDocumentFile;
          global.__flamecars_doc_files!.set(key, parsed);
          return parsed;
        }
      } catch {}
    }

    try {
      const cache = (globalThis as any).caches?.default;
      if (cache) {
        const domain = getCacheDomain();
        const res = await cache.match(
          new Request(`${domain}/__cache__/doc/${encodeURIComponent(appId)}/${encodeURIComponent(docType)}`)
        );
        if (res) {
          const parsed = (await res.json()) as StoredDocumentFile;
          global.__flamecars_doc_files!.set(key, parsed);
          return parsed;
        }
      }
    } catch {}

    return undefined;
  },
};
