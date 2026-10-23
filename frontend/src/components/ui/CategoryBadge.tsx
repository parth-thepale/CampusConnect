import React from 'react';
import { Category, CATEGORY_LABELS } from '../../types';

export interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md';
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, size = 'md' }) => {
  const label = CATEGORY_LABELS[category] || category;

  let catKey = 'plumbing';
  if (category === 'electricity') catKey = 'electricity';
  if (category === 'cleanliness') catKey = 'cleanliness';
  if (category === 'internet_connectivity') catKey = 'internet';

  return (
    <span
      className={`cc-cat-badge cc-cat-${category}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '0.125rem 0.5rem' : '0.25rem 0.625rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: size === 'sm' ? '0.75rem' : '0.8125rem',
        fontWeight: 600,
        backgroundColor: `var(--cat-${catKey}-bg, #f1f5f9)`,
        color: `var(--cat-${catKey}-text, #334155)`,
        border: `1px solid var(--cat-${catKey}-border, #cbd5e1)`,
      }}
    >
      {label}
    </span>
  );
};
