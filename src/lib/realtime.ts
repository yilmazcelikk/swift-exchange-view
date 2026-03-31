type RealtimePayload = {
  eventType?: string;
  new?: Record<string, unknown> | null;
  old?: Record<string, unknown> | null;
};

const getStatus = (row: Record<string, unknown> | null | undefined) =>
  typeof row?.status === "string" ? row.status : undefined;

// Fields that, when changed, indicate a structural edit (not just a price tick).
// If ANY of these differ between old and new, we must refetch.
const STRUCTURAL_FIELDS = [
  "entry_price", "lots", "leverage", "stop_loss", "take_profit",
  "type", "symbol_name", "symbol_id", "swap", "order_type", "target_price",
];

const hasStructuralChange = (payload: RealtimePayload): boolean => {
  const oldRow = payload.old;
  const newRow = payload.new;
  if (!oldRow || !newRow) return false;
  return STRUCTURAL_FIELDS.some(f => {
    // old may not contain all fields (Supabase REPLICA IDENTITY), 
    // so only compare when both sides have the field
    if (!(f in oldRow)) return false;
    return String(oldRow[f] ?? "") !== String(newRow[f] ?? "");
  });
};

// UPDATE eventlerinde sadece fiyat/pnl tick'i ise refetch'i atla.
// Admin düzenlemesi gibi yapısal değişikliklerde refetch yap.
export const shouldSkipOrderRefetch = (payload: RealtimePayload) => {
  if (payload.eventType !== "UPDATE") return false;

  // If structural fields changed (admin edit), always refetch
  if (hasStructuralChange(payload)) return false;

  const nextStatus = getStatus(payload.new);
  const prevStatus = getStatus(payload.old);

  if (!nextStatus && !prevStatus) return true;

  const fromStatus = prevStatus ?? nextStatus;
  const toStatus = nextStatus ?? prevStatus;
  return fromStatus === "open" && toStatus === "open";
};

export const isUpdateWithoutRowData = (payload: RealtimePayload) =>
  payload.eventType === "UPDATE" && !payload.new;
