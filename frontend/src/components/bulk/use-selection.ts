import { useState } from 'react';

const EMPTY: ReadonlySet<string> = new Set();

/**
 * Các mục đang được chọn trong trang danh sách. resetKey đổi (lọc, đổi trang, đổi số dòng) thì
 * tự bỏ chọn hết: không để mục đã khuất khỏi màn hình vẫn bị xóa.
 */
export function useSelection(resetKey: string) {
  const [state, setState] = useState<{ key: string; ids: ReadonlySet<string> }>({
    key: resetKey,
    ids: EMPTY,
  });
  const ids = state.key === resetKey ? state.ids : EMPTY;

  const update = (change: (next: Set<string>) => void) => {
    const next = new Set(ids);
    change(next);
    setState({ key: resetKey, ids: next });
  };

  return {
    ids,
    count: ids.size,
    has: (id: string) => ids.has(id),
    toggle: (id: string) =>
      update((next) => {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }),
    /** Chọn/bỏ chọn cả nhóm id (ô "chọn cả trang") */
    setMany: (list: string[], checked: boolean) =>
      update((next) => list.forEach((id) => (checked ? next.add(id) : next.delete(id)))),
    clear: () => setState({ key: resetKey, ids: EMPTY }),
  };
}

export type Selection = ReturnType<typeof useSelection>;
