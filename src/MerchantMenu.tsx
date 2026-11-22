import { useEffect, useState } from "react";
import { type StoreProduct } from "./order";
import { requestOrdersApi } from "./ordersApi";

export default function MerchantMenu({ accessToken }: { accessToken: string }) {
  const [menu, setMenu] = useState<StoreProduct[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [savingProductId, setSavingProductId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadMenu() {
      setLoading(true);
      setError("");
      try {
        const response = await requestOrdersApi("/merchant/menu", accessToken, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`读取商品供应状态失败（HTTP ${response.status}）`);

        const { menu, toppings = [] }: { menu: StoreProduct[]; toppings?: StoreProduct[] } = await response.json();
        if (!controller.signal.aborted) setMenu([...menu, ...toppings]);
      } catch (error) {
        if (!controller.signal.aborted) {
          setMenu(null);
          setError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadMenu();
    return () => controller.abort();
  }, [accessToken, refresh]);

  async function updateAvailability(product: StoreProduct) {
    setSavingProductId(product.productId);
    setError("");
    try {
      const response = await requestOrdersApi(`/merchant/menu/${encodeURIComponent(product.productId)}`, accessToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soldOut: !product.soldOut }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`更新供应状态失败（HTTP ${response.status}）`);

      const updated: StoreProduct = await response.json();
      setMenu((current) => current?.map((item) => item.productId === updated.productId ? updated : item) ?? null);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingProductId("");
    }
  }

  const busy = loading || savingProductId !== "";

  return (
    <section aria-labelledby="merchant-menu-heading">
      <h3 id="merchant-menu-heading">饮品与小料供应</h3>
      <button type="button" onClick={() => setRefresh((count) => count + 1)} disabled={busy}>
        {loading ? "正在读取…" : "刷新供应状态"}
      </button>
      {error && <p role="alert">{error}</p>}
      {menu && (
        <ul className="drink-menu">
          {menu.map((product) => (
            <li key={product.productId}>
              <strong>{product.name}</strong>
              <span>{product.soldOut ? "已售罄" : "供应中"}</span>
              <button
                type="button"
                aria-label={`${product.soldOut ? "恢复供应" : "设置售罄"}：${product.name}`}
                onClick={() => void updateAvailability(product)}
                disabled={busy}
              >
                {savingProductId === product.productId ? "正在保存…" : product.soldOut ? "恢复供应" : "设置售罄"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
