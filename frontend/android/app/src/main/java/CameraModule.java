package com.frontend;

import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;

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

    public CameraModule(ReactApplicationContext context) {
        super(context);
        this.context = context;
    }

    @Override
    public String getName() {
        return "CameraModule";
    }

    @ReactMethod
    public void triggerNotification() {
        Context ctx = context;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    "camera_channel",
                    "Camera Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );

            NotificationManager manager =
                    ctx.getSystemService(NotificationManager.class);

            manager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(ctx, CameraActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                ctx,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(ctx, "camera_channel")
                        .setSmallIcon(android.R.drawable.ic_menu_camera)
                        .setContentTitle("TEST")
                        .setContentText("If you see this, it works")
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setContentIntent(pendingIntent)
                        .setAutoCancel(true);

        NotificationManagerCompat.from(ctx).notify(1, builder.build());
    }

    @ReactMethod
    public void startPeriodicNotifications() {

        PeriodicWorkRequest workRequest =
            new PeriodicWorkRequest.Builder(
                    NotificationWorker.class,
                    15, TimeUnit.MINUTES
            ).build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "camera_notification",
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
        );
    }

    @ReactMethod
    public void startForegroundService() {
        Intent intent = new Intent(context, ForegroundService.class);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }
}