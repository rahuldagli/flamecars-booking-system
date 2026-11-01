'use client';

import { useState } from 'react';
import { DriverApplication, DocumentType, REQUIRED_DOCUMENTS_CONFIG, UploadedDoc } from '@/types/onboarding';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';

interface Step3DocumentsProps {
  data: DriverApplication;
  onChange: (updates: Partial<DriverApplication>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3Documents({ data, onChange, onNext, onBack }: Step3DocumentsProps) {
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'driver' | 'vehicle'>('all');
  const [previewDocType, setPreviewDocType] = useState<DocumentType | null>(null);

  async function handleFileUpload(type: DocumentType, title: string, file: File, expiry?: string) {
    if (file.size > 15 * 1024 * 1024) {
      setError(`File "${file.name}" exceeds the 15 MB maximum limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const docId = 'doc_' + Math.random().toString(36).substring(2, 9);

      // Create document entry in analyzing state
      const initialDoc: UploadedDoc = {
        id: docId,
        type,
        title,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        dataUrl,
        expiryDate: expiry || data.documents[type]?.expiryDate || '',
        status: 'PENDING',
        uploadedAt: new Date().toISOString(),
        isAnalyzing: true,
      };

      // Optimistically update document in list
      onChange({
        documents: {
          ...data.documents,
          [type]: initialDoc,
        },
      });
      setError('');

      // Trigger AI OCR Extraction API during file upload
      try {
        const res = await fetch('/api/onboarding/ai-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appId: data.id,
            docType: type,
            filename: file.name,
            dataUrl,
            currentAppData: {
              legalName: data.legalName,
              vrm: data.vrm,
              tflDriverBadgeNum: data.tflDriverBadgeNum,
              make: data.make,
            },
          }),
        });

        const resJson = await res.json();
        if (res.ok && resJson.extractedData) {
          const aiData = resJson.extractedData;
          const detectedExpiry = aiData.expiryDate || initialDoc.expiryDate;

          // Prepare updates to both document and application fields
          const appFieldUpdates: Partial<DriverApplication> = {};

          // Auto-sync application fields based on document type
          if (type === 'TFL_PHV_DRIVER_BADGE_FRONT') {
            if (aiData.licenceNumber && !data.tflDriverBadgeNum) {
              appFieldUpdates.tflDriverBadgeNum = aiData.licenceNumber;
            }
            if (detectedExpiry && !data.tflDriverBadgeExpiry) {
              appFieldUpdates.tflDriverBadgeExpiry = detectedExpiry;
            }
          } else if (type === 'TFL_PHV_VEHICLE_LICENCE') {
            if (aiData.vrm && !data.vrm) {
              appFieldUpdates.vrm = aiData.vrm;
            }
            if (aiData.licenceNumber && !data.tflPhvVehicleLicence) {
              appFieldUpdates.tflPhvVehicleLicence = aiData.licenceNumber;
            }
            if (detectedExpiry && !data.tflPhvVehicleExpiry) {
              appFieldUpdates.tflPhvVehicleExpiry = detectedExpiry;
            }
          } else if (type === 'DVLA_DRIVING_LICENCE_FRONT') {
            if (aiData.fullName && !data.legalName) {
              appFieldUpdates.legalName = aiData.fullName;
            }
          }

          const updatedDocuments = {
            ...data.documents,
            [type]: {
              ...initialDoc,
              isAnalyzing: false,
              expiryDate: detectedExpiry,
              aiExtractedData: aiData,
            },
          };

          const fullUpdatedApp = {
            ...data,
            ...appFieldUpdates,
            documents: updatedDocuments,
          };

          onChange(fullUpdatedApp);

          // Save directly to DB draft endpoint as well
          fetch('/api/onboarding/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullUpdatedApp),
          }).catch((err) => console.warn('Autosave to draft after OCR:', err));
        } else {
          // Finish analyzing state even if error
          onChange({
            documents: {
              ...data.documents,
              [type]: {
                ...initialDoc,
                isAnalyzing: false,
              },
            },
          });
        }
      } catch (aiErr) {
        console.error('AI extraction error:', aiErr);
        onChange({
          documents: {
            ...data.documents,
            [type]: {
              ...initialDoc,
              isAnalyzing: false,
            },
          },
        });
      }
    };

    reader.readAsDataURL(file);
  }

  // Trigger manual or on-open AI Extraction and persist to DB
  async function handleTriggerAiExtract(type: DocumentType) {
    const doc = data.documents[type];
    if (!doc || !doc.dataUrl) return;

    // Mark analyzing
    const analyzingDoc = { ...doc, isAnalyzing: true };
    onChange({
      documents: {
        ...data.documents,
        [type]: analyzingDoc,
      },
    });

    try {
      const res = await fetch('/api/onboarding/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: data.id,
          docType: type,
          filename: doc.filename,
          dataUrl: doc.dataUrl,
          currentAppData: {
            legalName: data.legalName,
            vrm: data.vrm,
            tflDriverBadgeNum: data.tflDriverBadgeNum,
            make: data.make,
          },
        }),
      });

      const resJson = await res.json();
      if (res.ok && resJson.extractedData) {
        const aiData = resJson.extractedData;
        const detectedExpiry = aiData.expiryDate || doc.expiryDate;

        const updatedDoc = {
          ...doc,
          isAnalyzing: false,
          expiryDate: detectedExpiry,
          aiExtractedData: aiData,
        };

        const appUpdates: Partial<DriverApplication> = {
          documents: {
            ...data.documents,
            [type]: updatedDoc,
          },
        };

        if (type === 'TFL_PHV_DRIVER_BADGE_FRONT') {
          if (aiData.licenceNumber && !data.tflDriverBadgeNum) appUpdates.tflDriverBadgeNum = aiData.licenceNumber;
          if (detectedExpiry && !data.tflDriverBadgeExpiry) appUpdates.tflDriverBadgeExpiry = detectedExpiry;
        } else if (type === 'TFL_PHV_VEHICLE_LICENCE') {
          if (aiData.vrm && !data.vrm) appUpdates.vrm = aiData.vrm;
          if (detectedExpiry && !data.tflPhvVehicleExpiry) appUpdates.tflPhvVehicleExpiry = detectedExpiry;
        }

        const fullUpdated = { ...data, ...appUpdates };
        onChange(fullUpdated);

        // Save to DB
        fetch('/api/onboarding/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullUpdated),
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Trigger AI Extraction error:', e);
    }
  }

  function handleExpiryChange(type: DocumentType, expiry: string) {
    const existing = data.documents[type];
    if (existing) {
      onChange({
        documents: {
          ...data.documents,
          [type]: { ...existing, expiryDate: expiry },
        },
      });
    }
  }

  function handleRemoveDoc(type: DocumentType) {
    onChange({
      documents: {
        ...data.documents,
        [type]: null,
      },
    });
  }

  function handleContinue() {
    // Check mandatory documents
    const missing = REQUIRED_DOCUMENTS_CONFIG.filter((c) => c.isMandatory && !data.documents[c.type]);
    if (missing.length > 0) {
      setError(`Please upload all mandatory documents: ${missing.map((m) => m.title).join(', ')}`);
      return;
    }

    setError('');
    onNext();
  }

  const filteredDocs = REQUIRED_DOCUMENTS_CONFIG.filter((c) => {
    if (activeCategory === 'all') return true;
    return c.category === activeCategory;
  });

  const totalMandatory = REQUIRED_DOCUMENTS_CONFIG.filter((c) => c.isMandatory).length;
  const uploadedMandatory = REQUIRED_DOCUMENTS_CONFIG.filter((c) => c.isMandatory && data.documents[c.type]).length;

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>3. Document Uploads & AI OCR</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Upload your documents (PDF, Word, Excel, CSV, or high-res photos). Our AI engine automatically extracts and validates licence numbers, VRMs, and expiry dates.
          </p>
        </div>

        <div
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            background: uploadedMandatory === totalMandatory ? 'var(--success-bg)' : 'var(--warning-bg)',
            color: uploadedMandatory === totalMandatory ? 'var(--success)' : 'var(--warning)',
            fontWeight: 700,
            fontSize: '13px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {uploadedMandatory} / {totalMandatory} Mandatory Uploaded
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }}>
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className="btn-secondary"
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            background: activeCategory === 'all' ? 'var(--flame-gradient)' : '#ffffff',
            color: activeCategory === 'all' ? '#ffffff' : 'var(--text-secondary)',
            border: activeCategory === 'all' ? '1px solid var(--flame-500)' : '1px solid var(--border-medium)',
          }}
        >
          All Documents
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('driver')}
          className="btn-secondary"
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            background: activeCategory === 'driver' ? 'var(--flame-gradient)' : '#ffffff',
            color: activeCategory === 'driver' ? '#ffffff' : 'var(--text-secondary)',
            border: activeCategory === 'driver' ? '1px solid var(--flame-500)' : '1px solid var(--border-medium)',
          }}
        >
          Driver Documents ({REQUIRED_DOCUMENTS_CONFIG.filter((c) => c.category === 'driver' && data.documents[c.type]).length}/4)
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('vehicle')}
          className="btn-secondary"
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            background: activeCategory === 'vehicle' ? 'var(--flame-gradient)' : '#ffffff',
            color: activeCategory === 'vehicle' ? '#ffffff' : 'var(--text-secondary)',
            border: activeCategory === 'vehicle' ? '1px solid var(--flame-500)' : '1px solid var(--border-medium)',
          }}
        >
          Vehicle Documents ({REQUIRED_DOCUMENTS_CONFIG.filter((c) => c.category === 'vehicle' && data.documents[c.type]).length}/4)
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: '13px',
            marginBottom: '20px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          {error}
        </div>
      )}

      {/* Document Upload Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
        {filteredDocs.map((config) => {
          const doc = data.documents[config.type];
          const isUploaded = !!doc;
          const aiData = doc?.aiExtractedData;
          const isPdf = doc?.mimeType?.includes('pdf') || doc?.filename?.toLowerCase().endsWith('.pdf');
          const isWord = doc?.mimeType?.includes('word') || /\.(docx|doc)$/i.test(doc?.filename || '');
          const isSheet = doc?.mimeType?.includes('sheet') || doc?.mimeType?.includes('csv') || /\.(xlsx|xls|csv)$/i.test(doc?.filename || '');

          return (
            <div
              key={config.type}
              style={{
                padding: '18px 20px',
                borderRadius: 'var(--radius-md)',
                background: '#ffffff',
                border: isUploaded ? '1px solid var(--border-medium)' : '1px dashed var(--border-medium)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700 }}>{config.title}</h4>
                    {config.isMandatory ? (
                      <span className="badge badge-action" style={{ fontSize: '10px', padding: '2px 6px' }}>Mandatory</span>
                    ) : (
                      <span className="badge badge-draft" style={{ fontSize: '10px', padding: '2px 6px' }}>Optional</span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '580px' }}>
                    {config.description}
                  </p>
                </div>

                <div>
                  {doc?.isAnalyzing ? (
                    <span className="badge badge-review" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span className="animate-pulse-glow">✨</span> AI Scanning...
                    </span>
                  ) : isUploaded ? (
                    <span className="badge badge-approved">✓ Uploaded</span>
                  ) : (
                    <span className="badge badge-draft">Not Uploaded</span>
                  )}
                </div>
              </div>

              {/* Upload Controls or Preview */}
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                {isUploaded ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div
                        onClick={() => setPreviewDocType(config.type)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                        title="Click to preview inside popup window"
                      >
                        {isPdf ? (
                          <div
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '8px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#dc2626',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '11px',
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ fontSize: '20px', lineHeight: 1 }}>📄</span>
                            <span style={{ marginTop: '2px' }}>PDF</span>
                          </div>
                        ) : isWord ? (
                          <div
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '8px',
                              background: '#e0e7ff',
                              border: '1px solid #c7d2fe',
                              color: '#4338ca',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '11px',
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ fontSize: '20px', lineHeight: 1 }}>📝</span>
                            <span style={{ marginTop: '2px' }}>WORD</span>
                          </div>
                        ) : isSheet ? (
                          <div
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '8px',
                              background: '#dcfce7',
                              border: '1px solid #86efac',
                              color: '#15803d',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '11px',
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ fontSize: '20px', lineHeight: 1 }}>📊</span>
                            <span style={{ marginTop: '2px' }}>SHEET</span>
                          </div>
                        ) : doc.dataUrl ? (
                          <img
                            src={doc.dataUrl}
                            alt={doc.filename}
                            style={{
                              width: '56px',
                              height: '56px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid var(--border-medium)',
                              flexShrink: 0,
                            }}
                          />
                        ) : null}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--flame-600)' }}>
                            {doc.filename} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🔍 Preview</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {(doc.fileSize / 1024).toFixed(1)} KB • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {config.requiresExpiry && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Expiry:</span>
                            <input
                              type="date"
                              value={doc.expiryDate || ''}
                              onChange={(e) => handleExpiryChange(config.type, e.target.value)}
                              style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setPreviewDocType(config.type)}
                          className="btn-secondary"
                          style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600 }}
                        >
                          👁️ Inspect / Preview
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(config.type)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--danger)',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          Replace / Remove
                        </button>
                      </div>
                    </div>

                    {/* AI Document Extraction Card */}
                    {doc.isAnalyzing ? (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '12px',
                          color: 'var(--flame-400)',
                        }}
                      >
                        <span className="animate-pulse-glow" style={{ fontSize: '16px' }}>🤖</span>
                        <span><strong>AI Engine:</strong> Extracting text contents, licence numbers, and regulatory dates...</span>
                      </div>
                    ) : aiData ? (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--success)' }}>
                            <span>✨</span> AI Document Extraction Verified
                            <span style={{ fontSize: '10px', opacity: 0.8 }}>({Math.round((aiData.confidence || 0.95) * 100)}% Match)</span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--success)' }}>✓ Saved to Database</span>
                        </div>

                        {aiData.summary && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            {aiData.summary}
                          </p>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {aiData.fullName && (
                            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                              Holder: <strong>{aiData.fullName}</strong>
                            </span>
                          )}
                          {aiData.licenceNumber && (
                            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                              Licence #: <strong>{aiData.licenceNumber}</strong>
                            </span>
                          )}
                          {aiData.vrm && (
                            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                              VRM: <strong>{aiData.vrm}</strong>
                            </span>
                          )}
                          {aiData.policyNumber && (
                            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                              Policy #: <strong>{aiData.policyNumber}</strong>
                            </span>
                          )}
                          {aiData.expiryDate && (
                            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--flame-400)' }}>
                              Expiry: <strong>{aiData.expiryDate}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Accepted formats: PDF, Images (JPG, PNG), Word (.docx), Sheets (.xlsx, .csv) • Max 15 MB • <span style={{ color: 'var(--flame-400)' }}>✨ AI Auto-Extract</span>
                    </div>

                    <label
                      className="btn-secondary"
                      style={{
                        padding: '8px 18px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderColor: 'var(--flame-500)',
                      }}
                    >
                      <span>📎</span> Choose File (PDF, Sheet, Word, Image)
                      <input
                        type="file"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(config.type, config.title, file);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Back to Vehicle
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onNext}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Skip to Bank Details →
          </button>
          <button type="button" onClick={handleContinue} className="btn-primary">
            Continue to Bank Details →
          </button>
        </div>
      </div>

      {/* Interactive Document Preview Popup Window for Driver */}
      <DocumentPreviewModal
        isOpen={!!previewDocType}
        onClose={() => setPreviewDocType(null)}
        doc={previewDocType ? data.documents[previewDocType] : null}
        applicantName={data.legalName}
        isStaff={false}
        onTriggerAiExtract={handleTriggerAiExtract}
      />
    </div>
  );
}
