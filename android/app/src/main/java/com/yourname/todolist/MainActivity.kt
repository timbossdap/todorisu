package com.yourname.todolist

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.ActivityCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class MainActivity : Activity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        NotificationHelper.ensureChannel(this)
        requestNotificationPermissionIfNeeded()

        webView = findViewById(R.id.webView)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.webViewClient = WebViewClient()
        webView.addJavascriptInterface(JsBridge(), "AndroidBridge")
        webView.loadUrl(Constants.WEB_APP_URL)

        // If we already have a saved session from a previous run, make sure
        // the periodic sync is scheduled (covers the case where the app was
        // reinstalled or data cleared and then the WebView restores login).
        // Also run an immediate one-time sync so the persistent notification
        // is up to date as soon as the app is opened, not just every 15 min.
        if (TokenStore.accessToken(this) != null) {
            schedulePeriodicSync()
            WorkManager.getInstance(applicationContext).enqueue(
                androidx.work.OneTimeWorkRequestBuilder<SyncWorker>().build()
            )
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
            }
        }
    }

    private fun schedulePeriodicSync() {
        // 15 minutes is the shortest interval WorkManager allows for periodic work.
        val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(applicationContext).enqueueUniquePeriodicWork(
            Constants.SYNC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
    }

    /** Exposed to the web app's JS so it can hand off the logged-in session. */
    inner class JsBridge {
        @JavascriptInterface
        fun onAuth(accessToken: String, refreshToken: String, userId: String) {
            TokenStore.save(applicationContext, accessToken, refreshToken, userId)
            schedulePeriodicSync()
            // Run an immediate sync too, not just on the next 15-minute tick.
            WorkManager.getInstance(applicationContext).enqueue(
                androidx.work.OneTimeWorkRequestBuilder<SyncWorker>().build()
            )
        }

        @JavascriptInterface
        fun onSignOut() {
            TokenStore.clear(applicationContext)
            WorkManager.getInstance(applicationContext).cancelUniqueWork(Constants.SYNC_WORK_NAME)
            NotificationHelper.cancelSummaryNotification(applicationContext)
        }
    }
}
