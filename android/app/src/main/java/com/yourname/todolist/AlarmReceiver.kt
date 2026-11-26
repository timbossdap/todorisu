package com.yourname.todolist

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra("taskId") ?: return
        val title = intent.getStringExtra("title") ?: "Task due"
        if (!NotificationHelper.hasNotificationPermission(context)) return

        NotificationHelper.ensureChannel(context)

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val contentIntent = launchIntent?.let {
            PendingIntent.getActivity(
                context, taskId.hashCode(), it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        val builder = NotificationCompat.Builder(context, Constants.NOTIF_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText("Due now")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        contentIntent?.let { builder.setContentIntent(it) }

        NotificationManagerCompat.from(context).notify(taskId.hashCode(), builder.build())
    }
}
