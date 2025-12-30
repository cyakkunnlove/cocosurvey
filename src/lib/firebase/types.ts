export type FieldType =
  | "short_text"
  | "long_text"
  | "single_select"
  | "multi_select"
  | "date"
  | "checkbox";

export type AnswerValue = string | string[] | boolean | null;

export interface SurveyField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  aiEnabled?: boolean;
  visibility?: {
    dependsOnId: string;
    operator: "equals" | "not_equals" | "includes" | "checked";
    value?: string;
  };
  validation?: {
    minLength?: number;
    maxLength?: number;
    minDate?: string;
    maxDate?: string;
  };
}

export interface SurveyForm {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: "draft" | "active";
  shareId: string;
  fields: SurveyField[];
  aiEnabled?: boolean;
  aiOverallEnabled?: boolean;
  aiMinConfidence?: number;
  notificationEmail?: string;
  webhookUrl?: string;
  slackWebhookUrl?: string;
  googleSheetUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SurveyResponse {
  id: string;
  formId: string;
  orgId: string;
  respondentId: string;
  answers: Record<string, AnswerValue>;
  submittedAt: Date;
  status: "new" | "in_progress" | "done";
  tags: string[];
  memo?: string;
  assigneeUid?: string | null;
  assigneeName?: string | null;
  updatedAt?: Date;
  analysis?: {
    overallScore?: number | null;
    sentimentLabel?: "positive" | "neutral" | "negative" | "needs_review" | null;
    confidence?: number | null;
    keywords?: string[];
    model?: string;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  orgId: string;
  orgName: string;
  role: "owner" | "admin" | "member";
  createdAt: Date;
}
