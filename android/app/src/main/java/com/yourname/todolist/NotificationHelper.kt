package com.yourname.todolist

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

object NotificationHelper {
    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(NotificationManager::class.java)

            val reminderChannel = NotificationChannel(
                Constants.NOTIF_CHANNEL_ID,
                "Task reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Reminders for tasks with a due date"
            }
            manager.createNotificationChannel(reminderChannel)

            // Low importance: no sound/heads-up popup on every refresh, since
            // this one gets updated frequently (every sync) and is meant to
            // just sit quietly in the shade.
            val summaryChannel = NotificationChannel(
                Constants.NOTIF_SUMMARY_CHANNEL_ID,
                "Upcoming tasks (persistent)",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "An always-visible summary of your next few tasks"
                setShowBadge(false)
            }
            manager.createNotificationChannel(summaryChannel)
        }
    }

    /**
     * Posts (or refreshes) a persistent, ongoing notification listing the
     * next few upcoming tasks. `setOngoing(true)` is what makes it
     * non-dismissible - it can't be swiped away or cleared with "Clear all",
     * only replaced/updated by us or removed if the app is uninstalled.
     *
     * Call this after every sync (periodic, boot, sign-in, app open) so the
     * pinned notification stays accurate. Pass an empty list to show an
     * "all caught up" state - the notification itself stays put either way.
     */
    fun updateSummaryNotification(context: Context, tasks: List<TaskDto>, maxItems: Int = 5) {
        ensureChannel(context)

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val contentIntent = launchIntent?.let {
            PendingIntent.getActivity(
                context, 0, it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        val builder = NotificationCompat.Builder(context, Constants.NOTIF_SUMMARY_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setShowWhen(false)

        contentIntent?.let { builder.setContentIntent(it) }

        val upcoming = tasks.filter { !it.completed }

        if (upcoming.isEmpty()) {
            builder
                .setContentTitle("Tasks")
                .setContentText("No upcoming tasks - you're all caught up")
        } else {
            val shown = upcoming.take(maxItems)
            val inbox = NotificationCompat.InboxStyle()
            for (task in shown) {
                inbox.addLine("${task.title} \u2022 ${formatDueDate(task.dueAt)}")
            }
            val extra = upcoming.size - shown.size
            if (extra > 0) {
                inbox.setSummaryText("+$extra more")
            }

            builder
                .setContentTitle(
                    if (upcoming.size == 1) "1 upcoming task" else "${upcoming.size} upcoming tasks"
                )
                .setContentText("${shown.first().title} \u2022 ${formatDueDate(shown.first().dueAt)}")
                .setStyle(inbox)
        }

        NotificationManagerCompat.from(context).notify(Constants.SUMMARY_NOTIFICATION_ID, builder.build())
    }

    /** Called on sign-out - there's nothing to show once there's no logged-in user. */
    fun cancelSummaryNotification(context: Context) {
        NotificationManagerCompat.from(context).cancel(Constants.SUMMARY_NOTIFICATION_ID)
    }

    private fun formatDueDate(iso: String?): String {
        if (iso == null) return "No due date"
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            parser.timeZone = TimeZone.getTimeZone("UTC")
            val date = parser.parse(iso.substring(0, 19)) ?: return "No due date"

            val due = Calendar.getInstance().apply { time = date }
            val now = Calendar.getInstance()
            val timeFmt = SimpleDateFormat("h:mm a", Locale.getDefault())

            val sameDay = due.get(Calendar.YEAR) == now.get(Calendar.YEAR) &&
                due.get(Calendar.DAY_OF_YEAR) == now.get(Calendar.DAY_OF_YEAR)

            val tomorrowCal = (now.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, 1) }
            val isTomorrow = due.get(Calendar.YEAR) == tomorrowCal.get(Calendar.YEAR) &&
                due.get(Calendar.DAY_OF_YEAR) == tomorrowCal.get(Calendar.DAY_OF_YEAR)

            when {
                sameDay -> "Today ${timeFmt.format(date)}"
                isTomorrow -> "Tomorrow ${timeFmt.format(date)}"
                else -> SimpleDateFormat("MMM d, h:mm a", Locale.getDefault()).format(date)
            }
        } catch (e: Exception) {
            "No due date"
        }
    }
}
