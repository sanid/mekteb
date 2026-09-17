export function getTranslatedRelation(relation: string | null | undefined, locale: string): string {
  if (!relation) return "";
  
  const relLower = relation.trim().toLowerCase();
  
  // Predefined translations for common relation types across the 4 supported locales
  const translations: Record<string, Record<string, string>> = {
    de: {
      father: "Vater",
      mother: "Mutter",
      guardian: "Vormund",
      parent: "Elternteil",
    },
    bs: {
      father: "Otac",
      mother: "Majka",
      guardian: "Staratelj",
      parent: "Roditelj",
    },
    tr: {
      father: "Baba",
      mother: "Anne",
      guardian: "Veli",
      parent: "Ebeveyn",
    },
    en: {
      father: "Father",
      mother: "Mother",
      guardian: "Guardian",
      parent: "Parent",
    }
  };

  const lang = translations[locale] ? locale : "en";
  const mapped = translations[lang]?.[relLower];
  
  if (mapped) return mapped;
  
  // Fallback: capitalize first letter of the custom input
  return relation.charAt(0).toUpperCase() + relation.slice(1);
}
