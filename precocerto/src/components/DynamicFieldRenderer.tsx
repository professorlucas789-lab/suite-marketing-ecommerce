import React from "react";
import { DynamicField } from "../modules/business-types/types";

interface DynamicFieldRendererProps {
  fields: DynamicField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export default function DynamicFieldRenderer({ fields, values, onChange }: DynamicFieldRendererProps) {
  // Evaluates visibleWhen conditional logic
  const isFieldVisible = (field: DynamicField) => {
    if (!field.visibleWhen) return true;
    const { field: targetField, operator, value: targetValue } = field.visibleWhen;
    const currentValue = values[targetField];

    switch (operator) {
      case "equals":
        return currentValue === targetValue;
      case "notEquals":
        return currentValue !== targetValue;
      case "includes":
        return Array.isArray(currentValue) && currentValue.includes(targetValue);
      case "exists":
        return currentValue !== undefined && currentValue !== null && currentValue !== "";
      default:
        return true;
    }
  };

  return (
    <>
      {fields.filter(isFieldVisible).map((field) => {
        const value = values[field.key] !== undefined ? values[field.key] : "";

        return (
          <div key={field.key} className="flex flex-col gap-1.5" id={`field-container-${field.key}`}>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              {field.label}
              {field.required && <span className="text-rose-500">*</span>}
            </label>
            
            {field.type === "textarea" ? (
              <textarea
                id={`field-input-${field.key}`}
                value={value}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-400 text-sm transition-colors min-h-[80px]"
              />
            ) : field.type === "select" ? (
              <select
                id={`field-input-${field.key}`}
                value={value}
                onChange={(e) => onChange(field.key, e.target.value)}
                required={field.required}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-slate-400 text-sm transition-colors"
              >
                <option value="">Selecione...</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <label className="flex items-center gap-2 cursor-pointer py-1.5" id={`field-label-${field.key}`}>
                <input
                  id={`field-input-${field.key}`}
                  type="checkbox"
                  checked={!!value}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                  className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">{field.placeholder || "Sim / Não"}</span>
              </label>
            ) : (
              <input
                id={`field-input-${field.key}`}
                type={field.type}
                value={value}
                onChange={(e) => onChange(field.key, field.type === "number" ? (e.target.value === "" ? "" : parseFloat(e.target.value)) : e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-400 text-sm transition-colors"
              />
            )}

            {field.helpText && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{field.helpText}</p>
            )}
          </div>
        );
      })}
    </>
  );
}
