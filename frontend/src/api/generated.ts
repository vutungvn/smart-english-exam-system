import { baseApi as api } from './base-api';
export const addTagTypes = [
  'Auth',
  'Me',
  'Subjects',
  'Questions',
  'Question Groups',
  'Question Import',
  'Exams',
  'Exam Catalog',
  'Attempts',
  'Teacher Assessments',
  'Notifications',
  'Progress',
  'AI Explanations',
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
      giveVoiceConsent: build.mutation<GiveVoiceConsentApiResponse, GiveVoiceConsentApiArg>({
        query: () => ({ url: `/api/v1/me/voice-consent`, method: 'PUT' }),
        invalidatesTags: ['Me'],
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
      uploadQuestionMedia: build.mutation<
        UploadQuestionMediaApiResponse,
        UploadQuestionMediaApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/questions/${queryArg.id}/media/${queryArg.kind}`,
          method: 'PUT',
          body: queryArg.body,
        }),
        invalidatesTags: ['Questions'],
      }),
      removeQuestionMedia: build.mutation<
        RemoveQuestionMediaApiResponse,
        RemoveQuestionMediaApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/questions/${queryArg.id}/media/${queryArg.kind}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['Questions'],
      }),
      uploadQuestionGroupMedia: build.mutation<
        UploadQuestionGroupMediaApiResponse,
        UploadQuestionGroupMediaApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/question-groups/${queryArg.id}/media/${queryArg.kind}`,
          method: 'PUT',
          body: queryArg.body,
        }),
        invalidatesTags: ['Question Groups'],
      }),
      removeQuestionGroupMedia: build.mutation<
        RemoveQuestionGroupMediaApiResponse,
        RemoveQuestionGroupMediaApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/question-groups/${queryArg.id}/media/${queryArg.kind}`,
          method: 'DELETE',
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
      getAutoFillCoverage: build.query<GetAutoFillCoverageApiResponse, GetAutoFillCoverageApiArg>({
        query: (queryArg) => ({ url: `/api/v1/teacher/exams/${queryArg}/auto-fill/coverage` }),
        providesTags: ['Exams'],
      }),
      previewAutoFill: build.mutation<PreviewAutoFillApiResponse, PreviewAutoFillApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/exams/${queryArg.id}/auto-fill/preview`,
          method: 'POST',
          body: queryArg.autoFillPreviewDto,
        }),
        invalidatesTags: ['Exams'],
      }),
      applyAutoFill: build.mutation<ApplyAutoFillApiResponse, ApplyAutoFillApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/teacher/exams/${queryArg.id}/auto-fill`,
          method: 'POST',
          body: queryArg.autoFillApplyDto,
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
      listPublishedExams: build.query<ListPublishedExamsApiResponse, ListPublishedExamsApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/exams`,
          params: {
            page: queryArg.page,
            limit: queryArg.limit,
            scoringScale: queryArg.scoringScale,
            skill: queryArg.skill,
            q: queryArg.q,
          },
        }),
        providesTags: ['Exam Catalog'],
      }),
      getPublishedExam: build.query<GetPublishedExamApiResponse, GetPublishedExamApiArg>({
        query: (queryArg) => ({ url: `/api/v1/exams/${queryArg}` }),
        providesTags: ['Exam Catalog'],
      }),
      startAttempt: build.mutation<StartAttemptApiResponse, StartAttemptApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/exams/${queryArg.id}/attempts`,
          method: 'POST',
          body: queryArg.startAttemptDto,
        }),
        invalidatesTags: ['Attempts'],
      }),
      listInProgressAttempts: build.query<
        ListInProgressAttemptsApiResponse,
        ListInProgressAttemptsApiArg
      >({
        query: () => ({ url: `/api/v1/me/attempts/in-progress` }),
        providesTags: ['Attempts'],
      }),
      listAttemptHistory: build.query<ListAttemptHistoryApiResponse, ListAttemptHistoryApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/me/attempts`,
          params: {
            page: queryArg.page,
            limit: queryArg.limit,
            examId: queryArg.examId,
            mode: queryArg.mode,
            sort: queryArg.sort,
          },
        }),
        providesTags: ['Attempts'],
      }),
      getAttemptReview: build.query<GetAttemptReviewApiResponse, GetAttemptReviewApiArg>({
        query: (queryArg) => ({ url: `/api/v1/attempts/${queryArg}/review` }),
        providesTags: ['Attempts'],
      }),
      getAttempt: build.query<GetAttemptApiResponse, GetAttemptApiArg>({
        query: (queryArg) => ({ url: `/api/v1/attempts/${queryArg}` }),
        providesTags: ['Attempts'],
      }),
      saveAnswer: build.mutation<SaveAnswerApiResponse, SaveAnswerApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/attempts/${queryArg.id}/answers/${queryArg.examQuestionId}`,
          method: 'PUT',
          body: queryArg.saveAnswerDto,
        }),
        invalidatesTags: ['Attempts'],
      }),
      saveRecording: build.mutation<SaveRecordingApiResponse, SaveRecordingApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/attempts/${queryArg.id}/answers/${queryArg.examQuestionId}/audio`,
          method: 'PUT',
          body: queryArg.body,
        }),
        invalidatesTags: ['Attempts'],
      }),
      syncAnswers: build.mutation<SyncAnswersApiResponse, SyncAnswersApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/attempts/${queryArg.id}/answers`,
          method: 'PATCH',
          body: queryArg.syncAnswersDto,
        }),
        invalidatesTags: ['Attempts'],
      }),
      submitAttempt: build.mutation<SubmitAttemptApiResponse, SubmitAttemptApiArg>({
        query: (queryArg) => ({ url: `/api/v1/attempts/${queryArg}/submit`, method: 'POST' }),
        invalidatesTags: ['Attempts'],
      }),
      cancelAttempt: build.mutation<CancelAttemptApiResponse, CancelAttemptApiArg>({
        query: (queryArg) => ({ url: `/api/v1/attempts/${queryArg}/cancel`, method: 'POST' }),
        invalidatesTags: ['Attempts'],
      }),
      regradeAssessment: build.mutation<RegradeAssessmentApiResponse, RegradeAssessmentApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/attempts/${queryArg.id}/assessments/${queryArg.assessmentId}/regrade`,
          method: 'POST',
        }),
        invalidatesTags: ['Attempts'],
      }),
      requestAssessmentReview: build.mutation<
        RequestAssessmentReviewApiResponse,
        RequestAssessmentReviewApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/attempts/${queryArg.id}/assessments/${queryArg.assessmentId}/review-request`,
          method: 'POST',
          body: queryArg.requestReviewDto,
        }),
        invalidatesTags: ['Attempts'],
      }),
      listTeacherAssessments: build.query<
        ListTeacherAssessmentsApiResponse,
        ListTeacherAssessmentsApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/assessments`,
          params: {
            page: queryArg.page,
            limit: queryArg.limit,
            tab: queryArg.tab,
            scope: queryArg.scope,
            skill: queryArg.skill,
          },
        }),
        providesTags: ['Teacher Assessments'],
      }),
      getTeacherAssessment: build.query<
        GetTeacherAssessmentApiResponse,
        GetTeacherAssessmentApiArg
      >({
        query: (queryArg) => ({ url: `/api/v1/teacher/assessments/${queryArg}` }),
        providesTags: ['Teacher Assessments'],
      }),
      gradeTeacherAssessment: build.mutation<
        GradeTeacherAssessmentApiResponse,
        GradeTeacherAssessmentApiArg
      >({
        query: (queryArg) => ({
          url: `/api/v1/teacher/assessments/${queryArg.answerId}`,
          method: 'PUT',
          body: queryArg.gradeAnswerDto,
        }),
        invalidatesTags: ['Teacher Assessments'],
      }),
      listNotifications: build.query<ListNotificationsApiResponse, ListNotificationsApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/me/notifications`,
          params: {
            page: queryArg.page,
            limit: queryArg.limit,
          },
        }),
        providesTags: ['Notifications'],
      }),
      getUnreadNotificationCount: build.query<
        GetUnreadNotificationCountApiResponse,
        GetUnreadNotificationCountApiArg
      >({
        query: () => ({ url: `/api/v1/me/notifications/unread-count` }),
        providesTags: ['Notifications'],
      }),
      markAllNotificationsRead: build.mutation<
        MarkAllNotificationsReadApiResponse,
        MarkAllNotificationsReadApiArg
      >({
        query: () => ({ url: `/api/v1/me/notifications/read-all`, method: 'POST' }),
        invalidatesTags: ['Notifications'],
      }),
      markNotificationRead: build.mutation<
        MarkNotificationReadApiResponse,
        MarkNotificationReadApiArg
      >({
        query: (queryArg) => ({ url: `/api/v1/me/notifications/${queryArg}/read`, method: 'POST' }),
        invalidatesTags: ['Notifications'],
      }),
      getScoreTrend: build.query<GetScoreTrendApiResponse, GetScoreTrendApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/me/progress/score-trend`,
          params: {
            range: queryArg,
          },
        }),
        providesTags: ['Progress'],
      }),
      getProgressSkills: build.query<GetProgressSkillsApiResponse, GetProgressSkillsApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/me/progress/skills`,
          params: {
            range: queryArg,
          },
        }),
        providesTags: ['Progress'],
      }),
      getAiExplanation: build.query<GetAiExplanationApiResponse, GetAiExplanationApiArg>({
        query: (queryArg) => ({
          url: `/api/v1/attempts/${queryArg.id}/questions/${queryArg.examQuestionId}/ai-explanation`,
        }),
        providesTags: ['AI Explanations'],
      }),
      getMyAiQuotas: build.query<GetMyAiQuotasApiResponse, GetMyAiQuotasApiArg>({
        query: () => ({ url: `/api/v1/me/ai-quotas` }),
        providesTags: ['AI Explanations'],
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
export type GiveVoiceConsentApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: MeProfile;
};
export type GiveVoiceConsentApiArg = void;
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
export type UploadQuestionMediaApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: QuestionDetail;
};
export type UploadQuestionMediaApiArg = {
  id: string;
  /** audio hoặc image */
  kind: 'audio' | 'image';
  body: {
    /** audio: MP3 tối đa 20 MB · image: JPG, PNG, WebP tối đa 5 MB */
    file: Blob;
  };
};
export type RemoveQuestionMediaApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: QuestionDetail;
};
export type RemoveQuestionMediaApiArg = {
  id: string;
  /** audio hoặc image */
  kind: 'audio' | 'image';
};
export type UploadQuestionGroupMediaApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: QuestionGroupDetail;
};
export type UploadQuestionGroupMediaApiArg = {
  id: string;
  /** audio hoặc image */
  kind: 'audio' | 'image';
  body: {
    /** audio: MP3 tối đa 20 MB · image: JPG, PNG, WebP tối đa 5 MB */
    file: Blob;
  };
};
export type RemoveQuestionGroupMediaApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: QuestionGroupDetail;
};
export type RemoveQuestionGroupMediaApiArg = {
  id: string;
  /** audio hoặc image */
  kind: 'audio' | 'image';
};
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
export type GetAutoFillCoverageApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AutoFillCoverage;
};
export type GetAutoFillCoverageApiArg = string;
export type PreviewAutoFillApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AutoFillPreview;
};
export type PreviewAutoFillApiArg = {
  id: string;
  autoFillPreviewDto: AutoFillPreviewDto;
};
export type ApplyAutoFillApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamDetail;
};
export type ApplyAutoFillApiArg = {
  id: string;
  autoFillApplyDto: AutoFillApplyDto;
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
export type ListPublishedExamsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamCatalogItem[];
  meta: PaginationMetaDto;
};
export type ListPublishedExamsApiArg = {
  page?: number;
  limit?: number;
  scoringScale?: ScoringScale;
  /** Đề có Part của kỹ năng này */
  skill?: Skill;
  /** Tìm theo tên đề (không phân biệt hoa thường) */
  q?: string;
};
export type GetPublishedExamApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ExamCatalogDetail;
};
export type GetPublishedExamApiArg = string;
export type StartAttemptApiResponse =
  | /** status 200 Làm tiếp bài đang dở (resumed = true) */ {
      success: true;
      status: number;
      data: AttemptDetail;
    }
  | /** status 201 Tạo lượt mới */ {
      success: true;
      status: number;
      data: AttemptDetail;
    };
export type StartAttemptApiArg = {
  id: string;
  startAttemptDto: StartAttemptDto;
};
export type ListInProgressAttemptsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: InProgressAttempt[];
};
export type ListInProgressAttemptsApiArg = void;
export type ListAttemptHistoryApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AttemptHistoryItem[];
  meta: PaginationMetaDto;
};
export type ListAttemptHistoryApiArg = {
  page?: number;
  limit?: number;
  /** Chỉ bài của đề này */
  examId?: string;
  mode?: AttemptMode;
  sort?: 'submittedAt:desc' | 'submittedAt:asc';
};
export type GetAttemptReviewApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AttemptReview;
};
export type GetAttemptReviewApiArg = string;
export type GetAttemptApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AttemptDetail;
};
export type GetAttemptApiArg = string;
export type SaveAnswerApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: SaveAnswerResult;
};
export type SaveAnswerApiArg = {
  id: string;
  examQuestionId: string;
  saveAnswerDto: SaveAnswerDto;
};
export type SaveRecordingApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: SaveRecordingResult;
};
export type SaveRecordingApiArg = {
  id: string;
  examQuestionId: string;
  body: {
    /** Bài nói đã ghi âm */
    file: Blob;
  };
};
export type SyncAnswersApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: SyncAnswersResult;
};
export type SyncAnswersApiArg = {
  id: string;
  syncAnswersDto: SyncAnswersDto;
};
export type SubmitAttemptApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AttemptResult;
};
export type SubmitAttemptApiArg = string;
export type CancelAttemptApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type CancelAttemptApiArg = string;
export type RegradeAssessmentApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: QuestionAssessment;
};
export type RegradeAssessmentApiArg = {
  id: string;
  assessmentId: string;
};
export type RequestAssessmentReviewApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AssessmentReviewRequest;
};
export type RequestAssessmentReviewApiArg = {
  id: string;
  assessmentId: string;
  requestReviewDto: RequestReviewDto;
};
export type ListTeacherAssessmentsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: TeacherReviewItem[];
  meta: PaginationMetaDto;
};
export type ListTeacherAssessmentsApiArg = {
  page?: number;
  limit?: number;
  /** WAITING: chờ chấm (AI lỗi, học viên yêu cầu) · REVIEWED: giáo viên đã chấm */
  tab?: 'WAITING' | 'REVIEWED';
  /** ALL: mọi đề · MINE: chỉ đề do tôi soạn */
  scope?: 'ALL' | 'MINE';
  skill?: Skill;
};
export type GetTeacherAssessmentApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: TeacherReviewDetail;
};
export type GetTeacherAssessmentApiArg = string;
export type GradeTeacherAssessmentApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: TeacherReviewDetail;
};
export type GradeTeacherAssessmentApiArg = {
  answerId: string;
  gradeAnswerDto: GradeAnswerDto;
};
export type ListNotificationsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: NotificationItem[];
  meta: PaginationMetaDto;
};
export type ListNotificationsApiArg = {
  page?: number;
  limit?: number;
};
export type GetUnreadNotificationCountApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: UnreadNotificationCount;
};
export type GetUnreadNotificationCountApiArg = void;
export type MarkAllNotificationsReadApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type MarkAllNotificationsReadApiArg = void;
export type MarkNotificationReadApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: object | null;
};
export type MarkNotificationReadApiArg = string;
export type GetScoreTrendApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ScoreTrend;
};
export type GetScoreTrendApiArg =
  | /** 30d, 90d, 1y: 30 ngày, 90 ngày, 1 năm gần nhất · all: toàn bộ */ (
      '30d' | '90d' | '1y' | 'all'
    )
  | undefined;
export type GetProgressSkillsApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: ProgressSkills;
};
export type GetProgressSkillsApiArg = ('30d' | '90d' | '1y' | 'all') | undefined;
export type GetAiExplanationApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AiExplanation;
};
export type GetAiExplanationApiArg = {
  id: string;
  examQuestionId: string;
};
export type GetMyAiQuotasApiResponse = /** status 200 Thành công */ {
  success: true;
  status: number;
  data: AiQuotas;
};
export type GetMyAiQuotasApiArg = void;
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
  | 'MEDIA_INVALID_FILE'
  | 'SUBJECT_NOT_FOUND'
  | 'QUESTION_NOT_FOUND'
  | 'QUESTION_GROUP_NOT_FOUND'
  | 'QUESTION_GROUP_NOT_EMPTY'
  | 'QUESTION_GROUP_ORDER_TAKEN'
  | 'QUESTION_CODE_TAKEN'
  | 'QUESTION_IN_PUBLISHED_EXAM'
  | 'QUESTION_IN_ACTIVE_ATTEMPT'
  | 'QUESTION_OPTION_IN_USE'
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
  | 'EXAM_NOT_PUBLISHABLE'
  | 'ATTEMPT_NOT_FOUND'
  | 'ATTEMPT_IN_PROGRESS'
  | 'ATTEMPT_LIMIT_REACHED'
  | 'ATTEMPT_PART_PRACTICE_DISABLED'
  | 'ATTEMPT_NOT_IN_PROGRESS'
  | 'ATTEMPT_EXPIRED'
  | 'ATTEMPT_QUESTION_NOT_FOUND'
  | 'ATTEMPT_NOT_SUBMITTED'
  | 'VOICE_CONSENT_REQUIRED'
  | 'ATTEMPT_RECORDING_INVALID'
  | 'ATTEMPT_RECORDING_TOO_LONG'
  | 'ASSESSMENT_NOT_FOUND'
  | 'ASSESSMENT_NOT_FAILED'
  | 'ASSESSMENT_REGRADE_LIMIT'
  | 'ASSESSMENT_RECORDING_MISSING'
  | 'ASSESSMENT_TEACHER_REVIEWED'
  | 'ASSESSMENT_NOT_GRADED'
  | 'ASSESSMENT_REVIEW_ALREADY_REQUESTED'
  | 'ASSESSMENT_SCORE_OUT_OF_RANGE'
  | 'AI_QUOTA_EXCEEDED'
  | 'AI_UNAVAILABLE'
  | 'AI_EXPLANATION_NOT_SUPPORTED'
  | 'NOTIFICATION_NOT_FOUND';
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
  /** Lúc đồng ý cho ghi âm và xử lý giọng nói (D19); null: chưa làm được Speaking */
  voiceConsentAt: string | null;
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
export type ContentLockReason = 'PUBLISHED_EXAM' | 'ACTIVE_ATTEMPT';
export type LockedExamRef = {
  id: string;
  title: string;
};
export type ContentLock = {
  /** PUBLISHED_EXAM: nằm trong đề đang xuất bản · ACTIVE_ATTEMPT: đề đã gỡ nhưng còn bài làm cả đề đang dở */
  reason: ContentLockReason;
  /** Các đề đang khóa câu */
  exams: LockedExamRef[];
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
  /** Khác null: không sửa được nội dung, phương án, đáp án đúng, loại câu, Part, nhóm, thời gian Speaking, âm thanh, hình ảnh; vẫn sửa được giải thích, bài mẫu, chủ đề, độ khó, trạng thái */
  lock: ContentLock | null;
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
  /** Khác null: không sửa được đoạn văn, âm thanh, hình ảnh của nhóm; vẫn sửa được lời thoại, chủ đề, trạng thái */
  lock: ContentLock | null;
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
  /** Đảo thứ tự câu trong từng Part theo từng lượt làm bài */
  shuffleQuestions: boolean;
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
  /** Đảo thứ tự câu trong từng Part theo từng lượt làm bài */
  shuffleQuestions: boolean;
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
  /** Đảo thứ tự câu trong từng Part theo từng lượt làm bài (nhóm câu đi cùng nhau, Part giữ thứ tự). Đề đang xuất bản thì không đổi được */
  shuffleQuestions?: boolean;
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
  /** Đảo thứ tự câu trong từng Part theo từng lượt làm bài (nhóm câu đi cùng nhau, Part giữ thứ tự). Đề đang xuất bản thì không đổi được */
  shuffleQuestions?: boolean;
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
export type AutoFillUnit = 'QUESTION' | 'GROUP';
export type DifficultyCount = {
  easy: number;
  medium: number;
  hard: number;
};
export type TopicCount = {
  topicId: string;
  name: string;
  count: number;
};
export type SizeCount = {
  /** Số câu mỗi nhóm */
  size: number;
  /** Số nhóm */
  count: number;
};
export type AutoFillCoveragePart = {
  skill: Skill;
  part: number;
  name: string;
  unit: AutoFillUnit;
  /** Reading Part 7 đề TOEIC: rút đúng 54 câu theo cấu trúc ETS (4×2, 3×3, 3×4, 5×5 câu); chủ đề tính theo nhóm */
  reading7Profile: boolean;
  /** Số lượng chuẩn của đề TOEIC (theo đơn vị); null với đề PERCENT */
  required: number | null;
  /** Số câu chuẩn; null với đề PERCENT */
  requiredQuestions: number | null;
  /** Số câu hoặc nhóm rút được (ACTIVE, đúng định dạng) */
  available: number;
  /** Trong đó chưa dùng ở đề khác */
  unused: number;
  difficulty: DifficultyCount;
  /** Mọi chủ đề của Part (kể cả chủ đề chưa có câu) */
  topics: TopicCount[];
  /** Part nhóm: số nhóm theo số câu mỗi nhóm */
  sizes: SizeCount[];
  /** Số nhóm có biểu đồ (Listening 3, 4) */
  graphics: number;
  /** Số câu trong đề này hiện có ở Part (0: Part trống) */
  current: number;
};
export type AutoFillCoverage = {
  scoringScale: ScoringScale;
  parts: AutoFillCoveragePart[];
};
export type AutoFillScope = 'EMPTY_PARTS' | 'ALL';
export type AutoFillPreviewItem = {
  questionId: string | null;
  groupId: string | null;
  /** Đoạn đầu nội dung câu hoặc đoạn văn */
  label: string;
  difficulty: Difficulty;
  topicName: string;
  /** Số đề khác đang dùng */
  usedCount: number;
  /** Số câu (câu đơn là 1) */
  questionCount: number;
  hasGraphic: boolean;
};
export type AutoFillPreviewPart = {
  skill: Skill;
  part: number;
  name: string;
  unit: AutoFillUnit;
  /** Reading Part 7 đề TOEIC: rút đúng 54 câu theo cấu trúc ETS (4×2, 3×3, 3×4, 5×5 câu); chủ đề tính theo nhóm */
  reading7Profile: boolean;
  /** Part đã có câu và phạm vi "chỉ Part trống": giữ nguyên, không rút */
  kept: boolean;
  /** Số lượng cần (Reading Part 7 đề TOEIC: số câu) */
  required: number;
  selected: number;
  shortage: number;
  /** Số câu đã chọn */
  questionCount: number;
  /** Các ràng buộc đã nới */
  relaxed: string[];
  difficulty: DifficultyCount;
  topics: TopicCount[];
  items: AutoFillPreviewItem[];
};
export type AutoFillPreview = {
  /** Gửi lại cùng seed và ma trận để ra cùng kết quả */
  seed: string;
  scope: AutoFillScope;
  /** Tổng số câu sẽ có trong đề sau khi áp dụng */
  totalQuestions: number;
  parts: AutoFillPreviewPart[];
};
export type DifficultyRatioDto = {
  easy: number;
  medium: number;
  hard: number;
};
export type TopicMinDto = {
  topicId: string;
  /** Số tối thiểu: câu với Part câu đơn, nhóm với Part nhóm */
  min: number;
};
export type AutoFillPartDto = {
  skill: Skill;
  part: number;
  /** Chỉ đề PERCENT: số câu (Part câu đơn) hoặc số nhóm (Part nhóm). Đề TOEIC theo chuẩn */
  count?: number;
  /** Bỏ trống: 30/50/20 */
  difficulty?: DifficultyRatioDto;
  topics?: TopicMinDto[];
};
export type AutoFillPreviewDto = {
  scope: AutoFillScope;
  /** Bỏ trống: server tự tạo; gửi lại để ra cùng kết quả */
  seed?: string;
  /** Ưu tiên câu chưa dùng ở đề khác */
  preferUnused: boolean;
  /** Đề TOEIC: cấu hình riêng từng Part (Part không gửi dùng mặc định). Đề PERCENT: các Part cần rút */
  parts: AutoFillPartDto[];
};
export type AutoFillApplyPartDto = {
  skill: Skill;
  part: number;
  questionIds?: string[];
  groupIds?: string[];
};
export type AutoFillApplyDto = {
  scope: AutoFillScope;
  /** updatedAt của đề lúc xem trước */
  updatedAt: string;
  /** Kết quả của bản xem trước, đúng thứ tự câu trong từng Part */
  parts: AutoFillApplyPartDto[];
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
export type AttemptMode = 'FULL' | 'PART';
export type MyInProgressRef = {
  id: string;
  mode: AttemptMode;
  sectionId: string | null;
  /** Số giây còn lại do server tính từ expiresAt; null khi không đếm giờ (luyện theo Part) */
  remainingSeconds: number | null;
};
export type ExamCatalogItem = {
  id: string;
  title: string;
  description: string | null;
  kind: ExamKind;
  scoringScale: ScoringScale;
  /** Thời gian làm cả đề (phút) */
  durationMinutes: number;
  /** null: không giới hạn */
  maxAttempts: number | null;
  allowPartPractice: boolean;
  /** Mỗi lượt làm bài có thứ tự câu riêng */
  shuffleQuestions: boolean;
  publishedAt: string | null;
  /** Theo thứ tự trong đề */
  skills: Skill[];
  sectionCount: number;
  questionCount: number;
  /** Số lượt làm cả đề đã dùng (không tính lượt đã hủy và lượt luyện theo Part) */
  attemptsUsed: number;
  /** null: không giới hạn */
  attemptsLeft: number | null;
  inProgress: MyInProgressRef | null;
};
export type ExamCatalogSection = {
  /** Gửi khi bắt đầu luyện riêng Part này */
  id: string;
  skill: Skill;
  part: number;
  name: string;
  questionCount: number;
};
export type ExamCatalogDetail = {
  id: string;
  title: string;
  description: string | null;
  kind: ExamKind;
  scoringScale: ScoringScale;
  /** Thời gian làm cả đề (phút) */
  durationMinutes: number;
  /** null: không giới hạn */
  maxAttempts: number | null;
  allowPartPractice: boolean;
  /** Mỗi lượt làm bài có thứ tự câu riêng */
  shuffleQuestions: boolean;
  publishedAt: string | null;
  /** Theo thứ tự trong đề */
  skills: Skill[];
  sectionCount: number;
  questionCount: number;
  /** Số lượt làm cả đề đã dùng (không tính lượt đã hủy và lượt luyện theo Part) */
  attemptsUsed: number;
  /** null: không giới hạn */
  attemptsLeft: number | null;
  inProgress: MyInProgressRef | null;
  sections: ExamCatalogSection[];
};
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'CANCELLED';
export type AttemptExamRef = {
  id: string;
  title: string;
  scoringScale: ScoringScale;
  durationMinutes: number;
};
export type AttemptSectionRef = {
  id: string;
  skill: Skill;
  part: number;
  name: string;
};
export type SkillScoreItem = {
  skill: Skill;
  correct: number;
  wrong: number;
  /** Câu trắc nghiệm bỏ trống */
  skipped: number;
  /** Số câu trắc nghiệm của kỹ năng */
  total: number;
  /** Số câu Speaking/Writing (chấm bằng AI) */
  openCount: number;
  /** Tổng điểm tối đa các câu Speaking/Writing */
  openMax: number;
  /** Tổng điểm các câu Speaking/Writing (bỏ trống 0); null khi còn câu chờ chấm */
  openRaw: number | null;
  /** Số câu Speaking/Writing chưa có điểm (chờ AI chấm hoặc chấm lỗi) */
  openPending: number;
  /** TOEIC LR: 5–495 · TOEIC SW: 0–200 · %: 0–100 · null khi kỹ năng còn câu chờ AI chấm */
  scaled: number | null;
};
export type GradingProgress = {
  /** Số câu cần AI chấm (câu bỏ trống không tính) */
  total: number;
  done: number;
  /** Đang chờ chấm (kể cả chờ lượt AI ngày mới) */
  pending: number;
  /** Chấm lỗi, học viên có thể bấm "Chấm lại" */
  failed: number;
  /** AI tạm hết lượt hôm nay: các câu còn lại chấm tiếp lúc này */
  waitingUntil: string | null;
};
export type AttemptResult = {
  attemptId: string;
  /** GRADED: đã có điểm · SUBMITTED: còn câu Speaking/Writing chờ AI chấm */
  status: AttemptStatus;
  submittedAt: string;
  /** TOEIC_990: làm cả đề TOEIC LR · TOEIC_SW: làm cả đề Speaking/Writing (0–200 mỗi kỹ năng) · PERCENT: đề luyện tập và mọi lượt luyện theo Part */
  scoring: 'TOEIC_990' | 'TOEIC_SW' | 'PERCENT';
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  /** Số câu trắc nghiệm đúng */
  rawScore: number;
  /** Điểm theo thang (TOEIC 10–990, TOEIC SW 0–400 hoặc %); null khi còn câu chờ AI chấm */
  scaledScore: number | null;
  /** Số câu Speaking/Writing chưa có điểm */
  pendingOpenCount: number;
  skillScores: SkillScoreItem[];
  /** Tiến độ AI chấm Speaking/Writing; null với đề chỉ có trắc nghiệm và ở lịch sử */
  grading: GradingProgress | null;
};
export type AttemptAnswerItem = {
  examQuestionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isFlagged: boolean;
  answeredAt: string;
  /** Câu Speaking đã có bài nói tải lên */
  hasRecording: boolean;
};
export type AttemptDetail = {
  id: string;
  mode: AttemptMode;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string | null;
  submittedAt: string | null;
  /** Số giây còn lại do server tính từ expiresAt; null khi không đếm giờ (luyện theo Part) */
  remainingSeconds: number | null;
  /** Giờ server, để FE bù lệch đồng hồ */
  serverTime: string;
  exam: AttemptExamRef;
  /** Part đang luyện (mode PART) */
  section: AttemptSectionRef | null;
  /** Có khi bài đã nộp */
  result: AttemptResult | null;
  /** true: trả lại bài đang làm dở thay vì tạo lượt mới */
  resumed: boolean;
  /** Không có isCorrect, sampleAnswer, explanation, transcript. Luyện theo Part chỉ có Part đó */
  paper: ExamPaper;
  answers: AttemptAnswerItem[];
};
export type StartAttemptDto = {
  /** FULL: làm cả đề, đếm giờ · PART: luyện riêng một Part, không đếm giờ */
  mode: AttemptMode;
  /** Bắt buộc khi mode = PART */
  sectionId?: string;
};
export type InProgressAttempt = {
  id: string;
  mode: AttemptMode;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string | null;
  submittedAt: string | null;
  /** Số giây còn lại do server tính từ expiresAt; null khi không đếm giờ (luyện theo Part) */
  remainingSeconds: number | null;
  /** Giờ server, để FE bù lệch đồng hồ */
  serverTime: string;
  exam: AttemptExamRef;
  /** Part đang luyện (mode PART) */
  section: AttemptSectionRef | null;
  /** Số câu đã chọn đáp án hoặc đã viết */
  answeredCount: number;
  totalQuestions: number;
};
export type AttemptHistoryItem = {
  id: string;
  mode: AttemptMode;
  startedAt: string;
  submittedAt: string;
  /** Thời gian làm bài (giây), từ lúc bắt đầu đến khi nộp */
  durationSeconds: number;
  /** true: hệ thống tự nộp khi hết giờ */
  autoSubmitted: boolean;
  exam: AttemptExamRef;
  /** Part đã luyện (mode PART) */
  section: AttemptSectionRef | null;
  result: AttemptResult;
};
export type ReviewCounts = {
  correct: number;
  wrong: number;
  skipped: number;
  /** Câu Speaking/Writing chờ AI chấm */
  pending: number;
  /** Câu Speaking/Writing đã có điểm AI */
  scored: number;
  /** Câu Speaking/Writing chấm lỗi */
  failed: number;
};
export type ReviewGroup = {
  id: string;
  /** Đoạn văn, bảng thông tin */
  passage: string | null;
  audioKey: string | null;
  imageKey: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  audioUrl: string | null;
  /** URL có chữ ký để phát trong <audio>/<img>, còn hạn ít nhất 4 giờ; null khi chưa có tệp */
  imageUrl: string | null;
  /** Lời thoại Listening (chỉ hiện ở màn xem lại) */
  transcript: string | null;
};
export type ReviewOption = {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
};
export type ReviewOutcome = 'CORRECT' | 'WRONG' | 'SKIPPED' | 'PENDING' | 'SCORED' | 'FAILED';
export type Grader = 'AI' | 'TEACHER';
export type AssessmentStatus = 'PENDING' | 'DONE' | 'FAILED';
export type AssessmentCriterion = {
  /** Writing: grammar · vocabulary · coherence · task; Speaking: pronunciation · intonation · fluency · grammar · vocabulary · task */
  key: string;
  label: string;
  score: number;
};
export type AssessmentSubScore = {
  /** pronunciation · intonation */
  key: string;
  label: string;
  score: number;
  max: number;
};
export type AssessmentCorrection = {
  original: string;
  corrected: string;
  explanation: string;
};
export type QuestionAssessment = {
  id: string;
  /** AI: điểm ước lượng do AI chấm · TEACHER: giáo viên đã chấm lại (điểm chính thức) */
  grader: Grader;
  /** Tên giáo viên chấm (grader = TEACHER) */
  reviewerName: string | null;
  status: AssessmentStatus;
  /** Điểm câu theo thang của dạng câu */
  score: number | null;
  /** Writing P1: 3 · P2: 4 · P3: 5; Speaking P1: 6 · P2–P4: 3 · P5: 5 */
  maxScore: number;
  /** Rỗng khi chưa chấm xong */
  criteria: AssessmentCriterion[];
  /** Nhận xét tiếng Việt */
  feedback: string | null;
  /** Speaking Part 1: phát âm + ngữ điệu; câu khác rỗng */
  subScores: AssessmentSubScore[];
  /** Speaking: lời nói AI nhận dạng được */
  transcript: string | null;
  /** Writing; Speaking rỗng */
  corrections: AssessmentCorrection[];
  /** Writing: bài viết lại tốt hơn; Speaking: câu trả lời gợi ý */
  improvedAnswer: string | null;
  /** Lý do chấm lỗi (FAILED), không chứa nội dung bài làm */
  errorMessage: string | null;
  /** AI tạm hết lượt hôm nay: dự kiến chấm tiếp lúc này */
  nextRunAt: string | null;
  /** Số lần học viên còn được bấm "Chấm lại" */
  regradesLeft: number;
  gradedAt: string | null;
  /** Khóa lạc quan khi giáo viên sửa lại bản chấm của mình */
  updatedAt: string;
};
export type AssessmentReviewRequest = {
  requestedAt: string;
  note: string;
};
export type ReviewQuestion = {
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
  /** Có isCorrect; rỗng với câu trả lời mở */
  options: ReviewOption[];
  outcome: ReviewOutcome;
  /** Phương án đã chọn */
  selectedOptionId: string | null;
  /** Bài viết (Writing) */
  textAnswer: string | null;
  /** URL ký để nghe lại bài nói (Speaking); null khi chưa ghi âm hoặc bài nói đã tự xóa (recordingDeletedAt) */
  recordingUrl: string | null;
  /** Speaking: thời điểm bài nói bị xóa vì quá hạn lưu (mặc định 30 ngày sau khi nộp); điểm, transcript vẫn giữ */
  recordingDeletedAt: string | null;
  isFlagged: boolean;
  /** Giải thích đáp án (trắc nghiệm) hoặc gợi ý cách làm (câu trả lời mở) */
  explanation: string | null;
  /** Câu trả lời mẫu (Speaking/Writing) */
  sampleAnswer: string | null;
  /** Kết quả chấm câu Speaking/Writing (bản giáo viên nếu đã chấm lại, không thì bản AI); null với câu trắc nghiệm, câu bỏ trống */
  assessment: QuestionAssessment | null;
  /** Bản AI chấm để đối chiếu khi giáo viên đã chấm lại (assessment là bản giáo viên) */
  aiAssessment: QuestionAssessment | null;
  /** Học viên đã yêu cầu giáo viên chấm lại câu này */
  reviewRequest: AssessmentReviewRequest | null;
};
export type ReviewBlock = {
  group: ReviewGroup | null;
  questions: ReviewQuestion[];
};
export type ReviewSection = {
  id: string;
  skill: Skill;
  part: number;
  name: string;
  counts: ReviewCounts;
  blocks: ReviewBlock[];
};
export type AttemptReview = {
  id: string;
  mode: AttemptMode;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string | null;
  submittedAt: string | null;
  /** Số giây còn lại do server tính từ expiresAt; null khi không đếm giờ (luyện theo Part) */
  remainingSeconds: number | null;
  /** Giờ server, để FE bù lệch đồng hồ */
  serverTime: string;
  exam: AttemptExamRef;
  /** Part đang luyện (mode PART) */
  section: AttemptSectionRef | null;
  result: AttemptResult;
  totalQuestions: number;
  /** Luyện theo Part chỉ có Part đó */
  sections: ReviewSection[];
};
export type SaveAnswerResult = {
  answer: AttemptAnswerItem;
  /** false: server đã có bản trả lời mới hơn (answeredAt lớn hơn) nên giữ bản đó */
  applied: boolean;
  /** Số giây còn lại do server tính từ expiresAt; null khi không đếm giờ (luyện theo Part) */
  remainingSeconds: number | null;
};
export type SaveAnswerDto = {
  selectedOptionId?: string | null;
  /** Câu Writing */
  textAnswer?: string | null;
  /** Đánh dấu để xem lại */
  isFlagged?: boolean;
  /** Lúc học viên trả lời (mặc định: lúc server nhận); bản mới hơn được giữ */
  answeredAt?: string;
};
export type SaveRecordingResult = {
  examQuestionId: string;
  /** Độ dài bài nói sau khi chuẩn hóa (giây) */
  seconds: number;
  /** Số giây còn lại; null khi không đếm giờ */
  remainingSeconds: number | null;
};
export type SyncAnswersResult = {
  /** Số câu trả lời đã ghi */
  applied: number;
  /** Bỏ qua: server có bản mới hơn, hoặc trả lời sau khi đã hết giờ */
  ignored: number;
  /** Số giây còn lại do server tính từ expiresAt; null khi không đếm giờ (luyện theo Part) */
  remainingSeconds: number | null;
};
export type SyncAnswerItemDto = {
  selectedOptionId?: string | null;
  /** Câu Writing */
  textAnswer?: string | null;
  /** Đánh dấu để xem lại */
  isFlagged?: boolean;
  examQuestionId: string;
  /** Bắt buộc khi đồng bộ lô */
  answeredAt: string;
};
export type SyncAnswersDto = {
  answers: SyncAnswerItemDto[];
};
export type RequestReviewDto = {
  note: string;
};
export type ReviewReason = 'AI_FAILED' | 'STUDENT_REQUEST';
export type TeacherReviewItem = {
  /** Id câu trả lời (attempt_answers) */
  answerId: string;
  examTitle: string;
  /** Đề do chính giáo viên đang xem soạn */
  isMyExam: boolean;
  skill: Skill;
  part: number;
  /** Số thứ tự câu trong Part (theo đề gốc) */
  questionNumber: number;
  /** Mã ẩn danh của học viên (không lộ tên, email) */
  studentCode: string;
  submittedAt: string;
  /** AI_FAILED: AI chấm lỗi · STUDENT_REQUEST: học viên yêu cầu chấm lại */
  reasons: ReviewReason[];
  /** Lý do học viên ghi khi yêu cầu */
  requestNote: string | null;
  aiStatus: AssessmentStatus | null;
  aiScore: number | null;
  maxScore: number;
  /** Điểm giáo viên (đã chấm lại) */
  teacherScore: number | null;
  reviewerName: string | null;
  reviewedAt: string | null;
};
export type ReviewQuestionContent = {
  type: QuestionType;
  content: string;
  /** Ảnh của câu (Writing P1, Speaking P2) */
  imageUrl: string | null;
  /** Đoạn văn, bảng thông tin của nhóm */
  passage: string | null;
  /** Ảnh của nhóm (Speaking P4) */
  groupImageUrl: string | null;
  sampleAnswer: string | null;
  responseSeconds: number | null;
};
export type ReviewStudentAnswer = {
  /** Bài viết (Writing) */
  textAnswer: string | null;
  /** URL ký để nghe bài nói; null khi đã tự xóa sau thời hạn lưu */
  recordingUrl: string | null;
  recordingDeletedAt: string | null;
};
export type ReviewCriterionOption = {
  key: string;
  label: string;
};
export type ReviewSubScoreOption = {
  key: string;
  label: string;
  max: number;
};
export type TeacherReviewDetail = {
  /** Id câu trả lời (attempt_answers) */
  answerId: string;
  examTitle: string;
  /** Đề do chính giáo viên đang xem soạn */
  isMyExam: boolean;
  skill: Skill;
  part: number;
  /** Số thứ tự câu trong Part (theo đề gốc) */
  questionNumber: number;
  /** Mã ẩn danh của học viên (không lộ tên, email) */
  studentCode: string;
  submittedAt: string;
  /** AI_FAILED: AI chấm lỗi · STUDENT_REQUEST: học viên yêu cầu chấm lại */
  reasons: ReviewReason[];
  /** Lý do học viên ghi khi yêu cầu */
  requestNote: string | null;
  aiStatus: AssessmentStatus | null;
  aiScore: number | null;
  maxScore: number;
  /** Điểm giáo viên (đã chấm lại) */
  teacherScore: number | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  question: ReviewQuestionContent;
  answer: ReviewStudentAnswer;
  reviewRequest: AssessmentReviewRequest | null;
  /** Bản AI chấm */
  aiAssessment: QuestionAssessment | null;
  /** Bản giáo viên đã chấm (sửa lại thì gửi kèm updatedAt của bản này) */
  teacherAssessment: QuestionAssessment | null;
  /** Tiêu chí 0–5 của kỹ năng */
  criteriaOptions: ReviewCriterionOption[];
  /** Speaking Part 1: chấm 2 điểm con thay cho điểm câu; câu khác rỗng */
  subScoreOptions: ReviewSubScoreOption[];
};
export type ReadAloudSubScoresDto = {
  pronunciation: number;
  intonation: number;
};
export type GradeAnswerDto = {
  /** Điểm câu theo thang của dạng câu; Speaking Part 1 gửi subScores thay cho trường này */
  score?: number;
  subScores?: ReadAloudSubScoresDto;
  /** Điểm tiêu chí 0–5 (không bắt buộc), khóa theo criteriaOptions của câu */
  criteria?: {
    [key: string]: number;
  };
  /** Nhận xét cho học viên */
  feedback: string;
  /** Bắt buộc khi sửa bản đã chấm: updatedAt của teacherAssessment lần đọc gần nhất */
  updatedAt?: string;
};
export type NotificationType =
  'ATTEMPT_GRADED' | 'ATTEMPT_AUTO_SUBMITTED' | 'GRADING_FAILED' | 'TEACHER_REVIEWED';
export type NotificationData = {
  /** Bài làm liên quan (trang kết quả, xem lại) */
  attemptId?: string;
};
export type NotificationItem = {
  id: string;
  /** ATTEMPT_GRADED: AI chấm xong, bài đã có điểm · ATTEMPT_AUTO_SUBMITTED: hết giờ, hệ thống tự nộp · GRADING_FAILED: có câu Speaking/Writing chấm lỗi, cần bấm "Chấm lại" */
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData | null;
  /** null: chưa đọc */
  readAt: string | null;
  createdAt: string;
};
export type UnreadNotificationCount = {
  count: number;
};
export type ScoreTrendPoint = {
  attemptId: string;
  submittedAt: string;
  mode: AttemptMode;
  exam: AttemptExamRef;
  /** Part đã luyện (mode PART) */
  section: AttemptSectionRef | null;
  /** TOEIC_990: làm cả đề TOEIC LR · PERCENT: đề luyện tập, lượt luyện theo Part */
  scoring: 'TOEIC_990' | 'TOEIC_SW' | 'PERCENT';
  /** Điểm theo thang (TOEIC 10–990 hoặc %); null khi còn câu Speaking/Writing chờ AI chấm */
  scaledScore: number | null;
  /** % câu trắc nghiệm đúng, có cả khi bài còn câu chờ chấm; null khi bài không có câu trắc nghiệm */
  choicePercent: number | null;
  correctCount: number;
  /** Số câu trắc nghiệm của bài */
  choiceTotal: number;
  /** Điểm từng kỹ năng (TOEIC LR: 5–495) */
  skillScores: SkillScoreItem[];
};
export type ScoreTrend = {
  range: '30d' | '90d' | '1y' | 'all';
  /** null: toàn bộ */
  from: string | null;
  /** Điểm mục tiêu TOEIC của học viên */
  targetScore: number | null;
  /** Bài đã nộp trong khoảng thời gian, cũ nhất trước (tối đa 200 bài gần nhất) */
  points: ScoreTrendPoint[];
};
export type ProgressOverview = {
  /** Số bài đã nộp (cả đề + luyện Part) */
  submittedCount: number;
  fullCount: number;
  partCount: number;
  /** Tổng lượt câu trắc nghiệm */
  choiceTotal: number;
  choiceCorrect: number;
  /** % đúng trên tổng câu trắc nghiệm (câu bỏ trống tính là sai); null khi chưa làm câu nào */
  accuracy: number | null;
  lastSubmittedAt: string | null;
  /** Điểm TOEIC LR cao nhất (chỉ bài làm cả đề TOEIC LR) */
  bestToeicScore: number | null;
  /** Điểm TOEIC LR của bài gần nhất */
  latestToeicScore: number | null;
};
export type SkillProgress = {
  /** Số lượt câu trắc nghiệm (một câu làm ở 2 bài tính 2) */
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** % đúng trên tổng câu trắc nghiệm (câu bỏ trống tính là sai); null khi chưa làm câu nào */
  accuracy: number | null;
  skill: Skill;
};
export type PartProgress = {
  /** Số lượt câu trắc nghiệm (một câu làm ở 2 bài tính 2) */
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** % đúng trên tổng câu trắc nghiệm (câu bỏ trống tính là sai); null khi chưa làm câu nào */
  accuracy: number | null;
  skill: Skill;
  part: number;
  name: string;
};
export type TopicProgress = {
  /** Số lượt câu trắc nghiệm (một câu làm ở 2 bài tính 2) */
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** % đúng trên tổng câu trắc nghiệm (câu bỏ trống tính là sai); null khi chưa làm câu nào */
  accuracy: number | null;
  topicId: string;
  name: string;
  skill: Skill;
  /** Part dùng chủ đề này */
  parts: number[];
};
export type ProgressSkills = {
  range: '30d' | '90d' | '1y' | 'all';
  /** null: toàn bộ */
  from: string | null;
  overview: ProgressOverview;
  /** Chỉ kỹ năng đã làm câu trắc nghiệm */
  skills: SkillProgress[];
  /** Theo thứ tự Part trong đề (L1…L4, R5…R7) */
  parts: PartProgress[];
  /** Chủ đề cần luyện thêm: đã làm ≥ minTopicQuestions câu và tỉ lệ đúng < weakAccuracy; yếu nhất trước, tối đa 5 */
  weakTopics: TopicProgress[];
  minTopicQuestions: number;
  weakAccuracy: number;
};
export type ExplanationOption = {
  label: string;
  /** Vì sao phương án này đúng hoặc sai */
  reason: string;
};
export type ExplanationKeyPoint = {
  /** Từ, cụm từ hoặc điểm ngữ pháp */
  term: string;
  /** Nghĩa và cách dùng */
  note: string;
};
export type AiQuota = {
  /** Số lượt mỗi ngày */
  limit: number;
  /** Đã dùng hôm nay (lấy từ cache không tính) */
  used: number;
  remaining: number;
  /** Lúc có lượt mới: 0h giờ Thái Bình Dương (14h hoặc 15h giờ Việt Nam) */
  resetAt: string;
};
export type AiExplanation = {
  examQuestionId: string;
  /** Vì sao đáp án đúng là đúng */
  summary: string;
  /** Mỗi phương án một mục */
  options: ExplanationOption[];
  /** Từ vựng, ngữ pháp cần nhớ (≤ 5) */
  keyPoints: ExplanationKeyPoint[];
  /** Mẹo làm dạng câu này */
  tip: string;
  /** "fake" khi chưa có API key */
  model: string;
  /** Lúc AI sinh lời giải thích */
  generatedAt: string;
  /** true: lấy từ cache, không tính lượt */
  cached: boolean;
  quota: AiQuota;
};
export type AiQuotas = {
  /** Giải thích đáp án bằng AI */
  explanation: AiQuota;
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
  useGiveVoiceConsentMutation,
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
  useUploadQuestionMediaMutation,
  useRemoveQuestionMediaMutation,
  useUploadQuestionGroupMediaMutation,
  useRemoveQuestionGroupMediaMutation,
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
  useGetAutoFillCoverageQuery,
  usePreviewAutoFillMutation,
  useApplyAutoFillMutation,
  useValidateExamQuery,
  usePreviewExamQuery,
  usePublishExamMutation,
  useUnpublishExamMutation,
  useListPublishedExamsQuery,
  useGetPublishedExamQuery,
  useStartAttemptMutation,
  useListInProgressAttemptsQuery,
  useListAttemptHistoryQuery,
  useGetAttemptReviewQuery,
  useGetAttemptQuery,
  useSaveAnswerMutation,
  useSaveRecordingMutation,
  useSyncAnswersMutation,
  useSubmitAttemptMutation,
  useCancelAttemptMutation,
  useRegradeAssessmentMutation,
  useRequestAssessmentReviewMutation,
  useListTeacherAssessmentsQuery,
  useGetTeacherAssessmentQuery,
  useGradeTeacherAssessmentMutation,
  useListNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useGetScoreTrendQuery,
  useGetProgressSkillsQuery,
  useGetAiExplanationQuery,
  useGetMyAiQuotasQuery,
} = injectedRtkApi;
