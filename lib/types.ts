import { z } from 'zod';

export interface LabelEntry {
  id: string;
  egg_id: string;
  name: string;
  cage: string;
  link: string;
  createdAt: string;
}

export const AddEntrySchema = z.object({
  secret: z.string(),
  egg_id: z.string().min(1),
  name: z.string().min(1),
  cage: z.string().min(1),
  link: z.string().url().optional(),
});

export type AddEntryParams = z.infer<typeof AddEntrySchema>;

export const DataResponse = z.object({
  ok: z.literal(true),
  entries: z.array(z.object({
    id: z.string(),
    egg_id: z.string(),
    name: z.string(),
    cage: z.string(),
    link: z.string(),
    createdAt: z.string(),
  })),
});

export const AddResponse = z.object({
  ok: z.literal(true),
  entry: z.object({
    id: z.string(),
    egg_id: z.string(),
    name: z.string(),
    cage: z.string(),
    link: z.string(),
    createdAt: z.string(),
  }),
});
