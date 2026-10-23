import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import {
  Category,
  SUPPORTED_CATEGORIES,
  CATEGORY_LABELS,
  Intake,
  AiDraftAnalysisResult,
} from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Building,
  RefreshCw,
  Send,
} from 'lucide-react';

export const ComplaintReportingWizard: React.FC = () => {
  // Wizard Steps: 1 = Initial Details, 2 = AI Analysis & Clarification, 3 = Review & Confirm, 4 = Ticket Created
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<string>('');

  // Server-Persisted State
  const [activeIntake, setActiveIntake] = useState<Intake | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiDraftAnalysisResult | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [clarificationAnswer, setClarificationAnswer] = useState('');
  const [confirmedTicket, setConfirmedTicket] = useState<{
    ticketId: string;
    ticketNumber: string;
    isNew: boolean;
  } | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Create Intake Draft
  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError('Complaint description must be at least 10 characters long.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let intake: Intake;
      if (activeIntake) {
        // Update existing draft
        intake = await apiClient.patch<Intake>(`/api/intakes/${activeIntake.intakeId}`, {
          description: description.trim(),
          location: location.trim() || undefined,
          category: category ? (category as Category) : undefined,
        });
      } else {
        // Create new intake draft
        intake = await apiClient.post<Intake>('/api/intakes', {
          description: description.trim(),
          location: location.trim() || undefined,
          category: category ? (category as Category) : undefined,
        });
      }

      setActiveIntake(intake);
      setStep(2);

      // Trigger AI Analysis automatically for Step 2
      await runAiAnalysis(intake.intakeId);
    } catch (err: any) {
      setError(err?.message || 'Failed to save complaint draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Run or retry AI Analysis
  const runAiAnalysis = async (intakeId: string) => {
    setLoading(true);
    setAiUnavailable(false);
    setError(null);
    try {
      const result = await apiClient.post<AiDraftAnalysisResult>(
        `/api/intakes/${intakeId}/analyze`
      );
      setAiAnalysis(result);

      // If category was not selected but AI suggested one, offer it
      if (!category && result.suggestedCategory) {
        setCategory(result.suggestedCategory);
      }
    } catch (err: any) {
      console.warn('AI Analysis unavailable:', err?.message);
      setAiUnavailable(true);
      // Fail-safe boundary: we do not crash or block the user from proceeding
    } finally {
      setLoading(false);
    }
  };

  // Submit Clarification answer to update draft and re-run AI
  const handleSubmitClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIntake || !clarificationAnswer.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const updatedDescription = `${description.trim()}\n\n[Additional Details]: ${clarificationAnswer.trim()}`;
      setDescription(updatedDescription);

      const updated = await apiClient.patch<Intake>(`/api/intakes/${activeIntake.intakeId}`, {
        description: updatedDescription,
      });
      setActiveIntake(updated);
      setClarificationAnswer('');

      // Re-analyze with enriched description
      await runAiAnalysis(updated.intakeId);
    } catch (err: any) {
      setError(err?.message || 'Failed to update draft with clarification.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Explicit Confirmation into Official Ticket
  const handleConfirmTicket = async () => {
    if (!activeIntake) return;

    if (!location.trim() || location.trim().length < 3) {
      setError('A specific location (at least 3 characters, e.g. "Library 2nd Floor") is required to confirm.');
      return;
    }

    if (!category) {
      setError('Please select a facility category before confirming.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // First ensure intake has final location and category
      await apiClient.patch<Intake>(`/api/intakes/${activeIntake.intakeId}`, {
        location: location.trim(),
        category: category as Category,
      });

      // Call authoritative confirm endpoint
      const result = await apiClient.post<{
        ticketId: string;
        ticketNumber: string;
        isNew: boolean;
      }>(`/api/intakes/${activeIntake.intakeId}/confirm`);

      setConfirmedTicket(result);
      setStep(4);
    } catch (err: any) {
      setError(err?.message || 'Failed to confirm ticket. Please check all required fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Wizard Header Progress Bar */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
          Report a Campus Issue
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: 'var(--space-1)' }}>
          Follow the guided steps to describe the problem, review AI analysis, and submit an official repair ticket.
        </p>

        {/* Stepper Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'var(--space-6)',
            position: 'relative',
          }}
          aria-label="Progress steps"
        >
          {[
            { num: 1, label: 'Describe' },
            { num: 2, label: 'AI Review' },
            { num: 3, label: 'Confirm' },
            { num: 4, label: 'Ticket' },
          ].map((s) => (
            <div
              key={s.num}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-1)',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  backgroundColor:
                    step > s.num
                      ? 'var(--color-success)'
                      : step === s.num
                      ? 'var(--color-primary)'
                      : 'var(--color-surface-hover)',
                  color:
                    step >= s.num ? 'var(--color-text-inverted)' : 'var(--color-text-muted)',
                  border: `2px solid ${step >= s.num ? 'transparent' : 'var(--color-border)'}`,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {step > s.num ? <CheckCircle2 size={18} /> : s.num}
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: step === s.num ? 700 : 500,
                  color: step === s.num ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
          {/* Connecting line */}
          <div
            style={{
              position: 'absolute',
              top: '18px',
              left: '20px',
              right: '20px',
              height: '2px',
              backgroundColor: 'var(--color-border)',
              zIndex: 0,
            }}
          />
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* STEP 1: INITIAL COMPLAINT FORM */}
      {step === 1 && (
        <Card padding="lg">
          <form onSubmit={handleCreateDraft} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Step 1: What is the issue?
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                Describe the problem clearly. You can provide location now or refine it in the next step.
              </p>
            </div>

            <Textarea
              label="Problem Description"
              required
              rows={4}
              maxLength={2000}
              showCount
              placeholder="e.g., The washroom tap on the 2nd floor of Block B has been leaking heavily since morning."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              helperText="Minimum 10 characters. Include any specific observations."
            />

            <Input
              label="Location on Campus"
              placeholder="e.g., Block B, 2nd floor near Room 204"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              helperText="Building, floor, wing, or room number."
            />

            <Select
              label="Facility Category (Optional)"
              placeholder="-- Select Category or let AI suggest --"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={SUPPORTED_CATEGORIES.map((c) => ({
                value: c,
                label: CATEGORY_LABELS[c],
              }))}
              helperText="Choose the department that handles this issue, or leave blank to let Gemini analyze it."
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <Button type="submit" variant="primary" size="lg" isLoading={loading}>
                Analyze with Gemini AI
                <ArrowRight size={18} />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* STEP 2: AI COMPLAINT ANALYSIS & CLARIFICATION */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card padding="lg">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Sparkles size={22} color="var(--color-primary)" />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    Step 2: AI Assistance &amp; Review
                  </h2>
                </div>
                {activeIntake && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => runAiAnalysis(activeIntake.intakeId)}
                    isLoading={loading}
                  >
                    <RefreshCw size={14} />
                    Re-analyze
                  </Button>
                )}
              </div>

              {/* Fail-Safe Boundary Notice */}
              {aiUnavailable && (
                <Alert type="warning" title="AI Assistance Temporarily Unavailable">
                  Gemini AI complaint analysis is temporarily unavailable (e.g. quota or connection). Your
                  complaint draft remains safely preserved! You can continue directly to review and submit.
                </Alert>
              )}

              {loading && !aiAnalysis && (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      width: '28px',
                      height: '28px',
                      border: '3px solid var(--color-primary)',
                      borderRightColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      marginBottom: 'var(--space-2)',
                    }}
                  />
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    Gemini AI is analyzing your complaint for clarity, location, and routing...
                  </p>
                </div>
              )}

              {aiAnalysis && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {/* Title & Summary */}
                  <div
                    style={{
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-primary-subtle)',
                      border: '1px solid var(--color-primary-border)',
                    }}
                  >
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                      Suggested Title &amp; Summary
                    </div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)', marginTop: 'var(--space-1)' }}>
                      {aiAnalysis.title}
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                      {aiAnalysis.summary}
                    </p>
                  </div>

                  {/* Classification & Location Badges */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
                    <div style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Category Suggestion
                      </div>
                      <div style={{ marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        {aiAnalysis.suggestedCategory ? (
                          <CategoryBadge category={aiAnalysis.suggestedCategory} />
                        ) : (
                          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            Could not determine category
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Extracted Location
                      </div>
                      <div style={{ marginTop: 'var(--space-1)', fontSize: '0.9rem', fontWeight: 600 }}>
                        {aiAnalysis.extractedLocation?.rawMentioned || location || (
                          <span style={{ color: 'var(--color-error)' }}>Location needed</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Demo Routing Transparency (Section 18) */}
                  {aiAnalysis.routingSuggestion && (
                    <div
                      style={{
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <Building size={16} color="var(--color-text-secondary)" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          Recommended Department: <strong>{aiAnalysis.routingSuggestion.department}</strong>
                        </span>
                        {aiAnalysis.routingSuggestion.isDemoRule && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'var(--status-in_progress-bg)',
                              color: 'var(--status-in_progress-text)',
                              border: '1px solid var(--status-in_progress-border)',
                              fontWeight: 600,
                            }}
                          >
                            Demo routing rule — not yet verified as official campus policy
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                        {aiAnalysis.routingSuggestion.reason}
                      </p>
                    </div>
                  )}

                  {/* Clarification Question Section */}
                  {aiAnalysis.clarifyingQuestion && (
                    <div
                      style={{
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fde68a',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <HelpCircle size={18} color="#b45309" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400e' }}>
                          Clarification Requested by AI:
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#78350f', marginTop: 'var(--space-1)', fontWeight: 500 }}>
                        {aiAnalysis.clarifyingQuestion.questionText}
                      </p>

                      <form onSubmit={handleSubmitClarification} style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
                        <Input
                          placeholder="Type your answer here to refine the complaint..."
                          value={clarificationAnswer}
                          onChange={(e) => setClarificationAnswer(e.target.value)}
                          disabled={loading}
                        />
                        <Button type="submit" variant="primary" size="md" isLoading={loading} disabled={!clarificationAnswer.trim()}>
                          <Send size={16} />
                          Answer
                        </Button>
                      </form>
                    </div>
                  )}

                  {/* Missing Info Indicators */}
                  {aiAnalysis.missingFields && aiAnalysis.missingFields.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {aiAnalysis.missingFields.map((mf, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            fontSize: '0.85rem',
                            color: 'var(--color-warning)',
                          }}
                        >
                          <AlertTriangle size={15} />
                          <span>Missing <strong>{mf.field}</strong>: {mf.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Advisory Notice */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Note: Gemini AI suggestions are advisory. Final assignment and resolution are executed by authorized campus staff.
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)' }}>
                <Button variant="ghost" size="md" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} />
                  Edit Complaint
                </Button>
                <Button variant="primary" size="lg" onClick={() => setStep(3)}>
                  Review &amp; Confirm
                  <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* STEP 3: REVIEW & EXPLICIT CONFIRMATION */}
      {step === 3 && (
        <Card padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Step 3: Review &amp; Confirm Ticket
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                Verify your complaint details before submission. Pressing confirm creates an official ticket in the campus operations queue.
              </p>
            </div>

            {/* Editable Fields for Confirmation Completeness */}
            <Input
              label="Campus Location"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              helperText="Exact building and room number (required for dispatching staff)."
            />

            <Select
              label="Confirmed Category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={SUPPORTED_CATEGORIES.map((c) => ({
                value: c,
                label: CATEGORY_LABELS[c],
              }))}
            />

            <div
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-hover)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Complaint Description
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', marginTop: 'var(--space-1)', whiteSpace: 'pre-wrap' }}>
                {description}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
              <Button variant="ghost" size="md" onClick={() => setStep(2)}>
                <ArrowLeft size={16} />
                Back to AI Review
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleConfirmTicket}
                isLoading={loading}
              >
                <CheckCircle2 size={18} />
                Confirm &amp; Create Ticket
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 4: TICKET CONFIRMED SUCCESS */}
      {step === 4 && confirmedTicket && (
        <Card padding="lg">
          <div style={{ textAlign: 'center', padding: 'var(--space-6) var(--space-4)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-3)',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Ticket Created Successfully!
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: 'var(--space-1)' }}>
              Your issue has been recorded and placed into the campus facilities queue for triage.
            </p>

            <div
              style={{
                display: 'inline-block',
                margin: 'var(--space-6) 0',
                padding: 'var(--space-4) var(--space-6)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-primary-subtle)',
                border: '1px solid var(--color-primary-border)',
              }}
            >
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Official Ticket Reference
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.05em' }}>
                {confirmedTicket.ticketNumber}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <StatusBadge status="submitted" />
                {category && <CategoryBadge category={category as Category} />}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Link to={`/student/tickets/${confirmedTicket.ticketId}`}>
                <Button variant="primary" size="lg">
                  View Ticket &amp; Timeline
                </Button>
              </Link>
              <Link to="/student">
                <Button variant="secondary" size="lg">
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
