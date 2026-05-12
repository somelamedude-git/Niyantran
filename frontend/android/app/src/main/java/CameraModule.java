package com.frontend;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.concurrent.TimeUnit;

import android.content.Context;
import android.content.Intent;
import android.app.PendingIntent;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.provider.Settings;
import android.net.Uri;
import com.facebook.react.bridge.Promise;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class CameraModule extends ReactContextBaseJavaModule {

    ReactApplicationContext context;
    public static ReactApplicationContext reactContextStatic;

    public CameraModule(ReactApplicationContext context) {
        super(context);
        this.context = context;
        reactContextStatic = context;
    }

    @Override
    public String getName() {
        return "CameraModule";
    }

    @ReactMethod
    public void startForegroundService(String token) {
        Intent intent = new Intent(context, ForegroundService.class);
        intent.putExtra("token", token);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    @ReactMethod
    public void stopForegroundService() {
        Intent intent = new Intent(context, ForegroundService.class);
        context.stopService(intent);
    }

    @ReactMethod
    public void requestOverlayPermission(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(context)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + context.getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                promise.resolve(false); // Indicates it was not granted initially
            } else {
                promise.resolve(true); // Already granted
            }
        } else {
            promise.resolve(true); // Not required before M
        }
    }

    @ReactMethod
    public void enableGrayscale(boolean enable, Promise promise) {
        try {
            android.content.ContentResolver cr = reactContextStatic.getContentResolver();
            android.provider.Settings.Secure.putInt(cr, "accessibility_display_daltonizer_enabled", enable ? 1 : 0);
            android.provider.Settings.Secure.putInt(cr, "accessibility_display_daltonizer", enable ? 0 : -1);
            promise.resolve(true);
        } catch (SecurityException e) {
            promise.reject("PERMISSION_DENIED", "WRITE_SECURE_SETTINGS permission is required. Run: adb shell pm grant com.frontend android.permission.WRITE_SECURE_SETTINGS");
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}