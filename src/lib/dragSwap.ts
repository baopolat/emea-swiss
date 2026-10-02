export const DRAG_MIME = "application/x-emea-swap";

export type Ro16DragPayload = {
  kind: "ro16";
  slotKey: string;
  pool: number;
};

export type PoolDragPayload = {
  kind: "pool";
  teamId: string;
  pool: number;
};

export type SwapDragPayload = Ro16DragPayload | PoolDragPayload;

export function writeDragPayload(
  e: React.DragEvent,
  payload: SwapDragPayload,
) {
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.setData("text/plain", payload.kind);
  e.dataTransfer.effectAllowed = "move";
}

export function readDragPayload(
  e: React.DragEvent,
): SwapDragPayload | null {
  const raw = e.dataTransfer.getData(DRAG_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SwapDragPayload;
  } catch {
    return null;
  }
}
