"use client";

import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface MinutesPDFDownloadProps {
  minutes: any;
  variant?: "button" | "icon";
}

export default function MinutesPDFDownload({ minutes, variant = "button" }: MinutesPDFDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = () => {
    setIsGenerating(true);

    try {
      // Initialize jsPDF
      const doc = new jsPDF();
      const meeting = minutes.meetingId;
      const meetingTitle = meeting?.title || "Board Meeting";
      const meetingDate = meeting?.scheduledAt
        ? new Date(meeting.scheduledAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "N/A";

      // Styles
      const primaryColor = [79, 70, 229] as [number, number, number]; // Indigo 600
      const textColor = [55, 65, 81] as [number, number, number]; // Gray 700

      // --- Header ---
      doc.setFontSize(24);
      doc.setTextColor(...primaryColor);
      doc.text("BoardSync", 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text("Official Minutes of Meeting", 14, 28);

      doc.setDrawColor(229, 231, 235);
      doc.line(14, 32, 196, 32);

      // --- Meeting Details ---
      doc.setFontSize(16);
      doc.setTextColor(...textColor);
      doc.text(meetingTitle, 14, 42);

      doc.setFontSize(11);
      doc.text(`Date: ${meetingDate}`, 14, 50);
      doc.text(`Location: ${meeting?.location || meeting?.meetingLink || "Virtual"}`, 14, 56);
      doc.text(`Status: ${minutes.status}`, 14, 62);

      let yPos = 70;

      // --- Summary ---
      if (minutes.meetingSummary) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Meeting Summary", 14, yPos);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        const splitSummary = doc.splitTextToSize(minutes.meetingSummary, 180);
        doc.text(splitSummary, 14, yPos + 6);
        yPos += 10 + (splitSummary.length * 5);
      }

      // --- Attendees ---
      if (minutes.attendees && minutes.attendees.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Attendance", 14, yPos);

        const attendeeBody = minutes.attendees.map((a: any) => [
          a.name,
          a.role || "Member",
          a.attendanceStatus
        ]);

        (doc as any).autoTable({
          startY: yPos + 4,
          head: [["Name", "Role", "Status"]],
          body: attendeeBody,
          theme: "grid",
          headStyles: { fillColor: primaryColor, textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3 },
          margin: { left: 14, right: 14 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Agenda & Discussions ---
      if (minutes.agendaItems && minutes.agendaItems.length > 0) {
        if (yPos > 240) { doc.addPage(); yPos = 20; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Discussions & Decisions", 14, yPos);

        const agendaBody = minutes.agendaItems.map((item: any, i: number) => [
          `${i + 1}. ${item.title}`,
          item.discussionSummary || "-",
          item.decision || "-"
        ]);

        (doc as any).autoTable({
          startY: yPos + 4,
          head: [["Item", "Discussion", "Decision"]],
          body: agendaBody,
          theme: "grid",
          headStyles: { fillColor: primaryColor, textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 80 },
            2: { cellWidth: 60 }
          },
          margin: { left: 14, right: 14 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Action Items ---
      if (minutes.actionItems && minutes.actionItems.length > 0) {
        if (yPos > 240) { doc.addPage(); yPos = 20; }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Action Items", 14, yPos);

        const actionBody = minutes.actionItems.map((item: any) => [
          item.task,
          item.assignedTo || "Unassigned",
          item.dueDate || "-",
          item.status
        ]);

        (doc as any).autoTable({
          startY: yPos + 4,
          head: [["Task", "Assigned To", "Due Date", "Status"]],
          body: actionBody,
          theme: "grid",
          headStyles: { fillColor: primaryColor, textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3 },
          margin: { left: 14, right: 14 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Signatures ---
      if (yPos > 220) { doc.addPage(); yPos = 20; }
      
      yPos += 20;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const draftedBy = minutes.draftedBy?.name || "______________________";
      const approvedBy = minutes.approvedBy?.name || "______________________";
      const approvedDate = minutes.approvedAt 
        ? new Date(minutes.approvedAt).toLocaleDateString() 
        : "________________";

      doc.text("Drafted By:", 14, yPos);
      doc.text(draftedBy, 14, yPos + 8);
      
      doc.text("Approved By:", 100, yPos);
      doc.text(approvedBy, 100, yPos + 8);
      
      doc.text("Date Approved:", 150, yPos);
      doc.text(approvedDate, 150, yPos + 8);

      // --- Footer ---
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `BoardSync Official Document - Confidential - Page ${i} of ${pageCount}`,
          105, 290, { align: "center" }
        );
      }

      // Download
      doc.save(`Minutes_${meetingTitle.replace(/\s+/g, "_")}_${meetingDate.replace(/,/g,"")}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={generatePDF}
        disabled={isGenerating}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        title="Download PDF"
      >
        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      </button>
    );
  }

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-600 text-white transition-colors"
    >
      {isGenerating ? (
        <Loader2 size={16} className="animate-spin text-indigo-400" />
      ) : (
        <FileText size={16} className="text-indigo-400" />
      )}
      Download PDF
    </button>
  );
}
