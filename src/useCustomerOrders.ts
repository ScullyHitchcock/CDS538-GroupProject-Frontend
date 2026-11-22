import { useState } from "react";
import type { Order } from "./order";
import { requestOrdersApi } from "./ordersApi";

export function useCustomerOrders(accessToken?: string) {
  const [serverOrders, setServerOrders] = useState<Order[] | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 保留刚提交的订单，直到查询结果里也读到它。
  const listedOrderIds = new Set(serverOrders?.map(({ orderId }) => orderId));
  const orders = [
    ...recentOrders.filter(({ orderId }) => !listedOrderIds.has(orderId)),
    ...(serverOrders ?? []),
  ].sort((left, right) => Number(right.createdAt) - Number(left.createdAt));

  function rememberOrder(confirmed: Order) {
    setRecentOrders((recent) => [confirmed, ...recent.filter(({ orderId }) => orderId !== confirmed.orderId)]);
  }

  async function refreshOrders() {
    if (!accessToken) {
      setError("请重新登录");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await requestOrdersApi("/orders", accessToken);
      if (!response.ok) {
        throw new Error(`读取订单列表失败（HTTP ${response.status}）`);
      }
      const { orders }: { orders: Order[] } = await response.json();
      const returnedOrderIds = new Set(orders.map(({ orderId }) => orderId));
      setServerOrders(orders);
      setRecentOrders((recent) => recent.filter(({ orderId }) => !returnedOrderIds.has(orderId)));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setLoading(false);
    }
  }

  return { orders, hasLoaded: serverOrders !== null, loading, error, rememberOrder, refreshOrders };
}
