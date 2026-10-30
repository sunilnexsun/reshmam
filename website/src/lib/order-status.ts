/**
 * Order statuses shown to customers (Track Order page, confirmation page,
 * chat assistant). Database values map onto these customer-facing steps.
 */
export const trackingSteps = [
  { key: "confirmed", label: "Order Confirmed", text: "Your order has been successfully received." },
  { key: "processing", label: "Processing", text: "Your order is being prepared." },
  { key: "packed", label: "Packed", text: "Your products are packed and ready for dispatch." },
  { key: "shipped", label: "Shipped", text: "Your order has been handed over to the courier partner." },
  { key: "out_for_delivery", label: "Out for Delivery", text: "Your package is on its way to your address." },
  { key: "delivered", label: "Delivered", text: "Your order has been successfully delivered." },
] as const;

/** Index of the current step for a database status, or -1 when the order isn't in the delivery flow. */
export function stepIndex(status: string) {
  const map: Record<string, number> = {
    placed: 0,
    paid: 0,
    processing: 1,
    packed: 2,
    shipped: 3,
    out_for_delivery: 4,
    delivered: 5,
  };
  return map[status] ?? -1;
}

export const otherStatusLabels: Record<string, string> = {
  pending_payment: "Awaiting payment",
  payment_failed: "Payment failed",
  cancelled: "Cancelled",
};

export function statusLabel(status: string) {
  const i = stepIndex(status);
  return i >= 0 ? trackingSteps[i].label : (otherStatusLabels[status] ?? status);
}
