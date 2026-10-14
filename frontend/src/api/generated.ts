import { baseApi as api } from './base-api';
export const addTagTypes = [
  'Auth',
  'Me',
  'Subjects',
  'Questions',
  'Question Groups',
  'Question Import',
  'Exams',
] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      register: build.mutation<RegisterApiResponse, RegisterApiArg>({
        query: (queryArg) => ({ url: `/api/v1/auth/register`, method: 'POST', body: queryArg }),
        invalidatesTags: ['Auth'],
      }),
      verifyEmail: build.mutation<VerifyEmailApiResponse, VerifyEmailApiArg>({
        query: (queryArg) => ({ url: `/api/v1/auth/verify-email`, method: 'POST', body: queryArg }),
        invalidatesTags: ['Auth'],
      }),
      resendVerification: build.mutation<ResendVerificationApiResponse, ResendVerificationApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/auth/resend-verification`,
          method: 'POST',
          body: queryArg,
        }),
        invalidatesTags: ['Auth'],
      }),
      forgotPassword: build.mutation<ForgotPasswordApiResponse, ForgotPasswordApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/auth/forgot-password`,
          method: 'POST',
          body: queryArg,
        }),
        invalidatesTags: ['Auth'],
      }),
      validateResetToken: build.query<ValidateResetTokenApiResponse, ValidateResetTokenApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/auth/reset-password/validate`,
          params: {
            token: queryArg,
          },
        }),
        providesTags: ['Auth'],
      }),
      resetPassword: build.mutation<ResetPasswordApiResponse, ResetPasswordApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/auth/reset-password`,
          method: 'POST',
          body: queryArg,
        }),
        invalidatesTags: ['Auth'],
      }),
      login: build.mutation<LoginApiResponse, LoginApiArg>({
        query: (queryArg) => ({ url: `/api/v1/auth/login`, method: 'POST', body: queryArg }),
        invalidatesTags: ['Auth'],
      }),
      refresh: build.mutation<RefreshApiResponse, RefreshApiArg>({
        query: () => ({ url: `/api/v1/auth/refresh`, method: 'POST' }),
        invalidatesTags: ['Auth'],
      }),
      logout: build.mutation<LogoutApiResponse, LogoutApiArg>({
        query: () => ({ url: `/api/v1/auth/logout`, method: 'POST' }),
        invalidatesTags: ['Auth'],
      }),
      getProfile: build.query<GetProfileApiResponse, GetProfileApiArg>({
        query: () => ({ url: `/api/v1/me` }),
        providesTags: ['Me'],
      }),
      updateProfile: build.mutation<UpdateProfileApiResponse, UpdateProfileApiArg>({
        query: (queryArg) => ({ url: `/api/v1/me`, method: 'PATCH', body: queryArg }),
        invalidatesTags: ['Me'],
      }),
      getLoginHistory: build.query<GetLoginHistoryApiResponse, GetLoginHistoryApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/me/login-history`,
          params: {
            page: queryArg.page,
            limit: queryArg.limit,
          },
        }),
        providesTags: ['Me'],
      }),
      changePassword: build.mutation<ChangePasswordApiResponse, ChangePasswordApiArg>({
        query: (queryArg) => ({ url: `/api/v1/me/password`, method: 'PATCH', body: queryArg }),
        invalidatesTags: ['Me'],
      }),
      uploadAvatar: build.mutation<UploadAvatarApiResponse, UploadAvatarApiArg>({
        query: (queryArg) => ({ url: `/api/v1/me/avatar`, method: 'POST', body: queryArg }),
        invalidatesTags: ['Me'],
      }),
      removeAvatar: build.mutation<RemoveAvatarApiResponse, RemoveAvatarApiArg>({
        query: () => ({ url: `/api/v1/me/avatar`, method: 'DELETE' }),
        invalidatesTags: ['Me'],
      }),
      listSubjects: build.query<ListSubjectsApiResponse, ListSubjectsApiArg>({
        query: () => ({ url: `/api/v1/subjects` }),
        providesTags: ['Subjects'],
      }),
      listTopics: build.query<ListTopicsApiResponse, ListTopicsApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/subjects/${queryArg.id}/topics`,
          params: {
            skill: queryArg.skill,
            part: queryArg.part,
          },
        }),
        providesTags: ['Subjects'],
      }),
      listQuestions: build.query<ListQuestionsApiResponse, ListQuestionsApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/questions`,
          params: {
            page: queryArg.page,
            limit: queryArg.limit,
            skill: queryArg.skill,
            part: queryArg.part,
            topicId: queryArg.topicId,
            type: queryArg['type'],
            difficulty: queryArg.difficulty,
            status: queryArg.status,
            groupId: queryArg.groupId,
            q: queryArg.q,
            mine: queryArg.mine,
            sort: queryArg.sort,
          },
        }),
        providesTags: ['Questions'],
      }),
      createQuestion: build.mutation<CreateQuestionApiResponse, CreateQuestionApiArg>({
        query: (queryArg) => ({ url: `/api/v1/teacher/questions`, method: 'POST', body: queryArg }),
        invalidatesTags: ['Questions'],
      }),
      getQuestion: build.query<GetQuestionApiResponse, GetQuestionApiArg>({
        query: (queryArg) => ({ url: `/api/v1/teacher/questions/${queryArg}` }),
        providesTags: ['Questions'],
      }),
      updateQuestion: build.mutation<UpdateQuestionApiResponse, UpdateQuestionApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/questions/${queryArg.id}`,
          method: 'PATCH',
          body: queryArg.updateQuestionDto,
        }),
        invalidatesTags: ['Questions'],
      }),
      deleteQuestion: build.mutation<DeleteQuestionApiResponse, DeleteQuestionApiArg>({
        query: (queryArg) => ({ url: `/api/v1/teacher/questions/${queryArg}`, method: 'DELETE' }),
        invalidatesTags: ['Questions'],
      }),
      bulkDeleteQuestions: build.mutation<
        BulkDeleteQuestionsApiResponse,
        BulkDeleteQuestionsApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/questions/bulk-delete`,
          method: 'POST',
          body: queryArg,
        }),
        invalidatesTags: ['Questions'],
      }),
      listQuestionGroups: build.query<ListQuestionGroupsApiResponse, ListQuestionGroupsApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/question-groups`,
          params: {
            page: queryArg.page,
            limit: queryArg.limit,
            skill: queryArg.skill,
            part: queryArg.part,
            topicId: queryArg.topicId,
            status: queryArg.status,
            mine: queryArg.mine,
          },
        }),
        providesTags: ['Question Groups'],
      }),
      createQuestionGroup: build.mutation<
        CreateQuestionGroupApiResponse,
        CreateQuestionGroupApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/question-groups`,
          method: 'POST',
          body: queryArg,
        }),
        invalidatesTags: ['Question Groups'],
      }),
      getQuestionGroup: build.query<GetQuestionGroupApiResponse, GetQuestionGroupApiArg>({
        query: (queryArg) => ({ url: `/api/v1/teacher/question-groups/${queryArg}` }),
        providesTags: ['Question Groups'],
      }),
      updateQuestionGroup: build.mutation<
        UpdateQuestionGroupApiResponse,
        UpdateQuestionGroupApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/question-groups/${queryArg.id}`,
          method: 'PATCH',
          body: queryArg.updateQuestionGroupDto,
        }),
        invalidatesTags: ['Question Groups'],
      }),
      deleteQuestionGroup: build.mutation<
        DeleteQuestionGroupApiResponse,
        DeleteQuestionGroupApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/question-groups/${queryArg.id}`,
          method: 'DELETE',
          params: {
            withQuestions: queryArg.withQuestions,
          },
        }),
        invalidatesTags: ['Question Groups'],
      }),
      bulkDeleteQuestionGroups: build.mutation<
        BulkDeleteQuestionGroupsApiResponse,
        BulkDeleteQuestionGroupsApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/question-groups/bulk-delete`,
          method: 'POST',
          body: queryArg,
        }),
        invalidatesTags: ['Question Groups'],
      }),
      getQuestionImportTemplate: build.query<
        GetQuestionImportTemplateApiResponse,
        GetQuestionImportTemplateApiArg
      >({
        query: () => ({ url: `/api/v1/teacher/questions/import/template` }),
        providesTags: ['Question Import'],
      }),
      previewQuestionImport: build.mutation<
        PreviewQuestionImportApiResponse,
        PreviewQuestionImportApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/questions/import/preview`,
          method: 'POST',
          body: queryArg,
        }),
        invalidatesTags: ['Question Import'],
      }),
      confirmQuestionImport: build.mutation<
        ConfirmQuestionImportApiResponse,
        ConfirmQuestionImportApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/questions/import/${queryArg.token}/confirm`,
          method: 'POST',
          body: queryArg.confirmImportDto,
        }),
        invalidatesTags: ['Question Import'],
      }),
      getQuestionImportErrors: build.query<
        GetQuestionImportErrorsApiResponse,
        GetQuestionImportErrorsApiArg
      >({
        query: (queryArg) => ({ url: `/api/v1/teacher/questions/import/${queryArg}/errors` }),
        providesTags: ['Question Import'],
      }),
      listExams: build.query<ListExamsApiResponse, ListExamsApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/exams`,
          params: {
            page: queryArg.page,
            limit: queryArg.limit,
            status: queryArg.status,
            scoringScale: queryArg.scoringScale,
            q: queryArg.q,
          },
        }),
        providesTags: ['Exams'],
      }),
      createExam: build.mutation<CreateExamApiResponse, CreateExamApiArg>({
        query: (queryArg) => ({ url: `/api/v1/teacher/exams`, method: 'POST', body: queryArg }),
        invalidatesTags: ['Exams'],
      }),
      getExam: build.query<GetExamApiResponse, GetExamApiArg>({
        query: (queryArg) => ({ url: `/api/v1/teacher/exams/${queryArg}` }),
        providesTags: ['Exams'],
      }),
      updateExam: build.mutation<UpdateExamApiResponse, UpdateExamApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/exams/${queryArg.id}`,
          method: 'PATCH',
          body: queryArg.updateExamDto,
        }),
        invalidatesTags: ['Exams'],
      }),
      deleteExam: build.mutation<DeleteExamApiResponse, DeleteExamApiArg>({
        query: (queryArg) => ({ url: `/api/v1/teacher/exams/${queryArg}`, method: 'DELETE' }),
        invalidatesTags: ['Exams'],
      }),
      bulkDeleteExams: build.mutation<BulkDeleteExamsApiResponse, BulkDeleteExamsApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/exams/bulk-delete`,
          method: 'POST',
          body: queryArg,
        }),
        invalidatesTags: ['Exams'],
      }),
      addSection: build.mutation<AddSectionApiResponse, AddSectionApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/exams/${queryArg.id}/sections`,
          method: 'POST',
          body: queryArg.addExamSectionDto,
        }),
        invalidatesTags: ['Exams'],
      }),
      removeSection: build.mutation<RemoveSectionApiResponse, RemoveSectionApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/exams/${queryArg.id}/sections/${queryArg.sectionId}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['Exams'],
      }),
      addQuestions: build.mutation<AddQuestionsApiResponse, AddQuestionsApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/exams/${queryArg.id}/sections/${queryArg.sectionId}/questions`,
          method: 'POST',
          body: queryArg.addExamQuestionsDto,
        }),
        invalidatesTags: ['Exams'],
      }),
      removeQuestion: build.mutation<RemoveQuestionApiResponse, RemoveQuestionApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/exams/${queryArg.id}/sections/${queryArg.sectionId}/questions/${queryArg.examQuestionId}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['Exams'],
      }),
      validateExam: build.query<ValidateExamApiResponse, ValidateExamApiArg>({
        query: (queryArg) => ({ url: `/api/v1/teacher/exams/${queryArg}/validation` }),
        providesTags: ['Exams'],
      }),
      previewExam: build.query<PreviewExamApiResponse, PreviewExamApiArg>({
        query: (queryArg) => ({ url: `/api/v1/teacher/exams/${queryArg}/preview` }),
        providesTags: ['Exams'],
      }),
      publishExam: build.mutation<PublishExamApiResponse, PublishExamApiArg>({
        query: (queryArg) => ({ url: `/api/v1/teacher/exams/${queryArg}/publish`, method: 'POST' }),
        invalidatesTags: ['Exams'],
      }),
      unpublishExam: build.mutation<UnpublishExamApiResponse, UnpublishExamApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/exams/${queryArg}/unpublish`,
          method: 'POST',
        }),
        invalidatesTags: ['Exams'],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as api };
