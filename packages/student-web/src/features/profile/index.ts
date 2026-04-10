/**
 * Profile feature public API.
 */
// Types
export type {
  UserProfile,
  SaveUserProfileInput,
  PersonalityType,
  TeacherTag,
  ProfileLanguage
} from './types';
export {
  PROFILE_SETUP_PATH,
  PROFILE_PREFERENCES_PATH,
  PROFILE_TOUR_PATH,
  PROFILE_STORAGE_KEY,
  PROFILE_API_BASE_PATH,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_DEFAULT_LANGUAGE,
  PERSONALITY_TYPES,
  TEACHER_TAGS,
  createEmptyUserProfile,
  mergeUserProfile,
  hasCollectedProfilePreferences
} from './types';

// API
export { profileApi, resolveProfileApi } from './api/profile-api';

// Stores
export { useUserProfileStore } from './stores/user-profile-store';

// Hooks
export { useUserProfile } from './hooks/use-user-profile';

// Routing
export {
  buildProfileSetupPath,
  buildProfilePreferencesPath,
  buildProfileTourPath,
  resolveProfileReturnTo,
  isProfileOnboardingPath
} from './shared/profile-routing';

// Schemas
export {
  createProfileIntroSchema,
  createProfilePreferencesSchema
} from './schemas/profile-form-schemas';
export type {
  ProfileIntroFormValues,
  ProfilePreferencesFormValues
} from './schemas/profile-form-schemas';

// Pages
export { ProfileIntroPage } from './pages/profile-intro-page';
export { ProfilePreferencesPage } from './pages/profile-preferences-page';
export { ProfileTourPage } from './pages/profile-tour-page';
