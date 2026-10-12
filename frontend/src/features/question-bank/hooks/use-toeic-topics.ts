import { useListSubjectsQuery, useListTopicsQuery, type Skill } from '@/api/generated';

/**
 * Chủ đề của chương trình TOEIC, lọc theo kỹ năng/Part. Hai truy vấn đều được RTK Query cache,
 * nên bộ lọc và form dùng chung không gọi lại API.
 */
export function useToeicTopics(skill?: Skill, part?: number) {
  const subjects = useListSubjectsQuery();
  const toeicId = subjects.data?.data.find((subject) => subject.code === 'TOEIC')?.id;

  const topics = useListTopicsQuery(
    { id: toeicId ?? '', skill, part },
    // Chưa chọn kỹ năng thì không lọc chủ đề (tên chủ đề gắn với dạng câu của từng kỹ năng)
    { skip: !toeicId || !skill },
  );

  return {
    topics: skill ? (topics.data?.data ?? []) : [],
    isLoading: subjects.isLoading || topics.isFetching,
    isError: subjects.isError || topics.isError,
  };
}
