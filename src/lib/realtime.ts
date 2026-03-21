type RealtimePayload = {
  eventType?: string;
  new?: Record<string, unknown> | null;
  old?: Record<string, unknown> | null;
};

const getStatus = (row: Record<string, unknown> | null | undefined) =>
  typeof row?.status === "string" ? row.status : undefined;

// UPDATE eventlerinde status alanı gelmiyorsa bu genelde fiyat/pnl tick'idir.
export const shouldSkipOrderRefetch = (payload: RealtimePayload) => {
  if (payload.eventType !== "UPDATE") return false;

  const nextStatus = getStatus(payload.new);
  const prevStatus = getStatus(payload.old);

  if (!nextStatus && !prevStatus) return true;

  const fromStatus = prevStatus ?? nextStatus;
  const toStatus = nextStatus ?? prevStatus;
  return fromStatus === "open" && toStatus === "open";
};

export const isUpdateWithoutRowData = (payload: RealtimePayload) =>
  payload.eventType === "UPDATE" && !payload.new;