export type RegisterApiResponse = /** status 201 Thành công */ {
  success: true;
  status: number;
  data: RegisterResult;
};
export type RegisterApiArg = RegisterDto;
export type VerifyEmailApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type VerifyEmailApiArg = VerifyEmailDto;
export type ResendVerificationApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type ResendVerificationApiArg = EmailDto;
export type ForgotPasswordApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type ForgotPasswordApiArg = EmailDto;
export type ValidateResetTokenApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type ValidateResetTokenApiArg =
  /** Token trong liên kết đặt lại mật khẩu (phần sau "token=") */ string;
export type ResetPasswordApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type ResetPasswordApiArg = ResetPasswordDto;
export type LoginApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AuthSession;
};
export type LoginApiArg = LoginDto;
export type RefreshApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AuthSession;
};
export type RefreshApiArg = void;
export type LogoutApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type LogoutApiArg = void;
export type GetProfileApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: MeProfile;
};
export type GetProfileApiArg = void;
export type UpdateProfileApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: MeProfile;
};
export type UpdateProfileApiArg = UpdateProfileDto;
export type GetLoginHistoryApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: LoginHistoryItem[];
  meta: PaginationMetaDto;
};
export type GetLoginHistoryApiArg = {
  page?: number;
  limit?: number;
};
export type ChangePasswordApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type ChangePasswordApiArg = ChangePasswordDto;
export type UploadAvatarApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: MeProfile;
};
export type UploadAvatarApiArg = {
  /** Ảnh JPEG, PNG hoặc WebP, tối đa 5 MB */
  file: Blob;
};
export type RemoveAvatarApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: MeProfile;
};
export type RemoveAvatarApiArg = void;
export type ListSubjectsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: SubjectItem[];
};
export type ListSubjectsApiArg = void;
export type ListTopicsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: TopicItem[];
};
export type ListTopicsApiArg = {
  id: string;
  skill?: Skill;
  part?: number;
};
export type ListQuestionsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: QuestionSummary[];
  meta: PaginationMetaDto;
};
export type ListQuestionsApiArg = {
  page?: number;
  limit?: number;
  skill?: Skill;
  part?: number;
  topicId?: string;
  type?: QuestionType;
  difficulty?: Difficulty;
  status?: QuestionStatus;
  /** Chỉ lấy câu thuộc nhóm này */
  groupId?: string;
  /** Tìm trong nội dung câu hỏi (không phân biệt hoa thường) */
  q?: string;
  /** true: chỉ câu do tôi tạo */
  mine?: boolean;
  sort?:
    | 'createdAt:desc'
    | 'createdAt:asc'
    | 'updatedAt:desc'
    | 'updatedAt:asc'
    | 'part:asc'
    | 'part:desc';
};
export type CreateQuestionApiResponse = /** status 201 Thành công */ {
  success: true;
  status: number;
  data: QuestionDetail;
};
export type CreateQuestionApiArg = CreateQuestionDto;
export type GetQuestionApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: QuestionDetail;
};
export type GetQuestionApiArg = string;
export type UpdateQuestionApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: QuestionDetail;
};
export type UpdateQuestionApiArg = {
  id: string;
  updateQuestionDto: UpdateQuestionDto;
};
export type DeleteQuestionApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type DeleteQuestionApiArg = string;
export type BulkDeleteQuestionsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: BulkDeleteResult;
};
export type BulkDeleteQuestionsApiArg = BulkIdsDto;
export type ListQuestionGroupsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: QuestionGroupSummary[];
  meta: PaginationMetaDto;
};
export type ListQuestionGroupsApiArg = {
  page?: number;
  limit?: number;
  skill?: Skill;
  part?: number;
  topicId?: string;
  status?: QuestionStatus;
  /** true: chỉ nhóm do tôi tạo */
  mine?: boolean;
};
export type CreateQuestionGroupApiResponse = /** status 201 Thành công */ {
  success: true;
  status: number;
  data: QuestionGroupDetail;
};
export type CreateQuestionGroupApiArg = CreateQuestionGroupDto;
export type GetQuestionGroupApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: QuestionGroupDetail;
};
export type GetQuestionGroupApiArg = string;
export type UpdateQuestionGroupApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: QuestionGroupDetail;
};
export type UpdateQuestionGroupApiArg = {
  id: string;
  updateQuestionGroupDto: UpdateQuestionGroupDto;
};
export type DeleteQuestionGroupApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type DeleteQuestionGroupApiArg = {
  id: string;
  /** true: xóa luôn các câu trong nhóm; false: nhóm còn câu thì không xóa được */
  withQuestions?: boolean;
};
export type BulkDeleteQuestionGroupsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: GroupBulkDeleteResult;
};
export type BulkDeleteQuestionGroupsApiArg = BulkDeleteGroupsDto;
export type GetQuestionImportTemplateApiResponse = /** status 200 Tệp .zip */ Blob;
export type GetQuestionImportTemplateApiArg = void;
export type PreviewQuestionImportApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ImportPreview;
};
export type PreviewQuestionImportApiArg = {
  /** Tệp .zip gồm questions.xlsx và thư mục media/, tối đa 100 MB */
  file: Blob;
};
export type ConfirmQuestionImportApiResponse = /** status 201 Thành công */ {
  success: true;
  status: number;
  data: ImportResult;
};
export type ConfirmQuestionImportApiArg = {
  token: string;
  confirmImportDto: ConfirmImportDto;
};
export type GetQuestionImportErrorsApiResponse = /** status 200 Tệp .xlsx */ Blob;
export type GetQuestionImportErrorsApiArg = string;
export type ListExamsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamSummary[];
  meta: PaginationMetaDto;
};
export type ListExamsApiArg = {
  page?: number;
  limit?: number;
  status?: ExamStatus;
  scoringScale?: ScoringScale;
  /** Tìm theo tên đề (không phân biệt hoa thường) */
  q?: string;
};
export type CreateExamApiResponse = /** status 201 Thành công */ {
  success: true;
  status: number;
  data: ExamDetail;
};
export type CreateExamApiArg = CreateExamDto;
export type GetExamApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamDetail;
};
export type GetExamApiArg = string;
export type UpdateExamApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamDetail;
};
export type UpdateExamApiArg = {
  id: string;
  updateExamDto: UpdateExamDto;
};
export type DeleteExamApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type DeleteExamApiArg = string;
export type BulkDeleteExamsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: BulkDeleteResult;
};
export type BulkDeleteExamsApiArg = BulkIdsDto;
export type AddSectionApiResponse = /** status 201 Thành công */ {
  success: true;
  status: number;
  data: ExamDetail;
};
export type AddSectionApiArg = {
  id: string;
  addExamSectionDto: AddExamSectionDto;
};
export type RemoveSectionApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamDetail;
};
export type RemoveSectionApiArg = {
  id: string;
  sectionId: string;
};
export type AddQuestionsApiResponse = /** status 201 Thành công */ {
  success: true;
  status: number;
  data: ExamDetail;
};
export type AddQuestionsApiArg = {
  id: string;
  sectionId: string;
  addExamQuestionsDto: AddExamQuestionsDto;
};
export type RemoveQuestionApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamDetail;
};
export type RemoveQuestionApiArg = {
  id: string;
  sectionId: string;
  examQuestionId: string;
};
export type ValidateExamApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamValidation;
};
export type ValidateExamApiArg = string;
export type PreviewExamApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamPaper;
};
export type PreviewExamApiArg = string;
export type PublishExamApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamDetail;
};
export type PublishExamApiArg = string;
export type UnpublishExamApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamDetail;
};
export type UnpublishExamApiArg = string;
export type UserStatus = 'PENDING_VERIFICATION' | 'PENDING_APPROVAL' | 'ACTIVE' | 'LOCKED';
export type RegisterResult = {
  id: string;
  email: string;
  status: UserStatus;
};
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VERSION_CONFLICT'
  | 'GONE'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNPROCESSABLE_ENTITY'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_EMAIL_NOT_VERIFIED'
  | 'AUTH_ACCOUNT_PENDING_APPROVAL'
  | 'AUTH_ACCOUNT_LOCKED'
  | 'AUTH_REFRESH_TOKEN_INVALID'
  | 'AUTH_EMAIL_ALREADY_EXISTS'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_TOO_MANY_LOGIN_ATTEMPTS'
  | 'AUTH_CURRENT_PASSWORD_INCORRECT'
  | 'AUTH_PASSWORD_NOT_SET'
  | 'AUTH_GOOGLE_DISABLED'
  | 'AUTH_GOOGLE_FAILED'
  | 'AUTH_GOOGLE_EMAIL_UNVERIFIED'
  | 'AUTH_GOOGLE_STUDENT_ONLY'
  | 'STORAGE_UNAVAILABLE'
  | 'AVATAR_INVALID_IMAGE'
  | 'MEDIA_LINK_INVALID'
  | 'MEDIA_RANGE_NOT_SATISFIABLE'
  | 'SUBJECT_NOT_FOUND'
  | 'QUESTION_NOT_FOUND'
  | 'QUESTION_GROUP_NOT_FOUND'
  | 'QUESTION_GROUP_NOT_EMPTY'
  | 'QUESTION_GROUP_ORDER_TAKEN'
  | 'QUESTION_CODE_TAKEN'
  | 'QUESTION_IN_PUBLISHED_EXAM'
  | 'QUESTION_IMPORT_INVALID_FILE'
  | 'QUESTION_IMPORT_NOT_FOUND'
  | 'QUESTION_IMPORT_HAS_ERRORS'
  | 'QUESTION_IMPORT_IN_PROGRESS'
  | 'EXAM_NOT_FOUND'
  | 'EXAM_SECTION_NOT_FOUND'
  | 'EXAM_QUESTION_NOT_FOUND'
  | 'EXAM_PUBLISHED'
  | 'EXAM_SECTION_EXISTS'
  | 'EXAM_QUESTION_DUPLICATE'
  | 'EXAM_NOT_PUBLISHABLE';
