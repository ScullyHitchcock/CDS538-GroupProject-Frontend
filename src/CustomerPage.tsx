import { useEffect, useRef, useState } from "react";
import OrderItems from "./OrderItems";
import { formatPrice, type Drink, type Order } from "./order";

const API = import.meta.env.VITE_API_URL as string;
const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "待制作",
  READY: "可取餐",
};

type Store = { storeId: string; name: string };
type Catalog = { stores: Store[]; menu: Drink[]; maxItemQuantity: number };

export default function CustomerPage({ accessToken }: { accessToken?: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [storeError, setStoreError] = useState("");
  const [storeId, setStoreId] = useState("");
  const [pendingStoreId, setPendingStoreId] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const checkoutId = useRef<string | null>(null);
  const [myOrders, setMyOrders] = useState<Order[] | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    async function loadCatalog() {
      setStoreError("");
      try {
        const response = await fetch(`${API}/stores`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`读取门店失败（HTTP ${response.status}）`);
        }
        const data: Catalog = await response.json();
        if (!controller.signal.aborted) setCatalog(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          setStoreError(error instanceof Error ? error.message : String(error));
        }
      }
    }
    void loadCatalog();
    return () => controller.abort();
  }, [accessToken]);

  const selectedStore = catalog?.stores.find((store) => store.storeId === storeId);
  const pendingStore = catalog?.stores.find((store) => store.storeId === pendingStoreId);
  const menu = catalog?.menu ?? [];
  const maxQuantity = catalog?.maxItemQuantity ?? 0;
  const cartItems = menu
    .map((drink) => ({ ...drink, quantity: cart[drink.productId] ?? 0 }))
    .filter((drink) => drink.quantity > 0);
  const total = cartItems.reduce((sum, drink) => sum + drink.priceCents * drink.quantity, 0);

  function selectStore(nextStoreId: string) {
    setStoreId(nextStoreId);
    setPendingStoreId("");
    setCart({});
    setCheckoutError("");
    setSubmittedOrder(null);
    checkoutId.current = null;
  }

  function changeQuantity(productId: string, change: number) {
    checkoutId.current = null;
    setCheckoutError("");
    setCart((current) => ({
      ...current,
      [productId]: Math.max(0, Math.min(maxQuantity, (current[productId] ?? 0) + change)),
    }));
  }

  async function submitOrder(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStore || cartItems.length === 0 || submitting) return;
    if (!accessToken) {
      setCheckoutError("请重新登录");
      return;
    }

    checkoutId.current ??= crypto.randomUUID();
    setPendingStoreId("");
    setSubmitting(true);
    setCheckoutError("");
    setSubmittedOrder(null);
    try {
      const response = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          storeId,
          note,
          checkoutId: checkoutId.current,
          items: cartItems.map(({ productId, quantity }) => ({ productId, quantity })),
        }),
      });
      if (!response.ok) {
        throw new Error(`提交订单失败（HTTP ${response.status}）`);
      }
      const created: Order = await response.json();
      setSubmittedOrder(created);
      setMyOrders((orders) => orders && [created, ...orders.filter((order) => order.orderId !== created.orderId)]);
      setCart({});
      setNote("");
      checkoutId.current = null;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function loadMyOrders() {
    if (!accessToken) {
      setOrdersError("请重新登录");
      return;
    }
    setOrdersError("");
    setLoadingOrders(true);
    try {
      const response = await fetch(`${API}/orders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error(`读取订单列表失败（HTTP ${response.status}）`);
      }
      const { orders }: { orders: Order[] } = await response.json();
      setMyOrders(orders);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingOrders(false);
    }
  }

  return (
    <>
      <section className="checkout" aria-labelledby="checkout-heading">
        <h3 id="checkout-heading">顾客下单</h3>
        <fieldset disabled={submitting}>
          <legend>选择门店</legend>
          {storeError && <p role="alert">{storeError}</p>}
          {!catalog && !storeError && <p>正在加载门店…</p>}
          {catalog?.stores.length === 0 && <p>暂无可选门店</p>}
          {catalog?.stores.map((store) => (
            <label className="store-option" key={store.storeId}>
              <input
                type="radio"
                name="store"
                value={store.storeId}
                checked={storeId === store.storeId}
                onChange={() => {
                  if (cartItems.length) setPendingStoreId(store.storeId);
                  else selectStore(store.storeId);
                }}
              />
              {store.name}
            </label>
          ))}
        </fieldset>
        {pendingStore && (
          <div className="store-switch" role="group" aria-label="确认切换门店">
            <p>切换到 {pendingStore.name} 会清空购物车。</p>
            <button type="button" onClick={() => setPendingStoreId("")}>保留当前门店</button>
            <button type="button" onClick={() => selectStore(pendingStore.storeId)}>确认切换</button>
          </div>
        )}

        {selectedStore && (
          <>
            <h4>饮品菜单</h4>
            {menu.length === 0 ? <p>暂无可售饮品</p> : (
              <ul className="drink-menu">
                {menu.map((drink) => (
                  <li key={drink.productId}>
                    <strong>{drink.name}</strong>
                    <span>{formatPrice(drink.priceCents)}</span>
                    <button
                      type="button"
                      aria-label={`加入购物车：${drink.name}`}
                      onClick={() => changeQuantity(drink.productId, 1)}
                      disabled={submitting || (cart[drink.productId] ?? 0) >= maxQuantity}
                    >
                      加入购物车
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <h4>购物车</h4>
            <form onSubmit={submitOrder}>
              {cartItems.length === 0 && <p>购物车是空的</p>}
              <ul className="cart-items">
                {cartItems.map((drink) => (
                  <li key={drink.productId}>
                    <span>{drink.name}</span>
                    <div className="quantity">
                      <button
                        type="button"
                        aria-label={`减少${drink.name}数量`}
                        onClick={() => changeQuantity(drink.productId, -1)}
                        disabled={submitting}
                      >−</button>
                      <span aria-label={`${drink.name}数量`}>{drink.quantity}</span>
                      <button
                        type="button"
                        aria-label={`增加${drink.name}数量`}
                        onClick={() => changeQuantity(drink.productId, 1)}
                        disabled={submitting || drink.quantity >= maxQuantity}
                      >+</button>
                    </div>
                    <span>{formatPrice(drink.priceCents * drink.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="checkout-fields">
                <label>
                  订单备注（可选）
                  <input
                    value={note}
                    disabled={submitting}
                    onChange={(event) => {
                      setNote(event.target.value);
                      setCheckoutError("");
                      checkoutId.current = null;
                    }}
                  />
                </label>
                <strong>合计 {formatPrice(total)}</strong>
                <button type="submit" disabled={cartItems.length === 0 || submitting}>
                  {submitting ? "正在提交…" : "提交订单"}
                </button>
              </div>
              {checkoutError && <p role="alert">{checkoutError}</p>}
            </form>
            {submittedOrder && (
              <div className="order-confirmation" role="status">
                <p>订单已提交 · {ORDER_STATUS_LABELS[submittedOrder.status ?? ""] ?? "处理中"}</p>
                <OrderItems items={submittedOrder.items} totalAmountCents={submittedOrder.totalAmountCents} />
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <h3>我的订单</h3>
        <button onClick={loadMyOrders} disabled={loadingOrders || submitting}>
          {loadingOrders ? "正在读取…" : myOrders ? "刷新我的订单" : "查看我的订单"}
        </button>
        {ordersError && <p role="alert">{ordersError}</p>}
        {myOrders?.length === 0 && <p>暂无订单</p>}
        {myOrders && myOrders.length > 0 && (
          <table style={{ margin: "12px auto" }}>
            <thead>
              <tr>
                <th scope="col">下单时间</th>
                <th scope="col">饮品</th>
                <th scope="col">备注</th>
                <th scope="col">状态</th>
              </tr>
            </thead>
            <tbody>
              {myOrders.map((order) => (
                <tr key={order.orderId}>
                  <td>{new Date(Number(order.createdAt) * 1000).toLocaleString("zh-CN")}</td>
                  <td><OrderItems items={order.items} totalAmountCents={order.totalAmountCents} /></td>
                  <td>{order.note || "—"}</td>
                  <td>{ORDER_STATUS_LABELS[order.status ?? ""] ?? "状态未记录"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
