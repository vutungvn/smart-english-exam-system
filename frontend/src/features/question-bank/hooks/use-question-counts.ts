import { useListQuestionGroupsQuery, useListQuestionsQuery, type Skill } from '@/api/generated';

// Số câu chỉ cần meta.total: gọi danh sách với limit=1 thay vì thêm endpoint thống kê.
// Cùng tag 'Questions' nên tạo/xóa câu xong các con số tự cập nhật.

export function useSkillCount(skill: Skill) {
  const { data, isLoading } = useListQuestionsQuery({ skill, limit: 1 });
  return { total: data?.meta.total, isLoading };
}

/** Số nhóm theo kỹ năng (undefined: mọi kỹ năng), theo cùng điều kiện "chỉ nhóm của tôi" */
export function useGroupCount(skill: Skill | undefined, mine: boolean) {
  const { data } = useListQuestionGroupsQuery({ skill, mine: mine || undefined, limit: 1 });
  return data?.meta.total;
}

export function useMyBankCounts() {
  const questions = useListQuestionsQuery({ mine: true, limit: 1 });
  const groups = useListQuestionGroupsQuery({ mine: true, limit: 1 });
  return { questions: questions.data?.meta.total, groups: groups.data?.meta.total };
}
