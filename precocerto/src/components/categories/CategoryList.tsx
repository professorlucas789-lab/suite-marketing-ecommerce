/**
 * CategoryList Component
 * Lista de categorias com ações de edit/delete
 */

import React from 'react';
import { CategoryMarginConfig } from '../../types/category';
import { Edit2, Trash2, Plus } from 'lucide-react';
import './CategoryList.css';

interface CategoryListProps {
  categories: CategoryMarginConfig[];
  onEdit: (category: CategoryMarginConfig) => void;
  onDelete: (categoryId: string) => void;
  onAdd: () => void;
  loading?: boolean;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onEdit,
  onDelete,
  onAdd,
  loading = false,
}) => {
  if (loading) {
    return <div className="category-list-loading">Carregando categorias...</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="category-list-empty">
        <p>Nenhuma categoria criada ainda.</p>
        <button onClick={onAdd} className="btn btn-primary">
          <Plus size={16} /> Criar Primeira Categoria
        </button>
      </div>
    );
  }

  return (
    <div className="category-list">
      <div className="category-list-header">
        <h3>Categorias de Produtos</h3>
        <button onClick={onAdd} className="btn btn-primary">
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      <div className="category-list-table">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Margem Base</th>
              <th>Min - Max</th>
              <th>Regulatória</th>
              <th>Produtos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="category-row">
                <td className="category-name">
                  <strong>{cat.name}</strong>
                </td>
                <td className="category-base-margin">
                  {cat.marginRules.baseMargin}%
                </td>
                <td className="category-range">
                  {cat.marginRules.minMargin}% - {cat.marginRules.maxMargin}%
                </td>
                <td className="category-regulatory">
                  {cat.regulatoryConstraints?.maxMarginPercentage ? (
                    <span className="regulatory-badge">
                      Máx {cat.regulatoryConstraints.maxMarginPercentage}%
                      <br />
                      <small>({cat.regulatoryConstraints.restrictionBody})</small>
                    </span>
                  ) : (
                    <span className="regulatory-badge none">Sem limite</span>
                  )}
                </td>
                <td className="category-products">
                  {cat.historicalData?.totalProductsCount || 0}
                </td>
                <td className="category-actions">
                  <button
                    onClick={() => onEdit(cat)}
                    className="btn btn-sm btn-secondary"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Tem a certeza que quer deletar "${cat.name}"?`
                        )
                      ) {
                        onDelete(cat.id);
                      }
                    }}
                    className="btn btn-sm btn-danger"
                    title="Deletar"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
