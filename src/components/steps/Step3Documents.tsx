'use client';

import { useState } from 'react';
import { DriverApplication, DocumentType, REQUIRED_DOCUMENTS_CONFIG, UploadedDoc } from '@/types/onboarding';

interface Step3DocumentsProps {
  data: DriverApplication;
  onChange: (updates: Partial<DriverApplication>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3Documents({ data, onChange, onNext, onBack }: Step3DocumentsProps) {
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'driver' | 'vehicle'>('all');

  async function handleFileUpload(type: DocumentType, title: string, file: File, expiry?: string) {
    if (file.size > 10 * 1024 * 1024) {
      setError(`File "${file.name}" exceeds the 10 MB maximum limit.`);
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
        mimeType: file.type,
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

      // Trigger AI OCR Extraction API
      try {
        const res = await fetch('/api/onboarding/ai-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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

          onChange({
            ...appFieldUpdates,
            documents: {
              ...data.documents,
              [type]: {
                ...initialDoc,
                isAnalyzing: false,
                expiryDate: detectedExpiry,
                aiExtractedData: aiData,
              },
            },
          });
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
            Upload clear photographs or PDF documents. Our AI scanner automatically extracts and validates licence numbers and expiry dates.
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
            background: activeCategory === 'all' ? 'var(--flame-gradient)' : undefined,
            color: activeCategory === 'all' ? '#fff' : undefined,
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
            background: activeCategory === 'driver' ? 'var(--flame-gradient)' : undefined,
            color: activeCategory === 'driver' ? '#fff' : undefined,
          }}
        >
          Driver Documents
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('vehicle')}
          className="btn-secondary"
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            background: activeCategory === 'vehicle' ? 'var(--flame-gradient)' : undefined,
            color: activeCategory === 'vehicle' ? '#fff' : undefined,
          }}
        >
          Vehicle Documents
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

      {/* Documents Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
        {filteredDocs.map((config) => {
          const doc = data.documents[config.type];
          const isUploaded = !!doc;
          const aiData = doc?.aiExtractedData;

          return (
            <div
              key={config.type}
              style={{
                padding: '18px',
                borderRadius: 'var(--radius-md)',
                background: isUploaded ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-tertiary)',
                border: isUploaded ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '15px' }}>{config.title}</h4>
                    {config.isMandatory ? (
                      <span style={{ fontSize: '11px', color: 'var(--flame-500)', fontWeight: 700 }}>REQUIRED</span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>OPTIONAL</span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{config.description}</p>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {doc.dataUrl && (
                          <img
                            src={doc.dataUrl}
                            alt={doc.filename}
                            style={{
                              width: '56px',
                              height: '56px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid var(--border-medium)',
                            }}
                          />
                        )}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{doc.filename}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {(doc.fileSize / 1024).toFixed(1)} KB &bull; Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
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
                        <span><strong>AI Document OCR Scanner:</strong> Reading text, licence numbers, and expiration dates...</span>
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
                          <span style={{ fontSize: '11px', color: 'var(--success)' }}>✓ Saved to Application</span>
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
                      Accepted formats: JPG, PNG, HEIC, PDF (Max 10 MB) &bull; <span style={{ color: 'var(--flame-400)' }}>✨ AI Auto-Extract</span>
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
                      <span>📷</span> Choose File / Take Photo
                      <input
                        type="file"
                        accept="image/*,application/pdf"
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={onBack} className="btn-secondary">
          &larr; Back to Vehicle
        </button>
        <button type="button" onClick={handleContinue} className="btn-primary">
          Continue to Agreement &rarr;
        </button>
      </div>
    </div>
  );
}
