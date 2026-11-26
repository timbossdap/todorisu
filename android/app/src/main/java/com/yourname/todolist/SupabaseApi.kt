package com.yourname.todolist

import org.json.JSONArray
import org.json.JSONObject
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

    private const val TIMEOUT_MS = 10_000

    /** Exchanges a refresh token for a fresh access token. Returns null on failure. */
    fun refreshAccessToken(refreshToken: String): RefreshResult? {
        var conn: HttpURLConnection? = null
        return try {
            val url = URL("${Constants.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token")
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = TIMEOUT_MS
                readTimeout = TIMEOUT_MS
                setRequestProperty("apikey", Constants.SUPABASE_ANON_KEY)
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
            }
            val payload = JSONObject().put("refresh_token", refreshToken).toString()
            conn.outputStream.use { it.write(payload.toByteArray()) }

            if (conn.responseCode != 200) return null
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(body)
            RefreshResult(json.getString("access_token"), json.getString("refresh_token"))
        } catch (e: Exception) {
            null
        } finally {
            conn?.disconnect()
        }
    }

    /**
     * Fetches this user's next incomplete tasks for the persistent summary
     * notification - soonest due date first, tasks with no due date last.
     */
    fun fetchUpcomingTasks(accessToken: String, userId: String, limit: Int = 5): List<TaskDto> {
        val query = "?user_id=eq.$userId&completed=eq.false" +
            "&select=id,title,due_at,reminder_minutes_before,completed" +
            "&order=due_at.asc.nullslast&limit=$limit"
        return fetchTasks(accessToken, query)
    }

    /** Fetches this user's incomplete tasks that have a due date set. */
    fun fetchDueTasks(accessToken: String, userId: String): List<TaskDto> {
        val query = "?user_id=eq.$userId&completed=eq.false&due_at=not.is.null" +
            "&select=id,title,due_at,reminder_minutes_before,completed"
        return fetchTasks(accessToken, query)
    }

    private fun fetchTasks(accessToken: String, query: String): List<TaskDto> {
        var conn: HttpURLConnection? = null
        return try {
            val url = URL("${Constants.SUPABASE_URL}/rest/v1/tasks$query")
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = TIMEOUT_MS
                readTimeout = TIMEOUT_MS
                setRequestProperty("apikey", Constants.SUPABASE_ANON_KEY)
                setRequestProperty("Authorization", "Bearer $accessToken")
            }

            if (conn.responseCode != 200) return emptyList()
            val body = conn.inputStream.bufferedReader().use { it.readText() }
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
        } finally {
            conn?.disconnect()
        }
    }
}
