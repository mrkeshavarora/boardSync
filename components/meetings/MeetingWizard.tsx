"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ChevronRight, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import StepDetails from "./steps/StepDetails";
import StepParticipants from "./steps/StepParticipants";
import StepAgenda from "./steps/StepAgenda";
import StepDocuments from "./steps/StepDocuments";
import StepReview from "./steps/StepReview";

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

      router.push("/meetings");
      router.refresh();
    } catch (error) {
      setErrors({ form: (error as Error).message || "Unable to create meeting. Please try again." });
    } finally {
      setLoading(false);
    }
  };

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
