import { DriverApplication } from '@/types/onboarding';
import fs from 'fs';
import path from 'path';

// Server-side persistent storage across requests (persisted in global for dev hot reload and file for durability)
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

function getStorageFilePath(): string {
  const dir = path.resolve(process.cwd(), '.data');
  return path.join(dir, 'applications.json');
}

function initFromDisk(): void {
  try {
    const file = getStorageFilePath();
    if (fs.existsSync(file)) {
      const text = fs.readFileSync(file, 'utf8');
      const items: DriverApplication[] = JSON.parse(text);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item && item.id) {
            global.__flamecars_applications!.set(item.id, item);
          }
        }
      }
    }
  } catch (err) {
    // Non-fatal if filesystem is read-only or in edge environment
  }
}

function saveToDisk(): void {
  try {
    const dir = path.resolve(process.cwd(), '.data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const file = getStorageFilePath();
    const items = Array.from(global.__flamecars_applications!.values());
    fs.writeFileSync(file, JSON.stringify(items, null, 2), 'utf8');
  } catch (err) {
    // Non-fatal if filesystem is read-only or in edge environment
  }
}

// Preload persisted applications on startup
if (global.__flamecars_applications.size === 0) {
  initFromDisk();
}

export const applicationStore = {
  get(idOrMobileOrRef: string): DriverApplication | undefined {
    if (global.__flamecars_applications!.size === 0) {
      initFromDisk();
    }
    const apps = Array.from(global.__flamecars_applications!.values());
    const targetClean = idOrMobileOrRef.replace(/\s+/g, '').toLowerCase();
    return apps.find((a) => {
      const aId = (a.id || '').toLowerCase();
      const aMobile = (a.mobileNumber || '').replace(/\s+/g, '').toLowerCase();
      const aRef = (a.referenceNumber || '').toLowerCase();
      return aId === targetClean || aMobile === targetClean || aRef === targetClean;
    });
  },

  getAll(): DriverApplication[] {
    if (global.__flamecars_applications!.size === 0) {
      initFromDisk();
    }
    return Array.from(global.__flamecars_applications!.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  save(app: DriverApplication): DriverApplication {
    if (!app.id) {
      app.id = 'app_' + Math.random().toString(36).substring(2, 10);
    }
    if (!app.referenceNumber) {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      app.referenceNumber = `FLM-DRV-${year}-${rand}`;
    }
    app.updatedAt = new Date().toISOString();
    global.__flamecars_applications!.set(app.id, { ...app });
    saveToDisk();
    return app;
  },

  delete(id: string): boolean {
    const deleted = global.__flamecars_applications!.delete(id);
    if (deleted) {
      saveToDisk();
    }
    return deleted;
  },
};

export const otpStore = {
  create(mobile: string): string {
    // Generate a 6-digit OTP (for testing/demo, "123456" is also accepted)
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
