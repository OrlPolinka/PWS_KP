export const matchesSearchPrefix = (search: string, ...values: Array<string | null | undefined>): boolean => {
  const query = search.trim().toLocaleLowerCase('ru');
  if (!query) return true;

  return values.some((value) => {
    const normalized = value?.trim().toLocaleLowerCase('ru');
    return normalized !== undefined && (
      normalized.startsWith(query) ||
      normalized.split(/[^\p{L}\p{N}]+/u).some((word) => word.startsWith(query))
    );
  });
};

export const getTodayDate = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};
