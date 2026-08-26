export const PASSWORD_MIN_LENGTH = 8;

export type PasswordValidation = {
  longEnough: boolean;
  matches: boolean;
  valid: boolean;
};

export function validateNewPassword(password: string, confirmation: string): PasswordValidation {
  const longEnough = password.length >= PASSWORD_MIN_LENGTH;
  const matches = password.length > 0 && password === confirmation;
  return { longEnough, matches, valid: longEnough && matches };
}
