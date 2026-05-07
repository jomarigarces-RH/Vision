/**
 * Standardizes names from short/tool versions to official full names.
 */
export const NAME_MAPPINGS: Record<string, string> = {
  // Recently fixed
  '@Edmar Baylon': 'Edmar Muyco Baylon',
  'Edmar Baylon': 'Edmar Muyco Baylon',
  '@Jimgirl Corciega': 'Jimboy Tortusa Corciega',
  'Jimgirl Corciega': 'Jimboy Tortusa Corciega',
  '@EJ Samson': 'Ej Gabrielle Samson Fua',
  'EJ Samson': 'Ej Gabrielle Samson Fua',
  '@Lyndel Verzano': 'Lyndel Mae Baguio Verzano',
  'Lyndel Verzano': 'Lyndel Mae Baguio Verzano',
  '@Shanne Diputado': 'Shanne Juliet Credo Diputado',
  'Shanne Diputado': 'Shanne Juliet Credo Diputado',
  '@Erwin Verano': 'Erwin Verano',
  '@Felrose Magalso': 'Felrose Quisel Magalso',
  'Felrose Magalso': 'Felrose Quisel Magalso',

  // New fixes
  '@Diditz Informanes': 'Diditz Grace Roda Informanes',
  'Diditz Informanes': 'Diditz Grace Roda Informanes',
  '@Pearl Tumilap': 'Pearl Pajares Tumilap',
  'Pearl Tumilap': 'Pearl Pajares Tumilap',
  '@Crisann Relox': 'Cris-Ann Ruado Relox',
  'Crisann Relox': 'Cris-Ann Ruado Relox',
  '@Djamaicca Alama': 'Djamaicca Quinol Alama',
  'Djamaicca Alama': 'Djamaicca Quinol Alama',
};

/**
 * Normalizes a name by stripping leading @ and checking against mappings.
 */
export function normalizeName(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  
  // Check direct mapping first (with or without @)
  if (NAME_MAPPINGS[trimmed]) return NAME_MAPPINGS[trimmed];
  
  // Fallback: If it starts with @, try removing it and checking again
  if (trimmed.startsWith('@')) {
    const withoutAt = trimmed.substring(1).trim();
    if (NAME_MAPPINGS[withoutAt]) return NAME_MAPPINGS[withoutAt];
  }

  return trimmed;
}
