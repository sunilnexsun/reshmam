"use client";

import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import type { OrderView } from "@storefront/_components/cart/OrderStatus";
import { customerDb } from "./customer-firebase";
import { toOrderView, type OrderRow } from "./order-view";

/** Most orders a signed-in customer sees on My Account. */
export const ORDER_HISTORY_LIMIT = 50;

/** The signed-in customer's orders, newest first. Firestore rules only return orders linked to their uid. */
export async function fetchCustomerOrders(uid: string): Promise<OrderView[]> {
  const snap = await getDocs(
    query(collection(customerDb, "orders"), where("customerId", "==", uid), orderBy("createdAt", "desc"), limit(ORDER_HISTORY_LIMIT)),
  );
  return snap.docs.map((d) => toOrderView({ id: d.id, ...(d.data() as OrderRow) }) as OrderView);
}
