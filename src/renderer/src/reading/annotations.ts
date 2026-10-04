// Annotation primitives (user_book_annotation change-stream LWW collection + tombstones).
// Pure functions: db and calibrated time are passed in by the facade.
// Deletes write tombstones; reads filter is_deleted=0; createdAt is set on insert only, never on edit.
import { and, asc, eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { userBookAnnotation } from '@/db/schema'
import type { AnnotationRecord } from './types'

const COLUMNS = {
  id: userBookAnnotation.annotationId,
  bookHash: userBookAnnotation.bookHash,
  cfi: userBookAnnotation.cfi,
  text: userBookAnnotation.text,
  color: userBookAnnotation.color,
  style: userBookAnnotation.style,
  note: userBookAnnotation.note,
  createdAt: userBookAnnotation.createdAt,
}

/** All annotations of a book (no tombstones), in creation order. Grouping/sorting by cfi happens in the page. */
export async function listAnnotations(db: Db, bookHash: string): Promise<AnnotationRecord[]> {
  const rows = await db
    .select(COLUMNS)
    .from(userBookAnnotation)
    .where(and(eq(userBookAnnotation.bookHash, bookHash), eq(userBookAnnotation.isDeleted, 0)))
    .orderBy(asc(userBookAnnotation.createdAt))
    .all()
  // color/style are text columns; writes only accept the enum (AnnotationInput), so reads narrow directly.
  return rows as AnnotationRecord[]
}

/** Editable fields: color / style / note, plus range changes from dragging handles (cfi + text together). */
export type AnnotationPatch = Partial<
  Pick<AnnotationRecord, 'cfi' | 'text' | 'color' | 'style' | 'note'>
>

/**
 * Save an annotation. The caller supplies the full record (including id and createdAt) because the page shows it
 * before saving (see newAnnotation in reading/index.ts); this only adds the sync fields.
 */
export async function addAnnotation(db: Db, a: AnnotationRecord, editTime: number): Promise<void> {
  await db
    .insert(userBookAnnotation)
    .values({ ...a, annotationId: a.id, editTime, isDeleted: 0, dirty: 1 })
    .run()
}

/**
 * Update an annotation: refreshes editTime + dirty, **keeps createdAt** (the list shows creation date).
 * The isDeleted=0 guard keeps late edits from reviving deleted rows.
 */
export async function updateAnnotation(
  db: Db,
  id: string,
  patch: AnnotationPatch,
  now: number,
): Promise<void> {
  await db
    .update(userBookAnnotation)
    .set({ ...patch, editTime: now, dirty: 1 })
    .where(and(eq(userBookAnnotation.annotationId, id), eq(userBookAnnotation.isDeleted, 0)))
    .run()
}

/** Delete an annotation: write a tombstone (same idempotency guard as books.removeBook). */
export async function removeAnnotation(db: Db, id: string, now: number): Promise<void> {
  await db
    .update(userBookAnnotation)
    .set({ isDeleted: 1, editTime: now, dirty: 1 })
    .where(and(eq(userBookAnnotation.annotationId, id), eq(userBookAnnotation.isDeleted, 0)))
    .run()
}
