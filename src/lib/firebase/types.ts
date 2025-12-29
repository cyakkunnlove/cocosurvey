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
}

export interface SurveyForm {
  id: string;
  orgId: string;
  title: string;
  description: string;
  status: "draft" | "active";
  shareId: string;
  fields: SurveyField[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SurveyResponse {
  id: string;
  formId: string;
  orgId: string;
  answers: Record<string, AnswerValue>;
  submittedAt: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  orgId: string;
  orgName: string;
  role: "owner" | "admin" | "member";
  createdAt: Date;
}
