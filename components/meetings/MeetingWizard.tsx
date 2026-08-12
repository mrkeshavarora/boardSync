"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CalendarDays, Check, ChevronRight, List, Mail, Save, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import StepDetails from "./steps/StepDetails";
import StepParticipants from "./steps/StepParticipants";
import StepAgenda from "./steps/StepAgenda";
import StepDocuments from "./steps/StepDocuments";
import StepReview from "./steps/StepReview";
import SendInviteBtn from "./SendInviteBtn";

const STEPS = [
  { id: "details", title: "Details" },
  { id: "participants", title: "Participants" },
  { id: "agenda", title: "Agenda" },
  { id: "documents", title: "Documents" },
  { id: "review", title: "Review" },
];

type MeetingParticipantDraft = {
  userId: string;
  name: string;
  email?: string;
  role?: string;
};

type MeetingAgendaDraft = {
  id: string;
  title: string;
  description?: string;
  duration: number;
  presenter?: string;
};

type MeetingDocumentDraft = {
  id: string;
  name: string;
  size?: string;
  type?: string;
  // Populated after real Cloudinary upload
  storageUrl?: string;
  storageKey?: string;
  fileSizeBytes?: number;
  status?: "uploading" | "done" | "error";
};

type MeetingData = {
  title: string;
  description: string;
  meetingType: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string;
  onlineMeeting: string;
  participants: MeetingParticipantDraft[];
  agenda: MeetingAgendaDraft[];
  documents: MeetingDocumentDraft[];
};

type MeetingFormErrors = {
  form?: string;
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  onlineMeeting?: string;
};

type MeetingDetailField = Exclude<keyof MeetingFormErrors, "form">;

const DETAIL_FIELDS: MeetingDetailField[] = ["title", "date", "startTime", "endTime", "timezone", "onlineMeeting"];

const isDetailField = (field: string): field is MeetingDetailField =>
  DETAIL_FIELDS.includes(field as MeetingDetailField);

