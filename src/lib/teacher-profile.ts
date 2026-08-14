import {
  changeTeacherEmailFn,
  changeTeacherPassword,
  getTeacherAccount,
  removeTeacherAvatarFn,
  updateTeacherIdentity,
  uploadTeacherAvatarFn,
} from "./auth.functions";

export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type TeacherProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarPath: string | null;
  avatarUrl: string | null;
};

export function teacherInitials(profile: { firstName: string; lastName: string; email: string }) {
  const letters = `${profile.firstName.trim()[0] ?? ""}${profile.lastName.trim()[0] ?? ""}`;
  return (letters || profile.email.trim()[0] || "?").toUpperCase();
}

export function teacherDisplayName(profile: TeacherProfile) {
  const full = `${profile.firstName} ${profile.lastName}`.trim();
  return full || profile.email;
}

/** Charge le profil de l'enseignant connecté (session cookie). */
export async function fetchTeacherProfile(): Promise<TeacherProfile> {
  const account = await getTeacherAccount();
  if (!account) throw new Error("Session enseignant introuvable");
  return {
    id: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    avatarPath: account.avatarUrl,
    avatarUrl: account.avatarUrl,
  };
}

export async function saveTeacherIdentity(input: { firstName: string; lastName: string }) {
  await updateTeacherIdentity({ data: input });
}

export async function changeTeacherEmail(email: string): Promise<{ pending: boolean }> {
  await changeTeacherEmailFn({ data: { email: email.trim().toLowerCase() } });
  return { pending: false };
}

export async function changeTeacherPasswordRequest(input: {
  currentPassword: string;
  newPassword: string;
}) {
  await changeTeacherPassword({ data: input });
}

export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_MIME_TYPES.includes(file.type)) {
    return "Format non autorisé. Utilisez une image JPG, PNG, WEBP ou GIF.";
  }
  if (file.size > AVATAR_MAX_BYTES) return "Image trop lourde (3 Mo maximum).";
  return null;
}

/** Encode un fichier en base64 pour l'envoyer à la server function. */
export async function fileToBase64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buffer.length; i += chunk) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function uploadTeacherAvatar(file: File, _previousPath?: string | null) {
  const problem = validateAvatarFile(file);
  if (problem) throw new Error(problem);
  await uploadTeacherAvatarFn({
    data: { contentType: file.type, dataBase64: await fileToBase64(file) },
  });
}

export async function removeTeacherAvatar(_path?: string | null) {
  await removeTeacherAvatarFn({});
}