export type FieldErrorDto = {
  /** Trường lỗi, trường lồng nhau dạng address.city */
  field: string;
  message: string;
};
export type ErrorBodyDto = {
  code: ErrorCode;
  message: string;
  /** VALIDATION_ERROR: danh sách lỗi theo trường. Mã khác có thể chứa dữ liệu riêng, ví dụ { retryAfterSeconds } */
  details?: FieldErrorDto[];
};
export type ErrorEnvelopeDto = {
  success: false;
  /** Luôn trùng HTTP status code */
  status: number;
  error: ErrorBodyDto;
};
export type RegisterDto = {
  fullName: string;
  email: string;
  /** Mật khẩu dài 8-72 ký tự, gồm ít nhất một chữ hoa, một chữ thường và một chữ số */
  password: string;
  confirmPassword: string;
  /** Đồng ý Điều khoản sử dụng và Chính sách xử lý dữ liệu cá nhân */
  acceptTerms: boolean;
};
export type VerifyEmailDto = {
  /** Token trong liên kết xác minh (phần sau "token=") */
  token: string;
};
export type EmailDto = {
  email: string;
};
export type ResetPasswordDto = {
  /** Token trong liên kết đặt lại mật khẩu (phần sau "token=") */
  token: string;
  /** Mật khẩu dài 8-72 ký tự, gồm ít nhất một chữ hoa, một chữ thường và một chữ số */
  newPassword: string;
  confirmPassword: string;
};
export type RoleCode = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type AuthSessionUser = {
  id: string;
  email: string;
  fullName: string;
  /** Ảnh đại diện; tài khoản Google lấy ảnh từ Google, null thì FE hiện chữ cái đầu */
  avatarUrl: string | null;
  role: RoleCode;
  /** true: FE chuyển thẳng tới trang Đổi mật khẩu (admin mặc định từ seed) */
  mustChangePassword: boolean;
};
export type AuthSession = {
  accessToken: string;
  /** Số giây access token còn hiệu lực, FE dùng để biết khi nào cần làm mới */
  expiresIn: number;
  user: AuthSessionUser;
};
export type LoginDto = {
  email: string;
  password: string;
};
export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type StudentProfile = {
  currentLevel: Level | null;
  currentScore: number | null;
  targetScore: number | null;
};
export type MeProfile = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: RoleCode;
  status: UserStatus;
  mustChangePassword: boolean;
  /** false: tài khoản chỉ đăng nhập bằng Google, chưa đặt mật khẩu */
  hasPassword: boolean;
  /** true: đã liên kết đăng nhập bằng Google */
  googleLinked: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** null với giáo viên và admin */
  student: StudentProfile | null;
};
export type UpdateProfileDto = {
  fullName?: string;
  /** Điểm TOEIC Listening + Reading mục tiêu, bước 5 điểm (chỉ học viên) */
  targetScore?: number;
};
export type LoginHistoryItem = {
  id: string;
  success: boolean;
  /** Mã lý do khi thất bại, ví dụ INVALID_PASSWORD, TOO_MANY_ATTEMPTS; null khi thành công */
  failureReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};
