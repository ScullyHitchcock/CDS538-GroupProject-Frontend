import { useEffect, useRef, useState } from "react";
import CartItems from "./CartItems";
import { cartTotalCents, changeCartQuantity, getCartItems, productQuantity, type CartLine } from "./cart";
import DrinkMenuItem from "./DrinkMenuItem";
import OrderItems from "./OrderItems";
import { formatPrice, orderStatusLabel, type Product, type ProductLine, type Order } from "./order";
import { requestOrdersApi } from "./ordersApi";
import useStoreMenu from "./useStoreMenu";

type Store = { storeId: string; name: string };
type Catalog = { stores: Store[]; menu: Product[]; toppings?: Product[]; maxItemQuantity: number };

type CheckoutRequest = {
  checkoutId: string;
  storeId: string;
  note: string;
  items: CartLine[];
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
  const [cart, setCart] = useState<CartLine[]>(pendingCheckout?.items ?? []);
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
        const response = await requestOrdersApi("/stores", token, { signal: controller.signal, cache: "no-store" });
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
  const menu = storeMenu && !storeMenu.error ? storeMenu : null;
  const products = [...(catalog?.menu ?? []), ...(catalog?.toppings ?? [])];
  const availableProducts = menu && [...menu.menu, ...menu.toppings.filter((topping) => !topping.soldOut)];
  const maxQuantity = catalog?.maxItemQuantity ?? 0;
  const cartItems = getCartItems(cart, products, availableProducts, maxQuantity);
  const total = cartTotalCents(cartItems);
  const checkoutLocked = submitting || pendingCheckout !== null;
  const canSubmit = selectedStore && menu && cartItems.length > 0 &&
    !cartItems.some((item) => item.soldOut);

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

  function changeQuantity(line: ProductLine, change: 1 | -1) {
    setCheckoutError("");
    setCart((current) => changeCartQuantity(current, line, change, maxQuantity));
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
      items: cartItems.map(({ productId, options, toppingIds, quantity }) => ({ productId, options, toppingIds, quantity })),
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
            setCheckoutError(`${names}已售罄或下架，请调整购物车后重新提交。`);
            reloadMenu();
          } else if (result.code === "CHECKOUT_ID_CONFLICT") {
            clearPendingCheckout();
            setCheckoutError("这次提交的内容与已保存的订单不同。请先查看「我的订单」，再决定是否重新下单。");
          }
        } else if (response.status === 400) {
          clearPendingCheckout();
          setCheckoutError("服务器拒绝了这笔订单，请检查门店、商品和规格后再提交。");
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
          {menu && <button type="button" onClick={reloadMenu} disabled={checkoutLocked}>刷新菜单</button>}
          {menu?.menu.length === 0 && <p>暂无可售饮品</p>}
          {menu && menu.menu.length > 0 && (
            <ul className="drink-menu">
              {menu.menu.map((drink) => (
                <DrinkMenuItem
                  key={drink.productId}
                  drink={drink}
                  toppings={menu.toppings}
                  locked={checkoutLocked}
                  atQuantityLimit={productQuantity(cart, drink.productId) >= maxQuantity}
                  onAdd={(options, toppingIds) => changeQuantity({
                    productId: drink.productId,
                    options,
                    toppingIds: toppingIds.length ? toppingIds : undefined,
                  }, 1)}
                />
              ))}
            </ul>
          )}

          {menu && menu.toppings.length > 0 && (
            <>
              <h4>单点小料</h4>
              <ul className="drink-menu">
                {menu.toppings.map((topping) => (
                  <li key={topping.productId}>
                    <strong>{topping.name}</strong>
                    <span>{formatPrice(topping.priceCents)}/份</span>
                    <button
                      type="button"
                      aria-label={`单点${topping.name}`}
                      onClick={() => changeQuantity({ productId: topping.productId }, 1)}
                      disabled={checkoutLocked || topping.soldOut || productQuantity(cart, topping.productId) >= maxQuantity}
                    >
                      {topping.soldOut ? "已下架" : "加入购物车"}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h4>购物车</h4>
          <form onSubmit={(event) => {
            event.preventDefault();
            void submitOrder();
          }}>
            <CartItems items={cartItems} locked={checkoutLocked} onQuantityChange={changeQuantity} />
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
