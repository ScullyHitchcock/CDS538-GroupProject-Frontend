const productImages: Partial<Record<string, string>> = {
  "pearl-milk-tea": "/images/products/pearl-milk-tea.webp",
  "jasmine-milk-tea": "/images/products/jasmine-milk-tea.webp",
  "lemon-tea": "/images/products/lemon-tea.webp",
  "topping-pearl": "/images/products/topping-pearl.webp",
  "topping-coconut": "/images/products/topping-coconut.webp",
};

export default function ProductImage({ productId }: { productId: string }) {
  const image = productImages[productId];

  return (
    <div className="product-image" aria-hidden="true">
      {image && <img src={image} width={960} height={720} loading="lazy" decoding="async" alt="" />}
    </div>
  );
}
