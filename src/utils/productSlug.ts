// Helper utility to generate clean, SEO-friendly product URLs

export const getProductSlug = (name?: string, id?: string): string => {
  if (!name) return id || '';
  
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')     // Remove special non-alphanumeric chars
    .replace(/[\s_-]+/g, '-')     // Replace spaces and underscores with single hyphen
    .replace(/^-+|-+$/g, '');     // Trim hyphens from ends

  return clean || id || '';
};
