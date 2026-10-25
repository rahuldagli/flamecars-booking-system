'use client';

import { DriverApplication, INITIAL_APPLICATION } from '@/types/onboarding';

const STORAGE_KEY = 'flamecars_driver_draft_v1';

export function loadLocalDraft(): DriverApplication | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local draft:', e);
    return null;
  }
}

export function saveLocalDraft(data: DriverApplication): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save local draft:', e);
  }
}

export function clearLocalDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear local draft:', e);
  }
}
