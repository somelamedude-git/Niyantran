package com.frontend;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.os.CountDownTimer;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.pm.PackageManager;
import android.content.pm.ApplicationInfo;

import java.util.HashMap;

public class OverlayManager {

    private static final String TAG = "OverlayManager";
    private static OverlayManager instance;
    private Context context;
    private WindowManager windowManager;
    private View overlayView;
    private boolean isShowing = false;
    private String currentBlockedPackage = "";

    // Timers
    private CountDownTimer firstTimer;
    private CountDownTimer secondTimer;
    private boolean firstStageDone = false;

    // Temporary Whitelist
    private HashMap<String, Long> whitelistedApps = new HashMap<>();

    private OverlayManager(Context context) {
        this.context = context;
        this.windowManager = (WindowManager) this.context.getSystemService(Context.WINDOW_SERVICE);
    }

    public static synchronized OverlayManager getInstance(Context context) {
        if (instance == null) {
            instance = new OverlayManager(context);
        } else {
            instance.context = context;
            instance.windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        }
        return instance;
    }

    public boolean isOverlayShowing() {
        return isShowing;
    }

    public void showOverlay(String packageName) {
        // Check if whitelisted
        Long expireTime = whitelistedApps.get(packageName);
        if (expireTime != null && System.currentTimeMillis() < expireTime) {
            Log.d(TAG, "App is temporarily whitelisted: " + packageName);
            return;
        }

        // If already showing for THIS package, do nothing
        if (isShowing && currentBlockedPackage.equals(packageName)) {
            return;
        }

        // If showing for a DIFFERENT package, remove old one first
        if (isShowing) {
            removeOverlay();
        }

        currentBlockedPackage = packageName;

        // Run on main thread because we are dealing with Views
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                overlayView = createOverlayView(packageName);

                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.MATCH_PARENT,
                        WindowManager.LayoutParams.MATCH_PARENT,
                        WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
                                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS |
                                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                        PixelFormat.TRANSLUCENT
                );

                params.gravity = Gravity.CENTER;

                windowManager.addView(overlayView, params);
                isShowing = true;
                Log.d(TAG, "Overlay attached for " + packageName);

