import { useEffect, useState } from "react";
import MerchantMenu from "./MerchantMenu";
import OrderItems from "./OrderItems";
import { formatOrderTime, type Order } from "./order";
import { requestOrdersApi } from "./ordersApi";
import "./merchant.css";

type MerchantPageProps = { accessToken: string; storeName: string; secondary?: boolean };

export default function MerchantPage({ accessToken, storeName, secondary = false }: MerchantPageProps) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const busy = loading || completingOrderId !== null;

  useEffect(() => {
    if (!accessToken || busy) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setRefresh((count) => count + 1);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [accessToken, busy]);

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    async function loadOrders() {
      setLoading(true);
      setError("");
      try {
        const response = await requestOrdersApi("/merchant/orders", accessToken, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
        });
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

  if (!accessToken) return <p className="app-alert" role="alert">请重新登录</p>;

  const Title = secondary ? "h2" : "h1";
  const SectionTitle = secondary ? "h3" : "h2";

  return (
    <section className="merchant-page" aria-labelledby="merchant-heading">
      <header className="page-banner">
        <Title id="merchant-heading">商家工作台</Title>
        <p className="merchant-store-name">门店 {storeName}</p>
      </header>

      <div className="merchant-dashboard">
        <section className="merchant-panel" id="merchant-orders" tabIndex={-1} aria-labelledby="merchant-orders-heading">
          <div className="section-heading">
            <SectionTitle id="merchant-orders-heading">待处理订单</SectionTitle>
            <button
              className="app-button app-button--outline"
              type="button"
              onClick={() => setRefresh((count) => count + 1)}
              disabled={busy}
            >
              {loading ? "正在读取…" : "刷新待处理订单"}
            </button>
          </div>
          {error && <p className="app-alert" role="alert">{error}</p>}
          {!loading && !error && orders?.length === 0 && <p className="merchant-empty">暂无待处理订单</p>}
          {orders && orders.length > 0 && (
            <ul className="merchant-orders-list">
              {orders.map((order) => (
                <li className="merchant-order" key={order.orderId}>
                  <div className="merchant-order-details">
                    <p className="merchant-order-time">下单时间 {formatOrderTime(order.createdAt)}</p>
                    {order.items?.length ? (
                      <OrderItems items={order.items} totalAmountCents={order.totalAmountCents} />
                    ) : null}
                    {order.note && <p className="merchant-order-note"><strong>备注</strong> {order.note}</p>}
                  </div>
                  <button className="app-button" type="button" onClick={() => void markReady(order.orderId)} disabled={busy}>
                    {completingOrderId === order.orderId ? "正在提交…" : "制作完成"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <MerchantMenu accessToken={accessToken} headingLevel={SectionTitle} />
      </div>
    </section>
  );
}
