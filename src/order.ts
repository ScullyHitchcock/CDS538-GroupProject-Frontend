export type Drink = {
  productId: string;
  name: string;
  priceCents: number;
};

export type Order = {
  orderId: string;
  createdAt: string | number;
  note?: string;
  status?: string;
  items?: {
    productId: string;
    name: string;
    quantity: string | number;
    unitPriceCents: string | number;
  }[];
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
