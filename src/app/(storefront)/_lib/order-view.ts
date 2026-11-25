// Turns an order document into what the order pages show. Shared by the server (order lookup) and the
// browser (My Account), so it must not import anything server-only.

/** One item as stored on an order document (older and newer field names). */
export type OrderRowItem = {
  product_name?: string;
  name?: string;
  variant_label?: string;
  size?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  subtotal?: number;
  line_total?: number;
  total?: number;
};

/** An order document from Firestore. Field names vary between the storefront and the admin panel. */
export type OrderRow = {
  id?: string;
  customer?: { name?: string; email?: string; phone?: string };
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  order_number?: string;
  number?: string;
  status?: string;
  payment_method?: string;
  paymentMethod?: string;
  payment_status?: string;
  paymentStatus?: string;
  subtotal_inr?: number;
  subtotal?: number;
  discount?: number;
  couponCode?: string;
  shipping_inr?: number;
  shipping?: number;
  total_inr?: number;
  total?: number;
  created_at?: string;
  createdAt?: string;
  access_token?: string;
  accessToken?: string;
  items?: OrderRowItem[];
};

export function orderCustomer(row: OrderRow) {
  if (row.customer && typeof row.customer === "object") return row.customer;
  return {
    name: row.customerName || "",
    email: row.customerEmail || "",
    phone: row.customerPhone || "",
  };
}

export function toOrderView(row: OrderRow) {
  const cust = orderCustomer(row);
  return {
    orderNumber: row.order_number || row.number,
    status: row.status || "Pending",
    paymentMethod: row.payment_method || row.paymentMethod || "Cash on Delivery",
    paymentStatus: row.payment_status || row.paymentStatus || "Pending",
    subtotal: Number(row.subtotal_inr || row.subtotal || 0),
    discount: Number(row.discount || 0),
    couponCode: row.couponCode || undefined,
    shipping: Number(row.shipping_inr || row.shipping || 0),
    total: Number(row.total_inr || row.total || 0),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    customerName: cust.name,
    items: (row.items || []).map((item) => {
      const qty = item.quantity ?? item.qty ?? 1;
      const lineTotal = item.line_total ?? item.subtotal ?? item.total ?? (item.price ? item.price * qty : 0);
      return {
        product_name: item.product_name || item.name || "Product",
        variant_label: item.variant_label || item.size || "Standard",
        quantity: qty,
        line_total_inr: Number(lineTotal),
      };
    }),
  };
}
