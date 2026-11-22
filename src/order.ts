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
