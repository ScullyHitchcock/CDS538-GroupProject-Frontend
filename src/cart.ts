import { productLineKey, type Product, type ProductLine } from "./order";

export type CartLine = ProductLine & { quantity: number };

export type CartItem = CartLine & {
  name: string;
  priceCents: number;
  toppings: Product[];
  unavailableToppings: Product[];
  soldOut: boolean;
  canIncrease: boolean;
};

export function productQuantity(items: CartLine[], productId: string) {
  return items.reduce((sum, item) => item.productId === productId ? sum + item.quantity : sum, 0);
}

export function changeCartQuantity(cart: CartLine[], line: ProductLine, change: 1 | -1, maxQuantity: number) {
  if (change === 1 && productQuantity(cart, line.productId) >= maxQuantity) return cart;

  const key = productLineKey(line);
  const existing = cart.find((item) => productLineKey(item) === key);
  if (!existing) {
    const { productId, options, toppingIds } = line;
    return change === 1 ? [...cart, { productId, options, toppingIds, quantity: 1 }] : cart;
  }

  const quantity = existing.quantity + change;
  if (quantity === 0) return cart.filter((item) => item !== existing);
  return cart.map((item) => item === existing ? { ...item, quantity } : item);
}

export function getCartItems(
  cart: CartLine[],
  products: Product[],
  availableProducts: Product[] | null,
  maxQuantity: number,
): CartItem[] {
  const availableIds = availableProducts && new Set(availableProducts.map((product) => product.productId));
  const productsById = new Map(products.map((product) => [product.productId, product]));

  return cart.flatMap((line) => {
    const product = productsById.get(line.productId);
    if (!product) return [];

    const toppingIds = line.toppingIds ?? [];
    const toppings = toppingIds.flatMap((id) => {
      const topping = productsById.get(id);
      return topping ? [topping] : [];
    });
    const unavailableToppings = toppings.filter((topping) => availableIds && !availableIds.has(topping.productId));
    const soldOut = availableIds !== null &&
      (!availableIds.has(line.productId) || toppingIds.some((id) => !availableIds.has(id)));
    return [{
      ...line,
      name: product.name,
      priceCents: product.priceCents + toppings.reduce((sum, topping) => sum + topping.priceCents, 0),
      toppings,
      unavailableToppings,
      soldOut,
      canIncrease: availableIds !== null && !soldOut && productQuantity(cart, line.productId) < maxQuantity,
    }];
  });
}

export function cartTotalCents(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
}
