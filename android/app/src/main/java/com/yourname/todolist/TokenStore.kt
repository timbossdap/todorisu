package com.yourname.todolist

import android.content.Context

object TokenStore {
    private const val PREFS = "tasks_prefs"

    fun save(context: Context, accessToken: String, refreshToken: String, userId: String) {
        prefs(context).edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .putString("user_id", userId)
            .apply()
    }

    fun clear(context: Context) {
        prefs(context).edit().clear().apply()
    }

    fun accessToken(context: Context) = prefs(context).getString("access_token", null)
    fun refreshToken(context: Context) = prefs(context).getString("refresh_token", null)
    fun userId(context: Context) = prefs(context).getString("user_id", null)

    fun updateAccessToken(context: Context, accessToken: String, refreshToken: String) {
        prefs(context).edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .apply()
    }

    // Track which task IDs currently have a scheduled alarm, so SyncWorker
    // can cancel ones that were completed/deleted/rescheduled elsewhere.
    fun scheduledTaskIds(context: Context): Set<String> =
        prefs(context).getStringSet("scheduled_ids", emptySet()) ?: emptySet()

    fun saveScheduledTaskIds(context: Context, ids: Set<String>) {
        prefs(context).edit().putStringSet("scheduled_ids", ids).apply()
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
