export type Product = {
  productId: string;
  name: string;
  priceCents: number;
};

export type DrinkOptions = {
  ice: string;
  sugar: string;
};

type OptionChoices = { choices: string[]; default: string };

export type MenuDrink = Product & {
  options: Record<keyof DrinkOptions, OptionChoices>;
};

export type StoreProduct = Product & { soldOut: boolean };
export type ToppingLabel = Pick<Product, "productId" | "name">;

export type ProductLine = {
  productId: string;
  options?: DrinkOptions;
  toppingIds?: string[];
};

export function productLineKey({ productId, options, toppingIds }: ProductLine) {
  return JSON.stringify([productId, options?.ice, options?.sugar, [...(toppingIds ?? [])].sort()]);
}

export function productLineLabel({
  name,
  options,
  toppings = [],
}: {
  name: string;
  options?: DrinkOptions;
  toppings?: ToppingLabel[];
}) {
  const details = options ? [options.ice, options.sugar] : [];
  details.push(...toppings.map((topping) => `加${topping.name}`));
  return details.length ? `${name}（${details.join("、")}）` : name;
}

export type Order = {
  orderId: string;
  createdAt: string | number;
  note?: string;
  status?: string;
  items?: (Omit<ProductLine, "toppingIds"> & {
    name: string;
    quantity: string | number;
    unitPriceCents: string | number;
    unit?: "portion";
    toppings?: (ToppingLabel & { unitPriceCents: string | number })[];
  })[];
  totalAmountCents?: string | number;
};

const money = new Intl.NumberFormat("zh-HK", { style: "currency", currency: "HKD" });

export function formatPrice(cents: string | number) {
  return money.format(Number(cents) / 100);
}

const statusLabels: Record<string, string> = {
  PENDING: "待制作",
  READY: "可取餐",
};

export function orderStatusLabel(status?: string, fallback = "状态未记录") {
  return statusLabels[status ?? ""] ?? fallback;
}

export function formatOrderTime(createdAt: Order["createdAt"]) {
  return new Date(Number(createdAt) * 1000).toLocaleString("zh-CN");
}
