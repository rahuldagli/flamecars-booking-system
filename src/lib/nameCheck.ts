import { DriverApplication, DocumentType, REQUIRED_DOCUMENTS_CONFIG } from '@/types/onboarding';

export interface NameDiscrepancy {
  docType: DocumentType;
  docTitle: string;
  extractedName: string;
  applicantName: string;
  fieldLabel: string;
  isVehicleDocument: boolean;
}

/**
 * Compare two names to determine if they refer to the same individual.
 * Ignores titles (Mr, Mrs, Ms, Dr), extra spaces, punctuation, case, and middle names/initials.
 */
export function areNamesCompatible(nameA?: string, nameB?: string): boolean {
  if (!nameA || !nameB) return true;

  const clean = (n: string) =>
    n
      .toLowerCase()
      .replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const a = clean(nameA);
  const b = clean(nameB);

  if (a === b) return true;
  if (!a || !b) return true;

  const partsA = a.split(' ').filter(Boolean);
  const partsB = b.split(' ').filter(Boolean);

  if (partsA.length === 0 || partsB.length === 0) return true;

  // Single word comparison
  if (partsA.length === 1 && partsB.length === 1) {
    return partsA[0] === partsB[0];
  }

  const lastA = partsA[partsA.length - 1];
  const lastB = partsB[partsB.length - 1];

  // Surnames must match
  if (lastA !== lastB) {
    return false;
  }

  const firstA = partsA[0];
  const firstB = partsB[0];

  // First names must match if both are more than 1 character
  if (firstA !== firstB && firstA.length > 1 && firstB.length > 1) {
    return false;
  }

  return true;
}

/**
 * Scans all uploaded documents in an application against the registered applicant name.
 * Returns a list of discrepancies where document names differ from the applicant name.
 */
export function detectNameDiscrepancies(app: DriverApplication): NameDiscrepancy[] {
  const discrepancies: NameDiscrepancy[] = [];
  const applicantName = (app.legalName || '').trim();
  if (!applicantName) return discrepancies;

  for (const config of REQUIRED_DOCUMENTS_CONFIG) {
    const doc = app.documents[config.type];
    if (!doc || !doc.aiExtractedData) continue;

    const aiData = doc.aiExtractedData;
    let extractedName: string | undefined;
    let fieldLabel = 'Driver Full Name';
    const isVehicleDoc = config.category === 'vehicle';

    if (config.type === 'V5C_LOGBOOK') {
      extractedName = typeof aiData.registeredKeeper === 'string' ? aiData.registeredKeeper : undefined;
      fieldLabel = 'Registered Keeper';
    } else if (config.type === 'HIRE_REWARD_INSURANCE') {
      extractedName = typeof aiData.fullName === 'string' ? aiData.fullName : undefined;
      fieldLabel = 'Policyholder';
    } else {
      extractedName = typeof aiData.fullName === 'string' ? aiData.fullName : undefined;
      fieldLabel = 'Driver Full Name';
    }

    if (extractedName && extractedName.trim().length > 1) {
      if (!areNamesCompatible(applicantName, extractedName)) {
        discrepancies.push({
          docType: config.type,
          docTitle: config.title,
          extractedName: extractedName.trim(),
          applicantName,
          fieldLabel,
          isVehicleDocument: isVehicleDoc,
        });
      }
    }
  }

  return discrepancies;
}

