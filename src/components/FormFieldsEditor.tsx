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
      {fields.map((field, index) => {
        const dependencyOptions = fields.filter((item) => item.id !== field.id);
        const visibility = field.visibility;
        const validation = field.validation;

        return (
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

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[var(--muted)]">
                表示条件
              </label>
              <select
                value={visibility?.dependsOnId ? "conditional" : "always"}
                onChange={(event) => {
                  if (event.target.value === "conditional") {
                    const defaultTarget = dependencyOptions[0]?.id ?? "";
                    updateField(field.id, {
                      visibility: defaultTarget
                        ? { dependsOnId: defaultTarget, operator: "equals", value: "" }
                        : undefined,
                    });
                  } else {
                    updateField(field.id, { visibility: undefined });
                  }
                }}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              >
                <option value="always">常に表示</option>
                <option value="conditional" disabled={dependencyOptions.length === 0}>
                  他の回答で表示
                </option>
              </select>
              {dependencyOptions.length === 0 && (
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  先に他の質問を追加してください。
                </p>
              )}
            </div>

            {visibility?.dependsOnId && (
              <div className="grid gap-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <select
                    value={visibility.dependsOnId}
                    onChange={(event) =>
                      updateField(field.id, {
                        visibility: {
                          ...visibility,
                          dependsOnId: event.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  >
                    {dependencyOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label || "（未入力）"}
                      </option>
                    ))}
                  </select>
                  <select
                    value={visibility.operator}
                    onChange={(event) =>
                      updateField(field.id, {
                        visibility: {
                          ...visibility,
                          operator: event.target.value as typeof visibility.operator,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                  >
                    <option value="equals">一致したら表示</option>
                    <option value="not_equals">一致しなければ表示</option>
                    <option value="includes">含む場合に表示</option>
                    <option value="checked">チェックされていたら表示</option>
                  </select>
                </div>
                {visibility.operator !== "checked" && (
                  <input
                    value={visibility.value ?? ""}
                    onChange={(event) =>
                      updateField(field.id, {
                        visibility: { ...visibility, value: event.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    placeholder="条件値（例：初回）"
                  />
                )}
              </div>
            )}
          </div>

          {(field.type === "short_text" || field.type === "long_text") && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-[var(--muted)]">
                  最小文字数
                </label>
                <input
                  type="number"
                  min={0}
                  value={validation?.minLength ?? ""}
                  onChange={(event) =>
                    updateField(field.id, {
                      validation: {
                        ...validation,
                        minLength: event.target.value ? Number(event.target.value) : undefined,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--muted)]">
                  最大文字数
                </label>
                <input
                  type="number"
                  min={0}
                  value={validation?.maxLength ?? ""}
                  onChange={(event) =>
                    updateField(field.id, {
                      validation: {
                        ...validation,
                        maxLength: event.target.value ? Number(event.target.value) : undefined,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {field.type === "date" && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-[var(--muted)]">
                  最小日付
                </label>
                <input
                  type="date"
                  value={validation?.minDate ?? ""}
                  onChange={(event) =>
                    updateField(field.id, {
                      validation: {
                        ...validation,
                        minDate: event.target.value || undefined,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--muted)]">
                  最大日付
                </label>
                <input
                  type="date"
                  value={validation?.maxDate ?? ""}
                  onChange={(event) =>
                    updateField(field.id, {
                      validation: {
                        ...validation,
                        maxDate: event.target.value || undefined,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
          </div>
        );
      })}

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
