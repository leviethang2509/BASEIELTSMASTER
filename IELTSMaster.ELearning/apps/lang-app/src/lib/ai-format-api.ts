import type {
  AiFormatInput,
  AiFormatJob,
  AiFormatStarted,
  AiStatus,
} from '@lang/shared';
import { api } from './api';

// Định dạng đề bằng AI (req-5 plan 6.1): chạy nền, client hỏi trạng thái job.

const jobsPath = (slug: string, examId: string) =>
  `/t/${slug}/exams/${examId}/ai-format`;

/** Tenant đã bật AI chưa, server có cấu hình chưa, lượt đã dùng tháng này. */
export const getAiStatus = (slug: string) =>
  api.get<AiStatus>(`/t/${slug}/ai/status`);

export const startAiFormat = (
  slug: string,
  examId: string,
  input: AiFormatInput,
) => api.post<AiFormatStarted>(jobsPath(slug, examId), input);

/** 404 = job không còn (API khởi động lại / quá 15 phút). */
export const getAiFormatJob = (slug: string, examId: string, jobId: string) =>
  api.get<AiFormatJob>(`${jobsPath(slug, examId)}/${jobId}`);

/** Huỷ và chờ job dừng hẳn; trả trạng thái cuối. */
export const cancelAiFormat = (slug: string, examId: string, jobId: string) =>
  api.delete<AiFormatJob>(`${jobsPath(slug, examId)}/${jobId}`);
