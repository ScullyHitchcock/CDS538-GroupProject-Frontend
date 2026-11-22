import { useEffect, useState } from "react";
import MerchantMenu from "./MerchantMenu";
import OrderItems from "./OrderItems";
import { formatOrderTime, type Order } from "./order";
import { requestOrdersApi } from "./ordersApi";

export default function MerchantPage({ accessToken }: { accessToken: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    async function loadOrders() {
      setLoading(true);
      setError("");
      try {
        const response = await requestOrdersApi("/merchant/orders", accessToken, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`读取待处理订单失败（HTTP ${response.status}）`);
        }
        const { orders }: { orders: Order[] } = await response.json();
        if (!controller.signal.aborted) setOrders(orders);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadOrders();
    return () => controller.abort();
  }, [accessToken, refresh]);

  async function markReady(orderId: string) {
    setCompletingOrderId(orderId);
    setError("");
    try {
      const response = await requestOrdersApi(`/merchant/orders/${encodeURIComponent(orderId)}/ready`, accessToken, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error(`标记制作完成失败（HTTP ${response.status}）`);
      }
      setOrders((current) => current?.filter((order) => order.orderId !== orderId) ?? null);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setCompletingOrderId(null);
    }
  }

  if (!accessToken) return <p role="alert">请重新登录</p>;

  const busy = loading || completingOrderId !== null;

  return (
    <>
      <MerchantMenu accessToken={accessToken} />
      <section>
        <h3>待处理订单</h3>
        <button onClick={() => setRefresh((count) => count + 1)} disabled={busy}>
          {loading ? "正在读取…" : "刷新待处理订单"}
        </button>
        {error && <p role="alert">{error}</p>}
        {!loading && !error && orders?.length === 0 && <p>暂无待处理订单</p>}
        {orders && orders.length > 0 && (
          <table style={{ margin: "12px auto" }}>
            <thead>
              <tr>
                <th scope="col">下单时间</th>
                <th scope="col">饮品</th>
                <th scope="col">备注</th>
                <th scope="col">状态</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td>{formatOrderTime(order.createdAt)}</td>
                  <td><OrderItems items={order.items} totalAmountCents={order.totalAmountCents} /></td>
                  <td>{order.note || "—"}</td>
                  <td>待制作</td>
                  <td>
                    <button onClick={() => void markReady(order.orderId)} disabled={busy}>
                      {completingOrderId === order.orderId ? "正在提交…" : "制作完成"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
