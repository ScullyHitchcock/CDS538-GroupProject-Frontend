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
type CheckoutRequest = {
  checkoutId: string;
  storeId: string;
  note: string;
  items: { productId: string; quantity: number }[];
};

function readPendingCheckout(storageKey: string): CheckoutRequest | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    return typeof saved?.checkoutId === "string" && Array.isArray(saved.items) ? saved : null;
  } catch {
    return null;
  }
}

export default function CustomerPage({ customerId, accessToken }: { customerId: string; accessToken?: string }) {
  const checkoutStorageKey = `orders-web:checkout:${customerId}`;
  const [pendingCheckout, setPendingCheckout] = useState(() => readPendingCheckout(checkoutStorageKey));
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [storeError, setStoreError] = useState("");
  const [storeId, setStoreId] = useState(pendingCheckout?.storeId ?? "");
  const [pendingStoreId, setPendingStoreId] = useState("");
  const [cart, setCart] = useState<Record<string, number>>(() => Object.fromEntries(
    (pendingCheckout?.items ?? []).map(({ productId, quantity }) => [productId, quantity]),
  ));
  const [note, setNote] = useState(pendingCheckout?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [myOrders, setMyOrders] = useState<Order[] | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
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
  const checkoutLocked = submitting || pendingCheckout !== null;
  const listedOrderIds = new Set(myOrders?.map(({ orderId }) => orderId));
  const visibleOrders = [
    ...recentOrders.filter(({ orderId }) => !listedOrderIds.has(orderId)),
    ...(myOrders ?? []),
  ].sort((left, right) => Number(right.createdAt) - Number(left.createdAt));

  function selectStore(nextStoreId: string) {
    setStoreId(nextStoreId);
    setPendingStoreId("");
    setCart({});
    setCheckoutError("");
    setSubmittedOrder(null);
  }

  function changeQuantity(productId: string, change: number) {
    setCheckoutError("");
    setCart((current) => ({
      ...current,
      [productId]: Math.max(0, Math.min(maxQuantity, (current[productId] ?? 0) + change)),
    }));
  }

  function clearPendingCheckout() {
    sessionStorage.removeItem(checkoutStorageKey);
    setPendingCheckout(null);
  }

  async function submitOrder() {
    if (submissionInFlight.current || (!pendingCheckout && (!selectedStore || cartItems.length === 0))) return;
    if (!accessToken) {
      setCheckoutError("请重新登录");
      return;
    }

    const request = pendingCheckout ?? {
      storeId,
      note,
      checkoutId: crypto.randomUUID(),
      items: cartItems.map(({ productId, quantity }) => ({ productId, quantity })),
    };
    if (!pendingCheckout) {
      try {
        sessionStorage.setItem(checkoutStorageKey, JSON.stringify(request));
      } catch {
        setCheckoutError("无法保存本次下单状态，请检查浏览器设置后重试。");
        return;
      }
      setPendingCheckout(request);
    }

    submissionInFlight.current = true;
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
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        if (response.status === 400) {
          clearPendingCheckout();
          setCheckoutError("服务器拒绝了这笔订单，请检查门店和饮品后再提交。");
        } else if (response.status === 401 || response.status === 403) {
          if (!pendingCheckout) clearPendingCheckout();
          setCheckoutError("请重新登录后继续。");
        }
        return;
      }
      const created: Order = await response.json();
      if (typeof created.orderId !== "string" || !created.orderId) return;
      clearPendingCheckout();
      setSubmittedOrder(created);
      setRecentOrders((orders) => [created, ...orders.filter(({ orderId }) => orderId !== created.orderId)]);
      setCart({});
      setNote("");
    } catch {
      // 没有收到明确结果，保留原请求供用户重试。
    } finally {
      submissionInFlight.current = false;
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
      const returnedOrderIds = new Set(orders.map(({ orderId }) => orderId));
      setMyOrders(orders);
      setRecentOrders((recent) => recent.filter(({ orderId }) => !returnedOrderIds.has(orderId)));
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
        <fieldset disabled={checkoutLocked}>
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
                      disabled={checkoutLocked || (cart[drink.productId] ?? 0) >= maxQuantity}
                    >
                      加入购物车
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <h4>购物车</h4>
            <form onSubmit={(event) => {
              event.preventDefault();
              void submitOrder();
            }}>
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
                        disabled={checkoutLocked}
                      >−</button>
                      <span aria-label={`${drink.name}数量`}>{drink.quantity}</span>
                      <button
                        type="button"
                        aria-label={`增加${drink.name}数量`}
                        onClick={() => changeQuantity(drink.productId, 1)}
                        disabled={checkoutLocked || drink.quantity >= maxQuantity}
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
                    disabled={checkoutLocked}
                    onChange={(event) => {
                      setNote(event.target.value);
                      setCheckoutError("");
                    }}
                  />
                </label>
                <strong>合计 {formatPrice(total)}</strong>
                <button type="submit" disabled={cartItems.length === 0 || checkoutLocked}>
                  {submitting ? "正在提交…" : "提交订单"}
                </button>
              </div>
            </form>
          </>
        )}
        {submitting && !selectedStore && <p role="status">正在确认订单…</p>}
        {pendingCheckout && !submitting && (
          <div className="order-confirmation">
            <p role="status">这笔订单可能已提交。请先重试确认，购物车暂时无法修改。</p>
            <button type="button" onClick={() => void submitOrder()}>重试原订单</button>
          </div>
        )}
        {checkoutError && <p role="alert">{checkoutError}</p>}
        {submittedOrder && (
          <div className="order-confirmation" role="status">
            <p>订单已提交 · {ORDER_STATUS_LABELS[submittedOrder.status ?? ""] ?? "处理中"}</p>
            <OrderItems items={submittedOrder.items} totalAmountCents={submittedOrder.totalAmountCents} />
          </div>
        )}
      </section>

      <section>
        <h3>我的订单</h3>
        <button onClick={loadMyOrders} disabled={loadingOrders || submitting}>
          {loadingOrders ? "正在读取…" : myOrders ? "刷新我的订单" : "查看我的订单"}
        </button>
        {ordersError && <p role="alert">{ordersError}</p>}
        {myOrders && visibleOrders.length === 0 && <p>暂无订单</p>}
        {visibleOrders.length > 0 && (
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
              {visibleOrders.map((order) => (
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
