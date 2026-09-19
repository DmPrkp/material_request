/** ?hard=true — физическое удаление вместо архивирования. */
export function hardDeleteQuery(query: { hard?: string }): boolean {
  return query.hard === 'true' || query.hard === '1';
}
