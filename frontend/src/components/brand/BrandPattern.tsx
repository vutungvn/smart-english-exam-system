// Họa tiết trên nền gradient thương hiệu (giống banner màn Đăng nhập): lưới chấm và 2 quầng sáng.
// Đặt trong phần tử cha có `relative overflow-hidden`; nội dung phía sau cần `relative` để nằm trên.
export function BrandPattern() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.18)_1.5px,transparent_1.5px)] bg-size-[24px_24px] opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-blue-300 opacity-30 mix-blend-screen blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -bottom-24 size-80 rounded-full bg-highlight opacity-20 mix-blend-screen blur-3xl"
      />
    </>
  );
}