export type PaginationMetaDto = {
  page: number;
  limit: number;
  total: number;
  /** 0 khi không có bản ghi nào */
  totalPages: number;
};
export type ChangePasswordDto = {
  currentPassword: string;
  /** Mật khẩu dài 8-72 ký tự, gồm ít nhất một chữ hoa, một chữ thường và một chữ số */
  newPassword: string;
  confirmPassword: string;
};
export type SubjectCategory = 'TOEIC' | 'IELTS';
export type SubjectItem = {
  id: string;
  code: string;
  name: string;
  category: SubjectCategory;
};
export type Skill = 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING';
export type TopicItem = {
  id: string;
  skill: Skill;
  /** Các Part dùng được chủ đề này */
  parts: number[];
  name: string;
  description: string | null;
};
export type TopicRef = {
  id: string;
  name: string;
};
export type AuthorRef = {
  id: string;
  fullName: string;
};
export type QuestionType =
  'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'SPOKEN_RESPONSE' | 'WRITTEN_RESPONSE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type QuestionSummary = {
  id: string;
  /** Mã câu trong tệp nhập; câu tạo bằng form thì null */
  code: string | null;
  topic: TopicRef;
  author: AuthorRef;
  groupId: string | null;
  orderInGroup: number | null;
  type: QuestionType;
  skill: Skill;
  part: number;
  difficulty: Difficulty;
  status: QuestionStatus;
  content: string;
  createdAt: string;
  /** Gửi lại nguyên giá trị này khi PATCH để kiểm tra xung đột (khóa lạc quan) */
  updatedAt: string;
};
export type QuestionOptionItem = {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
};
export type QuestionDetail = {
  id: string;
  /** Mã câu trong tệp nhập; câu tạo bằng form thì null */
  code: string | null;
  topic: TopicRef;
  author: AuthorRef;
  groupId: string | null;
  orderInGroup: number | null;
  type: QuestionType;
  skill: Skill;
  part: number;
  difficulty: Difficulty;
  status: QuestionStatus;
  content: string;
  createdAt: string;
  /** Gửi lại nguyên giá trị này khi PATCH để kiểm tra xung đột (khóa lạc quan) */
  updatedAt: string;
  explanation: string | null;
  sampleAnswer: string | null;
  prepSeconds: number | null;
  responseSeconds: number | null;
  /** Key trong kho tệp, gán khi nhập .zip */
  audioKey: string | null;
  /** Key trong kho tệp, gán khi nhập .zip */
  imageKey: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  audioUrl: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  imageUrl: string | null;
  /** Rỗng với câu trả lời mở */
  options: QuestionOptionItem[];
};
export type QuestionOptionDto = {
  /** Theo thứ tự hiển thị: A, B, C, D */
  label: string;
  content: string;
  isCorrect: boolean;
};
export type CreateQuestionDto = {
  /** Lấy từ GET /subjects/{id}/topics?skill=&part= */
  topicId: string;
  skill: Skill;
  /** LR 1–7; Speaking 1–5; Writing 1–3 */
  part: number;
  type: QuestionType;
  difficulty: Difficulty;
  status?: QuestionStatus;
  content: string;
  explanation?: string | null;
  /** Bắt buộc với Speaking, Writing; bỏ trống với câu trắc nghiệm */
  sampleAnswer?: string | null;
  prepSeconds?: number | null;
  responseSeconds?: number | null;
  groupId?: string | null;
  orderInGroup?: number | null;
  /** Câu trắc nghiệm: đủ số phương án của Part, đúng 1 đáp án đúng. Câu mở: bỏ trống */
  options?: QuestionOptionDto[];
};
export type UpdateQuestionDto = {
  /** Lấy từ GET /subjects/{id}/topics?skill=&part= */
  topicId?: string;
  skill?: Skill;
  /** LR 1–7; Speaking 1–5; Writing 1–3 */
  part?: number;
  type?: QuestionType;
  difficulty?: Difficulty;
  status?: QuestionStatus;
  content?: string;
  explanation?: string | null;
  /** Bắt buộc với Speaking, Writing; bỏ trống với câu trắc nghiệm */
  sampleAnswer?: string | null;
  prepSeconds?: number | null;
  responseSeconds?: number | null;
  groupId?: string | null;
  orderInGroup?: number | null;
  /** Câu trắc nghiệm: đủ số phương án của Part, đúng 1 đáp án đúng. Câu mở: bỏ trống */
  options?: QuestionOptionDto[];
  /** updatedAt nhận được lần đọc gần nhất; đã có người sửa sau đó thì trả 409 */
  updatedAt: string;
};
export type BulkSkipReason =
  'NOT_FOUND' | 'NOT_OWNER' | 'IN_PUBLISHED_EXAM' | 'NOT_EMPTY' | 'PUBLISHED';
