// Portfolio PDF builder. Ports the layout from the original admin.js
// generatePDF function. jsPDF 2.5.x supports Korean text rendering via its
// built-in font only when a Unicode font is embedded. For simplicity we
// keep the same naive approach as the original (default helvetica font +
// splitTextToSize), which *does* drop glyphs for Hangul on some platforms.
// If that becomes an issue, embed Noto Sans KR via jsPDF.addFont.
import { jsPDF } from 'jspdf';
import type { Writing } from './types';

export interface StudentPortfolio {
  userName: string;
  writings: Writing[];
}

function formatDate(w: Writing): string {
  const d = (w.createdAt as any)?.toDate?.() ?? new Date();
  return d.toLocaleDateString('ko-KR');
}

export function generatePortfolioPdf(title: string, students: StudentPortfolio[]) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const lineHeight = 7;
  let y = 20;

  doc.setFontSize(18);
  doc.text(title, margin, y);
  y += 15;

  students.forEach((student, sIdx) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${student.userName}님의 글`, margin, y);
    y += 10;

    student.writings.forEach((w, wIdx) => {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(`${wIdx + 1}. ${w.title}`, pageWidth - 2 * margin);
      doc.text(titleLines, margin, y);
      y += titleLines.length * lineHeight + 3;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `주제/장르: ${w.topicOrGenre} | 작성일: ${formatDate(w)} | 좋아요: ${w.likes ?? 0} | 댓글: ${w.comments?.length ?? 0}`,
        margin,
        y,
      );
      y += 8;

      doc.setFontSize(10);
      const contentLines = doc.splitTextToSize(w.content ?? '', pageWidth - 2 * margin);
      doc.text(contentLines, margin, y);
      y += contentLines.length * lineHeight + 10;

      if (w.comments && w.comments.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('댓글:', margin, y);
        y += 6;
        for (const c of w.comments) {
          if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
          }
          const cLines = doc.splitTextToSize(`- ${c.userName}: ${c.text}`, pageWidth - 2 * margin - 10);
          doc.text(cLines, margin + 5, y);
          y += cLines.length * lineHeight + 3;
        }
        y += 5;
      }

      if (wIdx < student.writings.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
      }
    });

    if (sIdx < students.length - 1) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      } else {
        y += 10;
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;
      }
    }
  });

  const fname = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fname);
}
