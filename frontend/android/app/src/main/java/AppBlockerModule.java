package com.frontend;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.BroadcastReceiver;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import android.provider.Settings;
import android.net.Uri;
import android.os.Build;
import android.app.AppOpsManager;

import android.content.SharedPreferences;
import android.text.TextUtils;

import java.util.List;
import java.util.Arrays;
import android.util.Log;

public class AppBlockerModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    public AppBlockerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("ShowAppWarning".equals(intent.getAction())) {
                    String pkg = intent.getStringExtra("package");
                    reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("ShowAppWarning", pkg);
                }
            }
        };
        reactContext.registerReceiver(receiver, new IntentFilter("ShowAppWarning"));
    }

    @Override
    public String getName() {
        return "AppBlockerModule";
    }

    @ReactMethod
    public void getInstalledApps(Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            List<ApplicationInfo> packages = pm.getInstalledApplications(PackageManager.GET_META_DATA);
            WritableArray appList = Arguments.createArray();
            for (ApplicationInfo appInfo : packages) {
                // Filter out system apps
                if ((appInfo.flags & ApplicationInfo.FLAG_SYSTEM) == 0 && (appInfo.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) == 0) {
                    WritableMap map = Arguments.createMap();
                    map.putString("packageName", appInfo.packageName);
                    map.putString("name", pm.getApplicationLabel(appInfo).toString());
                    appList.pushMap(map);
                }
            }
            promise.resolve(appList);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void checkAccessibilityPermission(Promise promise) {
        int accessibilityEnabled = 0;
        final String service = reactContext.getPackageName() + "/" + AppBlockerAccessibilityService.class.getCanonicalName();
        try {
            accessibilityEnabled = Settings.Secure.getInt(
                    reactContext.getApplicationContext().getContentResolver(),
                    android.provider.Settings.Secure.ACCESSIBILITY_ENABLED);
        } catch (Settings.SettingNotFoundException e) {
            Log.e("AppBlockerModule", "Error finding setting, default accessibility to not found: " + e.getMessage());
        }
        TextUtils.SimpleStringSplitter mStringColonSplitter = new TextUtils.SimpleStringSplitter(':');

        if (accessibilityEnabled == 1) {
            String settingValue = Settings.Secure.getString(
                    reactContext.getApplicationContext().getContentResolver(),
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (settingValue != null) {
                mStringColonSplitter.setString(settingValue);
                while (mStringColonSplitter.hasNext()) {
                    String accessibilityService = mStringColonSplitter.next();
                    if (accessibilityService.equalsIgnoreCase(service)) {
                        promise.resolve(true);
                        return;
                    }
                }
            }
        }
        promise.resolve(false);
    }

    @ReactMethod
    public void requestAccessibilityPermission(Promise promise) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
        promise.resolve(true);
    }

    @ReactMethod
    public void updateBlockedApps(ReadableArray packages) {
        String[] arr = new String[packages.size()];
        for (int i = 0; i < packages.size(); i++) {
            arr[i] = packages.getString(i);
        }
        
        // Save to SharedPreferences so it survives app kill
        SharedPreferences prefs = reactContext.getSharedPreferences("NiyantranPrefs", Context.MODE_PRIVATE);
        prefs.edit().putString("blocked_apps", TextUtils.join(",", arr)).apply();
        
        AppBlockerAccessibilityService service = AppBlockerAccessibilityService.getInstance();
        if (service != null) {
            service.reloadBlockedApps();
        }
    }



    @ReactMethod
    public void goHome() {
        Intent startMain = new Intent(Intent.ACTION_MAIN);
        startMain.addCategory(Intent.CATEGORY_HOME);
        startMain.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(startMain);
    }

    @ReactMethod
    public void saveAuthToken(String token, Promise promise) {
        SharedPreferences prefs = reactContext.getSharedPreferences("NiyantranPrefs", Context.MODE_PRIVATE);
        prefs.edit().putString("auth_token", token).apply();
        promise.resolve(true);
    }

    @ReactMethod
    public void getAuthToken(Promise promise) {
        SharedPreferences prefs = reactContext.getSharedPreferences("NiyantranPrefs", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        promise.resolve(token);
    }

    @ReactMethod
    public void checkUsagePermission(Promise promise) {
        AppOpsManager appOps = (AppOpsManager) reactContext.getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(), reactContext.getPackageName());
        if (mode == AppOpsManager.MODE_ALLOWED) {
            promise.resolve(true);
        } else {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestUsagePermission(Promise promise) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
        promise.resolve(true);
    }

    @ReactMethod
    public void getDailyUsage(Promise promise) {
        try {
            UsageStatsHelper helper = new UsageStatsHelper(reactContext);
            String json = helper.getDailyUsage();
            promise.resolve(json);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getCurrentForegroundApp(Promise promise) {
        AppBlockerAccessibilityService service = AppBlockerAccessibilityService.getInstance();
        if (service != null) {
            promise.resolve(service.getCurrentForegroundApp());
        } else {
            promise.resolve(null);
        }
    }

    @ReactMethod
    public void logout(Promise promise) {
        SharedPreferences prefs = reactContext.getSharedPreferences("NiyantranPrefs", Context.MODE_PRIVATE);
        prefs.edit().remove("auth_token").apply();
        promise.resolve(true);
    }
}
