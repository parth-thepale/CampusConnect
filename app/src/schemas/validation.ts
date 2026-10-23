import { z } from 'zod';
import {
  SUPPORTED_CATEGORIES,
  TICKET_STATUSES,
  normalizeCategory,
  Category,
  TicketStatus,
} from '../types/domain';

export const createIntakeSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, 'Complaint description must be at least 10 characters')
    .max(2000, 'Complaint description cannot exceed 2000 characters'),
  location: z
    .string()
    .trim()
    .min(3, 'Location must be at least 3 characters')
    .max(200, 'Location cannot exceed 200 characters')
    .optional(),
  category: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || normalizeCategory(val) !== null, {
      message: `Invalid category. Must be one of: ${SUPPORTED_CATEGORIES.join(', ')}`,
    })
    .transform((val) => (val ? normalizeCategory(val) : undefined)),
  additionalDetails: z.record(z.unknown()).optional(),
  attachments: z.array(z.string().max(500)).max(5).optional(),
});

export const updateIntakeSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(10, 'Complaint description must be at least 10 characters')
      .max(2000, 'Complaint description cannot exceed 2000 characters')
      .optional(),
    location: z
      .string()
      .trim()
      .min(3, 'Location must be at least 3 characters')
      .max(200, 'Location cannot exceed 200 characters')
      .optional(),
    category: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || normalizeCategory(val) !== null, {
        message: `Invalid category. Must be one of: ${SUPPORTED_CATEGORIES.join(', ')}`,
      })
      .transform((val) => (val ? normalizeCategory(val) : undefined)),
    additionalDetails: z.record(z.unknown()).optional(),
    attachments: z.array(z.string().max(500)).max(5).optional(),
  })
  .strict(); // Disallows unpermitted fields (like createdByUid, status, etc.)

export const updateTicketStatusSchema = z
  .object({
    status: z.enum(TICKET_STATUSES),
    note: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'resolved') {
        return !!data.note && data.note.trim().length >= 5;
      }
      return true;
    },
    {
      message: 'A meaningful resolution note (at least 5 characters) is required when marking a ticket as resolved',
      path: ['note'],
    }
  );

export const assignTicketSchema = z.object({
  assignedToUid: z
    .string()
    .trim()
    .min(1, 'Target assignee UID is required')
    .max(128, 'UID is too long'),
});

export const addStaffNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, 'Note cannot be empty')
    .max(1000, 'Note cannot exceed 1000 characters'),
  isInternal: z.boolean().optional().default(false),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(TICKET_STATUSES).optional(),
  category: z
    .string()
    .optional()
    .transform((val) => (val ? normalizeCategory(val) : undefined)),
  assignedToUid: z.string().optional(),
});
