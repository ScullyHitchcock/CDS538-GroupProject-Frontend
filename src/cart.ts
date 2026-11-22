import { drinkLineKey, type Drink, type DrinkLine } from "./order";

export type CartLine = DrinkLine & { quantity: number };

export type CartItem = CartLine & {
  name: string;
  priceCents: number;
  soldOut: boolean;
  canIncrease: boolean;
};

export function productQuantity(items: CartLine[], productId: string) {
  return items.reduce((sum, item) => item.productId === productId ? sum + item.quantity : sum, 0);
}

export function changeCartQuantity(cart: CartLine[], line: DrinkLine, change: 1 | -1, maxQuantity: number) {
  if (change === 1 && productQuantity(cart, line.productId) >= maxQuantity) return cart;

  const key = drinkLineKey(line);
  const existing = cart.find((item) => drinkLineKey(item) === key);
  if (!existing) {
    const { productId, options } = line;
    return change === 1 ? [...cart, { productId, options, quantity: 1 }] : cart;
  }

  const quantity = existing.quantity + change;
  if (quantity === 0) return cart.filter((item) => item !== existing);
  return cart.map((item) => item === existing ? { ...item, quantity } : item);
}

export function getCartItems(
  cart: CartLine[],
  menu: Drink[],
  availableMenu: Drink[] | null,
  maxQuantity: number,
): CartItem[] {
  return cart.flatMap((line) => {
    const product = menu.find((product) => product.productId === line.productId);
    if (!product) return [];

    const soldOut = availableMenu !== null && !availableMenu.some((drink) => drink.productId === line.productId);
    return [{
      ...line,
      name: product.name,
      priceCents: product.priceCents,
      soldOut,
      canIncrease: availableMenu !== null && !soldOut && productQuantity(cart, line.productId) < maxQuantity,
    }];
  });
}

export function cartTotalCents(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}
