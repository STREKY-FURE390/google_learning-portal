import { LearnerProfile } from '../data/portalData';

// ============================================================================
// LEARNER ACCOUNT & EMAIL VERIFICATION API SERVICE
// ============================================================================
// Configure VITE_AUTH_API_BASE_URL in your environment (never put secret keys
// in VITE_* browser variables). Update the placeholder endpoint paths and payload
// mappings below to match your documented API specification.
// ============================================================================

export const AUTH_API_BASE_URL = (import.meta.env.VITE_AUTH_API_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

export const AUTH_API_ENDPOINTS = {
  // TODO: Replace each placeholder path with your documented API endpoint path
  sendCode: '/__REPLACE_WITH_SEND_CODE_ENDPOINT__',
  verifyCode: '/__REPLACE_WITH_VERIFY_CODE_ENDPOINT__',
  createProfile: '/__REPLACE_WITH_CREATE_PROFILE_ENDPOINT__',
  loadProfile: '/__REPLACE_WITH_LOAD_PROFILE_ENDPOINT__',
} as const;

export type AuthFlowMode = 'signup' | 'signin';

export type AuthErrorCode =
  | 'API_NOT_CONFIGURED'
  | 'INVALID_CODE'
  | 'EXPIRED_CODE'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_EXISTS'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'REQUEST_FAILED';

export class AuthApiError extends Error {
  readonly code: AuthErrorCode;
  readonly status?: number;

  constructor(message: string, code: AuthErrorCode, status?: number) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
    this.status = status;
  }
}

export interface SendVerificationCodeParams {
  email: string;
  mode: AuthFlowMode;
}

export interface SendVerificationCodeResult {
  email: string;
  mode: AuthFlowMode;
  expiresInSeconds?: number;
  message?: string;
}

export interface VerifyEmailCodeParams {
  email: string;
  code: string;
  mode: AuthFlowMode;
}

export interface VerifyEmailCodeResult {
  verified: boolean;
  isNewAccount: boolean;
  verificationToken?: string;
  profile?: LearnerProfile;
}

export interface CreateLearnerProfileParams {
  email: string;
  verificationToken?: string;
  profile: LearnerProfile;
}

export interface LoadLearnerProfileParams {
  email: string;
  verificationToken?: string;
}

function hasPlaceholderEndpoints(): boolean {
  return Object.values(AUTH_API_ENDPOINTS).some((path) => path.includes('__REPLACE_WITH_'));
}

export function isAuthApiConfigured(): boolean {
  return Boolean(AUTH_API_BASE_URL) && !hasPlaceholderEndpoints();
}

function assertAuthApiReady(): void {
  if (!AUTH_API_BASE_URL) {
    throw new AuthApiError(
      'Authentication API base URL is not configured (VITE_AUTH_API_BASE_URL is empty). Real emails and verification codes cannot be sent until your API is configured. Use "Continue with demo account" below to preview the portal.',
      'API_NOT_CONFIGURED'
    );
  }

  if (hasPlaceholderEndpoints()) {
    throw new AuthApiError(
      'Authentication endpoint paths are still set to placeholders in authApi. Update AUTH_API_ENDPOINTS with your documented endpoints before signing in.',
      'API_NOT_CONFIGURED'
    );
  }
}

interface RawApiErrorBody {
  code?: string;
  error?: string;
  message?: string;
}

function mapApiError(status: number, body: RawApiErrorBody, fallbackMessage: string): AuthApiError {
  const rawCode = (body.code ?? '').toLowerCase();
  const rawMsg = (body.message ?? body.error ?? '').trim();
  const combined = `${rawCode} ${rawMsg}`.toLowerCase();

  if (combined.includes('expired') || status === 410) {
    return new AuthApiError(
      rawMsg || 'This verification code has expired. Select "Resend code" to request a new one.',
      'EXPIRED_CODE',
      status
    );
  }

  if (
    combined.includes('invalid_code') ||
    combined.includes('invalid code') ||
    combined.includes('wrong code') ||
    combined.includes('otp') ||
    status === 401
  ) {
    return new AuthApiError(
      rawMsg || 'Invalid verification code. Please check the 6-digit code and try again.',
      'INVALID_CODE',
      status
    );
  }

  if (combined.includes('not_found') || status === 404) {
    return new AuthApiError(
      rawMsg || 'No account found for this email. Switch to "Create account" to register.',
      'ACCOUNT_NOT_FOUND',
      status
    );
  }

  if (combined.includes('already_exists') || combined.includes('exists') || status === 409) {
    return new AuthApiError(
      rawMsg || 'An account already exists for this email. Switch to "Sign in" instead.',
      'ACCOUNT_EXISTS',
      status
    );
  }

  if (status === 429 || combined.includes('rate') || combined.includes('too many')) {
    return new AuthApiError(
      rawMsg || 'Too many requests. Please wait a moment before trying again.',
      'RATE_LIMITED',
      status
    );
  }

  return new AuthApiError(rawMsg || fallbackMessage, 'REQUEST_FAILED', status);
}