const normalizeOptionalUrl = (value?: string) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// ─── Post-Create Success + Invite Screen ─────────────────────────────────────
function PostCreateScreen({
  meetingId,
  meetingTitle,
  participantCount,
  agendaCount,
  onGoToMeeting,
}: {
  meetingId: string;
  meetingTitle: string;
  participantCount: number;
  agendaCount: number;
  onGoToMeeting: () => void;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Success Banner */}
      <div
        className="rounded-2xl p-6 border border-emerald-500/20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.04) 100%)" }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Check size={22} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-700 text-white mb-1">Meeting Created Successfully!</h2>
            <p className="text-sm text-white/50 truncate">&ldquo;{meetingTitle}&rdquo;</p>
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="flex items-center gap-1.5 text-xs font-500 text-white/60 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                <CalendarDays size={12} className="text-indigo-400" /> Meeting Scheduled
              </span>
              <span className="flex items-center gap-1.5 text-xs font-500 text-white/60 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                <Users size={12} className="text-purple-400" /> {participantCount} Participant{participantCount !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-500 text-white/60 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                <List size={12} className="text-amber-400" /> {agendaCount} Agenda Item{agendaCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Send Invite Card */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "var(--bg-card)" }}>
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 6px 20px rgba(99,102,241,0.3)" }}
            >
              <Mail size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-700 text-white">Send Meeting Invitations</h3>
              <p className="text-xs text-white/40">Email all participants with meeting details and a secure join link</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Email contents preview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              "\uD83D\uDCC5 Meeting title & date",
              "\uD83D\uDD50 Time & timezone",
              "\uD83D\uDC64 Organizer details",
              "\uD83D\uDCCC Full agenda",
              "\uD83D\uDC65 Participant list",
              "\uD83D\uDD17 Secure join link",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-xs text-white/50 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]"
              >
                <span>{item}</span>
              </div>
            ))}
          </div>

          {participantCount === 0 ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
              <AlertCircle size={16} className="shrink-0" />
              <span>No participants were added — invites cannot be sent. Add participants from the meeting detail page.</span>
            </div>
          ) : (
            <SendInviteBtn
              meetingId={meetingId}
              initialSentCount={0}
              totalParticipants={participantCount}
              hasBeenSentBefore={false}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <a
          href="/meetings"
          className="px-4 py-2.5 rounded-xl text-sm font-500 text-white/60 hover:text-white hover:bg-white/[0.05] border border-white/[0.06] transition-all"
        >
          Back to Meetings
        </a>
        <button
          onClick={onGoToMeeting}
          className="btn-gradient px-5 py-2.5 rounded-xl text-sm font-600 flex items-center gap-2"
        >
          Go to Meeting <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function MeetingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [meetingData, setMeetingData] = useState<MeetingData>({
    title: "",
    description: "",
    meetingType: "Board Meeting",
    date: "",
    startTime: "",
    endTime: "",
    timezone: "UTC",
    location: "",
    onlineMeeting: "",
    participants: [],
    agenda: [],
    documents: [],
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<MeetingFormErrors>({});
  // Holds the new meeting ID after successful creation — triggers the invite screen
  const [createdMeetingId, setCreatedMeetingId] = useState<string | null>(null);

  const validateMeetingData = () => {
    const nextErrors: MeetingFormErrors = {};
    const title = String(meetingData.title ?? "").trim();
    const date = String(meetingData.date ?? "").trim();
    const startTime = String(meetingData.startTime ?? "").trim();
    const endTime = String(meetingData.endTime ?? "").trim();
    const timezone = String(meetingData.timezone ?? "").trim();
    const onlineMeeting = normalizeOptionalUrl(String(meetingData.onlineMeeting ?? ""));

    if (title.length < 3) nextErrors.title = "Title must be at least 3 characters";
    if (!date) {
      nextErrors.date = "Date is required";
    } else if (Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      nextErrors.date = "Date must be valid";
    }
    if (!startTime) nextErrors.startTime = "Start time is required";
    if (!endTime) nextErrors.endTime = "End time is required";
    if (startTime && endTime && endTime <= startTime) nextErrors.endTime = "End time must be after start time";
    if (!timezone) nextErrors.timezone = "Timezone is required";
    if (onlineMeeting && !isValidHttpUrl(onlineMeeting)) {
      nextErrors.onlineMeeting = "Video meeting link must be a valid URL";
    }

    return nextErrors;
  };

  const hasValidationErrors = (nextErrors: MeetingFormErrors) => Object.values(nextErrors).some(Boolean);

  const updateMeetingData = (updates: Partial<MeetingData>) => {
    setMeetingData((current) => ({ ...current, ...updates }));
    setErrors((current) => {
      const changedFields = Object.keys(updates);
      if (!changedFields.some(isDetailField) && !current.form) return current;

      const next = { ...current };
      changedFields.forEach((field) => {
        if (isDetailField(field)) delete next[field];
      });
      if (changedFields.some(isDetailField)) delete next.form;

      return next;
    });
  };

  const buildCreatePayload = () => {
    const onlineMeeting = normalizeOptionalUrl(String(meetingData.onlineMeeting ?? ""));

    return {
      title: String(meetingData.title ?? "").trim(),
      description: String(meetingData.description ?? "").trim() || undefined,
      meetingType: String(meetingData.meetingType ?? "").trim(),
      date: String(meetingData.date ?? "").trim(),
      startTime: String(meetingData.startTime ?? "").trim(),
      endTime: String(meetingData.endTime ?? "").trim(),
      timezone: String(meetingData.timezone ?? "").trim(),
      location: String(meetingData.location ?? "").trim() || undefined,
      onlineMeeting: onlineMeeting || undefined,
    };
  };

  const handleNext = () => {
    if (currentStep === 0) {
      const nextErrors = validateMeetingData();
      if (hasValidationErrors(nextErrors)) {
        setErrors(nextErrors);
        return;
      }
    }

    if (currentStep < STEPS.length - 1) setCurrentStep((c) => c + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((c) => c - 1);
  };

  const handleSaveDraft = async () => {
    // Phase 2 implementation for saving draft
    console.log("Saving draft...", meetingData);
  };

  const handleSubmit = async () => {
    const nextErrors = validateMeetingData();
    if (hasValidationErrors(nextErrors)) {
      setErrors(nextErrors);
      setCurrentStep(0);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCreatePayload()),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const nextErrors: MeetingFormErrors = { form: result.error || "Failed to create meeting" };
        const fieldErrors = result.details?.fieldErrors;
        if (fieldErrors && Object.keys(fieldErrors).length > 0) {
          const firstField = Object.keys(fieldErrors)[0];
          const message = fieldErrors[firstField]?.[0] || nextErrors.form;
          if (isDetailField(firstField)) {
            nextErrors[firstField] = message;
            nextErrors.form = message;
          } else {
            nextErrors.form = `Validation error on ${firstField}: ${message}`;
          }
        } else if (result.details?.formErrors?.length > 0) {
          nextErrors.form = result.details.formErrors[0];
        }

        setErrors(nextErrors);
        if (Object.keys(nextErrors).some((field) => field !== "form" && isDetailField(field))) setCurrentStep(0);
        return;
      }

      const meetingId = result.meeting._id || result.meeting.id;
      if (meetingData.participants?.length) {
        await Promise.all(meetingData.participants.map((participant) =>
          fetch(`/api/meetings/${meetingId}/participants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: participant.userId,
              role: participant.role || "Attendee",
            }),
          })
        ));
      }

      // Save Agenda items to DB
      if (meetingData.agenda?.length) {
        await Promise.all(meetingData.agenda.map((item, index) =>
          fetch(`/api/meetings/${meetingId}/agenda`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: item.title,
              description: item.description,
              estimatedDuration: item.duration,
              presenterId: item.presenter || undefined,
              order: index + 1,
            }),
          })
        ));
      }

      // Save uploaded documents to DB
      const uploadedDocs = meetingData.documents.filter(
        (d) => d.status === "done" && d.storageUrl && d.storageKey
      );
      if (uploadedDocs.length > 0) {
        await Promise.all(
          uploadedDocs.map((doc) =>
            fetch(`/api/meetings/${meetingId}/documents`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: doc.name,
                fileType: doc.type ?? "file",
                fileSize: doc.fileSizeBytes ?? 0,
                storageUrl: doc.storageUrl,
                storageKey: doc.storageKey,
              }),
            })
          )
        );
      }

      // Show the post-create invite screen instead of navigating away immediately
      setCreatedMeetingId(meetingId);
    } catch (error) {
      setErrors({ form: (error as Error).message || "Unable to create meeting. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Render success + invite screen once the meeting is created
  if (createdMeetingId) {
    return (
      <PostCreateScreen
        meetingId={createdMeetingId}
        meetingTitle={meetingData.title}
        participantCount={meetingData.participants.length}
        agendaCount={meetingData.agenda.length}
        onGoToMeeting={() => {
          router.push(`/meetings/${createdMeetingId}`);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Wizard Header / Progress */}
      <div className="rounded-2xl p-6 border border-white/[0.06]" style={{ background: "var(--bg-card)" }}>
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = currentStep > index;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-600 transition-colors",
                    isActive ? "bg-indigo-500 text-white" : 
                    isCompleted ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : 
                    "bg-white/[0.04] text-white/40 border border-white/[0.1]"
                  )}>
                    {isCompleted ? <Check size={14} /> : index + 1}
                  </div>
                  <span className={cn(
                    "text-xs font-500",
                    isActive ? "text-white" : isCompleted ? "text-white/70" : "text-white/40"
                  )}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "h-px w-12 sm:w-24 mx-2 sm:mx-4 transition-colors",
                    isCompleted ? "bg-emerald-500/30" : "bg-white/[0.06]"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {errors.form && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 animate-fade-in">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-300" />
          <p>{errors.form}</p>
        </div>
      )}

      {/* Wizard Content */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "var(--bg-card)" }}>
        <div className="p-6 min-h-[400px]">
          {currentStep === 0 && <StepDetails data={meetingData} updateData={updateMeetingData} errors={errors} />}
          {currentStep === 1 && <StepParticipants data={meetingData} updateData={updateMeetingData} />}
          {currentStep === 2 && <StepAgenda data={meetingData} updateData={updateMeetingData} />}
          {currentStep === 3 && <StepDocuments data={meetingData} updateData={updateMeetingData} />}
          {currentStep === 4 && <StepReview data={meetingData} />}
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/meetings")}
              className="px-4 py-2 rounded-lg text-sm font-500 text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-lg text-sm font-500 text-white/80 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors flex items-center gap-2"
            >
              <Save size={14} />
              Save Draft
            </button>
          </div>
          
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 rounded-lg text-sm font-500 text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
              >
                Back
              </button>
            )}
            
            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="btn-gradient px-4 py-2 rounded-lg text-sm font-600 flex items-center gap-2"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-gradient px-4 py-2 rounded-lg text-sm font-600 flex items-center gap-2"
              >
                {loading ? "Creating..." : "Create Meeting"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
