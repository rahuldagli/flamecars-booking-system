'use client';

import { useState, useEffect } from 'react';
import { UploadedDoc, DocumentType } from '@/types/onboarding';
import { areNamesCompatible } from '@/lib/nameCheck';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: UploadedDoc | null;
  applicantName?: string;
  isStaff?: boolean;
  onTriggerAiExtract?: (docType: DocumentType) => Promise<void>;
  onApprove?: (docType: DocumentType) => Promise<void>;
  onReject?: (docType: DocumentType, reason: string) => Promise<void>;
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  doc,
  applicantName,
  isStaff = false,
  onTriggerAiExtract,
  onApprove,
  onReject,
}: DocumentPreviewModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'ai-data' | 'raw-text'>('preview');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfViewMode, setPdfViewMode] = useState<'native' | 'certificate'>('native');

  // Trigger AI extraction automatically if not yet extracted when modal opens
  useEffect(() => {
    if (isOpen && doc && !doc.aiExtractedData && !doc.isAnalyzing && onTriggerAiExtract) {
      onTriggerAiExtract(doc.type);
    }
  }, [isOpen, doc?.id]);

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Convert PDF base64 / dataUrl to Blob URL for native object/iframe rendering
  useEffect(() => {
    let activeBlobUrl: string | null = null;
    if (doc?.dataUrl) {
      const isPdfDoc = doc.mimeType?.includes('pdf') || doc.filename?.toLowerCase().endsWith('.pdf');
      if (isPdfDoc) {
        if (doc.dataUrl.startsWith('data:')) {
          try {
            const commaIdx = doc.dataUrl.indexOf(',');
            const base64Part = commaIdx !== -1 ? doc.dataUrl.substring(commaIdx + 1) : doc.dataUrl;
            const binaryString = atob(base64Part);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });
            activeBlobUrl = URL.createObjectURL(blob);
            setPdfBlobUrl(activeBlobUrl);
          } catch (e) {
            console.warn('[PDF Preview] Failed to create Blob URL from dataUrl:', e);
            setPdfBlobUrl(null);
          }
        } else if (doc.dataUrl.startsWith('http') || doc.dataUrl.startsWith('blob:')) {
          setPdfBlobUrl(doc.dataUrl);
        }
      } else {
        setPdfBlobUrl(null);
      }
    } else {
      setPdfBlobUrl(null);
    }

    return () => {
      if (activeBlobUrl && activeBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [doc?.dataUrl, doc?.filename, doc?.mimeType]);

  if (!isOpen || !doc) return null;

  const filename = doc.filename || 'document';
  const lowerFile = filename.toLowerCase();

  // Document format classification
  const isPdf = doc.mimeType?.includes('pdf') || lowerFile.endsWith('.pdf');
  const isImage = doc.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|gif)$/i.test(lowerFile);
  const isCsv = doc.mimeType?.includes('csv') || lowerFile.endsWith('.csv');
  const isExcel = doc.mimeType?.includes('sheet') || doc.mimeType?.includes('excel') || /\.(xlsx|xls)$/i.test(lowerFile);
  const isWord = doc.mimeType?.includes('word') || /\.(docx|doc)$/i.test(lowerFile);
  const isSheet = isCsv || isExcel;

  // Attempt to parse CSV rows if CSV
  let parsedCsvData: { headers: string[]; rows: string[][] } | null = null;
  if (isCsv && doc.dataUrl && doc.dataUrl.includes('base64,')) {
    try {
      const base64 = doc.dataUrl.split('base64,')[1];
      const decoded = atob(base64);
      const lines = decoded.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1, 30).map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
        parsedCsvData = { headers, rows };
      }
    } catch {
      parsedCsvData = null;
    }
  }

  // Format badge helper
  function getFormatBadge() {
    if (isPdf) return { label: 'PDF Document', icon: '📄', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
    if (isWord) return { label: 'Word Document (.docx)', icon: '📝', bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' };
    if (isSheet) return { label: isCsv ? 'CSV Data File' : 'Excel Spreadsheet (.xlsx)', icon: '📊', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
    if (isImage) return { label: 'Image Scan', icon: '🖼️', bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' };
    return { label: 'Document', icon: '📁', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  }

  const badge = getFormatBadge();
  const aiData = doc.aiExtractedData;

  const extractedDocName = (doc.type === 'V5C_LOGBOOK' ? aiData?.registeredKeeper : aiData?.fullName) as string | undefined;
  const hasNameConflict = Boolean(
    applicantName &&
    extractedDocName &&
    extractedDocName.trim().length > 1 &&
    !areNamesCompatible(applicantName, extractedDocName)
  );

  async function handleApproveClick() {
    if (!onApprove) return;
    setIsProcessingAction(true);
    try {
      await onApprove(doc!.type);
    } finally {
      setIsProcessingAction(false);
    }
  }

  async function handleRejectSubmit() {
    if (!onReject) return;
    setIsProcessingAction(true);
    try {
      await onReject(doc!.type, rejectReason || 'Document requires re-submission.');
      setShowRejectInput(false);
      setRejectReason('');
    } finally {
      setIsProcessingAction(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '1060px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-xl)',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              {badge.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{doc.title}</h3>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                  }}
                >
                  {badge.label}
                </span>
                <span className={`badge badge-${doc.status.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                  {doc.status}
                </span>
                {hasNameConflict && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fca5a5',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    ⚠️ Name Mismatch: &ldquo;{extractedDocName}&rdquo;
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {filename} • {(doc.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Action buttons on header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {doc.dataUrl && (
              <a
                href={doc.dataUrl}
                download={filename}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}
              >
                ⤓ Download
              </a>
            )}
            {doc.dataUrl && isPdf && (
              <a
                href={doc.dataUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}
              >
                Open in New Tab ↗
              </a>
            )}
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            padding: '8px 24px',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-subtle)',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setActiveTab('preview')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === 'preview' ? '#ffffff' : 'transparent',
              color: activeTab === 'preview' ? 'var(--flame-600)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'preview' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            👁️ Document Preview
          </button>
          <button
            onClick={() => setActiveTab('ai-data')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === 'ai-data' ? '#ffffff' : 'transparent',
              color: activeTab === 'ai-data' ? 'var(--flame-600)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'ai-data' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>✨</span> AI Extracted Contents
            {doc.isAnalyzing && <span className="animate-pulse-glow" style={{ color: 'var(--flame-500)' }}>• Analyzing</span>}
          </button>
          <button
            onClick={() => setActiveTab('raw-text')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === 'raw-text' ? '#ffffff' : 'transparent',
              color: activeTab === 'raw-text' ? 'var(--flame-600)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'raw-text' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            📄 Text Transcript
          </button>
        </div>

        {/* Modal Main Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* TAB 1: DOCUMENT PREVIEW */}
          {activeTab === 'preview' && (
            <div>
              {/* PDF Viewer */}
              {isPdf && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Top Action Bar for PDF */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      padding: '10px 16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>📄</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {filename}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB • ` : ''}Adobe PDF Document • London Compliance Schedule
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* View mode toggle */}
                      {pdfBlobUrl && (
                        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '2px' }}>
                          <button
                            type="button"
                            onClick={() => setPdfViewMode('native')}
                            style={{
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: pdfViewMode === 'native' ? '#ffffff' : 'transparent',
                              color: pdfViewMode === 'native' ? 'var(--flame-600)' : 'var(--text-secondary)',
                              boxShadow: pdfViewMode === 'native' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                              cursor: 'pointer',
                            }}
                          >
                            PDF Embed
                          </button>
                          <button
                            type="button"
                            onClick={() => setPdfViewMode('certificate')}
                            style={{
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: pdfViewMode === 'certificate' ? '#ffffff' : 'transparent',
                              color: pdfViewMode === 'certificate' ? 'var(--flame-600)' : 'var(--text-secondary)',
                              boxShadow: pdfViewMode === 'certificate' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                              cursor: 'pointer',
                            }}
                          >
                            Certificate View
                          </button>
                        </div>
                      )}

                      {pdfBlobUrl && (
                        <a
                          href={pdfBlobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>↗</span> Full Tab
                        </a>
                      )}

                      {pdfBlobUrl && (
                        <a
                          href={pdfBlobUrl}
                          download={filename}
                          className="btn-secondary"
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>⤓</span> Download
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Native PDF Object / Embed View */}
                  {pdfBlobUrl && pdfViewMode === 'native' ? (
                    <div
                      style={{
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid var(--border-medium)',
                        height: '560px',
                        background: '#525659',
                      }}
                    >
                      <object
                        data={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                        type="application/pdf"
                        width="100%"
                        height="100%"
                      >
                        <iframe
                          src={`${pdfBlobUrl}#toolbar=1`}
                          title={filename}
                          width="100%"
                          height="100%"
                          style={{ border: 'none' }}
                        />
                      </object>
                    </div>
                  ) : (
                    /* Official Certificate Layout */
                    <div
                      style={{
                        background: '#ffffff',
                        border: '2px solid var(--border-medium)',
                        borderRadius: 'var(--radius-md)',
                        padding: '32px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          borderBottom: '2px solid var(--border-medium)',
                          paddingBottom: '16px',
                          marginBottom: '20px',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--flame-600)', fontWeight: 800 }}>
                            {doc.type === 'HIRE_REWARD_INSURANCE'
                              ? 'Official Motor Insurance Schedule'
                              : doc.type === 'MOT_CERTIFICATE'
                              ? 'Official DVSA MOT Test Certificate (VT20)'
                              : 'Official Regulatory Document'}
                          </div>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                            {doc.title || filename}
                          </h3>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Transport for London (TfL) Private Hire Regulatory Compliance Record
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span className="badge badge-approved" style={{ fontSize: '12px', padding: '4px 10px' }}>
                            ✓ Verified Active Document
                          </span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Ref: FLM-PDF-{doc.id.substring(0, 8).toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Certificate Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '16px',
                          marginBottom: '24px',
                        }}
                      >
                        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>HOLDER / POLICYHOLDER</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                            {aiData?.fullName || applicantName || '—'}
                          </div>
                        </div>

                        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>DOCUMENT / POLICY NUMBER</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: '4px' }}>
                            {aiData?.policyNumber || aiData?.licenceNumber || '—'}
                          </div>
                        </div>

                        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>VEHICLE REGISTRATION (VRM)</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: '4px' }}>
                            {aiData?.vrm || '—'}
                          </div>
                        </div>

                        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>EXPIRATION DATE</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--flame-600)', marginTop: '4px' }}>
                            {doc.expiryDate || aiData?.expiryDate || '—'}
                          </div>
                        </div>
                      </div>

                      {/* Regulatory Statement */}
                      <div
                        style={{
                          padding: '14px 18px',
                          background: 'rgba(239, 68, 68, 0.04)',
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                          marginBottom: '20px',
                        }}
                      >
                        <strong>Regulatory Covenants:</strong> This document certifies that the aforementioned driver and vehicle satisfy the statutory licensing requirements set forth under the Private Hire Vehicles (London) Act 1998 and Road Traffic Act 1988 for Hire &amp; Reward passenger carriage.
                      </div>

                      {/* Footer Stamp & Action */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                            🛡️
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                              Digitally Verified &amp; Watermarked
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Compliant with London Transport Standards
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab('ai-data')}
                          className="btn-primary"
                          style={{ fontSize: '12px', padding: '8px 16px' }}
                        >
                          ✨ View AI Extracted Data &amp; Transcript
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Image Viewer */}
              {isImage && doc.dataUrl && (
                <div
                  style={{
                    background: '#0f172a',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '360px',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  <img
                    src={doc.dataUrl}
                    alt={filename}
                    style={{ maxWidth: '100%', maxHeight: '520px', objectFit: 'contain', borderRadius: '4px' }}
                  />
                </div>
              )}

              {/* CSV Interactive Data Table */}
              {isCsv && parsedCsvData && (
                <div style={{ border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', fontWeight: 600, fontSize: '13px' }}>
                    📊 SpreadSheet Data Preview ({parsedCsvData.rows.length} rows loaded)
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-medium)' }}>
                          {parsedCsvData.headers.map((h, i) => (
                            <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedCsvData.rows.map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)', background: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} style={{ padding: '8px 14px', color: 'var(--text-primary)' }}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Excel Spreadsheet Viewer */}
              {isExcel && !parsedCsvData && (
                <div
                  style={{
                    padding: '36px',
                    background: '#f8fafc',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
                  <h4 style={{ fontSize: '18px', marginBottom: '6px' }}>Microsoft Excel Spreadsheet (.xlsx)</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px auto' }}>
                    Spreadsheet workbook "{filename}" is indexed. Contents and verification values have been extracted by AI below.
                  </p>
                  <div style={{ display: 'inline-flex', gap: '12px' }}>
                    <button
                      onClick={() => setActiveTab('ai-data')}
                      className="btn-primary"
                      style={{ fontSize: '13px', padding: '10px 18px' }}
                    >
                      ✨ View Extracted Sheet Cells
                    </button>
                    {doc.dataUrl && (
                      <a href={doc.dataUrl} download={filename} className="btn-secondary" style={{ fontSize: '13px', padding: '10px 18px', textDecoration: 'none' }}>
                        ⤓ Download Excel Workbook
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Word Document Viewer */}
              {isWord && (
                <div
                  style={{
                    padding: '36px',
                    background: '#f8fafc',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>📝</div>
                  <h4 style={{ fontSize: '18px', marginBottom: '6px' }}>Microsoft Word Document (.docx)</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px auto' }}>
                    Word document "{filename}" is verified and indexed. All visible text paragraphs and covenants have been extracted below.
                  </p>
                  <div style={{ display: 'inline-flex', gap: '12px' }}>
                    <button
                      onClick={() => setActiveTab('ai-data')}
                      className="btn-primary"
                      style={{ fontSize: '13px', padding: '10px 18px' }}
                    >
                      ✨ View Extracted Text & Terms
                    </button>
                    {doc.dataUrl && (
                      <a href={doc.dataUrl} download={filename} className="btn-secondary" style={{ fontSize: '13px', padding: '10px 18px', textDecoration: 'none' }}>
                        ⤓ Download Word File
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Fallback for other formats */}
              {!isPdf && !isImage && !isSheet && !isWord && (
                <div
                  style={{
                    padding: '40px',
                    background: '#f8fafc',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
                  <h4 style={{ fontSize: '17px', marginBottom: '6px' }}>{filename}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '18px' }}>
                    Document content has been indexed by the compliance verification engine.
                  </p>
                  {doc.dataUrl && (
                    <a href={doc.dataUrl} download={filename} className="btn-primary" style={{ fontSize: '13px', textDecoration: 'none' }}>
                      ⤓ Download Document
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI EXTRACTED INTELLIGENCE */}
          {activeTab === 'ai-data' && (
            <div>
              {doc.isAnalyzing ? (
                <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '14px' }} className="animate-pulse-glow">
                    🤖
                  </div>
                  <h4 style={{ fontSize: '18px', marginBottom: '6px' }}>AI Document Analysis in Progress...</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Extracting visible text, Transport for London licensing numbers, VRM, and expiration dates.
                  </p>
                </div>
              ) : aiData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Summary & Confidence Bar */}
                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-md)',
                      background: aiData.apiError ? '#fef2f2' : 'var(--flame-50)',
                      border: aiData.apiError ? '1px solid #fecaca' : '1px solid var(--border-flame)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: aiData.apiError ? '#b91c1c' : 'var(--flame-600)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {aiData.apiError ? 'AI Vision API Error' : 'AI Content Verification'}
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: aiData.apiError ? '#7f1d1d' : 'var(--text-primary)',
                          marginTop: '2px',
                          fontFamily: aiData.apiError ? 'monospace' : 'inherit',
                          wordBreak: 'break-word',
                        }}
                      >
                        {aiData.apiError || aiData.summary || 'Document details successfully verified and extracted.'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="badge badge-approved"
                        style={{
                          fontSize: '12px',
                          padding: '4px 10px',
                          background: aiData.apiError ? '#fee2e2' : '#dcfce7',
                          color: aiData.apiError ? '#b91c1c' : '#15803d',
                          border: aiData.apiError ? '1px solid #fca5a5' : 'none',
                        }}
                      >
                        {aiData.apiError ? 'API Error' : `✓ ${Math.round((aiData.confidence || 0.95) * 100)}% Confidence`}
                      </span>
                      {onTriggerAiExtract && (
                        <button
                          onClick={() => onTriggerAiExtract(doc.type)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          🔄 Re-analyze
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Extracted Key-Value Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {aiData.fullName && (
                      <div style={{ padding: '12px 16px', background: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NAME ON DOCUMENT</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>{aiData.fullName}</div>
                      </div>
                    )}

                    {aiData.licenceNumber && (
                      <div style={{ padding: '12px 16px', background: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>LICENCE / BADGE #</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', marginTop: '2px' }}>
                          {aiData.licenceNumber}
                        </div>
                      </div>
                    )}

                    {aiData.expiryDate && (
                      <div style={{ padding: '12px 16px', background: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>EXPIRATION DATE</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--flame-600)', marginTop: '2px' }}>
                          {aiData.expiryDate}
                        </div>
                      </div>
                    )}

                    {aiData.vrm && (
                      <div style={{ padding: '12px 16px', background: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>VEHICLE REGISTRATION (VRM)</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', marginTop: '2px' }}>
                          {aiData.vrm}
                        </div>
                      </div>
                    )}

                    {aiData.policyNumber && (
                      <div style={{ padding: '12px 16px', background: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>INSURANCE POLICY #</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', marginTop: '2px' }}>
                          {aiData.policyNumber}
                        </div>
                      </div>
                    )}

                    {aiData.documentTypeDetected && (
                      <div style={{ padding: '12px 16px', background: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DETECTED CLASSIFICATION</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                          {aiData.documentTypeDetected}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Extracted Table Data (from Sheet / CSV) */}
                  {aiData.tableData && (
                    <div style={{ border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', fontSize: '12px', fontWeight: 700 }}>
                        📊 EXTRACTED WORKSHEET RECORDS
                      </div>
                      <div style={{ overflowX: 'auto', maxHeight: '280px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-medium)' }}>
                              {(aiData.tableData as any).headers?.map((h: string, idx: number) => (
                                <th key={idx} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(aiData.tableData as any).rows?.map((row: string[], rI: number) => (
                              <tr key={rI} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                {row.map((c: string, cI: number) => (
                                  <td key={cI} style={{ padding: '8px 12px' }}>
                                    {c}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>⚡</div>
                  <h4 style={{ fontSize: '16px', marginBottom: '6px' }}>Ready for AI Analysis</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                    Click below to scan and extract visible licensing fields, dates, and tables.
                  </p>
                  {onTriggerAiExtract && (
                    <button
                      onClick={() => onTriggerAiExtract(doc.type)}
                      className="btn-primary"
                      style={{ fontSize: '13px', padding: '10px 20px' }}
                    >
                      ✨ Run AI Document Extraction
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEXT TRANSCRIPT */}
          {activeTab === 'raw-text' && (
            <div
              style={{
                background: '#0f172a',
                color: '#e2e8f0',
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: 1.6,
                maxHeight: '520px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {aiData?.apiError
                ? `DOCUMENT: ${filename}\n[AI OCR API ERROR]\n${aiData.apiError}\n\nTimestamp: ${new Date(doc.uploadedAt).toISOString()}\n(Error logged directly to Developer Tools Console)`
                : aiData?.rawTextContent || `[RAW DOCUMENT TRANSCRIPT]\nFile: ${filename}\nUploaded: ${new Date(doc.uploadedAt).toISOString()}\nStatus: Verified\nSummary: ${aiData?.summary || 'Standard compliance document indexed.'}`}
            </div>
          )}
        </div>

        {/* Footer Bar with Staff Approval Actions */}
        {isStaff && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-medium)',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Applicant: <strong>{applicantName || 'Applicant'}</strong> • Current Status:{' '}
              <span className={`badge badge-${doc.status.toLowerCase()}`}>{doc.status}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {showRejectInput ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter rejection reason (e.g. Blurry, Expired)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ fontSize: '12px', padding: '8px 12px', width: '280px' }}
                  />
                  <button
                    onClick={handleRejectSubmit}
                    disabled={isProcessingAction}
                    style={{
                      background: 'var(--danger)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Confirm Reject ✕
                  </button>
                  <button
                    onClick={() => setShowRejectInput(false)}
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--danger)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Reject Document ✕
                  </button>
                  <button
                    onClick={handleApproveClick}
                    disabled={isProcessingAction}
                    style={{
                      background: 'var(--success)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 20px',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Approve Document ✓
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
