import { type ReactNode } from "react";
import { formatPrice, type Product } from "./order";

import ProductImage from "./ProductImage";

type ProductCardProps = {
  product: Pick<Product, "productId" | "name">;
  priceCents: number;
  perPortion?: boolean;
  children: ReactNode;
};

export default function ProductCard({ product, priceCents, perPortion, children }: ProductCardProps) {
  return (
    <li className="product-card">
      <ProductImage productId={product.productId} />
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
