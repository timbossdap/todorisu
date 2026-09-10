package com.yourname.todolist

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * Runs periodically (via WorkManager) and right after boot / sign-in.
 * Pulls tasks with due dates from Supabase directly (independent of the
 * WebView) and schedules exact native alarms for the ones coming up soon.
 * This is what makes reminders survive the browser/app being closed.
 */
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    // Only schedule alarms for tasks due within this window, to avoid piling
    // up thousands of far-future exact alarms (Android limits these).
    private val LOOKAHEAD_MS = 48L * 60 * 60 * 1000

    override suspend fun doWork(): Result {
        val ctx = applicationContext
        var accessToken = TokenStore.accessToken(ctx) ?: return Result.success()
        val refreshToken = TokenStore.refreshToken(ctx) ?: return Result.success()
        val userId = TokenStore.userId(ctx) ?: return Result.success()

        // Access tokens expire (default ~1h) - refresh first.
        val refreshed = SupabaseApi.refreshAccessToken(refreshToken)
        if (refreshed != null) {
            accessToken = refreshed.accessToken
            TokenStore.updateAccessToken(ctx, refreshed.accessToken, refreshed.refreshToken)
        }

        val tasks = SupabaseApi.fetchDueTasks(accessToken, userId)
        val now = System.currentTimeMillis()
        val previouslyScheduled = TokenStore.scheduledTaskIds(ctx).toMutableSet()
        val nowScheduled = mutableSetOf<String>()

        for (task in tasks) {
            val dueMillis = parseIso(task.dueAt) ?: continue
            val triggerAt = dueMillis - task.reminderMinutesBefore * 60_000L
            if (triggerAt < now || triggerAt - now > LOOKAHEAD_MS) continue

            scheduleAlarm(ctx, task.id, task.title, triggerAt)
            nowScheduled.add(task.id)
        }

        // Cancel alarms for tasks that were scheduled before but are no
        // longer due-soon (completed, deleted, or edited elsewhere).
        for (staleId in previouslyScheduled - nowScheduled) {
            cancelAlarm(ctx, staleId)
        }

        TokenStore.saveScheduledTaskIds(ctx, nowScheduled)
        return Result.success()
    }

    private fun scheduleAlarm(context: Context, taskId: String, title: String, triggerAt: Long) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("taskId", taskId)
            putExtra("title", title)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context, taskId.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()
        if (canExact) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        } else {
            // Fallback if the user hasn't granted exact-alarm permission:
            // still fires, just with some system-controlled slack.
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        }
    }

    private fun cancelAlarm(context: Context, taskId: String) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context, taskId.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        am.cancel(pendingIntent)
    }

    private fun parseIso(value: String?): Long? {
        if (value == null) return null
        return try {
            val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            fmt.timeZone = TimeZone.getTimeZone("UTC")
            fmt.parse(value.substring(0, 19))?.time
        } catch (e: Exception) {
            null
        }
    }
}
