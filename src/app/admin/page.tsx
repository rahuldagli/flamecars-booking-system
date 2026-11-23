'use client';

import { useState, useEffect, useRef } from 'react';
import { DriverApplication, DocumentType, REQUIRED_DOCUMENTS_CONFIG } from '@/types/onboarding';
import { CustomerBooking } from '@/types/booking';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';
import PricingPromotionsSection from '@/app/admin/PricingPromotionsSection';

interface StaffUser {
  name: string;
  email: string;
  role: string;
}

export default function AdminDashboardPage() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'drivers' | 'bookings' | 'pricing'>('drivers');

  // Driver Dashboard states
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<DriverApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Import / Export states
  const [showExportMenu, setShowExportMenu] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Customer Bookings states
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<CustomerBooking | null>(null);
  const [bookingFilter, setBookingFilter] = useState<string>('ALL');
  const [bookingSearch, setBookingSearch] = useState<string>('');
  const [retryingTbmsRef, setRetryingTbmsRef] = useState<string | null>(null);
  const [resendingBookingEmailRef, setResendingBookingEmailRef] = useState<string | null>(null);

  // Document modal preview
  const [inspectDocType, setInspectDocType] = useState<DocumentType | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Check authentication on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const savedToken = typeof window !== 'undefined' ? localStorage.getItem('fc_staff_token') : null;
        const res = await fetch('/api/admin/me', {
          headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : {},
        });
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
          loadApplications();
          loadBookings();
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkSession();
  }, []);

  // Close export dropdown on outside click
  useEffect(() => {
    function handleWindowClick() {
      setShowExportMenu(false);
    }
    if (showExportMenu) {
      window.addEventListener('click', handleWindowClick);
      return () => window.removeEventListener('click', handleWindowClick);
    }
  }, [showExportMenu]);

  // Auto-refresh applications gently in background without CPU exhaustion
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh every 25 seconds only if the tab is currently visible
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadApplications(false);
        loadBookings(false);
      }
    }, 25000);

    const handleFocus = () => {
      loadApplications(false);
      loadBookings(false);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated]);

  // Handle Staff Login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both staff email and password.');
      return;
    }

    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== 'undefined' && data.token) {
          localStorage.setItem('fc_staff_token', data.token);
        }
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        loadApplications();
      } else {
        setLoginError(data.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch {
      setLoginError('Connection error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }

  // Handle Staff Logout
  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fc_staff_token');
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedApp(null);
  }

  // Authenticated fetch helper for /api/admin/* endpoints
  async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('fc_staff_token') : null;
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fc_staff_token');
      }
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
    return res;
  }

  // Load customer bookings
  async function loadBookings(showSpinner = true) {
    try {
      const res = await adminFetch('/api/admin/bookings');
      const data = await res.json();
      if (res.ok && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
      }
    } catch (err) {
      console.error('Error loading customer bookings:', err);
    }
  }

  // Retry TBMS dispatch for a customer booking
  async function retryTbmsBooking(bookingRef: string) {
    setRetryingTbmsRef(bookingRef);
    try {
      const res = await adminFetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingRef, action: 'retry-tbms' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({
          text: `Dispatched ${bookingRef} to TBMS (Job Ref: ${data.jobReference || 'Accepted'})`,
          type: 'success',
        });
        await loadBookings(false);
        if (selectedBooking && selectedBooking.referenceNumber === bookingRef) {
          setSelectedBooking(data.booking);
        }
      } else {
        setActionMessage({
          text: `TBMS dispatch failed for ${bookingRef}: ${data.error || 'Server error'}`,
          type: 'error',
        });
        await loadBookings(false);
      }
    } catch (err: any) {
      setActionMessage({ text: `Network error retrying TBMS: ${err.message}`, type: 'error' });
    } finally {
      setRetryingTbmsRef(null);
    }
  }

  // Resend booking confirmation email to customer & alert to staff
  async function resendBookingEmail(bookingRef: string) {
    setResendingBookingEmailRef(bookingRef);
    try {
      const res = await adminFetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingRef, action: 'resend-email' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({
          text: `Confirmation email successfully resent to ${data.customerEmail || 'customer'}!`,
          type: 'success',
        });
        await loadBookings(false);
        if (selectedBooking && selectedBooking.referenceNumber === bookingRef) {
          setSelectedBooking(data.booking);
        }
      } else {
        setActionMessage({
          text: `Failed to resend confirmation email for ${bookingRef}: ${data.error || 'Server error'}`,
          type: 'error',
        });
      }
    } catch (err: any) {
      setActionMessage({ text: `Network error resending email: ${err.message}`, type: 'error' });
    } finally {
      setResendingBookingEmailRef(null);
    }
  }

  // Helper to persist updated application state locally across reloads (admin-only key, does not touch driver draft)
  function persistAppToLocal(app: DriverApplication) {
    if (typeof window === 'undefined' || !app) return;
    try {
      const raw = localStorage.getItem('flamecars_submitted_applications');
      const list: DriverApplication[] = raw ? JSON.parse(raw) : [];
      const updated = [
        app,
        ...list.filter((a) => a.referenceNumber !== app.referenceNumber && a.id !== app.id),
      ];
      localStorage.setItem('flamecars_submitted_applications', JSON.stringify(updated));
    } catch { }
  }

  // Helper to strip heavy base64 strings before sending over wire
  function sanitizeForSync(app: DriverApplication): DriverApplication {
    const shallowDocs: Record<string, any> = {};
    if (app.documents) {
      for (const [key, doc] of Object.entries(app.documents)) {
        if (doc) {
          shallowDocs[key] = {
            ...doc,
            dataUrl: '[stored-in-client]',
          };
        } else {
          shallowDocs[key] = null;
        }
      }
    }
    return { ...app, documents: shallowDocs as any };
  }

  // Load applications
  async function loadApplications(trigger?: boolean | React.MouseEvent) {
    const showSpinner = typeof trigger === 'boolean' ? trigger : true;
    if (showSpinner) setLoading(true);
    try {
      // 1. Fetch authoritative applications from server first
      const res = await adminFetch('/api/admin/applications');
      const data = await res.json();
      const serverApps: DriverApplication[] = res.ok && Array.isArray(data.applications) ? data.applications : [];

      // 2. Gather any locally saved/submitted applications on this browser
      let localApps: DriverApplication[] = [];
      if (typeof window !== 'undefined') {
        try {
          const submittedRaw = localStorage.getItem('flamecars_submitted_applications');
          if (submittedRaw) {
            const parsed = JSON.parse(submittedRaw);
            if (Array.isArray(parsed)) localApps = parsed;
          }
          const draftRaw = localStorage.getItem('flamecars_driver_draft_v1');
          if (draftRaw) {
            const draft = JSON.parse(draftRaw);
            if (
              draft &&
              (draft.status === 'SUBMITTED' || draft.referenceNumber) &&
              !localApps.some((a) => a.referenceNumber === draft.referenceNumber)
            ) {
              localApps.push(draft);
            }
          }
        } catch { }
      }

      // 3. Build unified map: server-authoritative ACTIVE status & TBMS IDs always win (Fix H1)
      const appMap = new Map<string, DriverApplication>();

      for (const localApp of localApps) {
        const key = (localApp.referenceNumber || localApp.id || '').toLowerCase().trim();
        if (key) appMap.set(key, localApp);
      }

      for (const srvApp of serverApps) {
        const key = (srvApp.referenceNumber || srvApp.id || '').toLowerCase().trim();
        if (!key) continue;

        const existing = appMap.get(key);
        if (!existing) {
          appMap.set(key, srvApp);
        } else {
          const srvTime = new Date(srvApp.updatedAt || srvApp.submittedAt || 0).getTime();
          const locTime = new Date(existing.updatedAt || existing.submittedAt || 0).getTime();
          const merged = srvTime >= locTime ? { ...existing, ...srvApp } : { ...srvApp, ...existing };

          // Server-authoritative status & TBMS activation must never be reverted by stale localStorage
          if (srvApp.status === 'TRASH' || srvApp.isDeleted) {
            merged.status = 'TRASH';
            merged.isDeleted = true;
            merged.deletedAt = srvApp.deletedAt;
            merged.previousStatus = srvApp.previousStatus;
          } else if (srvApp.status === 'ACTIVE' || existing.status === 'ACTIVE') {
            merged.status = 'ACTIVE';
          }
          if (srvApp.tbmsDriverId) {
            merged.tbmsDriverId = srvApp.tbmsDriverId;
            merged.tbmsSyncStatus = srvApp.tbmsSyncStatus || 'SYNCED';
          }
          appMap.set(key, merged);
        }
      }

      const combined = Array.from(appMap.values()).sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );

      // 4. Only push local apps to server on initial page load if missing on server
      if (showSpinner) {
        const missingOnServer = localApps.filter(
          (loc) =>
            loc.status !== 'TRASH' &&
            !loc.isDeleted &&
            !serverApps.some((srv) => srv.id === loc.id || srv.referenceNumber === loc.referenceNumber)
        );
        if (missingOnServer.length > 0) {
          const sanitizedPayload = missingOnServer.map(sanitizeForSync);
          adminFetch('/api/admin/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sanitizedPayload),
          }).catch(() => { });
        }
      }

      // 5. Keep local storage refreshed with the latest unified records
      if (typeof window !== 'undefined' && combined.length > 0) {
        try {
          localStorage.setItem('flamecars_submitted_applications', JSON.stringify(combined));
        } catch { }
      }

      setApplications(combined);

      // 6. Ensure selectedApp reflects the latest updated record in real-time
      setSelectedApp((currentSelected) => {
        if (!currentSelected) return null;
        const fresh = combined.find(
          (a) =>
            a.id === currentSelected.id ||
            (a.referenceNumber && a.referenceNumber === currentSelected.referenceNumber) ||
            (a.mobileNumber &&
              a.mobileNumber.replace(/\s+/g, '') ===
              (currentSelected.mobileNumber || '').replace(/\s+/g, ''))
        );
        return fresh || currentSelected;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Seed demo applicant for testing compliance review immediately
  async function seedDemoDriver() {
    const demoApp: DriverApplication = {
      id: 'demo_101',
      referenceNumber: 'FLM-DRV-2026-1001',
      status: 'SUBMITTED',
      currentStep: 5,
      updatedAt: new Date().toISOString(),
      legalName: 'Tariq Mahmood',
      mobileNumber: '07700900542',
      isMobileVerified: true,
      email: 'tariq.mahmood@example.com',
      residentialAddress: '42 Station Road, Harrow',
      postcode: 'HA1 2TY',
      nationalInsuranceNumber: 'QQ 12 34 56 C',
      tflDriverBadgeNum: '089421',
      tflDriverBadgeExpiry: '2027-08-15',
      vrm: 'LM71 XKD',
      make: 'Mercedes-Benz',
      model: 'E220d AMG Line',
      colour: 'Obsidian Black',
      year: '2022',
      passengerSeats: 4,
      tflPhvVehicleLicence: '49281',
      tflPhvVehicleExpiry: '2027-06-30',
      vehicleCategory: 'Executive',
      bankAccountName: 'Tariq Mahmood',
      bankAccountNumber: '84910293',
      bankSortCode: '20-40-71',
      preferredAirports: ['Heathrow Airport (LHR)', 'Gatwick Airport (LGW)'],
      operatingZones: ['West London / Harrow', 'Central London'],
      termsAccepted: true,
      signatureDataUrl: 'Tariq Mahmood',
      consentAccuracy: true,
      tflRegisterVerified: false,
      tbmsSyncStatus: 'NOT_SYNCED',
      documents: {
        TFL_PHV_DRIVER_BADGE_FRONT: {
          id: 'doc_1',
          type: 'TFL_PHV_DRIVER_BADGE_FRONT',
          title: 'TfL PHV Driver Badge (Front)',
          filename: 'tfl_badge_front.jpg',
          fileSize: 450000,
          mimeType: 'image/jpeg',
          dataUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
          expiryDate: '2027-08-15',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
          aiExtractedData: {
            confidence: 0.97,
            fullName: 'Tariq Mahmood',
            licenceNumber: '089421',
            expiryDate: '2027-08-15',
            summary: 'TfL PHV Driver Badge #089421 identified for Tariq Mahmood. Expiry: 15/08/2027.',
          },
        },
        TFL_PHV_DRIVER_BADGE_BACK: {
          id: 'doc_2',
          type: 'TFL_PHV_DRIVER_BADGE_BACK',
          title: 'TfL PHV Driver Badge (Back)',
          filename: 'tfl_badge_back.jpg',
          fileSize: 380000,
          mimeType: 'image/jpeg',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        DVLA_DRIVING_LICENCE_FRONT: {
          id: 'doc_3',
          type: 'DVLA_DRIVING_LICENCE_FRONT',
          title: 'DVLA Driving Licence (Front)',
          filename: 'dvla_licence.jpg',
          fileSize: 520000,
          mimeType: 'image/jpeg',
          dataUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=600&auto=format&fit=crop&q=80',
          expiryDate: '2030-05-12',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        DVLA_DRIVING_LICENCE_BACK: {
          id: 'doc_4',
          type: 'DVLA_DRIVING_LICENCE_BACK',
          title: 'DVLA Driving Licence (Back)',
          filename: 'dvla_back.jpg',
          fileSize: 310000,
          mimeType: 'image/jpeg',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        TFL_PHV_VEHICLE_LICENCE: {
          id: 'doc_5',
          type: 'TFL_PHV_VEHICLE_LICENCE',
          title: 'TfL PHV Vehicle Licence Disc',
          filename: 'vehicle_phv_disc.jpg',
          fileSize: 600000,
          mimeType: 'image/jpeg',
          expiryDate: '2027-06-30',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        HIRE_REWARD_INSURANCE: {
          id: 'doc_6',
          type: 'HIRE_REWARD_INSURANCE',
          title: 'Hire & Reward Insurance Certificate',
          filename: 'flame_cars_insurance.pdf',
          fileSize: 1200000,
          mimeType: 'application/pdf',
          dataUrl:
            'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCA2MTIgNzkyXS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDw+Pi9Db250ZW50cyA0IDAgUj4+ZW5kb2JqCjQgMCBvYmo8PC9MZW5ndGggNTU+PnN0cmVhbQpCVCAvRjEgMTIgVGYgNzIgNzEyIFRkIChGbGFtZSBDYXJzIExvbmRvbiBDb21wbGlhbmNlIENlcnRpZmljYXRlKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDUyIDAwMDAwIG4gCjAwMDAwMDAxMDIgMDAwMDAgbiAKMDAwMDAwMDE5MiAwMDAwMCBuIAp0cmFpbGVyPDwvU2l6ZSA1L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjk3CiUlRU9G',
          expiryDate: '2027-04-10',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        MOT_CERTIFICATE: {
          id: 'doc_7',
          type: 'MOT_CERTIFICATE',
          title: 'MOT Certificate',
          filename: 'mot_2026.pdf',
          fileSize: 240000,
          mimeType: 'application/pdf',
          dataUrl:
            'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCA2MTIgNzkyXS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDw+Pi9Db250ZW50cyA0IDAgUj4+ZW5kb2JqCjQgMCBvYmo8PC9MZW5ndGggNTU+PnN0cmVhbQpCVCAvRjEgMTIgVGYgNzIgNzEyIFRkIChGbGFtZSBDYXJzIExvbmRvbiBDb21wbGlhbmNlIENlcnRpZmljYXRlKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDUyIDAwMDAwIG4gCjAwMDAwMDAxMDIgMDAwMDAgbiAKMDAwMDAwMDE5MiAwMDAwMCBuIAp0cmFpbGVyPDwvU2l6ZSA1L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjk3CiUlRU9G',
          expiryDate: '2027-03-20',
          status: 'PENDING',
          uploadedAt: new Date().toISOString(),
        },
        V5C_LOGBOOK: null,
      },
    };

    await fetch('/api/onboarding/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(demoApp),
    });
    loadApplications();
  }

  // Handle Document Approval / Rejection with instant optimistic state update
  async function handleDocReview(docType: DocumentType, action: 'APPROVE' | 'REJECT', reason?: string) {
    if (!selectedApp) return;
    setActionLoading(true);

    const existingDoc = selectedApp.documents[docType] || {
      id: 'doc_' + Math.random().toString(36).substring(2, 9),
      type: docType,
      title: docType,
      filename: 'document',
      fileSize: 0,
      mimeType: 'application/octet-stream',
      status: 'PENDING',
      uploadedAt: new Date().toISOString(),
    };

    const updatedDoc = {
      ...existingDoc,
      status: action === 'APPROVE' ? ('APPROVED' as const) : ('REJECTED' as const),
      rejectionReason: action === 'REJECT' ? (reason || 'Document rejected by compliance reviewer.') : undefined,
    };

    const updatedDocuments = {
      ...selectedApp.documents,
      [docType]: updatedDoc,
    };

    // Check if all mandatory documents are now approved
    const mandatoryKeys: DocumentType[] = [
      'TFL_PHV_DRIVER_BADGE_FRONT',
      'DVLA_DRIVING_LICENCE_FRONT',
      'TFL_PHV_VEHICLE_LICENCE',
      'HIRE_REWARD_INSURANCE',
    ];
    const allApproved = mandatoryKeys.every((k) => updatedDocuments[k]?.status === 'APPROVED');
    let newAppStatus = selectedApp.status;
    if (action === 'REJECT') {
      newAppStatus = 'ACTION_REQUIRED';
    } else if (allApproved && (selectedApp.status === 'SUBMITTED' || selectedApp.status === 'UNDER_REVIEW')) {
      newAppStatus = 'APPROVED_PENDING_TBMS';
    }

    const optimisticApp: DriverApplication = {
      ...selectedApp,
      status: newAppStatus,
      documents: updatedDocuments,
      updatedAt: new Date().toISOString(),
    };

    // Instant UI update
    setSelectedApp(optimisticApp);
    setApplications((prev) => prev.map((a) => (a.id === selectedApp.id ? optimisticApp : a)));
    setInspectDocType(null);
    setRejectReason('');
    setActionMessage({ text: `Document successfully ${action.toLowerCase()}d ✓`, type: 'success' });

    try {
      const res = await adminFetch('/api/admin/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: selectedApp.id,
          docType,
          action,
          reason,
          application: sanitizeForSync(optimisticApp),
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.application) {
        setSelectedApp(resData.application);
        setApplications((prev) => prev.map((a) => (a.id === selectedApp.id ? resData.application : a)));
        persistAppToLocal(resData.application);
      }
    } catch (err) {
      console.warn('Network sync for doc review:', err);
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 3500);
    }
  }

  // Handle Gated TBMS Sync
  async function handleTbmsSync(appId: string) {
    setActionLoading(true);
    setActionMessage({ text: 'Syncing driver with TBMS server (CreateDriver.php)...', type: 'success' });

    try {
      const res = await adminFetch('/api/admin/tbms-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, forceSync: true }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.application) {
        setSelectedApp(data.application);
        setApplications((prev) => prev.map((a) => (a.id === appId ? data.application : a)));
        persistAppToLocal(data.application);
        setActionMessage({
          text: `Success! Driver is now ACTIVE in TBMS (ID: ${data.application.tbmsDriverId || 'Synced'}) ✓`,
          type: 'success',
        });
      } else if (data.alreadyExists) {
        setActionMessage({
          text: `⚠️ TBMS Re-sync: TBMS returned 'Mobile number is already in use.' Because CreateDriver.php is insert-only, TBMS cannot update existing drivers via API. Please update the name in TBMS Admin Console (click 'Copy Updated Details for TBMS' below).`,
          type: 'error',
        });
      } else {
        setActionMessage({ text: data.error || 'TBMS sync error', type: 'error' });
      }
    } catch {
      setActionMessage({ text: 'TBMS integration call failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Resend Registration Email
  async function handleResendEmail(appId: string) {
    setActionLoading(true);
    setActionMessage({ text: 'Dispatching registration email via Mailgun...', type: 'success' });

    try {
      const res = await adminFetch('/api/admin/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.application) {
          setSelectedApp(data.application);
          setApplications((prev) => prev.map((a) => (a.id === appId ? data.application : a)));
          persistAppToLocal(data.application);
        }
        setActionMessage({
          text: `Email successfully delivered to ${selectedApp?.email}! (ID: ${data.messageId || 'queued'}) ✓`,
          type: 'success',
        });
      } else {
        setActionMessage({
          text: `Failed to send email: ${data.error || 'Check Mailgun configuration'}`,
          type: 'error',
        });
      }
    } catch {
      setActionMessage({ text: 'Network failure calling email dispatch endpoint', type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 6000);
    }
  }

  // Acknowledge driver's updated name in TBMS
  async function handleAcknowledgeNameUpdate() {
    if (!selectedApp) return;
    setActionLoading(true);
    const updated: DriverApplication = {
      ...selectedApp,
      syncedName: selectedApp.legalName,
      detailsModifiedAfterSync: false,
      lastModifiedFields: [],
      updatedAt: new Date().toISOString(),
    };
    setSelectedApp(updated);
    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    persistAppToLocal(updated);
    try {
      await adminFetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizeForSync(updated)),
      });
      setActionMessage({ text: 'TBMS driver name update marked as confirmed ✓', type: 'success' });
    } catch {
      setActionMessage({ text: 'Saved locally. Server sync pending.', type: 'success' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  }

  // Copy updated driver details to clipboard for easy pasting into TBMS Admin console
  function handleCopyTbmsDetails() {
    if (!selectedApp) return;
    const lines = [
      `DRIVER PROFILE UPDATE FOR TBMS DISPATCH`,
      `Full Legal Name: ${selectedApp.legalName}`,
      `Telephone/Mobile: ${selectedApp.mobileNumber}`,
      `Driver Email: ${selectedApp.email}`,
      `Residential Address: ${selectedApp.residentialAddress}, ${selectedApp.postcode}`,
      `Vehicle: ${selectedApp.make} ${selectedApp.model} (${selectedApp.colour || 'Standard'})`,
      `VRM: ${selectedApp.vrm} | Category: ${selectedApp.vehicleCategory}`,
      `TfL Driver Badge: ${selectedApp.tflDriverBadgeNum} (Exp: ${selectedApp.tflDriverBadgeExpiry})`,
      `PHV Vehicle Licence: ${selectedApp.tflPhvVehicleLicence} (Exp: ${selectedApp.tflPhvVehicleExpiry})`,
      `National Insurance: ${selectedApp.nationalInsuranceNumber || 'N/A'}`,
      `Bank: ${selectedApp.bankAccountName} | A/C: ${selectedApp.bankAccountNumber} | Sort: ${selectedApp.bankSortCode}`,
    ];
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(lines.join('\n'));
      setActionMessage({ text: 'Driver details copied to clipboard for TBMS console ✓', type: 'success' });
      setTimeout(() => setActionMessage(null), 4000);
    }
  }

  // Handle Quick Lookup by Ref or Mobile
  async function handleQuickLookup(identifier: string) {
    if (!identifier.trim()) return;
    setActionLoading(true);
    setActionMessage({ text: `Looking up applicant "${identifier}"...`, type: 'success' });

    try {
      const res = await adminFetch(`/api/onboarding/draft?identifier=${encodeURIComponent(identifier.trim())}`);
      const data = await res.json();
      if (res.ok && data.application) {
        const found: DriverApplication = data.application;
        setApplications((prev) => {
          const map = new Map<string, DriverApplication>();
          for (const a of prev) map.set(a.referenceNumber || a.id, a);
          map.set(found.referenceNumber || found.id, found);
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
          );
        });
        setSelectedApp(found);
        setActionMessage({
          text: `Found applicant: ${found.legalName} (${found.referenceNumber}) ✓`,
          type: 'success',
        });
      } else {
        setActionMessage({ text: `No applicant found matching "${identifier}"`, type: 'error' });
      }
    } catch {
      setActionMessage({ text: `Failed to query "${identifier}"`, type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  }

  // Move driver application to Trash (Soft delete)
  async function handleMoveToTrash(appId: string) {
    setActionLoading(true);
    try {
      const res = await adminFetch(`/api/admin/applications?id=${encodeURIComponent(appId)}&action=trash`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: 'Driver application moved to Trash ✓', type: 'success' });
        setApplications((prev) =>
          prev.map((a) =>
            a.id === appId
              ? { ...a, status: 'TRASH', isDeleted: true, deletedAt: new Date().toISOString(), previousStatus: a.status }
              : a
          )
        );
        setSelectedApp((curr) =>
          curr?.id === appId
            ? { ...curr, status: 'TRASH', isDeleted: true, deletedAt: new Date().toISOString(), previousStatus: curr.status }
            : curr
        );
        await loadApplications(false);
      } else {
        setActionMessage({ text: data.error || 'Failed to move applicant to Trash', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error moving applicant to Trash', type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  }

  // Restore driver application from Trash
  async function handleRestoreFromTrash(appId: string) {
    setActionLoading(true);
    try {
      const res = await adminFetch(`/api/admin/applications?id=${encodeURIComponent(appId)}&action=restore`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: 'Driver application restored from Trash ✓', type: 'success' });
        setApplications((prev) =>
          prev.map((a) =>
            a.id === appId
              ? {
                  ...a,
                  status: a.previousStatus || 'UNDER_REVIEW',
                  isDeleted: false,
                  deletedAt: undefined,
                  previousStatus: undefined,
                }
              : a
          )
        );
        setSelectedApp((curr) =>
          curr?.id === appId
            ? {
                ...curr,
                status: curr.previousStatus || 'UNDER_REVIEW',
                isDeleted: false,
                deletedAt: undefined,
                previousStatus: undefined,
              }
            : curr
        );
        await loadApplications(false);
      } else {
        setActionMessage({ text: data.error || 'Failed to restore applicant', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error restoring applicant', type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  }

  // Permanently delete driver application (Hard delete)
  async function handlePermanentDelete(appId: string) {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('⚠️ Are you sure you want to permanently delete this driver registration? This cannot be undone.')
    ) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await adminFetch(`/api/admin/applications?id=${encodeURIComponent(appId)}&action=permanent`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: 'Driver registration permanently deleted ✓', type: 'success' });
        if (selectedApp?.id === appId) {
          setSelectedApp(null);
        }
        setApplications((prev) => prev.filter((a) => a.id !== appId));
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('flamecars_submitted_applications');
            if (raw) {
              const list: DriverApplication[] = JSON.parse(raw);
              localStorage.setItem('flamecars_submitted_applications', JSON.stringify(list.filter((a) => a.id !== appId)));
            }
          } catch {}
        }
        await loadApplications(false);
      } else {
        setActionMessage({ text: data.error || 'Failed to permanently delete applicant', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error deleting applicant', type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  }

  // Empty all items in Trash
  async function handleEmptyTrash() {
    const trashItems = applications.filter((a) => a.status === 'TRASH' || a.isDeleted);
    if (trashItems.length === 0) return;

    if (
      typeof window !== 'undefined' &&
      !window.confirm(`⚠️ Are you sure you want to permanently delete all ${trashItems.length} item(s) in Trash? This cannot be undone.`)
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminFetch('/api/admin/applications?action=empty-trash', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: `Trash emptied successfully (${trashItems.length} items removed) ✓`, type: 'success' });
        if (selectedApp && (selectedApp.status === 'TRASH' || selectedApp.isDeleted)) {
          setSelectedApp(null);
        }
        const trashIds = new Set(trashItems.map((a) => a.id));
        setApplications((prev) => prev.filter((a) => !trashIds.has(a.id)));
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('flamecars_submitted_applications');
            if (raw) {
              const list: DriverApplication[] = JSON.parse(raw);
              localStorage.setItem(
                'flamecars_submitted_applications',
                JSON.stringify(list.filter((a) => !trashIds.has(a.id)))
              );
            }
          } catch {}
        }
        await loadApplications(false);
      } else {
        setActionMessage({ text: data.error || 'Failed to empty Trash', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error emptying Trash', type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  }

  // Export applications (JSON or CSV)
  function exportApplications(format: 'json' | 'csv') {
    const exportList = applications;
    const dateStamp = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      const jsonStr = JSON.stringify(exportList, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flamecars_drivers_${dateStamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setActionMessage({ text: `Exported ${exportList.length} driver registrations to JSON ✓`, type: 'success' });
    } else {
      const headers = [
        'Reference Number',
        'Legal Name',
        'Mobile Number',
        'Email',
        'Status',
        'Vehicle Category',
        'VRM',
        'Make',
        'Model',
        'Colour',
        'Seats',
        'TfL Driver Badge',
        'Badge Expiry',
        'PHV Vehicle Licence',
        'PHV Vehicle Expiry',
        'Residential Address',
        'Postcode',
        'National Insurance',
        'Bank Account Name',
        'Bank Account Number',
        'Bank Sort Code',
        'TBMS Driver ID',
        'TBMS Sync Status',
        'Submitted At',
        'Updated At',
      ];

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      };

      const rows = exportList.map((a) => [
        escapeCsv(a.referenceNumber || a.id),
        escapeCsv(a.legalName),
        escapeCsv(a.mobileNumber),
        escapeCsv(a.email),
        escapeCsv(a.status),
        escapeCsv(a.vehicleCategory),
        escapeCsv(a.vrm),
        escapeCsv(a.make),
        escapeCsv(a.model),
        escapeCsv(a.colour),
        escapeCsv(a.passengerSeats || 4),
        escapeCsv(a.tflDriverBadgeNum),
        escapeCsv(a.tflDriverBadgeExpiry),
        escapeCsv(a.tflPhvVehicleLicence),
        escapeCsv(a.tflPhvVehicleExpiry),
        escapeCsv(a.residentialAddress),
        escapeCsv(a.postcode),
        escapeCsv(a.nationalInsuranceNumber),
        escapeCsv(a.bankAccountName),
        escapeCsv(a.bankAccountNumber),
        escapeCsv(a.bankSortCode),
        escapeCsv(a.tbmsDriverId || ''),
        escapeCsv(a.tbmsSyncStatus || ''),
        escapeCsv(a.submittedAt || ''),
        escapeCsv(a.updatedAt || ''),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flamecars_drivers_${dateStamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setActionMessage({ text: `Exported ${exportList.length} driver registrations to CSV ✓`, type: 'success' });
    }
    setTimeout(() => setActionMessage(null), 4000);
  }

  // Import applications from file (JSON or CSV)
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionLoading(true);
    setActionMessage({ text: `Importing ${file.name}...`, type: 'success' });

    try {
      const text = await file.text();
      let imported: Partial<DriverApplication>[] = [];

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          imported = parsed;
        } else if (parsed && Array.isArray(parsed.applications)) {
          imported = parsed.applications;
        } else if (parsed && (parsed.legalName || parsed.id || parsed.mobileNumber)) {
          imported = [parsed];
        } else {
          throw new Error('Invalid JSON structure: Expected an array of driver applications');
        }
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error('CSV is empty or missing data rows');
        }

        const parseCsvLine = (line: string): string[] => {
          const result: string[] = [];
          let cur = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(cur.trim());
              cur = '';
            } else {
              cur += char;
            }
          }
          result.push(cur.trim());
          return result;
        };

        const rawHeaders = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const findCol = (aliases: string[]) => rawHeaders.findIndex((h) => aliases.includes(h));

        const idxRef = findCol(['referencenumber', 'reference', 'ref', 'id']);
        const idxName = findCol(['legalname', 'fulllegalname', 'name', 'drivername']);
        const idxMobile = findCol(['mobilenumber', 'mobile', 'phone', 'telephone']);
        const idxEmail = findCol(['email', 'driveremail']);
        const idxStatus = findCol(['status', 'applicationstatus']);
        const idxCat = findCol(['vehiclecategory', 'category', 'vehicletype']);
        const idxVrm = findCol(['vrm', 'vrmregistration', 'registration', 'carreg']);
        const idxMake = findCol(['make', 'vehiclemake']);
        const idxModel = findCol(['model', 'vehiclemodel']);
        const idxColour = findCol(['colour', 'color']);
        const idxSeats = findCol(['seats', 'passengerseats']);
        const idxBadge = findCol(['tfldriverbadge', 'badge', 'badgenumber', 'tflbadge']);
        const idxBadgeExp = findCol(['badgeexpiry', 'tflbadgeexpiry']);
        const idxPhvLic = findCol(['phvvehiclelicence', 'vehiclelicence']);
        const idxPhvExp = findCol(['phvvehicleexpiry', 'phvexpiry']);
        const idxAddress = findCol(['residentialaddress', 'address']);
        const idxPostcode = findCol(['postcode', 'postalcode']);
        const idxNi = findCol(['nationalinsurance', 'ninumber', 'ni']);
        const idxBankName = findCol(['bankaccountname', 'accountname']);
        const idxBankAcc = findCol(['bankaccountnumber', 'accountnumber', 'accountno']);
        const idxSort = findCol(['banksortcode', 'sortcode']);
        const idxTbmsId = findCol(['tbmsdriverid', 'driverid']);

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          if (cols.length === 0 || cols.every((c) => !c)) continue;

          const rowApp: any = {
            legalName: idxName >= 0 ? cols[idxName] : '',
            mobileNumber: idxMobile >= 0 ? cols[idxMobile] : '',
            email: idxEmail >= 0 ? cols[idxEmail] : '',
            residentialAddress: idxAddress >= 0 ? cols[idxAddress] : '',
            postcode: idxPostcode >= 0 ? cols[idxPostcode] : '',
            vehicleCategory: idxCat >= 0 && cols[idxCat] ? cols[idxCat] : 'Saloon',
            vrm: idxVrm >= 0 ? cols[idxVrm] : '',
            make: idxMake >= 0 ? cols[idxMake] : '',
            model: idxModel >= 0 ? cols[idxModel] : '',
            colour: idxColour >= 0 ? cols[idxColour] : '',
            passengerSeats: idxSeats >= 0 && parseInt(cols[idxSeats]) ? parseInt(cols[idxSeats]) : 4,
            tflDriverBadgeNum: idxBadge >= 0 ? cols[idxBadge] : '',
            tflDriverBadgeExpiry: idxBadgeExp >= 0 ? cols[idxBadgeExp] : '',
            tflPhvVehicleLicence: idxPhvLic >= 0 ? cols[idxPhvLic] : '',
            tflPhvVehicleExpiry: idxPhvExp >= 0 ? cols[idxPhvExp] : '',
            nationalInsuranceNumber: idxNi >= 0 ? cols[idxNi] : '',
            bankAccountName: idxBankName >= 0 ? cols[idxBankName] : '',
            bankAccountNumber: idxBankAcc >= 0 ? cols[idxBankAcc] : '',
            bankSortCode: idxSort >= 0 ? cols[idxSort] : '',
            status: idxStatus >= 0 && cols[idxStatus] ? cols[idxStatus] : 'UNDER_REVIEW',
            tbmsDriverId: idxTbmsId >= 0 && cols[idxTbmsId] ? cols[idxTbmsId] : undefined,
            referenceNumber: idxRef >= 0 && cols[idxRef] ? cols[idxRef] : undefined,
            updatedAt: new Date().toISOString(),
          };

          if (rowApp.legalName || rowApp.mobileNumber || rowApp.referenceNumber) {
            imported.push(rowApp);
          }
        }
      } else {
        throw new Error('Unsupported format. Please select a .json or .csv file');
      }

      if (imported.length === 0) {
        throw new Error('No valid driver entries found in file');
      }

      const res = await adminFetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imported),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({
          text: `Successfully imported ${imported.length} driver registration(s) into portal ✓`,
          type: 'success',
        });
        await loadApplications();
      } else {
        throw new Error(data.error || 'Server rejected imported records');
      }
    } catch (err: any) {
      console.error('Import Error:', err);
      setActionMessage({ text: `Import failed: ${err.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
      if (e.target) e.target.value = '';
      setTimeout(() => setActionMessage(null), 5000);
    }
  }

  // Counts & Trash Status
  const isTrashApp = (a: DriverApplication) => a.status === 'TRASH' || Boolean(a.isDeleted);
  const activeAppsCount = applications.filter((a) => !isTrashApp(a)).length;
  const underReviewCount = applications.filter(
    (a) => (a.status === 'UNDER_REVIEW' || a.status === 'SUBMITTED') && !isTrashApp(a)
  ).length;
  const actionRequiredCount = applications.filter((a) => a.status === 'ACTION_REQUIRED' && !isTrashApp(a)).length;
  const activeDispatchCount = applications.filter((a) => a.status === 'ACTIVE' && !isTrashApp(a)).length;
  const trashCount = applications.filter((a) => isTrashApp(a)).length;

  // Filtered List
  const filteredApps = applications.filter((app) => {
    const inTrash = isTrashApp(app);

    if (filterStatus === 'TRASH') {
      if (!inTrash) return false;
    } else {
      if (inTrash) return false;

      if (filterStatus !== 'ALL') {
        if (filterStatus === 'UNDER_REVIEW' || filterStatus === 'SUBMITTED' || filterStatus === 'INACTIVE') {
          if (app.status !== 'UNDER_REVIEW' && app.status !== 'SUBMITTED') return false;
        } else if (app.status !== filterStatus) {
          return false;
        }
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.legalName?.toLowerCase().includes(q);
      const matchMobile = app.mobileNumber?.includes(q);
      const matchVrm = app.vrm?.toLowerCase().includes(q);
      const matchRef = app.referenceNumber?.toLowerCase().includes(q);
      return matchName || matchMobile || matchVrm || matchRef;
    }
    return true;
  });

  // 1. Loading State while checking authentication
  if (isAuthenticated === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--flame-400)', fontSize: '15px' }}>Verifying Staff Session...</div>
      </div>
    );
  }

  // 2. Unauthenticated: Render Staff Portal Login Form
  if (!isAuthenticated) {
    return (
      <div className="container" style={{ paddingTop: '60px', maxWidth: '440px' }}>
        <div className="glass-panel animate-fade-in" style={{ padding: '36px 30px', borderRadius: 'var(--radius-xl)' }}>
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: 'var(--flame-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
                boxShadow: 'var(--flame-glow)',
              }}
            >
              <span style={{ fontSize: '28px' }}>🔥</span>
            </div>
            <h1 style={{ fontSize: '24px', marginBottom: '6px' }}>Staff & Compliance Portal</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Restricted access for Flame Cars operations and compliance officers.
            </p>
          </div>

          {loginError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                fontSize: '13px',
                marginBottom: '20px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Staff Email Address
              </label>
              <input
                type="email"
                placeholder="admin@flamecars.co.uk"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', color: 'var(--flame-400)', fontSize: '12px', border: 'none' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            >
              {loginLoading ? 'Signing In...' : 'Sign In to Staff Portal →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Authenticated: Render Full Dashboard
  return (
    <div className="container" style={{ paddingTop: '24px', maxWidth: '1100px' }}>
      {/* Top Staff Auth Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: '#ffffff',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <span>👤</span>
          <span>
            Signed in as: <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.email || 'admin@flamecars.co.uk'}</strong>
          </span>
          <span className="badge badge-approved" style={{ fontSize: '10px', padding: '2px 8px' }}>
            {currentUser?.role || 'SUPER_ADMIN'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--danger)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Main Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Flame Cars Operations Portal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Compliance &amp; Driver Onboarding • Customer Bookings &amp; TBMS Dispatch Adapter
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {activeTab === 'drivers' && (
            <>
              {/* Hidden file input for importing driver registrations */}
              <input
                type="file"
                ref={importFileInputRef}
                onChange={handleImportFile}
                accept=".json,.csv"
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                disabled={actionLoading}
                className="btn-secondary"
                style={{ fontSize: '13px', padding: '8px 14px', fontWeight: 600 }}
                title="Import driver registrations from JSON or CSV"
              >
                ⬆️ Import
              </button>

              {/* Export dropdown menu */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExportMenu(!showExportMenu);
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '13px', padding: '8px 14px', fontWeight: 600 }}
                  title="Export driver registration entries"
                >
                  ⬇️ Export ▾
                </button>
                {showExportMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: '4px',
                      background: '#ffffff',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
                      zIndex: 50,
                      minWidth: '160px',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        exportApplications('json');
                        setShowExportMenu(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        background: 'none',
                        border: 'none',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--flame-50)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <span>📄</span> Export as JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportApplications('csv');
                        setShowExportMenu(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        background: 'none',
                        border: 'none',
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--flame-50)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <span>📊</span> Export as CSV
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => {
              loadApplications();
              loadBookings();
            }}
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '8px 14px' }}
          >
            🔄 Refresh All
          </button>
          {activeTab === 'drivers' && (
            <button onClick={seedDemoDriver} className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px' }}>
              + Seed Test Driver
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Driver Applications vs Customer Bookings */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-medium)', marginBottom: '22px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('drivers')}
          style={{
            padding: '10px 18px',
            fontWeight: 700,
            fontSize: '14px',
            border: 'none',
            borderBottom: activeTab === 'drivers' ? '3px solid var(--flame-500)' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'drivers' ? 'var(--flame-500)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          📋 Driver Applications ({activeAppsCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          style={{
            padding: '10px 18px',
            fontWeight: 700,
            fontSize: '14px',
            border: 'none',
            borderBottom: activeTab === 'bookings' ? '3px solid var(--flame-500)' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'bookings' ? 'var(--flame-500)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          🚗 Customer Bookings ({bookings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pricing')}
          style={{
            padding: '10px 18px',
            fontWeight: 700,
            fontSize: '14px',
            border: 'none',
            borderBottom: activeTab === 'pricing' ? '3px solid var(--flame-500)' : '3px solid transparent',
            background: 'none',
            color: activeTab === 'pricing' ? 'var(--flame-500)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          🏷️ Pricing &amp; Promotions
        </button>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            background: actionMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: actionMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '18px',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          }}
        >
          {actionMessage.text}
        </div>
      )}

      {/* ================= TAB 1: DRIVER APPLICATIONS ================= */}
      {activeTab === 'drivers' && (
        <>
          {/* Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              className="glass-panel"
              onClick={() => setFilterStatus('ALL')}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border: filterStatus === 'ALL' ? '2px solid var(--flame-500)' : '1px solid var(--border-medium)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE APPLICANTS</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{activeAppsCount}</div>
            </div>

            <div
              className="glass-panel"
              onClick={() => setFilterStatus('UNDER_REVIEW')}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border: filterStatus === 'UNDER_REVIEW' ? '2px solid #b45309' : '1px solid var(--border-medium)',
              }}
            >
              <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700 }}>INACTIVE (UNDER REVIEW)</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                {underReviewCount}
              </div>
            </div>

            <div
              className="glass-panel"
              onClick={() => setFilterStatus('ACTION_REQUIRED')}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border: filterStatus === 'ACTION_REQUIRED' ? '2px solid var(--warning)' : '1px solid var(--border-medium)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: 700 }}>ACTION REQUIRED</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--warning)', marginTop: '4px' }}>
                {actionRequiredCount}
              </div>
            </div>

            <div
              className="glass-panel"
              onClick={() => setFilterStatus('ACTIVE')}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border: filterStatus === 'ACTIVE' ? '2px solid var(--success)' : '1px solid var(--border-medium)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 700 }}>DISPATCH ACTIVE</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                {activeDispatchCount}
              </div>
            </div>

            <div
              className="glass-panel"
              onClick={() => setFilterStatus('TRASH')}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                background: filterStatus === 'TRASH' ? '#fef2f2' : '#ffffff',
                border: filterStatus === 'TRASH' ? '2px solid var(--danger)' : '1px solid var(--border-medium)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 700 }}>🗑️ TRASH</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--danger)', marginTop: '4px' }}>
                {trashCount}
              </div>
            </div>
          </div>

          {/* Main Content Layout: List on Left, Detail on Right */}
          <div style={{ display: 'grid', gridTemplateColumns: selectedApp ? '1fr 1.4fr' : '1fr', gap: '20px' }}>
            {/* Applications List */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
              {/* Search & Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Search or paste FLM-DRV- ref / mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickLookup(searchQuery);
                    }}
                    style={{ fontSize: '13px', padding: '10px 12px', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickLookup(searchQuery)}
                    className="btn-secondary"
                    style={{ padding: '10px 14px', fontSize: '12px', whiteSpace: 'nowrap', fontWeight: 600 }}
                    title="Lookup exact applicant from server storage"
                  >
                    🔍 Find
                  </button>
                  <button
                    type="button"
                    onClick={loadApplications}
                    className="btn-secondary"
                    style={{ padding: '10px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                    title="Reload latest applications"
                  >
                    🔄 Refresh
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'ALL', label: `ALL (${activeAppsCount})` },
                    { id: 'UNDER_REVIEW', label: `UNDER REVIEW (${underReviewCount})` },
                    { id: 'ACTION_REQUIRED', label: `ACTION REQUIRED (${actionRequiredCount})` },
                    { id: 'ACTIVE', label: `ACTIVE TBMS (${activeDispatchCount})` },
                    { id: 'TRASH', label: `🗑️ TRASH (${trashCount})`, danger: true },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterStatus(tab.id)}
                      className="btn-secondary"
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        background:
                          filterStatus === tab.id
                            ? tab.danger
                              ? 'var(--danger)'
                              : 'var(--flame-gradient)'
                            : '#ffffff',
                        color:
                          filterStatus === tab.id
                            ? '#ffffff'
                            : tab.danger && trashCount > 0
                            ? 'var(--danger)'
                            : 'var(--text-secondary)',
                        border:
                          filterStatus === tab.id
                            ? tab.danger
                              ? '1px solid var(--danger)'
                              : '1px solid var(--flame-500)'
                            : tab.danger && trashCount > 0
                            ? '1px solid rgba(239, 68, 68, 0.4)'
                            : '1px solid var(--border-medium)',
                        fontWeight: filterStatus === tab.id ? 700 : 500,
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trash Notice & Empty Trash Bar */}
              {filterStatus === 'TRASH' && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '14px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: 600 }}>
                    🗑️ Trash: {trashCount} deleted registration{trashCount !== 1 ? 's' : ''}
                  </span>
                  {trashCount > 0 && (
                    <button
                      type="button"
                      onClick={handleEmptyTrash}
                      disabled={actionLoading}
                      style={{
                        background: 'var(--danger)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Empty Trash
                    </button>
                  )}
                </div>
              )}

          {/* List Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading records...</div>
            ) : filteredApps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No applications match.</div>
            ) : (
              filteredApps.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                const isAppTrash = app.status === 'TRASH' || Boolean(app.isDeleted);
                const isAppActive = app.status === 'ACTIVE' && !isAppTrash;
                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--flame-50)' : isAppTrash ? '#fffbfb' : '#ffffff',
                      border: isSelected
                        ? '2px solid var(--flame-500)'
                        : isAppTrash
                        ? '1px solid #fecaca'
                        : '1px solid var(--border-medium)',
                      boxShadow: isSelected ? '0 2px 8px rgba(234, 88, 12, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>
                        {app.legalName || 'Draft Applicant'}
                        {(app.detailsModifiedAfterSync ||
                          (app.syncedName && app.syncedName.trim() !== app.legalName.trim())) && !isAppTrash && (
                            <span
                              style={{
                                marginLeft: '6px',
                                fontSize: '10px',
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #fde68a',
                              }}
                              title="Driver updated details after initial registration/sync"
                            >
                              UPDATED
                            </span>
                          )}
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          background: isAppTrash ? '#fee2e2' : isAppActive ? '#d1fae5' : '#fef3c7',
                          color: isAppTrash ? '#b91c1c' : isAppActive ? '#047857' : '#b45309',
                          border: `1px solid ${isAppTrash ? '#fca5a5' : isAppActive ? '#a7f3d0' : '#fde68a'}`,
                        }}
                      >
                        {isAppTrash ? '🗑️ IN TRASH' : isAppActive ? 'ACTIVE (TBMS)' : 'INACTIVE'}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                      <span>Ref: {app.referenceNumber || 'N/A'}</span>
                      <span>VRM: {app.vrm || 'N/A'}</span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Badge: {app.tflDriverBadgeNum || 'N/A'} • Tel: {app.mobileNumber || 'N/A'}
                    </div>

                    {/* Quick actions for Trash tab */}
                    {isAppTrash && (
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid #fee2e2',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span style={{ fontSize: '11px', color: '#b91c1c' }}>
                          Deleted: {app.deletedAt ? new Date(app.deletedAt).toLocaleDateString() : 'In Trash'}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleRestoreFromTrash(app.id)}
                            disabled={actionLoading}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #10b981',
                              color: '#059669',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermanentDelete(app.id)}
                            disabled={actionLoading}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #ef4444',
                              color: '#dc2626',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Application Details & Document Review */}
        {selectedApp && (
          <div className="glass-panel animate-fade-in" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            {/* Top Bar with TBMS Sync Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '20px' }}>{selectedApp.legalName}</h3>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background:
                        selectedApp.status === 'TRASH' || selectedApp.isDeleted
                          ? '#fee2e2'
                          : selectedApp.status === 'ACTIVE'
                          ? '#d1fae5'
                          : '#fef3c7',
                      color:
                        selectedApp.status === 'TRASH' || selectedApp.isDeleted
                          ? '#b91c1c'
                          : selectedApp.status === 'ACTIVE'
                          ? '#047857'
                          : '#b45309',
                      border: `1px solid ${
                        selectedApp.status === 'TRASH' || selectedApp.isDeleted
                          ? '#fca5a5'
                          : selectedApp.status === 'ACTIVE'
                          ? '#a7f3d0'
                          : '#fde68a'
                      }`,
                    }}
                  >
                    {selectedApp.status === 'TRASH' || selectedApp.isDeleted
                      ? '🗑️ IN TRASH'
                      : selectedApp.status === 'ACTIVE'
                      ? '✓ ACTIVE (TBMS Dispatch)'
                      : '● INACTIVE (Pending Staff Review)'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Reference: <strong>{selectedApp.referenceNumber}</strong> • Submitted: {selectedApp.submittedAt ? new Date(selectedApp.submittedAt).toLocaleDateString() : 'Draft'}
                </div>
              </div>

              {/* Top Bar Actions (TBMS Sync & Trash management) */}
              <div>
                {selectedApp.status === 'TRASH' || selectedApp.isDeleted ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleRestoreFromTrash(selectedApp.id)}
                      disabled={actionLoading}
                      className="btn-secondary"
                      style={{
                        fontSize: '12px',
                        padding: '8px 14px',
                        fontWeight: 700,
                        color: 'var(--success)',
                        borderColor: 'rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      ♻️ Restore Driver
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(selectedApp.id)}
                      disabled={actionLoading}
                      style={{
                        background: 'var(--danger)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ❌ Permanently Delete
                    </button>
                  </div>
                ) : selectedApp.status === 'ACTIVE' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        background: '#d1fae5',
                        color: '#047857',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #a7f3d0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      ✓ TBMS Active (Driver ID: {selectedApp.tbmsDriverId || 'Synced'})
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTbmsSync(selectedApp.id)}
                      disabled={actionLoading}
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '7px 12px' }}
                      title="Re-push updated driver details to TBMS dispatch"
                    >
                      🔄 Re-sync to TBMS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveToTrash(selectedApp.id)}
                      disabled={actionLoading}
                      className="btn-secondary"
                      style={{
                        fontSize: '12px',
                        padding: '7px 12px',
                        fontWeight: 600,
                        color: 'var(--danger)',
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                      }}
                      title="Move applicant to Trash"
                    >
                      🗑️ Move to Trash
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <button
                        onClick={() => handleTbmsSync(selectedApp.id)}
                        disabled={actionLoading}
                        className="btn-primary"
                        style={{
                          fontSize: '13px',
                          padding: '10px 18px',
                          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        ✓ Approve &amp; Activate in TBMS
                      </button>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Currently Inactive. Approving activates driver in TBMS.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMoveToTrash(selectedApp.id)}
                      disabled={actionLoading}
                      className="btn-secondary"
                      style={{
                        fontSize: '12px',
                        padding: '10px 14px',
                        fontWeight: 600,
                        color: 'var(--danger)',
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                      }}
                      title="Move applicant to Trash"
                    >
                      🗑️ Move to Trash
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Trash Warning Banner when selected applicant is in Trash */}
            {(selectedApp.status === 'TRASH' || selectedApp.isDeleted) && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#fef2f2',
                  border: '1px solid #f87171',
                  color: '#991b1b',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <strong>⚠️ This applicant is currently in the Trash.</strong>
                  <div style={{ fontSize: '11px', marginTop: '2px', color: '#b91c1c' }}>
                    Deleted: {selectedApp.deletedAt ? new Date(selectedApp.deletedAt).toLocaleString() : 'Recently'}.
                    Restoring it will return it to {selectedApp.previousStatus || 'UNDER_REVIEW'}.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleRestoreFromTrash(selectedApp.id)}
                    disabled={actionLoading}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px', color: '#047857', borderColor: '#10b981' }}
                  >
                    ♻️ Restore Driver
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePermanentDelete(selectedApp.id)}
                    disabled={actionLoading}
                    style={{
                      background: 'var(--danger)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            )}

            {/* Driver Name / Details Modification Alert for Staff */}
            {(selectedApp.detailsModifiedAfterSync ||
              (selectedApp.syncedName && selectedApp.syncedName.trim() !== selectedApp.legalName.trim())) && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#fffbeb',
                    border: '1px solid #f59e0b',
                    color: '#92400e',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#b45309', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span>Driver Name Updated by Applicant</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>
                    Applicant updated full legal name to <strong>{selectedApp.legalName}</strong>
                    {selectedApp.syncedName && (
                      <span> (previously registered / synced in TBMS as <em>{selectedApp.syncedName}</em>)</span>
                    )}.
                  </div>
                  <div style={{ fontSize: '12px', color: '#b45309', marginTop: '6px' }}>
                    Note: TBMS Dispatch API (<code>CreateDriver.php</code>) is insert-only and rejects duplicate mobile numbers. To ensure TBMS dispatchers see the updated name, update the name directly in the TBMS Admin Console, or click below:
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleTbmsSync(selectedApp.id)}
                      disabled={actionLoading}
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      🔄 Push Re-sync Attempt
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyTbmsDetails}
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      📋 Copy Updated Details for TBMS
                    </button>
                    <button
                      type="button"
                      onClick={handleAcknowledgeNameUpdate}
                      disabled={actionLoading}
                      className="btn-primary"
                      style={{ fontSize: '12px', padding: '6px 12px', background: '#059669', borderColor: '#059669' }}
                    >
                      ✓ Mark TBMS Name Update Confirmed
                    </button>
                  </div>
                </div>
              )}

            {/* Document Name Discrepancy Notice for Staff */}
            {selectedApp.nameMismatchConfirmed && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#fff7ed',
                  border: '1px solid #fdba74',
                  color: '#9a3412',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 800, color: '#c2410c' }}>
                    Third-Party / Discrepant Document Name Acknowledged by Driver
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>
                    Driver Explanation: <strong>{selectedApp.nameMismatchReason || 'Confirmed third-party authorization'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Applicant Summary Accordion */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ padding: '14px', background: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ fontWeight: 600, color: 'var(--flame-600)', marginBottom: '6px' }}>👤 Driver Details</div>
                <div>Phone: <strong>{selectedApp.mobileNumber}</strong></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', margin: '3px 0' }}>
                  <div>
                    Email: <strong>{selectedApp.email}</strong>{' '}
                    {selectedApp.emailNotificationSent ? (
                      <span style={{ color: 'var(--success)', fontSize: '11px', fontWeight: 600 }}>✓ Link Sent</span>
                    ) : (
                      <span style={{ color: '#b45309', fontSize: '11px', fontWeight: 600 }}>⚠️ Not Sent</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResendEmail(selectedApp.id)}
                    disabled={actionLoading}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                    title="Send or resend registration confirmation and modify link email to driver"
                  >
                    ✉️ Resend Email
                  </button>
                </div>
                <div>Address: {selectedApp.residentialAddress}, {selectedApp.postcode}</div>
                <div>NI Number: <strong>{selectedApp.nationalInsuranceNumber || 'N/A'}</strong></div>
                <div>TfL Badge: <strong>{selectedApp.tflDriverBadgeNum}</strong> (Exp: {selectedApp.tflDriverBadgeExpiry})</div>
              </div>

              <div style={{ padding: '14px', background: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ fontWeight: 600, color: 'var(--flame-600)', marginBottom: '6px' }}>🚗 Vehicle Details</div>
                <div>VRM: <strong>{selectedApp.vrm}</strong></div>
                <div>Vehicle: {selectedApp.make} {selectedApp.model} ({selectedApp.colour})</div>
                <div>Category: <strong>{selectedApp.vehicleCategory}</strong> ({selectedApp.passengerSeats} Seats)</div>
                <div>Licence Expiry: {selectedApp.tflPhvVehicleExpiry || 'Uploaded in docs'}</div>
              </div>

              <div style={{ padding: '14px', background: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ fontWeight: 600, color: 'var(--flame-600)', marginBottom: '6px' }}>💳 Bank Details</div>
                <div>A/C Name: <strong>{selectedApp.bankAccountName || 'N/A'}</strong></div>
                <div>A/C Number: <strong style={{ fontFamily: 'monospace' }}>{selectedApp.bankAccountNumber || 'N/A'}</strong></div>
                <div>Sort Code: <strong style={{ fontFamily: 'monospace' }}>{selectedApp.bankSortCode || 'N/A'}</strong></div>
              </div>
            </div>

            {/* TBMS Dispatch Profile & Document Inspection Details */}
            <div
              style={{
                marginBottom: '20px',
                padding: '14px 16px',
                borderRadius: 'var(--radius-sm)',
                background: '#f8fafc',
                border: '1px solid var(--border-medium)',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                  📡 TBMS Dispatch Profile & Documents Inspection
                </div>
                <a
                  href={`/?ref=${encodeURIComponent(selectedApp.referenceNumber)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--flame-600)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  🔗 Open Driver Status & Modify View ↗
                </a>
              </div>

              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                <div>
                  <strong>Dispatch Status:</strong>{' '}
                  <span style={{ fontWeight: 700, color: selectedApp.status === 'ACTIVE' ? 'var(--success)' : '#b45309' }}>
                    {selectedApp.status === 'ACTIVE'
                      ? `ACTIVE (TBMS ID: ${selectedApp.tbmsDriverId || 'Synced'})`
                      : 'INACTIVE (Pending Staff Review)'}
                  </span>
                </div>
                <div style={{ marginTop: '4px', wordBreak: 'break-all' }}>
                  <strong>TBMS Profile Data:</strong>{' '}
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-primary)' }}>
                    {[
                      [selectedApp.residentialAddress, selectedApp.postcode].filter(Boolean).join(', '),
                      `Email: ${selectedApp.email}`,
                      `Vehicle: ${selectedApp.make} ${selectedApp.model} (${selectedApp.colour}) | VRM: ${selectedApp.vrm}`,
                      `TfL Badge: ${selectedApp.tflDriverBadgeNum} (Exp: ${selectedApp.tflDriverBadgeExpiry})`,
                      `Status: ${selectedApp.status === 'ACTIVE' ? 'ACTIVE (Approved)' : 'INACTIVE (Pending Staff Review)'}`,
                      `Compliance Documents: https://flamecars.co.uk/admin?ref=${selectedApp.referenceNumber}`,
                    ].join(' | ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Verification Checklist */}
            <div>
              <h4 style={{ fontSize: '15px', marginBottom: '12px' }}>Document Verification & Compliance Audit</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {REQUIRED_DOCUMENTS_CONFIG.map((cfg) => {
                  const doc = selectedApp.documents[cfg.type];
                  return (
                    <div
                      key={cfg.type}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#ffffff',
                        border: '1px solid var(--border-medium)',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{cfg.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {doc ? (
                            <>
                              File: {doc.filename} • Expiry:{' '}
                              <strong style={{ color: doc.expiryDate ? 'var(--text-primary)' : 'var(--warning)' }}>
                                {doc.expiryDate || 'Not specified'}
                              </strong>
                            </>
                          ) : (
                            <span style={{ color: cfg.isMandatory ? 'var(--danger)' : 'var(--text-muted)' }}>
                              {cfg.isMandatory ? 'Missing Mandatory Document' : 'Optional document omitted'}
                            </span>
                          )}
                        </div>
                        {doc?.rejectionReason && (
                          <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
                            Reason: {doc.rejectionReason}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {doc ? (
                          <>
                            <span
                              className={`badge badge-${doc.status === 'APPROVED' ? 'approved' : doc.status === 'REJECTED' ? 'suspended' : 'review'
                                }`}
                              style={{ fontSize: '11px' }}
                            >
                              {doc.status}
                            </span>

                            {doc.status !== 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => handleDocReview(cfg.type, 'APPROVE')}
                                className="btn-secondary"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '12px',
                                  color: 'var(--success)',
                                  borderColor: 'rgba(5, 150, 105, 0.4)',
                                  fontWeight: 600,
                                }}
                              >
                                ✓ Approve
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setInspectDocType(cfg.type);
                                setRejectReason('');
                              }}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              Inspect
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* ================= TAB 2: CUSTOMER BOOKINGS ================= */}
      {activeTab === 'bookings' && (
        <div>
          {/* Booking Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>TOTAL BOOKINGS</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{bookings.length}</div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>CONFIRMED &amp; PAID</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                {bookings.filter((b) => b.paymentStatus === 'PAID').length}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>PENDING PAYMENT</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                {bookings.filter((b) => b.paymentStatus !== 'PAID').length}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>TBMS DISPATCHED</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
                {bookings.filter((b) => b.tbmsStatus === 'SYNCED').length}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 600 }}>TBMS EXCEPTIONS</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--danger)', marginTop: '4px' }}>
                {bookings.filter((b) => b.tbmsStatus === 'FAILED').length}
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div
            className="glass-panel"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <input
              type="text"
              placeholder="Search bookings by ref, customer name, phone, email, address..."
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
              style={{
                flex: '1 1 300px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-medium)',
                fontSize: '13px',
              }}
            />

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'PAID', label: 'Paid' },
                { id: 'PENDING', label: 'Pending Payment' },
                { id: 'TBMS_SYNCED', label: 'TBMS Synced' },
                { id: 'TBMS_FAILED', label: 'TBMS Failed' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBookingFilter(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-medium)',
                    background: bookingFilter === f.id ? 'var(--flame-500)' : '#ffffff',
                    color: bookingFilter === f.id ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings List */}
          {(() => {
            const filtered = bookings.filter((b) => {
              if (bookingFilter === 'PAID' && b.paymentStatus !== 'PAID') return false;
              if (bookingFilter === 'PENDING' && b.paymentStatus === 'PAID') return false;
              if (bookingFilter === 'TBMS_SYNCED' && b.tbmsStatus !== 'SYNCED') return false;
              if (bookingFilter === 'TBMS_FAILED' && b.tbmsStatus !== 'FAILED') return false;

              if (bookingSearch.trim()) {
                const s = bookingSearch.toLowerCase();
                const text = `${b.referenceNumber} ${b.customerName} ${b.customerPhone} ${b.customerEmail} ${b.pickupAddress} ${b.destinationAddress} ${b.tbmsJobReference || ''}`.toLowerCase();
                if (!text.includes(s)) return false;
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div
                  className="glass-panel"
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚗</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    No Customer Bookings Found
                  </div>
                  <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
                    {bookingSearch || bookingFilter !== 'ALL'
                      ? 'No bookings match your selected filter criteria.'
                      : 'Live customer bookings placed via /book will automatically appear here in real-time.'}
                  </p>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filtered.map((b) => {
                  const isPaid = b.paymentStatus === 'PAID';
                  const isTbmsSynced = b.tbmsStatus === 'SYNCED';
                  const isTbmsFailed = b.tbmsStatus === 'FAILED';

                  return (
                    <div
                      key={b.id || b.referenceNumber}
                      className="glass-panel"
                      style={{
                        padding: '18px 20px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-medium)',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      {/* Booking Card Header */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          borderBottom: '1px solid var(--border-subtle)',
                          paddingBottom: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                            {b.referenceNumber}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Placed {new Date(b.createdAt).toLocaleDateString()} at {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Status Pills */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '12px',
                              background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: isPaid ? '#047857' : '#b45309',
                            }}
                          >
                            💳 {isPaid ? 'PAID' : 'UNPAID'}
                          </span>

                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '12px',
                              background: isTbmsSynced
                                ? 'rgba(2, 132, 199, 0.15)'
                                : isTbmsFailed
                                ? 'rgba(239, 68, 68, 0.15)'
                                : '#f1f5f9',
                              color: isTbmsSynced ? '#0284c7' : isTbmsFailed ? '#b91c1c' : '#64748b',
                            }}
                          >
                            🚖{' '}
                            {isTbmsSynced
                              ? `TBMS Job #${b.tbmsJobReference || 'Dispatched'}`
                              : isTbmsFailed
                              ? 'TBMS Sync Failed'
                              : 'Not Dispatched'}
                          </span>

                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '12px',
                              background: b.customerEmailSent
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                              color: b.customerEmailSent ? '#047857' : '#b45309',
                            }}
                          >
                            ✉️ {b.customerEmailSent ? 'EMAIL SENT' : 'EMAIL PENDING'}
                          </span>
                        </div>
                      </div>

                      {/* Journey Details */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '12px',
                          fontSize: '13px',
                        }}
                      >
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>PASSENGER</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.customerName}</div>
                          <div style={{ color: 'var(--text-secondary)' }}>
                            <a href={`tel:${b.customerPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              📞 {b.customerPhone}
                            </a>
                          </div>
                          <div style={{ color: 'var(--text-secondary)' }}>✉️ {b.customerEmail}</div>
                        </div>

                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>ROUTING</div>
                          <div>
                            <strong>From:</strong> {b.pickupAddress}
                          </div>
                          <div>
                            <strong>To:</strong> {b.destinationAddress}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            {b.distanceMiles} road miles · {b.passengers} Pax · {b.luggage} Bags
                          </div>
                        </div>

                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>TIMING &amp; VEHICLE</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            📅 {b.pickupDate} at {b.pickupTime}
                          </div>
                          <div>
                            🚗 {b.vehicleName} · <strong>£{b.fare.toFixed(2)}</strong>
                          </div>
                          {b.flightNumber && (
                            <div style={{ color: '#0284c7', fontWeight: 600 }}>✈️ Flight: {b.flightNumber}</div>
                          )}
                        </div>
                      </div>

                      {/* TBMS Error Notice if failed */}
                      {isTbmsFailed && b.tbmsError && (
                        <div
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '12px',
                            color: '#991b1b',
                          }}
                        >
                          <strong>TBMS Error:</strong> {b.tbmsError}
                        </div>
                      )}

                      {/* Card Actions */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: '10px',
                          alignItems: 'center',
                          marginTop: '4px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(b)}
                          className="btn-secondary"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          👁️ View Full Details
                        </button>

                        <button
                          type="button"
                          disabled={resendingBookingEmailRef === b.referenceNumber}
                          onClick={() => resendBookingEmail(b.referenceNumber)}
                          style={{
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: resendingBookingEmailRef === b.referenceNumber ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          title={`Resend confirmation email to ${b.customerEmail}`}
                        >
                          {resendingBookingEmailRef === b.referenceNumber ? '⏳ Sending...' : '✉️ Resend Email'}
                        </button>

                        {(!isTbmsSynced || isTbmsFailed) && (
                          <button
                            type="button"
                            disabled={retryingTbmsRef === b.referenceNumber}
                            onClick={() => retryTbmsBooking(b.referenceNumber)}
                            style={{
                              background: 'var(--flame-500)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              padding: '6px 14px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: retryingTbmsRef === b.referenceNumber ? 'wait' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {retryingTbmsRef === b.referenceNumber ? '⏳ Dispatching...' : '🔄 Retry TBMS Dispatch'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Booking Detail Modal */}
          {selectedBooking && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px',
              }}
              onClick={() => setSelectedBooking(null)}
            >
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  maxWidth: '640px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  padding: '28px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                    Booking Details: {selectedBooking.referenceNumber}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', fontSize: '13px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    <strong>Passenger:</strong> {selectedBooking.customerName}<br />
                    <strong>Contact:</strong> {selectedBooking.customerPhone} • {selectedBooking.customerEmail}<br />
                    {selectedBooking.flightNumber && <span><strong>Flight Number:</strong> {selectedBooking.flightNumber}<br /></span>}
                    {selectedBooking.notes && <span><strong>Passenger Notes:</strong> {selectedBooking.notes}<br /></span>}
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    <strong>Pickup:</strong> {selectedBooking.pickupAddress}<br />
                    <strong>Destination:</strong> {selectedBooking.destinationAddress}<br />
                    <strong>Date &amp; Time:</strong> {selectedBooking.pickupDate} at {selectedBooking.pickupTime}<br />
                    <strong>Vehicle:</strong> {selectedBooking.vehicleName} (£{selectedBooking.fare.toFixed(2)})<br />
                    <strong>Road Distance:</strong> {selectedBooking.distanceMiles} miles
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    <strong>Payment Status:</strong> {selectedBooking.paymentStatus}<br />
                    {selectedBooking.stripePaymentIntentId && <span><strong>Stripe Intent ID:</strong> {selectedBooking.stripePaymentIntentId}<br /></span>}
                    <strong>TBMS Dispatch Status:</strong> {selectedBooking.tbmsStatus}<br />
                    {selectedBooking.tbmsJobReference && <span><strong>TBMS Job Ref:</strong> {selectedBooking.tbmsJobReference}<br /></span>}
                    {selectedBooking.tbmsError && <span style={{ color: '#b91c1c' }}><strong>TBMS Error:</strong> {selectedBooking.tbmsError}<br /></span>}
                    <strong>Confirmation Email:</strong> {selectedBooking.customerEmailSent ? `✓ Sent to ${selectedBooking.customerEmail}` : '⏳ Pending / Not Sent'}<br />
                    {selectedBooking.customerEmailMessageId && <span><strong>Email ID:</strong> <code style={{ fontSize: '11px', color: '#64748b' }}>{selectedBooking.customerEmailMessageId}</code><br /></span>}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={resendingBookingEmailRef === selectedBooking.referenceNumber}
                    onClick={() => resendBookingEmail(selectedBooking.referenceNumber)}
                    style={{
                      background: '#f8fafc',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '10px 18px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: resendingBookingEmailRef === selectedBooking.referenceNumber ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {resendingBookingEmailRef === selectedBooking.referenceNumber ? '⏳ Sending...' : '✉️ Resend Confirmation Email'}
                  </button>

                  {selectedBooking.tbmsStatus !== 'SYNCED' && (
                    <button
                      type="button"
                      disabled={retryingTbmsRef === selectedBooking.referenceNumber}
                      onClick={() => retryTbmsBooking(selectedBooking.referenceNumber)}
                      style={{
                        background: 'var(--flame-500)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 18px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {retryingTbmsRef === selectedBooking.referenceNumber ? '⏳ Dispatching...' : '🔄 Dispatch to TBMS Now'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    className="btn-secondary"
                    style={{ fontSize: '13px', padding: '10px 18px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: PRICING & PROMOTIONS ================= */}
      {activeTab === 'pricing' && (
        <PricingPromotionsSection
          currentUser={currentUser}
          adminFetch={adminFetch}
          showMessage={(text, type) => setActionMessage({ text, type })}
        />
      )}

      {/* Universal Document Preview & AI Inspector Modal */}
      <DocumentPreviewModal
        isOpen={!!inspectDocType && !!selectedApp && !!selectedApp.documents[inspectDocType]}
        onClose={() => setInspectDocType(null)}
        doc={inspectDocType && selectedApp ? selectedApp.documents[inspectDocType] : null}
        appId={selectedApp?.id}
        applicantName={selectedApp?.legalName}
        isStaff={true}
        onTriggerAiExtract={async (docType) => {
          if (!selectedApp) return;
          const doc = selectedApp.documents[docType];
          if (!doc) return;
          try {
            const res = await fetch('/api/onboarding/ai-extract', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                appId: selectedApp.id,
                docType,
                filename: doc.filename,
                dataUrl: doc.dataUrl,
                currentAppData: {
                  legalName: selectedApp.legalName,
                  vrm: selectedApp.vrm,
                  tflDriverBadgeNum: selectedApp.tflDriverBadgeNum,
                  make: selectedApp.make,
                },
              }),
            });
            const data = await res.json();
            if (data.apiError || !res.ok || data.extractedData?.apiError) {
              const apiErr = data.apiError || data.extractedData?.apiError || data.error || `HTTP ${res.status}`;
              console.error(`[AI OCR API ERROR] Staff inspect ${doc.filename} (${docType}):`, apiErr);
              console.error('[AI OCR API Details]:', {
                filename: doc.filename,
                docType,
                httpStatus: res.status,
                apiError: apiErr,
                fullResponse: data,
              });
            } else {
              console.log(`[AI OCR SUCCESS] Staff inspect ${doc.filename}:`, data.extractedData);
            }
            if (res.ok && data.extractedData) {
              const updatedDoc = {
                ...doc,
                aiExtractedData: data.extractedData,
                isAnalyzing: false,
              };
              const updatedApp = {
                ...selectedApp,
                documents: {
                  ...selectedApp.documents,
                  [docType]: updatedDoc,
                },
              };
              setSelectedApp(updatedApp);
              setApplications((prev) => prev.map((a) => (a.id === selectedApp.id ? updatedApp : a)));
            }
          } catch (err) {
            console.error('Staff re-extract error:', err);
          }
        }}
        onApprove={async (docType) => {
          await handleDocReview(docType, 'APPROVE');
        }}
        onReject={async (docType, reason) => {
          await handleDocReview(docType, 'REJECT', reason);
        }}
      />
    </div>
  );
}
