package com.yourname.todolist

import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL

data class TaskDto(
    val id: String,
    val title: String,
    val dueAt: String?,
    val reminderMinutesBefore: Int,
    val completed: Boolean
)

data class RefreshResult(val accessToken: String, val refreshToken: String)

object SupabaseApi {

    /** Exchanges a refresh token for a fresh access token. Returns null on failure. */
    fun refreshAccessToken(refreshToken: String): RefreshResult? {
        return try {
            val url = URL("${Constants.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("apikey", Constants.SUPABASE_ANON_KEY)
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.outputStream.write("""{"refresh_token":"$refreshToken"}""".toByteArray())

            if (conn.responseCode != 200) return null
            val body = conn.inputStream.bufferedReader().readText()
            val json = org.json.JSONObject(body)
            RefreshResult(json.getString("access_token"), json.getString("refresh_token"))
        } catch (e: Exception) {
            null
        }
    }

    /** Fetches this user's incomplete tasks that have a due date set. */
    fun fetchDueTasks(accessToken: String, userId: String): List<TaskDto> {
        return try {
            val url = URL(
                "${Constants.SUPABASE_URL}/rest/v1/tasks" +
                    "?user_id=eq.$userId&completed=eq.false&due_at=not.is.null" +
                    "&select=id,title,due_at,reminder_minutes_before,completed"
            )
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("apikey", Constants.SUPABASE_ANON_KEY)
            conn.setRequestProperty("Authorization", "Bearer $accessToken")

            if (conn.responseCode != 200) return emptyList()
            val body = conn.inputStream.bufferedReader().readText()
            val arr = JSONArray(body)
            val results = mutableListOf<TaskDto>()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                results.add(
                    TaskDto(
                        id = o.getString("id"),
                        title = o.getString("title"),
                        dueAt = if (o.isNull("due_at")) null else o.getString("due_at"),
                        reminderMinutesBefore = o.optInt("reminder_minutes_before", 0),
                        completed = o.optBoolean("completed", false)
                    )
                )
            }
            results
        } catch (e: Exception) {
            emptyList()
        }
    }
}
