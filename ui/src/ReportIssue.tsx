import { useState, type FormEvent } from 'react';
import { api } from './api';
import { categories, type AiDraft, type Category, type DuplicateCandidate, type ImageProblemDetection, type Ticket } from './types';
import SmartTextArea from './SmartTextArea';
import { playSound } from './audio';

const locations = [
  { id: 'library-north', label: 'Central Library · North Reading Area' },
  { id: 'block-b-floor-2', label: 'Block B · Second Floor' },
  { id: 'science-lab-1', label: 'Science Building · Lab 1' },
  { id: 'hostel-a-ground', label: 'Hostel A · Ground Floor' },
  { id: 'main-cafeteria', label: 'Main Cafeteria' },
];

const categoryLabels: Record<Category, string> = {
  plumbing: 'Plumbing',
  electricity: 'Electricity',
  cleanliness: 'Cleanliness',
  internet: 'Internet',
};

function Icon({ name, filled = false }: { name: string; filled?: boolean }) {
  return <span className="material-symbols-rounded symbol" data-filled={filled}>{name}</span>;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function ReportIssue({ onCreated }: { onCreated: (ticket: Ticket) => void }) {
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [source, setSource] = useState<'gemini' | 'local' | null>(null);
  const [photo, setPhoto] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [comparison, setComparison] = useState<{ candidateId: string | null; confidence: string; reasons: string[]; source: 'gemini' | 'local' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedProblem, setDetectedProblem] = useState<ImageProblemDetection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const location = locations.find((item) => item.id === locationId);

  const updateDescription = (value: string) => {
    setDescription(value);
    setDraft(null);
  };

  const analyze = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.analyze(description, locationId || undefined, photo ? { data: photo.data, mimeType: photo.mimeType } : undefined);
      setDraft(result.draft);
      setSource(result.source);
      if (locationId) {
        const duplicate = await api.duplicatePreview(description, result.draft.category, locationId);
        setCandidates(duplicate.candidates);
        setComparison(duplicate.comparison);
      } else {
        setCandidates([]);
        setComparison(null);
      }
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  const runImageAutoDetection = async (img: { data: string; mimeType: string; name: string }) => {
    setDetecting(true);
    setError(null);
    try {
      const res = await api.detectFromImage({
        data: img.data,
        mimeType: img.mimeType,
        name: img.name,
        hint: description,
      });
      setDetectedProblem(res.detection);
      setDescription(res.detection.description);

      // Immediately generate draft from detected problem
      const analyzeRes = await api.analyze(res.detection.description, locationId || undefined, { data: img.data, mimeType: img.mimeType });
      setDraft({
        ...analyzeRes.draft,
        category: res.detection.category,
        summary: res.detection.summary,
        photoObservation: `AI Visual Detection (${res.detection.confidence} confidence): ${res.detection.summary}. Objects identified: ${res.detection.detectedObjects.join(', ')}. Severity: ${res.detection.severity.toUpperCase()}.`,
      });
      setSource(res.source);

      if (locationId) {
        const duplicate = await api.duplicatePreview(res.detection.description, res.detection.category, locationId);
        setCandidates(duplicate.candidates);
        setComparison(duplicate.comparison);
      }
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setDetecting(false);
    }
  };

  const switchDetectedCategory = (cat: Category) => {
    if (!detectedProblem) return;
    const catDefaults: Record<Category, { summary: string; description: string; objects: string[]; action: string; risk: string }> = {
      plumbing: {
        summary: 'Faucet Valve Gasket Seepage and Basin Water Pooling',
        description: 'Visual inspection shows pressurized moisture seepage and water pooling around plumbing fixtures. Rubber washer replacement and slip joint retorquing required.',
        objects: ['P-Trap Waste Pipe', 'Compression Slip Nut', 'Water Droplets / Floor Puddle', 'Isolation Valve'],
        action: 'Turn off angle isolation valve, replace rubber conical washer, and retorque slip nut.',
        risk: 'Floor slip hazard on wet ceramic tiles; place caution cone around wet floor area.',
      },
      electricity: {
        summary: 'Damaged Switchboard Faceplate & Exposed Terminal Wiring',
        description: 'Visual evidence indicates electrical contact degradation or structural socket damage with exposed internal wiring. High risk of electrical arcing and short-circuit hazard.',
        objects: ['Switchboard Faceplate', 'MCB Breaker', 'Exposed Copper Wire', 'Junction Box'],
        action: 'Trip upstream branch breaker, verify zero voltage with multimeter, and replace terminal block.',
        risk: 'Severe electrical shock hazard. Do not touch enclosure with bare hands before lockout/tagout.',
      },
      cleanliness: {
        summary: 'Sanitation Refuse Overflow & Uncollected Waste Accumulation',
        description: 'Physical evidence reveals unattended debris or liquid pooling in high-traffic campus zone. Condition creates immediate slip/fall hazards and unsanitary conditions.',
        objects: ['Corridor Floor Surface', 'Organic Waste & Wrapper', 'Liquid Spill Film', 'Receptacle Area'],
        action: 'Dispatch housekeeping team with disinfectant mop, absorbent powder, and industrial disposal bags.',
        risk: 'High slipping hazard on slick floor surface; deploy yellow wet-floor caution pylons immediately.',
      },
      internet: {
        summary: 'Wi-Fi Access Point Showing Red LOS / Link Loss Indicator',
        description: 'Network transceiver indicates unseated Ethernet cabling or upstream PoE link failure. Access point is unresponsive to client associations, requiring port test.',
        objects: ['Ceiling Access Point (AP)', 'RJ-45 Ethernet Patch Cord', 'Status LED Indicator', 'PoE Supply Cable'],
        action: 'Power-cycle PoE switch port, test cable continuity with RJ45 tester, and verify DHCP pool allocation.',
        risk: 'Low-voltage data cabling; no shock hazard. Confirm ladder placement safety.',
      },
    };
    const def = catDefaults[cat];
    const updated: ImageProblemDetection = {
      ...detectedProblem,
      category: cat,
      summary: def.summary,
      description: def.description,
      detectedObjects: def.objects,
      suggestedAction: def.action,
      safetyRisk: def.risk,
    };
    setDetectedProblem(updated);
    setDescription(def.description);
    if (draft) {
      setDraft({
        ...draft,
        category: cat,
        summary: def.summary,
      });
    }
  };

  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
      setError('Use a JPEG, PNG, or WebP photo smaller than 6 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const imgObj = { data: String(reader.result), mimeType: file.type, name: file.name };
      setPhoto(imgObj);
      // Auto-trigger image detection immediately upon photo upload!
      runImageAutoDetection(imgObj);
    };
    reader.readAsDataURL(file);
  };

  const confirm = async () => {
    if (!draft || !location) return;
    setBusy(true);
    setError(null);
    try {
      const { ticket } = await api.createTicket({
        originalText: description,
        summary: draft.summary,
        category: draft.category,
        locationId,
        location: location.label,
        photoName: photo?.name,
        photoData: photo?.data, // Persist photo data for staff and admin screens!
        candidates,
      });
      playSound('success');
      onCreated(ticket);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  const needsLocation = draft?.missingFields.includes('location');

  return (
    <section className="report-layout">
      <div className="page-heading report-heading">
        <span className="eyebrow">Student intake</span>
        <h1>Tell us what needs attention.</h1>
        <p>Type, dictate with voice, or simply upload a photo—our AI will auto-detect the problem for you.</p>
      </div>

      <div className="report-grid">
        <form
          className="report-form"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            analyze();
          }}
        >
          <div className="photo-input-section">
            <div className="photo-input-header">
              <div>
                <strong>Upload issue photo</strong>
                <span>AI can auto-detect the problem directly from your image</span>
              </div>
              <label className="file-button">
                <Icon name="add_a_photo" />
                {photo ? 'Replace photo' : 'Attach photo'}
                <input
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => choosePhoto(event.target.files?.[0])}
                />
              </label>
            </div>

            {photo && (
              <div className="photo-preview-card">
                <div className="preview-img-wrap">
                  <img src={photo.data} alt="Selected report attachment" />
                  <button
                    type="button"
                    className="icon-button remove-photo"
                    aria-label="Remove photo"
                    onClick={() => {
                      setPhoto(null);
                      setDetectedProblem(null);
                    }}
                  >
                    <Icon name="close" />
                  </button>
                </div>
                <div className="preview-meta">
                  <span className="photo-filename">{photo.name}</span>
                  <button
                    type="button"
                    className="button-chip ai-detect-btn"
                    disabled={detecting}
                    onClick={() => runImageAutoDetection(photo)}
                  >
                    {detecting ? (
                      <>
                        <span className="spinner small" />
                        Detecting problem…
                      </>
                    ) : (
                      <>
                        <Icon name="auto_awesome" filled />
                        Auto-detect from image
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {detectedProblem && (
              <div className="detected-problem-banner">
                <div className="banner-title">
                  <div className="title-left">
                    <Icon name="image_search" filled />
                    <strong>AI Visual Detection: {categoryLabels[detectedProblem.category]}</strong>
                  </div>
                  <div className="banner-tags">
                    <span className="model-chip">Gemini 3.8 Flash-Lite</span>
                    <span className={`severity-tag ${detectedProblem.severity}`}>{detectedProblem.severity}</span>
                  </div>
                </div>
                <p className="detected-summary-text">
                  <strong>{detectedProblem.summary}</strong>: {detectedProblem.description}
                </p>
                <div className="detected-tags">
                  {detectedProblem.detectedObjects.map((obj) => (
                    <span key={obj} className="tag-pill">{obj}</span>
                  ))}
                </div>
                {detectedProblem.suggestedAction && (
                  <div className="action-hint">
                    <Icon name="build" />
                    <span><strong>Suggested Action:</strong> {detectedProblem.suggestedAction}</span>
                  </div>
                )}
                {detectedProblem.safetyRisk && (
                  <div className="safety-warning-hint">
                    <Icon name="warning" filled />
                    <span><strong>Safety Notice:</strong> {detectedProblem.safetyRisk}</span>
                  </div>
                )}

                <div className="category-override-row">
                  <span className="override-label">Need adjustment? Switch category:</span>
                  <div className="override-pills">
                    {(['plumbing', 'electricity', 'cleanliness', 'internet'] as Category[]).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`override-pill ${detectedProblem.category === cat ? 'active' : ''}`}
                        onClick={() => switchDetectedCategory(cat)}
                      >
                        <Icon name={cat === 'plumbing' ? 'water_drop' : cat === 'electricity' ? 'bolt' : cat === 'cleanliness' ? 'mop' : 'wifi'} />
                        <span>{categoryLabels[cat]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="detected-actions-row">
                  <button
                    type="button"
                    className="button secondary sm apply-ai-btn"
                    onClick={() => {
                      setDescription(`${detectedProblem.summary}. ${detectedProblem.description}`);
                    }}
                  >
                    <Icon name="content_paste" />
                    Use AI description in form
                  </button>
                </div>
              </div>
            )}
          </div>

          <SmartTextArea
            id="issue-description"
            name="description"
            value={description}
            onChange={updateDescription}
            placeholder="Type or dictate the issue… or upload a photo above to auto-detect!"
            minLength={4}
            required
            label="What did you notice?"
            type="issue"
            category={draft?.category}
            location={location?.label}
            hint="Voice dictation, AI write & photo detection active"
          />

          <label>
            Where is it happening?
            <select
              name="location"
              value={locationId}
              onChange={(event) => {
                setLocationId(event.target.value);
                setDraft(null);
              }}
            >
              <option value="">Select a campus location</option>
              {locations.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p className="form-error" role="alert">
              <Icon name="error" filled />
              {error}
            </p>
          )}

          <button
            type="submit"
            className="button primary report-submit"
            disabled={busy || description.trim().length < 4}
          >
            {busy ? (
              <>
                <span className="spinner" />
                Reviewing report…
              </>
            ) : (
              <>
                <Icon name="auto_awesome" />
                Create AI draft
              </>
            )}
          </button>
        </form>

        <aside className="ai-panel" aria-live="polite">
          {!draft ? (
            <IntakeGuide
              description={description}
              locationId={locationId}
              hasPhoto={Boolean(photo)}
              hasAutoDetected={Boolean(detectedProblem)}
            />
          ) : (
            <>
              <div className="ai-panel-head">
                <div>
                  <span className="eyebrow">Structured review</span>
                  <h2>Confirm the draft</h2>
                </div>
                <span className={`ai-source ${source}`}>
                  {source === 'gemini' ? 'Gemini' : 'Local fallback'}
                </span>
              </div>

              <div className="intake-quality">
                <div>
                  <span>Intake readiness</span>
                  <strong>{draft.clarityScore}%</strong>
                </div>
                <div className="quality-meter" aria-label={`Intake readiness ${draft.clarityScore}%`}>
                  <i style={{ width: `${draft.clarityScore}%` }} />
                </div>
                <ul>
                  {draft.reviewChecks.map((check) => (
                    <li key={check}>
                      <Icon name="check_circle" filled />
                      {check}
                    </li>
                  ))}
                </ul>
              </div>

              <label>
                Ticket summary
                <input
                  name="summary"
                  value={draft.summary}
                  onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                />
              </label>

              <label>
                Category
                <select
                  name="category"
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </option>
                  ))}
                </select>
              </label>

              {draft.clarificationQuestion && (
                <div className={`clarification ${needsLocation ? 'attention' : ''}`}>
                  <Icon name="help" filled />
                  <div>
                    <strong>{needsLocation ? 'One detail is needed' : 'Suggested follow-up'}</strong>
                    <p>{draft.clarificationQuestion}</p>
                  </div>
                </div>
              )}

              {draft.photoObservation && (
                <p className="photo-observation">
                  <Icon name="image_search" />
                  {draft.photoObservation}
                </p>
              )}

              {location && (
                <div className="confirmed-location">
                  <Icon name="location_on" filled />
                  <span>{location.label}</span>
                </div>
              )}

              {comparison?.candidateId && (
                <DuplicatePreview
                  candidate={candidates.find((item) => item.id === comparison.candidateId) ?? null}
                  reasons={comparison.reasons}
                  source={comparison.source}
                />
              )}

              {draft.safetyNote && (
                <p className="safety-note">
                  <Icon name="info" />
                  {draft.safetyNote}
                </p>
              )}

              <button
                type="button"
                className="button primary full"
                disabled={busy || !location || Boolean(needsLocation)}
                onClick={confirm}
              >
                {busy ? (
                  <>
                    <span className="spinner" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Confirm and submit
                    <Icon name="arrow_forward" />
                  </>
                )}
              </button>
              {!location && <p className="validation-copy">Choose a location to enable submission.</p>}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function IntakeGuide({
  description,
  locationId,
  hasPhoto,
  hasAutoDetected,
}: {
  description: string;
  locationId: string;
  hasPhoto: boolean;
  hasAutoDetected: boolean;
}) {
  const steps = [
    {
      icon: 'add_a_photo',
      label: 'Photo or description',
      detail: hasAutoDetected
        ? 'Problem auto-detected from photo!'
        : description.trim()
          ? 'Captured'
          : 'Upload a photo or dictate/type',
      complete: Boolean(description.trim() || hasPhoto),
    },
    {
      icon: 'location_on',
      label: 'Confirm location',
      detail: locationId ? 'Location selected' : 'Choose campus area',
      complete: Boolean(locationId),
    },
    {
      icon: 'auto_awesome',
      label: 'Review draft',
      detail: 'AI categorizes and prepares review',
      complete: false,
    },
  ];

  return (
    <>
      <div className="ai-icon">
        <Icon name="auto_awesome" filled />
      </div>
      <div>
        <h2>Guided intake</h2>
        <p>Three simple steps turn photos or voice reports into accountable maintenance tickets.</p>
      </div>
      <ol className="intake-steps">
        {steps.map((step, index) => (
          <li className={step.complete ? 'complete' : ''} key={step.label}>
            <span>{step.complete ? <Icon name="check" filled /> : index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </div>
          </li>
        ))}
      </ol>
      <p className="ai-boundary">
        <Icon name="shield" />
        AI assists intake & classification. Human staff review and resolve every ticket.
      </p>
    </>
  );
}

function DuplicatePreview({
  candidate,
  reasons,
  source,
}: {
  candidate: DuplicateCandidate | null;
  reasons: string[];
  source: 'gemini' | 'local';
}) {
  if (!candidate) return null;
  return (
    <div className="duplicate-preview">
      <div>
        <Icon name="content_copy" filled />
        <strong>Possible related report</strong>
      </div>
      <p>
        <b>{candidate.publicId}</b> · {candidate.summary}
      </p>
      {reasons.map((reason) => (
        <span key={reason}>{reason}</span>
      ))}
      <small>
        {source === 'gemini'
          ? 'AI comparison is for staff review only.'
          : 'Local similarity check is for staff review only.'}
      </small>
    </div>
  );
}
