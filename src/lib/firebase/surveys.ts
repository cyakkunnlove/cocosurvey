import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type {
  SurveyField,
  SurveyForm,
  SurveyResponse,
  UserProfile,
} from "@/lib/firebase/types";

const ORG_COLLECTION = "surveyOrganizations";
const USERS_COLLECTION = "surveyUsers";
const FORMS_COLLECTION = "surveyForms";
const RESPONSES_COLLECTION = "surveyResponses";

const toDate = (value: unknown): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "object" && value && "toDate" in value) {
    try {
      const maybe = (value as { toDate: () => Date }).toDate();
      return maybe instanceof Date ? maybe : new Date();
    } catch {
      return new Date();
    }
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
};

const sanitizeFields = (fields: SurveyField[]) =>
  fields.map((field) => {
    if (field.type === "single_select" || field.type === "multi_select") {
      return {
        ...field,
        options: (field.options ?? []).filter((option) => option.trim() !== ""),
      };
    }
    const { options, ...rest } = field;
    return rest;
  });

export async function createOrganization(name: string, ownerUid: string) {
  const orgRef = doc(collection(db, ORG_COLLECTION));
  await setDoc(orgRef, {
    name,
    ownerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return orgRef.id;
}

export async function createUserProfile(profile: {
  uid: string;
  email: string;
  orgId: string;
  orgName: string;
}) {
  const userRef = doc(db, USERS_COLLECTION, profile.uid);
  await setDoc(userRef, {
    email: profile.email,
    orgId: profile.orgId,
    orgName: profile.orgName,
    role: "owner",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    uid,
    email: String(data.email ?? ""),
    orgId: String(data.orgId ?? ""),
    orgName: String(data.orgName ?? ""),
    role: data.role === "admin" ? "admin" : data.role === "member" ? "member" : "owner",
    createdAt: toDate(data.createdAt),
  };
}

export async function createForm(input: {
  orgId: string;
  createdBy: string;
  title: string;
  description: string;
  status: "draft" | "active";
  shareId: string;
  fields: SurveyField[];
}) {
  const formRef = doc(collection(db, FORMS_COLLECTION));
  await setDoc(formRef, {
    ...input,
    fields: sanitizeFields(input.fields),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return formRef.id;
}

export async function updateForm(
  formId: string,
  updates: Partial<Pick<SurveyForm, "title" | "description" | "status" | "fields">>
) {
  const formRef = doc(db, FORMS_COLLECTION, formId);
  await updateDoc(formRef, {
    ...updates,
    ...(updates.fields ? { fields: sanitizeFields(updates.fields) } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function listForms(orgId: string): Promise<SurveyForm[]> {
  const q = query(collection(db, FORMS_COLLECTION), where("orgId", "==", orgId));
  const snap = await getDocs(q);
  const items = snap.docs.map((docSnap) => {
    const data = docSnap.data() as any;
    return {
      id: docSnap.id,
      orgId: String(data.orgId ?? ""),
      title: String(data.title ?? ""),
      description: String(data.description ?? ""),
      status: data.status === "active" ? "active" : "draft",
      shareId: String(data.shareId ?? ""),
      fields: Array.isArray(data.fields) ? data.fields : [],
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      createdBy: String(data.createdBy ?? ""),
    } as SurveyForm;
  });
  return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getFormById(formId: string): Promise<SurveyForm | null> {
  const formRef = doc(db, FORMS_COLLECTION, formId);
  const snap = await getDoc(formRef);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    id: snap.id,
    orgId: String(data.orgId ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    status: data.status === "active" ? "active" : "draft",
    shareId: String(data.shareId ?? ""),
    fields: Array.isArray(data.fields) ? data.fields : [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: String(data.createdBy ?? ""),
  };
}

export async function getFormByShareId(shareId: string): Promise<SurveyForm | null> {
  const q = query(collection(db, FORMS_COLLECTION), where("shareId", "==", shareId));
  const snap = await getDocs(q);
  const docSnap = snap.docs[0];
  if (!docSnap) return null;
  const data = docSnap.data() as any;
  return {
    id: docSnap.id,
    orgId: String(data.orgId ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    status: data.status === "active" ? "active" : "draft",
    shareId: String(data.shareId ?? ""),
    fields: Array.isArray(data.fields) ? data.fields : [],
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: String(data.createdBy ?? ""),
  };
}

export async function createResponse(input: {
  formId: string;
  orgId: string;
  answers: Record<string, unknown>;
}) {
  await addDoc(collection(db, RESPONSES_COLLECTION), {
    ...input,
    submittedAt: serverTimestamp(),
  });
}

export async function listResponses(formId: string): Promise<SurveyResponse[]> {
  const q = query(collection(db, RESPONSES_COLLECTION), where("formId", "==", formId));
  const snap = await getDocs(q);
  const items = snap.docs.map((docSnap) => {
    const data = docSnap.data() as any;
    return {
      id: docSnap.id,
      formId: String(data.formId ?? ""),
      orgId: String(data.orgId ?? ""),
      answers: data.answers ?? {},
      submittedAt: toDate(data.submittedAt),
    } as SurveyResponse;
  });
  return items.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}
