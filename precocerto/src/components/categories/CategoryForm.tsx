/**
 * CategoryForm Component
 * Formulário para criar/editar categorias
 */

import React, { useState, useEffect } from 'react';
import { CategoryMarginConfig } from '../../types/category';
import { validateCategoryData } from '../../utils/categoryUtils';
import './CategoryForm.css';

interface CategoryFormProps {
  category?: CategoryMarginConfig; // undefined = create mode
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  businessType: string;
  loading?: boolean;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  onSubmit,
  onCancel,
  businessType,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    marginRules: {
      baseMargin: category?.marginRules.baseMargin || 25,
      minMargin: category?.marginRules.minMargin || 10,
      maxMargin: category?.marginRules.maxMargin || 50,
    },
    priceStrategy: category?.priceStrategy || 'percentage',
    regulatoryConstraints: {
      maxMarginPercentage:
        category?.regulatoryConstraints?.maxMarginPercentage || undefined,
      restrictionBody: category?.regulatoryConstraints?.restrictionBody || '',
      notes: category?.regulatoryConstraints?.notes || '',
    },
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const numValue = type === 'number' ? parseFloat(value) : value;

    if (name.startsWith('marginRules.')) {
      const key = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        marginRules: {
          ...prev.marginRules,
          [key]: numValue,
        },
      }));
    } else if (name.startsWith('regulatory.')) {
      const key = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        regulatoryConstraints: {
          ...prev.regulatoryConstraints,
          [key]: value === '' ? undefined : numValue || value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateCategoryData(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      setErrors([]);
      onCancel();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Erro ao salvar']);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="category-form" onSubmit={handleSubmit}>
      <h3>{category ? 'Editar Categoria' : 'Criar Nova Categoria'}</h3>

      {errors.length > 0 && (
        <div className="form-errors">
          {errors.map((err) => (
            <div key={err} className="error-message">
              {err}
            </div>
          ))}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="name">Nome da Categoria *</label>
        <input
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Ex: Medicamentos, Genéricos, Cosméticos"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Descrição</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Descrição opcional"
          rows={3}
        />
      </div>

      <div className="form-section">
        <h4>Regras de Margem</h4>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="baseMargin">Margem Base (%) *</label>
            <input
              id="baseMargin"
              type="number"
              name="marginRules.baseMargin"
              value={formData.marginRules.baseMargin}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.5"
            />
          </div>

          <div className="form-group">
            <label htmlFor="minMargin">Margem Mínima (%) *</label>
            <input
              id="minMargin"
              type="number"
              name="marginRules.minMargin"
              value={formData.marginRules.minMargin}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.5"
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxMargin">Margem Máxima (%) *</label>
            <input
              id="maxMargin"
              type="number"
              name="marginRules.maxMargin"
              value={formData.marginRules.maxMargin}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.5"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4>Restrições Regulatórias</h4>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="regulatoryMax">Limite Regulatório (%)</label>
            <input
              id="regulatoryMax"
              type="number"
              name="regulatory.maxMarginPercentage"
              value={formData.regulatoryConstraints.maxMarginPercentage || ''}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.5"
              placeholder="Ex: 35 (para ARMED)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="restrictionBody">Organismo Regulador</label>
            <input
              id="restrictionBody"
              type="text"
              name="regulatory.restrictionBody"
              value={formData.regulatoryConstraints.restrictionBody}
              onChange={handleChange}
              placeholder="Ex: ARMED, AECOC"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notas</label>
          <textarea
            id="notes"
            name="regulatory.notes"
            value={formData.regulatoryConstraints.notes}
            onChange={handleChange}
            placeholder="Notas sobre restrições"
            rows={3}
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || loading}
        >
          {submitting ? 'Salvando...' : category ? 'Atualizar' : 'Criar Categoria'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={submitting || loading}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};