                startFirstTimer();
            } catch (Exception e) {
                Log.e(TAG, "Failed to attach overlay", e);
            }
        });
    }

    public void removeOverlay() {
        if (!isShowing || overlayView == null) {
            return;
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                cancelTimers();
                if (overlayView != null && overlayView.getWindowToken() != null) {
                    windowManager.removeView(overlayView);
                }
                overlayView = null;
                isShowing = false;
                currentBlockedPackage = "";
                firstStageDone = false;
                Log.d(TAG, "Overlay removed");
            } catch (Exception e) {
                Log.e(TAG, "Failed to remove overlay", e);
            }
        });
    }

    private View createOverlayView(String packageName) {
        LinearLayout root = new LinearLayout(context);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#E6000000")); // 90% black
        root.setPadding(60, 60, 60, 60);

        // Title
        TextView title = new TextView(context);
        title.setText("⚠ BLOCKED APP");
        title.setTextColor(Color.parseColor("#EF4444")); // Red
        title.setTextSize(28);
        title.setTypeface(null, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        root.addView(title);

        addSpace(root, 20);

        // App name
        TextView appLabel = new TextView(context);
        appLabel.setText(getAppName(packageName) + " is blocked.");
        appLabel.setTextColor(Color.parseColor("#F1F5F9"));
        appLabel.setTextSize(18);
        appLabel.setGravity(Gravity.CENTER);
        root.addView(appLabel);

        addSpace(root, 30);

        // Message
        TextView message = new TextView(context);
        message.setTag("message_text");
        message.setText("Are you sure you want to do this?");
        message.setTextColor(Color.parseColor("#94A3B8"));
        message.setTextSize(16);
        message.setGravity(Gravity.CENTER);
        root.addView(message);

        addSpace(root, 20);

        // Countdown text
        TextView countdown = new TextView(context);
        countdown.setTag("countdown_text");
        countdown.setTextColor(Color.parseColor("#F59E0B"));
        countdown.setTextSize(14);
        countdown.setGravity(Gravity.CENTER);
        root.addView(countdown);

        addSpace(root, 30);

        // Continue Button
        Button continueBtn = new Button(context);
        continueBtn.setTag("continue_btn");
        continueBtn.setText("CONTINUE (10s)");
        continueBtn.setEnabled(false);
        continueBtn.setBackgroundColor(Color.parseColor("#334155"));
        continueBtn.setTextColor(Color.parseColor("#64748B"));
        continueBtn.setPadding(40, 20, 40, 20);
        continueBtn.setOnClickListener(v -> handleContinueClick());
        root.addView(continueBtn);

        addSpace(root, 15);

        // Close Button
        Button closeBtn = new Button(context);
        closeBtn.setText("← CLOSE APP");
        closeBtn.setBackgroundColor(Color.parseColor("#EF4444"));
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setPadding(40, 20, 40, 20);
        closeBtn.setOnClickListener(v -> handleCloseClick());
        root.addView(closeBtn);

        return root;
    }

    private void handleContinueClick() {
        if (!firstStageDone) {
            return;
        }

        // Start Stage 2
        firstStageDone = false; // Reset so they can't spam it

        if (overlayView != null) {
            TextView message = overlayView.findViewWithTag("message_text");
            Button continueBtn = overlayView.findViewWithTag("continue_btn");

            if (message != null) {
                message.setText("For real bro? This will be tracked.");
                message.setTextColor(Color.parseColor("#EF4444"));
            }

            if (continueBtn != null) {
                continueBtn.setEnabled(false);
                continueBtn.setBackgroundColor(Color.parseColor("#334155"));
                continueBtn.setTextColor(Color.parseColor("#64748B"));
            }
        }

        startSecondTimer();
    }

    private void startFirstTimer() {
        cancelTimers();
        firstStageDone = false;

        firstTimer = new CountDownTimer(10000, 1000) {
            @Override
            public void onTick(long ms) {
                updateTimersUI((int)(ms / 1000) + 1, false, false);
            }

            @Override
            public void onFinish() {
                firstStageDone = true;
                updateTimersUI(0, true, false);
            }
        }.start();
    }

    private void startSecondTimer() {
        cancelTimers();

        secondTimer = new CountDownTimer(5000, 1000) {
            @Override
            public void onTick(long ms) {
                updateTimersUI((int)(ms / 1000) + 1, false, true);
            }

            @Override
            public void onFinish() {
                if (overlayView != null) {
                    TextView countdown = overlayView.findViewWithTag("countdown_text");
                    Button continueBtn = overlayView.findViewWithTag("continue_btn");

                    if (countdown != null) countdown.setText("");
                    if (continueBtn != null) {
                        continueBtn.setText("YES, CONTINUE");
                        continueBtn.setEnabled(true);
                        continueBtn.setBackgroundColor(Color.parseColor("#10B981")); // Green
                        continueBtn.setTextColor(Color.WHITE);

                        // Final bypass action
                        continueBtn.setOnClickListener(v -> {
                            Log.d(TAG, "Temporary bypass activated for " + currentBlockedPackage);
                            // Whitelist for 15 minutes
                            whitelistedApps.put(currentBlockedPackage, System.currentTimeMillis() + (15 * 60 * 1000));
                            removeOverlay();
                        });
                    }
                }
            }
        }.start();
    }

    private void updateTimersUI(int secs, boolean finished, boolean isStageTwo) {
        if (overlayView == null) return;

        TextView countdown = overlayView.findViewWithTag("countdown_text");
        Button continueBtn = overlayView.findViewWithTag("continue_btn");

        if (countdown == null || continueBtn == null) return;

        if (!finished) {
            if (isStageTwo) {
                countdown.setText("Really sure? (" + secs + "s)");
            } else {
                countdown.setText("Continue unlocks in " + secs + "s...");
            }
            continueBtn.setText("CONTINUE (" + secs + "s)");
        } else {
            countdown.setText("");
            continueBtn.setText("CONTINUE");
            continueBtn.setEnabled(true);
            continueBtn.setBackgroundColor(Color.parseColor("#F59E0B")); // Amber
            continueBtn.setTextColor(Color.parseColor("#0F172A")); // Dark Slate
        }
    }

    private void handleCloseClick() {
        Log.d(TAG, "Close app clicked");
        // Remove overlay
        removeOverlay();
        
        // Go Home
        Intent home = new Intent(Intent.ACTION_MAIN);
        home.addCategory(Intent.CATEGORY_HOME);
        home.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(home);
    }

    private void cancelTimers() {
        if (firstTimer != null) {
            firstTimer.cancel();
            firstTimer = null;
        }
        if (secondTimer != null) {
            secondTimer.cancel();
            secondTimer = null;
        }
    }

    private void addSpace(LinearLayout parent, int dp) {
        View space = new View(context);
        space.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp));
        parent.addView(space);
    }

    private String getAppName(String packageName) {
        PackageManager pm = context.getPackageManager();
        try {
            ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
            return pm.getApplicationLabel(appInfo).toString();
        } catch (PackageManager.NameNotFoundException e) {
            return packageName;
        }
    }
}