async function requestAuthJson<T>(
  endpointPath: string,
  init: RequestInit,
  fallbackError: string
): Promise<T> {
  assertAuthApiReady();

  const url = `${AUTH_API_BASE_URL}${endpointPath}`;
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new AuthApiError(
      'Could not reach the authentication server. Check your connection and API base URL.',
      'NETWORK_ERROR'
    );
  }

  const data = (await response.json().catch(() => ({}))) as RawApiErrorBody & T;
  if (!response.ok) {
    throw mapApiError(response.status, data, fallbackError);
  }

  return data;
}

/**
 * Sends a 6-digit email verification code for account creation or sign-in.
 */
export async function sendVerificationCode({
  email,
  mode,
}: SendVerificationCodeParams): Promise<SendVerificationCodeResult> {
  const normalizedEmail = email.trim().toLowerCase();

  // TODO: Adjust request body keys if your documented API uses different field names
  return requestAuthJson<SendVerificationCodeResult>(
    AUTH_API_ENDPOINTS.sendCode,
    {
      method: 'POST',
      body: JSON.stringify({
        email: normalizedEmail,
        mode,
      }),
    },
    'Unable to send a verification code right now. Please try again.'
  );
}

/**
 * Verifies the 6-digit code entered by the learner (kept in memory only, never stored).
 */
export async function verifyEmailCode({
  email,
  code,
  mode,
}: VerifyEmailCodeParams): Promise<VerifyEmailCodeResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.replace(/\D/g, '').slice(0, 6);

  // TODO: Adjust request body keys if your documented API uses different field names
  return requestAuthJson<VerifyEmailCodeResult>(
    AUTH_API_ENDPOINTS.verifyCode,
    {
      method: 'POST',
      body: JSON.stringify({
        email: normalizedEmail,
        code: normalizedCode,
        mode,
      }),
    },
    'Could not verify the code. Please check the 6 digits and try again.'
  );
}

function normalizeLearnerProfile(
  raw: Partial<LearnerProfile> | undefined,
  fallback?: LearnerProfile
): LearnerProfile {
  return {
    name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name.trim() : fallback?.name ?? 'Learner',
    careerGoal:
      raw?.careerGoal === 'Frontend Developer' ||
      raw?.careerGoal === 'Backend Developer' ||
      raw?.careerGoal === 'Full Stack Developer'
        ? raw.careerGoal
        : fallback?.careerGoal ?? 'Full Stack Developer',
    bio:
      typeof raw?.bio === 'string' && raw.bio.trim()
        ? raw.bio.trim()
        : fallback?.bio ?? 'Building skills through guided full-stack projects and exercises.',
    skills: Array.isArray(raw?.skills) ? raw.skills : fallback?.skills ?? [],
    projects: Array.isArray(raw?.projects) ? raw.projects : fallback?.projects ?? [],
    certifications: Array.isArray(raw?.certifications)
      ? raw.certifications
      : fallback?.certifications ?? [],
  };
}

/**
 * Creates a new learner profile through the documented API after verification.
 */
export async function createLearnerProfileAccount({
  email,
  verificationToken,
  profile,
}: CreateLearnerProfileParams): Promise<LearnerProfile> {
  const normalizedEmail = email.trim().toLowerCase();

  // TODO: Adjust headers/payload shape to match your documented create-profile endpoint
  const result = await requestAuthJson<{ profile?: LearnerProfile } & Partial<LearnerProfile>>(
    AUTH_API_ENDPOINTS.createProfile,
    {
      method: 'POST',
      headers: verificationToken
        ? { Authorization: `Bearer ${verificationToken}` }
        : undefined,
      body: JSON.stringify({
        email: normalizedEmail,
        profile,
      }),
    },
    'Unable to create your learner profile right now. Please try again.'
  );

  return normalizeLearnerProfile(result.profile ?? result, profile);
}

/**
 * Loads an existing learner profile through the documented API after verification.
 */
export async function fetchLearnerProfileAccount({
  email,
  verificationToken,
}: LoadLearnerProfileParams): Promise<LearnerProfile> {
  const normalizedEmail = email.trim().toLowerCase();
  const query = `?email=${encodeURIComponent(normalizedEmail)}`;

  // TODO: Switch to POST or adjust path/headers if your documented load-profile endpoint differs
  const result = await requestAuthJson<{ profile?: LearnerProfile } & Partial<LearnerProfile>>(
    `${AUTH_API_ENDPOINTS.loadProfile}${query}`,
    {
      method: 'GET',
      headers: verificationToken
        ? { Authorization: `Bearer ${verificationToken}` }
        : undefined,
    },
    'Unable to load your learner profile right now. Please try again.'
  );

  return normalizeLearnerProfile(result.profile ?? result);
}
