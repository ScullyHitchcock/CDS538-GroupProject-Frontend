import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL as string;
const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "待制作",
  READY: "可取餐",
};

type Order = {
  orderId: string;
  createdAt: string | number;
  note?: string;
  status?: string;
};

type Store = { storeId: string; name: string };

export default function CustomerPage({ accessToken }: { accessToken?: string }) {
  const [note, setNote] = useState("hello cloud");
  const [result, setResult] = useState("");
  // const [orderId, setOrderId] = useState("");
  const [myOrders, setMyOrders] = useState<Order[] | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [stores, setStores] = useState<Store[] | null>(null);
  const [storeError, setStoreError] = useState("");
  const [storeId, setStoreId] = useState("");

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    async function loadStores() {
      setStoreError("");
      try {
        const response = await fetch(`${API}/stores`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`读取门店失败（HTTP ${response.status}）`);
        }
        const { stores }: { stores: Store[] } = await response.json();
        if (!controller.signal.aborted) setStores(stores);
      } catch (error) {
        if (!controller.signal.aborted) {
          setStoreError(error instanceof Error ? error.message : String(error));
        }
      }
    }
    void loadStores();
    return () => controller.abort();
  }, [accessToken]);

  const hasSelectedStore = stores?.some((store) => store.storeId === storeId) ?? false;

  async function run() {
    if (!accessToken) {
      setResult("请重新登录");
      return;
    }
    if (!hasSelectedStore) return;

    const authorization = `Bearer ${accessToken}`;

    try {
      const createResponse = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({ note, storeId }),
      });
      if (!createResponse.ok) {
        throw new Error(`创建订单失败（HTTP ${createResponse.status}）`);
      }
      const created = await createResponse.json();

      const readResponse = await fetch(`${API}/orders/${created.orderId}`, {
        headers: { Authorization: authorization },
      });
      if (!readResponse.ok) {
        throw new Error(`读取订单失败（HTTP ${readResponse.status}）`);
      }

      setResult(JSON.stringify(await readResponse.json(), null, 2));
    } catch (err) {
      setResult(`请求失败：${String(err)}`);
    }
  }

  // async function readOrder() {
  //   if (!accessToken) {
  //     setResult("请重新登录");
  //     return;
  //   }
  //
  //   try {
  //     const response = await fetch(
  //       `${API}/orders/${encodeURIComponent(orderId.trim())}`,
  //       {
  //         headers: { Authorization: `Bearer ${accessToken}` },
  //       },
  //     );
  //
  //     if (!response.ok) {
  //       throw new Error(`读取订单失败（HTTP ${response.status}）`);
  //     }
  //
  //     setResult(JSON.stringify(await response.json(), null, 2));
  //   } catch (err) {
  //     setResult(`请求失败：${String(err)}`);
  //   }
  // }

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
      <section>
        <h3>顾客下单</h3>
        <fieldset>
          <legend>选择门店</legend>
          {storeError && <p role="alert">{storeError}</p>}
          {!stores && !storeError && <p>正在加载门店…</p>}
          {stores?.length === 0 && <p>暂无可选门店</p>}
          {stores?.map((store) => (
            <div key={store.storeId}>
              <label>
                <input
                  type="radio"
                  name="store"
                  value={store.storeId}
                  checked={storeId === store.storeId}
                  onChange={() => setStoreId(store.storeId)}
                />
                {store.name}
              </label>
            </div>
          ))}
        </fieldset>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={run} disabled={!hasSelectedStore}>创建订单并读回</button>
      </section>

      <section>
        <h3>我的订单</h3>
        <button onClick={loadMyOrders} disabled={loadingOrders}>
          {loadingOrders ? "正在读取…" : myOrders ? "刷新我的订单" : "查看我的订单"}
        </button>
        {ordersError && <p role="alert">{ordersError}</p>}
        {myOrders?.length === 0 && <p>暂无订单</p>}
        {myOrders && myOrders.length > 0 && (
          <table style={{ margin: "12px auto" }}>
            <thead>
              <tr>
                <th scope="col">下单时间</th>
                <th scope="col">备注</th>
                <th scope="col">状态</th>
              </tr>
            </thead>
            <tbody>
              {myOrders.map((order) => (
                <tr key={order.orderId}>
                  <td>{new Date(Number(order.createdAt) * 1000).toLocaleString("zh-CN")}</td>
                  <td>{order.note || "—"}</td>
                  <td>{ORDER_STATUS_LABELS[order.status ?? ""] ?? "状态未记录"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <hr />
      {/*<label>*/}
      {/*  订单号*/}
      {/*  <input*/}
      {/*    value={orderId}*/}
      {/*    onChange={(e) => setOrderId(e.target.value)}*/}
      {/*  />*/}
      {/*</label>*/}
      {/*<button onClick={readOrder} disabled={!orderId.trim()}>*/}
      {/*  读取订单*/}
      {/*</button>*/}

      <pre>{result}</pre>
    </>
  );
}
