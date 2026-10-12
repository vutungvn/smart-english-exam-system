import * as z from 'zod';
import type {
  CreateQuestionGroupDto,
  QuestionGroupDetail,
  Skill,
  UpdateQuestionGroupDto,
} from '@/api/generated';
import { findPartRule, GROUP_SKILLS, groupPartsOfSkill, type PartRule } from '../toeic';

// Luật khớp backend/src/modules/questions (assertGroupRules, question-group.dto), server vẫn kiểm tra lại
export const GROUP_CONTENT_MAX = 20000;

export const groupFormSchema = z
  .object({
    skill: z.enum(['LISTENING', 'READING', 'SPEAKING']).or(z.literal('')),
    part: z.number(),
    topicId: z.string(),
    status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']),
    /** Lời thoại (Listening) hoặc đoạn văn/bảng thông tin (Reading, Speaking) */
    content: z.string(),
    updatedAt: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });

    if (!values.skill) return issue('skill', 'Chọn kỹ năng');
    const rule = findPartRule(values.skill, values.part);
    if (!rule || rule.group !== 'required') return issue('part', 'Chọn Part');
    if (!values.topicId) issue('topicId', 'Chọn chủ đề');
    if (!values.content.trim()) {
      issue(
        'content',
        rule.groupContent === 'transcript' ? 'Nhập lời thoại' : 'Nhập đoạn văn hoặc bảng thông tin',
      );
    } else if (values.content.length > GROUP_CONTENT_MAX) {
      issue('content', `Tối đa ${GROUP_CONTENT_MAX} ký tự`);
    }
  });

export type GroupFormValues = z.infer<typeof groupFormSchema>;

export function emptyGroupValues(preset?: { skill?: Skill; part?: number }): GroupFormValues {
  const skill = GROUP_SKILLS.find((s) => s === preset?.skill);
  // Speaking chỉ có Part 4 là nhóm: chọn luôn
  const part =
    preset?.part ??
    (skill && groupPartsOfSkill(skill).length === 1 ? groupPartsOfSkill(skill)[0].part : undefined);
  const rule = skill && part ? findPartRule(skill, part) : undefined;
  return {
    skill: (skill as GroupFormValues['skill']) ?? '',
    part: rule?.group === 'required' ? rule.part : 0,
    topicId: '',
    status: 'DRAFT',
    content: '',
  };
}

export function toGroupValues(group: QuestionGroupDetail): GroupFormValues {
  const transcript = group.skill === 'LISTENING';
  return {
    skill: group.skill as GroupFormValues['skill'],
    part: group.part,
    topicId: group.topic.id,
    status: group.status,
    content: (transcript ? group.transcript : group.passage) ?? '',
    updatedAt: group.updatedAt,
  };
}

/** Listening ghi vào transcript, Reading/Speaking ghi vào passage (đúng trường backend yêu cầu) */
export function toCreateGroupPayload(
  values: GroupFormValues,
  rule: PartRule,
): CreateQuestionGroupDto {
  const transcript = rule.groupContent === 'transcript';
  return {
    topicId: values.topicId,
    skill: rule.skill,
    part: rule.part,
    status: values.status,
    passage: transcript ? null : values.content.trim(),
    transcript: transcript ? values.content.trim() : null,
  };
}

/** Kỹ năng/Part không đổi được sau khi tạo; trường nội dung còn lại để nguyên (không gửi) */
export function toUpdateGroupPayload(
  values: GroupFormValues,
  rule: PartRule,
  updatedAt: string,
): UpdateQuestionGroupDto {
  const content = values.content.trim();
  return {
    topicId: values.topicId,
    status: values.status,
    ...(rule.groupContent === 'transcript' ? { transcript: content } : { passage: content }),
    updatedAt,
  };
}
