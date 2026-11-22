import { useEffect, useRef, useState } from "react";
import DrinkMenuItem from "./DrinkMenuItem";
import OrderItems from "./OrderItems";
import { drinkLineKey, drinkLineLabel, formatPrice, orderStatusLabel, type Drink, type DrinkLine, type Order } from "./order";
import { requestOrdersApi } from "./ordersApi";
import useStoreMenu from "./useStoreMenu";

type Store = { storeId: string; name: string };
type Catalog = { stores: Store[]; menu: Drink[]; maxItemQuantity: number };
type CheckoutItem = DrinkLine & { quantity: number };

type CheckoutRequest = {
  checkoutId: string;
  storeId: string;
  note: string;
  items: CheckoutItem[];
};

type CheckoutProps = {
  customerId: string;
  accessToken?: string;
  submitting: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  onOrderConfirmed: (order: Order) => void;
};

function readPendingCheckout(storageKey: string): CheckoutRequest | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    return typeof saved?.checkoutId === "string" && Array.isArray(saved.items) ? saved : null;
  } catch {
    return null;
  }
}

function productQuantity(items: CheckoutItem[], productId: string) {
  return items.reduce((sum, item) => item.productId === productId ? sum + item.quantity : sum, 0);
}

export default function CustomerCheckout({
  customerId,
  accessToken,
  submitting,
  onSubmittingChange,
  onOrderConfirmed,
}: CheckoutProps) {
  const checkoutStorageKey = `orders-web:checkout:${customerId}`;
  const [pendingCheckout, setPendingCheckout] = useState(() => readPendingCheckout(checkoutStorageKey));
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [storeError, setStoreError] = useState("");
  const [storeId, setStoreId] = useState(pendingCheckout?.storeId ?? "");
  const [pendingStoreId, setPendingStoreId] = useState("");
  const [cart, setCart] = useState<CheckoutItem[]>(pendingCheckout?.items ?? []);
  const [note, setNote] = useState(pendingCheckout?.note ?? "");
  const submissionInFlight = useRef(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    async function loadCatalog(token: string) {
      setStoreError("");
      try {
        const response = await requestOrdersApi("/stores", token, { signal: controller.signal });
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
    void loadCatalog(accessToken);
    return () => controller.abort();
  }, [accessToken]);

  const selectedStore = catalog?.stores.find((store) => store.storeId === storeId);
  const pendingStore = catalog?.stores.find((store) => store.storeId === pendingStoreId);
  const { result: storeMenu, reloadMenu } = useStoreMenu(storeId, accessToken);
  const availableMenu = storeMenu && !storeMenu.error ? storeMenu.menu : null;
  const maxQuantity = catalog?.maxItemQuantity ?? 0;
  const cartItems = cart.flatMap((line) => {
    const drink = catalog?.menu.find((drink) => drink.productId === line.productId);
    return drink ? [{ ...line, name: drink.name, priceCents: drink.priceCents }] : [];
  });
  const total = cartItems.reduce((sum, drink) => sum + drink.priceCents * drink.quantity, 0);
  const checkoutLocked = submitting || pendingCheckout !== null;

  function isSoldOut(productId: string) {
    return availableMenu !== null && !availableMenu.some((drink) => drink.productId === productId);
  }

  const canSubmit = selectedStore && availableMenu && cartItems.length > 0 &&
    !cartItems.some((drink) => isSoldOut(drink.productId));

  function selectStore(nextStoreId: string) {
    reloadMenu();
    setStoreId(nextStoreId);
    setPendingStoreId("");
    setCart([]);
    setCheckoutError("");
    setSubmittedOrder(null);
  }

  function requestStoreChange(nextStoreId: string) {
    if (cartItems.length > 0) {
      setPendingStoreId(nextStoreId);
      return;
    }
    selectStore(nextStoreId);
  }

  function changeQuantity(line: DrinkLine, change: 1 | -1) {
    setCheckoutError("");
    setCart((current) => {
      if (change === 1 && productQuantity(current, line.productId) >= maxQuantity) return current;

      const key = drinkLineKey(line);
      const existing = current.find((item) => drinkLineKey(item) === key);
      if (!existing) return change === 1 ? [...current, { ...line, quantity: 1 }] : current;

      const quantity = existing.quantity + change;
      if (quantity === 0) return current.filter((item) => item !== existing);
      return current.map((item) => item === existing ? { ...item, quantity } : item);
    });
  }

  function clearPendingCheckout() {
    sessionStorage.removeItem(checkoutStorageKey);
    setPendingCheckout(null);
  }

  async function submitOrder() {
    if (submissionInFlight.current) return;
    if (!pendingCheckout && !canSubmit) return;
    if (!accessToken) {
      setCheckoutError("请重新登录");
      return;
    }

    const request = pendingCheckout ?? {
      storeId,
      note,
      checkoutId: crypto.randomUUID(),
      items: cartItems.map(({ productId, options, quantity }) => ({ productId, options, quantity })),
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
    onSubmittingChange(true);
    setCheckoutError("");
    setSubmittedOrder(null);
    try {
      const response = await requestOrdersApi("/orders", accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        if (response.status === 409) {
          const result = await response.json();
          if (result.code === "ITEMS_SOLD_OUT") {
            const names = result.items.map((item: { name: string }) => item.name).join("、");
            clearPendingCheckout();
            setCheckoutError(`${names}已售罄，请从购物车移除后重新提交。`);
            reloadMenu();
          }
        } else if (response.status === 400) {
          clearPendingCheckout();
          setCheckoutError("服务器拒绝了这笔订单，请检查门店、饮品和规格后再提交。");
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
      onOrderConfirmed(created);
      setCart([]);
      setNote("");
    } catch {
      // 没有收到明确结果，保留原请求供用户重试。
    } finally {
      submissionInFlight.current = false;
      onSubmittingChange(false);
    }
  }

  return (
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
              onChange={() => requestStoreChange(store.storeId)}
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
          {!storeMenu && <p role="status">正在读取饮品菜单…</p>}
          {storeMenu?.error && (
            <div>
              <p role="alert">{storeMenu.error}</p>
              <button type="button" onClick={reloadMenu}>重新读取菜单</button>
            </div>
          )}
          {availableMenu?.length === 0 && <p>暂无可售饮品</p>}
          {availableMenu && availableMenu.length > 0 && (
            <ul className="drink-menu">
              {availableMenu.map((drink) => (
                <DrinkMenuItem
                  key={drink.productId}
                  drink={drink}
                  locked={checkoutLocked}
                  atQuantityLimit={productQuantity(cart, drink.productId) >= maxQuantity}
                  onAdd={(options) => changeQuantity({ productId: drink.productId, options }, 1)}
                />
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
              {cartItems.map((line) => {
                const label = drinkLineLabel(line);
                const soldOut = isSoldOut(line.productId);

                return (
                  <li key={drinkLineKey(line)}>
                    <span>{label}{soldOut && "（已售罄）"}</span>
                    <div className="quantity">
                      <button
                        type="button"
                        aria-label={`减少${label}数量`}
                        onClick={() => changeQuantity(line, -1)}
                        disabled={checkoutLocked}
                      >−</button>
                      <span aria-label={`${label}数量`}>{line.quantity}</span>
                      <button
                        type="button"
                        aria-label={`增加${label}数量`}
                        onClick={() => changeQuantity(line, 1)}
                        disabled={checkoutLocked || !availableMenu || soldOut ||
                          productQuantity(cart, line.productId) >= maxQuantity}
                      >+</button>
                    </div>
                    <span>{formatPrice(line.priceCents * line.quantity)}</span>
                  </li>
                );
              })}
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
              <button type="submit" disabled={!canSubmit || checkoutLocked}>
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
          <p>订单已提交 · {orderStatusLabel(submittedOrder.status, "处理中")}</p>
          <OrderItems items={submittedOrder.items} totalAmountCents={submittedOrder.totalAmountCents} />
        </div>
      )}
    </section>
  );
}
