import { useEffect, useState } from "react";
import { type MenuDrink, type StoreProduct } from "./order";
import { requestOrdersApi } from "./ordersApi";

export default function useStoreMenu(storeId: string, accessToken?: string) {
  const [result, setResult] = useState<{ storeId: string; menu: MenuDrink[]; toppings: StoreProduct[]; error: string } | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!storeId || !accessToken) return;

    const controller = new AbortController();
    async function loadMenu(token: string) {
      try {
        const response = await requestOrdersApi(`/stores/${encodeURIComponent(storeId)}/menu`, token, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`读取菜单失败（HTTP ${response.status}）`);

        const { menu, toppings = [] }: { menu: MenuDrink[]; toppings?: StoreProduct[] } = await response.json();
        if (!controller.signal.aborted) setResult({ storeId, menu, toppings, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ storeId, menu: [], toppings: [], error: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    void loadMenu(accessToken);
    return () => controller.abort();
  }, [storeId, accessToken, revision]);

  function reloadMenu() {
    setResult(null);
    setRevision((current) => current + 1);
  }

  return { result: result?.storeId === storeId ? result : null, reloadMenu };
}
