import type { Ticket } from './types';

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportTicketsCsv(tickets: Ticket[]): void {
  const headers = [
    'Ticket ID',
    'Tracking Code',
    'Status',
    'Category',
    'Location',
    'Reporter Name',
    'Summary',
    'Assigned Technician',
    'Department',
    'Created At',
    'Updated At',
    'Resolution Note',
    'Student Rating',
    'Student Sentiment',
    'Student Quality Tags',
    'Student Feedback Comment',
    'Has Photo Attachment',
  ];

  const rows = tickets.map((t) => [
    escapeCsv(t.id),
    escapeCsv(t.publicId),
    escapeCsv(t.status.toUpperCase()),
    escapeCsv(t.category.toUpperCase()),
    escapeCsv(t.location),
    escapeCsv(t.reporterName),
    escapeCsv(t.summary),
    escapeCsv(t.assignee || 'Unassigned'),
    escapeCsv(t.department),
    escapeCsv(t.createdAt),
    escapeCsv(t.updatedAt),
    escapeCsv(t.resolutionNote || ''),
    escapeCsv(t.studentFeedback ? `${t.studentFeedback.rating}/5` : 'N/A'),
    escapeCsv(t.studentFeedback?.satisfaction || 'N/A'),
    escapeCsv(t.studentFeedback?.tags?.join('; ') || ''),
    escapeCsv(t.studentFeedback?.comment || ''),
    escapeCsv(Boolean(t.photoData || t.photoName) ? 'YES' : 'NO'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `CampusConnect_Operations_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printExecutiveReport(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
