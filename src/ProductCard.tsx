import { type ReactNode } from "react";
import { formatPrice, type Product } from "./order";

const productImages: Partial<Record<string, string>> = {
  "pearl-milk-tea": "/images/products/pearl-milk-tea.webp",
  "jasmine-milk-tea": "/images/products/jasmine-milk-tea.webp",
  "lemon-tea": "/images/products/lemon-tea.webp",
  "topping-pearl": "/images/products/topping-pearl.webp",
  "topping-coconut": "/images/products/topping-coconut.webp",
};

type ProductCardProps = {
  product: Pick<Product, "productId" | "name">;
  priceCents: number;
  perPortion?: boolean;
  children: ReactNode;
};

export default function ProductCard({ product, priceCents, perPortion, children }: ProductCardProps) {
  const image = productImages[product.productId];

  return (
    <li className="product-card">
      <div className="product-image" aria-hidden="true">
        {image && <img src={image} width={960} height={720} loading="lazy" decoding="async" alt="" />}
      </div>
      <div className="product-details">
        <div className="product-heading">
          <strong>{product.name}</strong>
          <span className="product-price">
            {formatPrice(priceCents)}{perPortion && <small>/份</small>}
          </span>
        </div>
        {children}
      </div>
    </li>
  );
}
