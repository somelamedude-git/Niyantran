package com.frontend;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.Handler;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.os.Build;
import android.content.Context;

public class ForegroundService extends Service {

    private Handler handler = new Handler();

    private Runnable task = new Runnable() {
        @Override
        public void run() {
            sendNotification();

            handler.postDelayed(this, 30 * 1000); // 15 min
        }
    };

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {

        createChannel();

        startForeground(1, getServiceNotification());

        handler.post(task); // start loop

        return START_STICKY;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    "service_channel",
                    "Foreground Service",
                    NotificationManager.IMPORTANCE_LOW
            );

            NotificationManager manager =
                    getSystemService(NotificationManager.class);

            manager.createNotificationChannel(channel);
        }
    }

    private android.app.Notification getServiceNotification() {
        return new NotificationCompat.Builder(this, "service_channel")
                .setContentTitle("Service Running")
                .setContentText("Camera notifier is active")
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .build();
    }

    private void sendNotification() {

        Context ctx = this;

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
                        .setContentTitle("Reminder")
                        .setContentText("Tap to open camera")
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setContentIntent(pendingIntent)
                        .setAutoCancel(true);

        NotificationManagerCompat.from(ctx).notify((int) System.currentTimeMillis(), builder.build());
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
