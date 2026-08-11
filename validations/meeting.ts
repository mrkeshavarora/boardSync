import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional()
);

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  },
  z.string().url("Video meeting link must be a valid URL").optional()
);

export const createMeetingSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  description: optionalTrimmedString,
  meetingType: z.string().trim().min(1, "Meeting type is required"),
  date: z.string().trim().min(1, "Date is required"),
  startTime: z.string().trim().min(1, "Start time is required"),
  endTime: z.string().trim().min(1, "End time is required"),
  timezone: z.string().trim().min(1, "Timezone is required"),
  location: optionalTrimmedString,
  onlineMeeting: optionalUrl,
});

export const updateMeetingSchema = createMeetingSchema.partial().extend({
  status: z.enum(["Draft", "Scheduled", "In Progress", "Completed", "Cancelled", "Archived"]).optional(),
});