export type BulkSkippedItem = {
  id: string;
  /** Mã câu, tên đề hoặc đoạn đầu nội dung; null khi không tìm thấy */
  label: string | null;
  /** NOT_FOUND: không tồn tại hoặc đã xóa · NOT_OWNER: của giáo viên khác · IN_PUBLISHED_EXAM: đang nằm trong đề đã xuất bản · NOT_EMPTY: nhóm còn câu · PUBLISHED: đề đang xuất bản */
  reason: BulkSkipReason;
  message: string;
};
export type BulkDeleteResult = {
  /** Số mục đã xóa */
  deleted: number;
  /** Theo đúng thứ tự id gửi lên */
  skipped: BulkSkippedItem[];
};
export type BulkIdsDto = {
  /** Từ 1 đến 100 id, không trùng nhau */
  ids: string[];
};
export type QuestionGroupSummary = {
  id: string;
  topic: TopicRef;
  author: AuthorRef;
  skill: Skill;
  part: number;
  passage: string | null;
  transcript: string | null;
  audioKey: string | null;
  imageKey: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  audioUrl: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  imageUrl: string | null;
  status: QuestionStatus;
  /** Số câu còn hiệu lực trong nhóm */
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};
export type QuestionGroupDetail = {
  id: string;
  topic: TopicRef;
  author: AuthorRef;
  skill: Skill;
  part: number;
  passage: string | null;
  transcript: string | null;
  audioKey: string | null;
  imageKey: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  audioUrl: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  imageUrl: string | null;
  status: QuestionStatus;
  /** Số câu còn hiệu lực trong nhóm */
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  /** Các câu trong nhóm, theo thứ tự */
  questions: QuestionSummary[];
};
export type CreateQuestionGroupDto = {
  topicId: string;
  skill: Skill;
  /** Nhóm dùng cho Listening 3, 4; Reading 6, 7; Speaking 4 */
  part: number;
  /** Bắt buộc với Reading 6, 7 và Speaking 4 */
  passage?: string | null;
  /** Bắt buộc với Listening 3, 4. Chỉ hiện ở màn xem lại */
  transcript?: string | null;
  status?: QuestionStatus;
};
export type UpdateQuestionGroupDto = {
  topicId?: string;
  /** Bắt buộc với Reading 6, 7 và Speaking 4 */
  passage?: string | null;
  /** Bắt buộc với Listening 3, 4. Chỉ hiện ở màn xem lại */
  transcript?: string | null;
  status?: QuestionStatus;
  /** updatedAt lần đọc gần nhất */
  updatedAt: string;
};
export type GroupBulkDeleteResult = {
  /** Số mục đã xóa */
  deleted: number;
  /** Theo đúng thứ tự id gửi lên */
  skipped: BulkSkippedItem[];
  /** Số câu bị xóa theo nhóm (khi withQuestions = true) */
  deletedQuestions: number;
};
export type BulkDeleteGroupsDto = {
  /** Từ 1 đến 100 id, không trùng nhau */
  ids: string[];
  /** true: xóa luôn các câu trong nhóm; false: bỏ qua nhóm còn câu (NOT_EMPTY) */
  withQuestions?: boolean;
};
export type ImportPartCount = {
  skill: Skill;
  part: number;
  name: string;
  groupCount: number;
  questionCount: number;
};
export type ImportIssue = {
  /** file: cấu trúc tệp; groups, questions: sheet trong Excel; media: thư mục media/ */
  sheet: 'file' | 'groups' | 'questions' | 'media';
  /** Số dòng trong Excel (dòng 1 là tiêu đề) */
  row: number | null;
  column: string | null;
  message: string;
};
export type ImportQuestionRow = {
  row: number;
  code: string;
  skill: Skill;
  part: number;
  difficulty: Difficulty;
  topic: string;
  groupCode: string | null;
  orderInGroup: number | null;
  /** Nội dung câu, cắt ngắn 120 ký tự */
  content: string;
  audioFile: string | null;
  imageFile: string | null;
};
export type ImportPreview = {
  /** Dùng cho /{token}/confirm và /{token}/errors */
  token: string;
  fileName: string;
  /** Sau thời điểm này phải tải lại */
  expiresAt: string;
  /** false khi còn lỗi: phải sửa tệp rồi tải lên lại */
  canConfirm: boolean;
  /** Số nhóm hợp lệ */
  groupCount: number;
  /** Số câu hợp lệ */
  questionCount: number;
  /** Số tệp audio/ảnh được dùng */
  mediaCount: number;
  errorCount: number;
  warningCount: number;
  parts: ImportPartCount[];
  /** Tối đa 500 lỗi đầu tiên; đầy đủ trong GET /{token}/errors */
  errors: ImportIssue[];
  /** Tối đa 500 cảnh báo đầu tiên */
  warnings: ImportIssue[];
  /** Các câu hợp lệ, theo thứ tự dòng */
  questions: ImportQuestionRow[];
};
export type ImportResult = {
  groupCount: number;
  questionCount: number;
  /** Số tệp audio/ảnh đã lưu vào kho */
  mediaCount: number;
  status: QuestionStatus;
};
export type ImportStatus = 'DRAFT' | 'ACTIVE';
export type ConfirmImportDto = {
  /** Trạng thái của mọi nhóm, câu được nhập. ACTIVE: dùng ngay để soạn đề xuất bản */
  status?: ImportStatus;
};
export type SubjectRef = {
  id: string;
  code: string;
  name: string;
};
export type ExamKind = 'STANDARD' | 'AI_PRACTICE';
export type ScoringScale = 'TOEIC_990' | 'TOEIC_SW' | 'PERCENT';
export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
export type ExamSummary = {
  id: string;
  subject: SubjectRef;
  kind: ExamKind;
  title: string;
  description: string | null;
  scoringScale: ScoringScale;
  durationMinutes: number;
  /** null: không giới hạn */
  maxAttempts: number | null;
  allowPartPractice: boolean;
  status: ExamStatus;
  publishedAt: string | null;
  sectionCount: number;
  questionCount: number;
  createdAt: string;
  /** Gửi lại nguyên giá trị này khi PATCH để kiểm tra xung đột (khóa lạc quan) */
  updatedAt: string;
};
export type ExamQuestionItem = {
  /** Id của câu trong đề (dùng khi gỡ câu khỏi đề) */
  id: string;
  orderIndex: number;
  /** Câu trong ngân hàng; các câu cùng groupId nằm liền nhau (một khối) */
  question: QuestionSummary;
};
export type ExamSectionItem = {
  id: string;
  skill: Skill;
  part: number;
  name: string;
  questionCount: number;
  questions: ExamQuestionItem[];
};
export type ExamDetail = {
  id: string;
  subject: SubjectRef;
  kind: ExamKind;
  title: string;
  description: string | null;
  scoringScale: ScoringScale;
  durationMinutes: number;
  /** null: không giới hạn */
  maxAttempts: number | null;
  allowPartPractice: boolean;
  status: ExamStatus;
  publishedAt: string | null;
  sectionCount: number;
  questionCount: number;
  createdAt: string;
  /** Gửi lại nguyên giá trị này khi PATCH để kiểm tra xung đột (khóa lạc quan) */
  updatedAt: string;
  /** Theo thứ tự Part chuẩn của TOEIC */
  sections: ExamSectionItem[];
};
export type CreateExamDto = {
  /** Chương trình thi, lấy từ GET /subjects */
  subjectId: string;
  title: string;
  description?: string | null;
  /** TOEIC_990: đề Listening + Reading đủ 7 Part · TOEIC_SW: đề Speaking và/hoặc Writing · PERCENT: luyện theo Part */
  scoringScale: ScoringScale;
  durationMinutes: number;
  /** Bỏ trống hoặc null: không giới hạn số lần làm */
  maxAttempts?: number | null;
  /** Cho phép học viên làm riêng từng Part */
  allowPartPractice?: boolean;
};
export type UpdateExamDto = {
  title?: string;
  description?: string | null;
  /** TOEIC_990: đề Listening + Reading đủ 7 Part · TOEIC_SW: đề Speaking và/hoặc Writing · PERCENT: luyện theo Part */
  scoringScale?: ScoringScale;
  durationMinutes?: number;
  /** Bỏ trống hoặc null: không giới hạn số lần làm */
  maxAttempts?: number | null;
  /** Cho phép học viên làm riêng từng Part */
  allowPartPractice?: boolean;
  /** updatedAt lần đọc gần nhất */
  updatedAt: string;
};
export type AddExamSectionDto = {
  skill: Skill;
  /** LR 1–7; Speaking 1–5; Writing 1–3 */
  part: number;
};
export type AddExamQuestionsDto = {
  /** Câu đơn (Part không có nhóm), thêm theo đúng thứ tự gửi lên */
  questionIds?: string[];
  /** Nhóm câu (L3, L4, R6, R7, S4): thêm toàn bộ câu của nhóm theo thứ tự trong nhóm */
  groupIds?: string[];
};
export type ExamPartCheck = {
  skill: Skill;
  part: number;
  name: string;
  /** Số câu chuẩn TOEIC; null với đề luyện tập (PERCENT) */
  expected: number | null;
  actual: number;
};
export type ExamIssueLevel = 'ERROR' | 'WARNING';
export type ExamIssueCode =
  | 'NO_SECTIONS'
  | 'MISSING_PART'
  | 'EMPTY_SECTION'
  | 'WRONG_QUESTION_COUNT'
  | 'QUESTION_REMOVED'
  | 'QUESTION_NOT_ACTIVE'
  | 'GROUP_NOT_ACTIVE'
  | 'GROUP_SIZE'
  | 'GROUP_INCOMPLETE'
  | 'MISSING_MEDIA'
  | 'DURATION';
