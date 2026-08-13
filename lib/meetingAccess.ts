import mongoose from "mongoose";
import Meeting from "@/models/Meeting";
import MeetingParticipant from "@/models/MeetingParticipant";
import { UserRole } from "@/models/User";

/**
 * Checks if a user role is an administrative role.
 */
export function isAdmin(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

/**
 * Returns an array of meeting ObjectIds accessible to the given user.
 * If the user is an admin (super_admin or admin), returns null (indicating unrestricted access).
 */
export async function getAccessibleMeetingIds(
  userId: string,
  role: UserRole
): Promise<mongoose.Types.ObjectId[] | null> {
  if (isAdmin(role)) {
    return null; // Null indicates no filtering needed (all access)
  }

  if (!userId) return [];

  const userObjId = new mongoose.Types.ObjectId(userId);

  // 1. Meetings where the user is organizer or creator
  const organizedMeetings = await Meeting.find({
    $or: [{ organizerId: userObjId }, { createdBy: userObjId }],
  })
    .select("_id")
    .lean();

  // 2. Meetings where the user is listed in MeetingParticipant
  const participantRecords = await MeetingParticipant.find({
    userId: userObjId,
  })
    .select("meetingId")
    .lean();

  const idSet = new Set<string>();
  organizedMeetings.forEach((m: any) => {
    if (m._id) idSet.add(m._id.toString());
  });
  participantRecords.forEach((p: any) => {
    if (p.meetingId) idSet.add(p.meetingId.toString());
  });

  return Array.from(idSet).map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * Checks if a user has permission to access a specific meeting.
 * Access is granted if the user is an Admin, the Organizer/Creator, or an invited Participant.
 */
export async function canAccessMeeting(
  userId: string,
  role: UserRole,
  meetingId: string
): Promise<boolean> {
  if (isAdmin(role)) return true;
  if (!userId || !meetingId) return false;

  try {
    const userObjId = new mongoose.Types.ObjectId(userId);
    const meetingObjId = new mongoose.Types.ObjectId(meetingId);

    // Check if user is organizer or creator
    const isOrganizer = await Meeting.exists({
      _id: meetingObjId,
      $or: [{ organizerId: userObjId }, { createdBy: userObjId }],
    });
    if (isOrganizer) return true;

    // Check if user is a participant
    const isParticipant = await MeetingParticipant.exists({
      meetingId: meetingObjId,
      userId: userObjId,
    });
    if (isParticipant) return true;

    return false;
  } catch (err) {
    console.error("Error in canAccessMeeting:", err);
    return false;
  }
}
