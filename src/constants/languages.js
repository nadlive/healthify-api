/**
 * Locale slots used for localized names/specialities.
 * Frontend maps these labels per country (e.g. language2 → Sinhala in LK).
 */
const LANGUAGE_KEYS = ['language1', 'language2', 'language3'];

const LANGUAGES = {
  language1: 'English',
  language2: 'Sinhala',
  language3: 'Tamil',
};

const DEFAULT_LANGUAGE_KEY = 'language1';

const LANGUAGE_KEY_BY_LABEL = Object.entries(LANGUAGES).reduce(
  (acc, [key, label]) => {
    acc[label] = key;
    acc[label.toLowerCase()] = key;
    return acc;
  },
  {},
);

const resolveLanguageKey = (value) => {
  if (!value || typeof value !== 'string') return null;
  if (LANGUAGE_KEYS.includes(value)) return value;
  return (
    LANGUAGE_KEY_BY_LABEL[value] ||
    LANGUAGE_KEY_BY_LABEL[value.toLowerCase()] ||
    null
  );
};

const emptyNameEntry = () => ({
  prefix: '',
  firstName: '',
  lastName: '',
});

/**
 * Normalize practitioner names into:
 * { language1: { prefix, firstName, lastName }, language2: {...}, language3: {...} }
 * Accepts object keyed by language1..3, or legacy array [{ language, ... }].
 */
const normalizeLocalizedNames = (data = {}) => {
  const result = {
    language1: emptyNameEntry(),
    language2: emptyNameEntry(),
    language3: emptyNameEntry(),
  };

  if (
    data.names &&
    !Array.isArray(data.names) &&
    typeof data.names === 'object'
  ) {
    for (const key of LANGUAGE_KEYS) {
      const entry = data.names[key];
      if (entry && typeof entry === 'object') {
        result[key] = {
          prefix: entry.prefix || '',
          firstName: entry.firstName || '',
          lastName: entry.lastName || '',
        };
      }
    }
    return result;
  }

  if (Array.isArray(data.names) && data.names.length > 0) {
    for (const entry of data.names) {
      const key = resolveLanguageKey(entry?.language);
      if (!key) continue;
      result[key] = {
        prefix: entry.prefix || '',
        firstName: entry.firstName || '',
        lastName: entry.lastName || '',
      };
    }
    return result;
  }

  result.language1 = {
    prefix: data.prefix || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
  };

  return result;
};

const getPrimaryName = (names = {}) => names.language1 || emptyNameEntry();

const mapSpecialityNames = (speciality = {}) => ({
  language1: speciality.name || speciality.nameLanguage1 || '',
  language2: speciality.nameLanguage2 || '',
  language3: speciality.nameLanguage3 || '',
});

const mapSpecialityResponse = (speciality = {}) => ({
  id: speciality.id,
  names: mapSpecialityNames(speciality),
  // Keep flat English name for older clients
  name: speciality.name || '',
});

module.exports = {
  LANGUAGES,
  LANGUAGE_KEYS,
  DEFAULT_LANGUAGE_KEY,
  resolveLanguageKey,
  normalizeLocalizedNames,
  getPrimaryName,
  mapSpecialityNames,
  mapSpecialityResponse,
};
