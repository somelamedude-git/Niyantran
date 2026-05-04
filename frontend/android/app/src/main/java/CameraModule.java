package com.frontend;

import android.app.PendingIntent;
import android.content.Intent;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    "camera_channel",
                    "Camera Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );

            NotificationManager manager =
                    context.getSystemService(NotificationManager.class);

            manager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(context, CameraActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(context, "camera_channel")
                        .setSmallIcon(android.R.drawable.ic_menu_camera)
                        .setContentTitle("TEST 🔥")
                        .setContentText("If you see this, it works")
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setContentIntent(pendingIntent)
                        .setAutoCancel(true);

        NotificationManagerCompat.from(context).notify(1, builder.build());
    }
}