export type ExamIssue = {
  level: ExamIssueLevel;
  code: ExamIssueCode;
  message: string;
  sectionId: string | null;
  /** Câu trong ngân hàng, để FE mở thẳng câu cần sửa */
  questionId: string | null;
};
export type ExamValidation = {
  /** true khi không còn lỗi mức ERROR */
  publishable: boolean;
  totalQuestions: number;
  parts: ExamPartCheck[];
  issues: ExamIssue[];
};
export type PaperGroup = {
  id: string;
  /** Đoạn văn, bảng thông tin */
  passage: string | null;
  audioKey: string | null;
  imageKey: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  audioUrl: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  imageUrl: string | null;
};
export type PaperOption = {
  id: string;
  label: string;
  content: string;
};
export type PaperQuestion = {
  /** Số câu liên tục trong cả đề: 1, 2, 3… */
  number: number;
  examQuestionId: string;
  type: QuestionType;
  content: string;
  audioKey: string | null;
  imageKey: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  audioUrl: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  imageUrl: string | null;
  prepSeconds: number | null;
  responseSeconds: number | null;
  /** Không có isCorrect; rỗng với câu trả lời mở */
  options: PaperOption[];
};
export type PaperBlock = {
  group: PaperGroup | null;
  questions: PaperQuestion[];
};
export type PaperSection = {
  id: string;
  skill: Skill;
  part: number;
  name: string;
  blocks: PaperBlock[];
};
export type ExamPaper = {
  id: string;
  title: string;
  scoringScale: ScoringScale;
  durationMinutes: number;
  totalQuestions: number;
  sections: PaperSection[];
};
export const {
  useRegisterMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useForgotPasswordMutation,
  useValidateResetTokenQuery,
  useResetPasswordMutation,
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetLoginHistoryQuery,
  useChangePasswordMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
  useListSubjectsQuery,
  useListTopicsQuery,
  useListQuestionsQuery,
  useCreateQuestionMutation,
  useGetQuestionQuery,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  useBulkDeleteQuestionsMutation,
  useListQuestionGroupsQuery,
  useCreateQuestionGroupMutation,
  useGetQuestionGroupQuery,
  useUpdateQuestionGroupMutation,
  useDeleteQuestionGroupMutation,
  useBulkDeleteQuestionGroupsMutation,
  useGetQuestionImportTemplateQuery,
  usePreviewQuestionImportMutation,
  useConfirmQuestionImportMutation,
  useGetQuestionImportErrorsQuery,
  useListExamsQuery,
  useCreateExamMutation,
  useGetExamQuery,
  useUpdateExamMutation,
  useDeleteExamMutation,
  useBulkDeleteExamsMutation,
  useAddSectionMutation,
  useRemoveSectionMutation,
  useAddQuestionsMutation,
  useRemoveQuestionMutation,
  useValidateExamQuery,
  usePreviewExamQuery,
  usePublishExamMutation,
  useUnpublishExamMutation,
} = injectedRtkApi;
