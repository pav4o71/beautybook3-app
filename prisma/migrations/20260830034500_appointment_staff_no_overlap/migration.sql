-- One-time cleanup before overlap constraint: drops the NEWER row in each overlapping
-- non-cancelled pair. Safe for test DBs; review before first deploy on production data.
-- Constraint: Appointment_staff_no_overlap (staffId + tsrange, excluding CANCELLED).
DELETE FROM "Appointment" newer
USING "Appointment" older
WHERE newer."staffId" = older."staffId"
  AND newer.id <> older.id
  AND newer.status <> 'CANCELLED'
  AND older.status <> 'CANCELLED'
  AND newer."startsAt" < older."endsAt"
  AND newer."endsAt" > older."startsAt"
  AND newer."createdAt" > older."createdAt";

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_staff_no_overlap"
EXCLUDE USING gist (
  "staffId" WITH =,
  tsrange("startsAt", "endsAt", '[)') WITH &&
)
WHERE (status <> 'CANCELLED');
