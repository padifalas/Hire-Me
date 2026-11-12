// Reads, updates and live-subscribes to the notifications table.

// Table fields: id, user_id, type, title, body, link_type, link_id, read,
// created_at. Rows are created server-side (triggers / edge functions); the
// frontend only reads them, flips `read`, and deletes them.

// NOTE: Supabase returns NO error when RLS silently blocks an update or
// delete - it just affects 0 rows. So every mutation below asks for the
// affected rows back (.select("id")) and treats an empty result as a failure.
// That way a missing UPDATE / DELETE policy shows up as a visible error
// instead of a button that "works" and then reverts on refresh.

import { supabase } from "../config/supabase";

export async function getNotifications(userId, limit = 100) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, notifications: data ?? [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateNotificationRead(notificationId, read) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read })
      .eq("id", notificationId)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Couldn't update this notification.");
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function markAllNotificationsRead(userId) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteNotification(notificationId) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Couldn't delete this notification.");
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Employer deep link: a `new_application` notification only carries the
 * application id, but ApplicantsModal needs the opportunity it belongs to.
 */
export async function getApplicationTarget(applicationId) {
  try {
    const { data, error } = await supabase
      .from("applications")
      .select("id, opportunity_id, opportunities(title)")
      .eq("id", applicationId)
      .single();

    if (error) throw error;
    return {
      success: true,
      opportunityId: data.opportunity_id,
      jobTitle: data.opportunities?.title ?? "",
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Live updates for the signed-in user's notifications. Requires Realtime to
 * be enabled for the table:
 *   alter publication supabase_realtime add table public.notifications;
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(
  userId,
  { onInsert, onUpdate, onDelete },
) {
  const filter = `user_id=eq.${userId}`;

  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter },
      (payload) => onInsert?.(payload.new),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "notifications", filter },
      (payload) => onUpdate?.(payload.new),
    )
    // Realtime can't filter DELETE events by column, but RLS still limits
    // them to rows this user can see, and removing an unknown id is a no-op.
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "notifications" },
      (payload) => onDelete?.(payload.old?.id),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
