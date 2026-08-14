import React from 'react';

interface SearchHighlightProps {
  text: string;
  search: string;
  className?: string;
}

/**
 * Component to highlight search terms within text
 * Useful for displaying search results with emphasis on matching terms
 */
export function SearchHighlight({ text, search, className = '' }: SearchHighlightProps) {
  if (!search.trim()) {
    return <span className={className}>{text}</span>;
  }

  const searchLower = search.toLowerCase();
  const textLower = text.toLowerCase();
  const parts: { text: string; highlighted: boolean }[] = [];
  let lastIndex = 0;

  let index = textLower.indexOf(searchLower);
  while (index !== -1) {
    if (index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, index), highlighted: false });
    }
    parts.push({
      text: text.substring(index, index + search.length),
      highlighted: true,
    });
    lastIndex = index + search.length;
    index = textLower.indexOf(searchLower, lastIndex);
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), highlighted: false });
  }

  // If no parts were created (no matches), return original text
  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.highlighted ? (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-700 font-semibold text-inherit"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
}
