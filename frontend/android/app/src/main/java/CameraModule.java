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
}