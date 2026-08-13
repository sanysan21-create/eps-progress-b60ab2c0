import { supabase } from "@/integrations/supabase/client";

export const AVATAR_BUCKET = "teacher-avatars";
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

async function signedAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/**
 * Charge le profil enseignant du compte connecté et le crée à la volée si le
 * compte a été créé avant l'existence du profil (ou via Google).
 */
export async function fetchTeacherProfile(): Promise<TeacherProfile> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Session enseignant introuvable");
  const user = auth.user;

  const { data: row, error } = await supabase
    .from("teacher_profiles")
    .select("id, first_name, last_name, email, avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const metadata = user.user_metadata ?? {};
  let profile = row;

  if (!profile) {
    const { data: created, error: insertError } = await supabase
      .from("teacher_profiles")
      .insert({
        id: user.id,
        first_name: String(metadata["first_name"] ?? metadata["given_name"] ?? ""),
        last_name: String(metadata["last_name"] ?? metadata["family_name"] ?? ""),
        email: user.email ?? "",
      })
      .select("id, first_name, last_name, email, avatar_path")
      .single();
    if (insertError) throw new Error(insertError.message);
    profile = created;
  } else if (user.email && profile.email !== user.email) {
    // Le compte d'authentification reste la source de vérité pour l'e-mail.
    const { data: synced } = await supabase
      .from("teacher_profiles")
      .update({ email: user.email })
      .eq("id", user.id)
      .select("id, first_name, last_name, email, avatar_path")
      .single();
    if (synced) profile = synced;
  }

  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    avatarPath: profile.avatar_path,
    avatarUrl: await signedAvatarUrl(profile.avatar_path),
  };
}

/** Enregistre le prénom et le nom (l'e-mail est géré séparément par le compte). */
export async function saveTeacherIdentity(input: { firstName: string; lastName: string }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Session enseignant introuvable");
  const { error } = await supabase
    .from("teacher_profiles")
    .update({ first_name: input.firstName.trim(), last_name: input.lastName.trim() })
    .eq("id", auth.user.id);
  if (error) throw new Error(error.message);
}

/**
 * Modifie l'e-mail dans le système d'authentification puis, si le changement est
 * immédiatement effectif, dans le profil — évitant toute désynchronisation.
 */
export async function changeTeacherEmail(email: string): Promise<{ pending: boolean }> {
  const next = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.updateUser({ email: next });
  if (error) throw new Error(error.message);
  const confirmed = data.user?.email?.toLowerCase() === next;
  if (confirmed && data.user) {
    await supabase.from("teacher_profiles").update({ email: next }).eq("id", data.user.id);
  }
  return { pending: !confirmed };
}

export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_MIME_TYPES.includes(file.type)) {
    return "Format non autorisé. Utilisez une image JPG, PNG, WEBP ou GIF.";
  }
  if (file.size > AVATAR_MAX_BYTES) return "Image trop lourde (3 Mo maximum).";
  return null;
}

export async function uploadTeacherAvatar(file: File, previousPath: string | null) {
  const problem = validateAvatarFile(file);
  if (problem) throw new Error(problem);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Session enseignant introuvable");

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${auth.user.id}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(error.message);

  const { error: saveError } = await supabase
    .from("teacher_profiles")
    .update({ avatar_path: path })
    .eq("id", auth.user.id);
  if (saveError) throw new Error(saveError.message);

  if (previousPath && previousPath !== path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }
}

export async function removeTeacherAvatar(path: string | null) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Session enseignant introuvable");
  const { error } = await supabase
    .from("teacher_profiles")
    .update({ avatar_path: null })
    .eq("id", auth.user.id);
  if (error) throw new Error(error.message);
  if (path) await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}
