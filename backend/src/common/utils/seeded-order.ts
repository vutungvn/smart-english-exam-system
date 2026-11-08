import { createHash } from 'node:crypto';

/**
 * Thứ tự ngẫu nhiên nhưng cố định theo seed: mỗi phần tử nhận "số bốc thăm" là
 * SHA-256(seed:khóa của phần tử), rồi xếp theo số đó. Cùng seed và cùng danh sách luôn ra cùng thứ
 * tự (vào lại bài, trang xem lại khớp nhau, không phải lưu thứ tự vào DB); seed khác ra thứ tự khác.
 * SHA-256 phân bố đều nên mọi hoán vị có khả năng như nhau. Không phụ thuộc thứ tự đầu vào: thêm,
 * bớt một phần tử không làm các phần tử khác đổi thứ tự tương đối
 */
export function seededOrder<T>(items: readonly T[], seed: string, keyOf: (item: T) => string): T[] {
  return items
    .map((item) => ({
      item,
      rank: createHash('sha256')
        .update(`${seed}:${keyOf(item)}`)
        .digest('hex'),
    }))
    .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0))
    .map(({ item }) => item);
}
