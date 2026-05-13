package com.frontend;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.SharedPreferences;
import android.text.TextUtils;
import android.view.accessibility.AccessibilityEvent;
import android.util.Log;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class AppBlockerAccessibilityService extends AccessibilityService {

    private static final String TAG = "AppBlockerService";
    private static AppBlockerAccessibilityService instance;
    private List<String> blockedApps = new ArrayList<>();
    private String currentPackage = "";
    private long lastEventTime = 0;

    // Packages to ignore completely
    private static final List<String> IGNORED_PACKAGES = Arrays.asList(
            "com.frontend", // Our app
            "com.android.systemui", // System UI
            "com.android.settings", // Settings
            "com.google.android.inputmethod.latin" // Keyboard
            // Can add launcher packages here if needed
    );

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "Accessibility Service Connected");
        instance = this;
        reloadBlockedApps();
    }

    public static AppBlockerAccessibilityService getInstance() {
        return instance;
    }

    public String getCurrentForegroundApp() {
        return currentPackage;
    }

    public void reloadBlockedApps() {
        SharedPreferences prefs = getSharedPreferences("NiyantranPrefs", Context.MODE_PRIVATE);
        String savedApps = prefs.getString("blocked_apps", "");
        if (!TextUtils.isEmpty(savedApps)) {
            blockedApps = new ArrayList<>(Arrays.asList(savedApps.split(",")));
            Log.d(TAG, "Reloaded blocked apps: " + blockedApps.size());
        } else {
            blockedApps = new ArrayList<>();
            Log.d(TAG, "No blocked apps loaded");
        }
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            return;
        }

        if (event.getPackageName() == null) {
            return;
        }

        String packageName = event.getPackageName().toString();

        // Debounce to prevent excessive processing
        long currentTime = System.currentTimeMillis();
        if (packageName.equals(currentPackage) && (currentTime - lastEventTime) < 500) {
            return;
        }
        lastEventTime = currentTime;
        currentPackage = packageName;

        Log.d(TAG, "Foreground app changed: " + packageName);

        // Ignore system packages and our own app
        if (IGNORED_PACKAGES.contains(packageName)) {
            return;
        }
        
        // Sometimes launchers are not in our hardcoded ignore list, 
        // but we handle removing overlay below if the package is NOT blocked.

        OverlayManager overlayManager = OverlayManager.getInstance(this);

        if (blockedApps.contains(packageName)) {
            Log.d(TAG, "Blocked app detected: " + packageName);
            overlayManager.showOverlay(packageName);
        } else {
            // Safe app or home screen - remove overlay if it's showing
            if (overlayManager.isOverlayShowing()) {
                Log.d(TAG, "Safe app detected, removing overlay");
                overlayManager.removeOverlay();
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.e(TAG, "Accessibility Service Interrupted");
        OverlayManager.getInstance(this).removeOverlay();
    }

    @Override
    public boolean onUnbind(android.content.Intent intent) {
        Log.d(TAG, "Accessibility Service Unbound");
        instance = null;
        OverlayManager.getInstance(this).removeOverlay();
        return super.onUnbind(intent);
    }
}
