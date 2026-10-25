import { DriverApplication } from '@/types/onboarding';

// Server-side persistent storage across requests (persisted in global for dev hot reload)
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

export const applicationStore = {
  get(idOrMobileOrRef: string): DriverApplication | undefined {
    const apps = Array.from(global.__flamecars_applications!.values());
    return apps.find(
      (a) =>
        a.id === idOrMobileOrRef ||
        a.mobileNumber === idOrMobileOrRef ||
        a.referenceNumber === idOrMobileOrRef
    );
  },

  getAll(): DriverApplication[] {
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
    return app;
  },

  delete(id: string): boolean {
    return global.__flamecars_applications!.delete(id);
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
