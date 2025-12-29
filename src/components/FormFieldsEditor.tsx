"use client";

import { SurveyField, FieldType } from "@/lib/firebase/types";

const fieldTypeLabels: Record<FieldType, string> = {
  short_text: "短文",
  long_text: "長文",
  single_select: "単一選択",
  multi_select: "複数選択",
  date: "日付",
  checkbox: "チェック",
};

interface FormFieldsEditorProps {
  fields: SurveyField[];
  onChange: (next: SurveyField[]) => void;
}

export default function FormFieldsEditor({
  fields,
  onChange,
}: FormFieldsEditorProps) {
  const updateField = (id: string, updates: Partial<SurveyField>) => {
    onChange(fields.map((field) => (field.id === id ? { ...field, ...updates } : field)));
  };

  const addField = (type: FieldType) => {
    const id = crypto.randomUUID();
    const base: SurveyField = {
      id,
      label: "",
      type,
      required: false,
      options: type === "single_select" || type === "multi_select" ? ["選択肢1"] : undefined,
    };
    onChange([...fields, base]);
  };

  const removeField = (id: string) => {
    onChange(fields.filter((field) => field.id !== id));
  };

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[var(--muted)]">
              質問 {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeField(field.id)}
              className="text-xs text-red-500"
            >
              削除
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1.6fr,1fr]">
            <div>
              <label className="text-xs font-semibold text-[var(--muted)]">
                質問文
              </label>
              <input
                value={field.label}
                onChange={(event) => updateField(field.id, { label: event.target.value })}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                placeholder="例：ご来店目的を教えてください"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--muted)]">
                種類
              </label>
              <select
                value={field.type}
                onChange={(event) =>
                  updateField(field.id, {
                    type: event.target.value as FieldType,
                    options:
                      event.target.value === "single_select" ||
                      event.target.value === "multi_select"
                        ? field.options ?? ["選択肢1"]
                        : undefined,
                  })
                }
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              >
                {Object.entries(fieldTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs text-[var(--muted)]">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) => updateField(field.id, { required: event.target.checked })}
            />
            <span>必須にする</span>
          </div>

          {(field.type === "single_select" || field.type === "multi_select") && (
            <div className="mt-3">
              <label className="text-xs font-semibold text-[var(--muted)]">
                選択肢（カンマ区切り）
              </label>
              <input
                value={(field.options ?? []).join(", ")}
                onChange={(event) =>
                  updateField(field.id, {
                    options: event.target.value
                      .split(",")
                      .map((option) => option.trim())
                      .filter(Boolean),
                  })
                }
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                placeholder="例：初回, 2回目, リピート"
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(fieldTypeLabels) as FieldType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addField(type)}
            className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            + {fieldTypeLabels[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
