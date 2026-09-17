import { getTranslations } from "next-intl/server";

/**
 * Localised failure messages for server actions.
 *
 * Actions used to return English prose (`return { error: "Not authorised for
 * this group" }`), which `ActionForm` toasted verbatim — so the error layer
 * was the one user-facing surface that never got translated.
 *
 * Every message now lives in the `Errors` namespace of `messages/*.json` and
 * is resolved **here, on the server**, using the request's locale. The action
 * still returns a plain `{ error: string }`, so callers and form components
 * need no changes and a raw code can never reach the UI.
 *
 * Adding a message: add the key to all four `messages/*.json` files under
 * `Errors` (CI's `check:i18n` enforces this), then use it via `actionError`.
 */
export type ErrorCode =
  | "audio_missing_parameters"
  | "account_already_exists_appoint_instead"
  | "already_admin_for_mosque"
  | "already_linked"
  | "already_on_plan"
  | "announcement_not_found"
  | "cannot_remove_self_admin"
  | "checkin_closed"
  | "counter_date_required"
  | "current_password_incorrect"
  | "date_required"
  | "device_token_not_found"
  | "email_required"
  | "exam_part_required"
  | "exam_session_not_found"
  | "exam_session_terminal"
  | "exam_session_not_in_progress"
  | "failed_session_not_found"
  | "feature_disabled"
  | "fields_required"
  | "file_too_large_5mb"
  | "full_name_and_email_required"
  | "full_name_and_username_required"
  | "full_name_required"
  | "group_not_found"
  | "homework_not_found"
  | "invalid_config_json"
  | "invalid_file_type"
  | "lesson_id_missing"
  | "lesson_not_in_mosque"
  | "locale_and_title_required"
  | "location_required"
  | "logo_too_large_2mb"
  | "message_empty"
  | "missing_fields"
  | "missing_parameters"
  | "mosque_name_required"
  | "mosque_not_found"
  | "name_and_slug_required"
  | "name_mismatch"
  | "name_required"
  | "no_account_for_email"
  | "no_active_subscription"
  | "no_file_selected"
  | "no_holidays_configured"
  | "no_login_account_for_student"
  | "no_proposed_date"
  | "no_students_selected"
  | "no_subscription_found"
  | "no_teacher_profile_in_mosque"
  | "no_teacher_selected"
  | "not_a_thread_participant"
  | "not_allowed"
  | "not_assigned_to_group"
  | "not_authorised"
  | "not_authorised_for_group"
  | "not_signed_in"
  | "note_empty"
  | "onboarding_throttled"
  | "original_must_be_failed_exam"
  | "pages_out_of_range"
  | "parent_not_found"
  | "plan_not_found"
  | "password_min_8"
  | "passwords_do_not_match"
  | "pending_request_exists"
  | "pending_requests_all_exist"
  | "permission_denied"
  | "plan_disallows_more_mosques"
  | "plugin_id_missing"
  | "proposed_date_required"
  | "recipient_not_in_mosque"
  | "recipients_not_in_mosque"
  | "request_id_required"
  | "request_not_found_or_processed"
  | "schedule_not_confirmed"
  | "select_a_parent"
  | "select_a_student"
  | "select_at_least_one_recipient"
  | "select_at_least_one_student"
  | "select_at_least_one_teacher"
  | "select_group"
  | "select_student_to_link"
  | "session_not_found"
  | "session_not_found_or_completed"
  | "slug_already_taken"
  | "slug_invalid_chars"
  | "slug_required"
  | "student_different_mosque"
  | "student_not_enrolled_in_group"
  | "student_not_found"
  | "student_not_in_mosque"
  | "student_required"
  | "students_none_valid_in_mosque"
  | "subscription_already_canceled"
  | "summary_empty"
  | "target_group_not_found"
  | "teacher_not_found"
  | "title_and_body_required"
  | "title_required"
  | "too_many_attempts"
  | "transfer_enroll_failed"
  | "transfer_unenroll_failed"
  | "url_already_taken"
  | "username_invalid_chars"
  | "username_required"
  | "week_start_required"
  | "wrong_mosque_for_admin_add"
  | "wrong_mosque_for_admin_remove";

/** Resolves `code` in the request locale and wraps it in the action-failure shape. */
export async function actionError(code: ErrorCode): Promise<{ error: string; code: ErrorCode }> {
  const t = await getTranslations("Errors");
  // The code rides along so callers can branch on the failure without
  // string-matching a translated message.
  return { error: t(code), code };
}

/** Same message, for the `{ ok: false }` state-machine results. */
export async function actionErrorState(
  code: ErrorCode,
): Promise<{ ok: false; error: string }> {
  const t = await getTranslations("Errors");
  return { ok: false, error: t(code) };
}
