package com.frontend;

import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.app.usage.UsageEvents;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import android.content.Intent;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Map;
import java.util.List;

public class UsageStatsHelper {

    private static final String TAG = "UsageStatsHelper";
    private Context context;

    public UsageStatsHelper(Context context) {
        this.context = context;
    }

    public String getDailyUsage() {
        return getUsageForTimeRange(Calendar.DAY_OF_YEAR, 1);
    }

    public String getWeeklyUsage() {
        return getUsageForTimeRange(Calendar.WEEK_OF_YEAR, 1);
    }

    private String getUsageForTimeRange(int calendarField, int amount) {
        UsageStatsManager usageStatsManager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) {
            return "[]";
        }

        Calendar calendar = Calendar.getInstance();
        long endTime = calendar.getTimeInMillis();
        
        // Start from beginning of the current day/week
        if (calendarField == Calendar.DAY_OF_YEAR) {
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
        } else if (calendarField == Calendar.WEEK_OF_YEAR) {
            calendar.set(Calendar.DAY_OF_WEEK, calendar.getFirstDayOfWeek());
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
        } else {
            calendar.add(calendarField, -amount);
        }
        
        long startTime = calendar.getTimeInMillis();

        UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
        UsageEvents.Event event = new UsageEvents.Event();
        
        java.util.HashMap<String, Long> appUsageMap = new java.util.HashMap<>();
        java.util.HashMap<String, Long> lastResumeMap = new java.util.HashMap<>();

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event);
            String packageName = event.getPackageName();
            int eventType = event.getEventType();
            long timestamp = event.getTimeStamp();

            if (eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                lastResumeMap.put(packageName, timestamp);
            } else if (eventType == UsageEvents.Event.ACTIVITY_PAUSED || eventType == UsageEvents.Event.ACTIVITY_STOPPED) {
                Long resumeTime = lastResumeMap.get(packageName);
                if (resumeTime != null) {
                    long duration = timestamp - resumeTime;
                    if (duration > 0) {
                        long currentTotal = appUsageMap.containsKey(packageName) ? appUsageMap.get(packageName) : 0L;
                        appUsageMap.put(packageName, currentTotal + duration);
                    }
                    lastResumeMap.remove(packageName);
                }
            }
        }

        // Handle apps still running
        for (Map.Entry<String, Long> entry : lastResumeMap.entrySet()) {
            String packageName = entry.getKey();
            long resumeTime = entry.getValue();
            long duration = endTime - resumeTime;
            if (duration > 0) {
                long currentTotal = appUsageMap.containsKey(packageName) ? appUsageMap.get(packageName) : 0L;
                appUsageMap.put(packageName, currentTotal + duration);
            }
        }

        PackageManager pm = context.getPackageManager();
        List<JSONObject> appUsageList = new ArrayList<>();

        Intent homeIntent = new Intent(Intent.ACTION_MAIN);
        homeIntent.addCategory(Intent.CATEGORY_HOME);
        android.content.pm.ResolveInfo defaultLauncher = pm.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY);
        String defaultLauncherPackage = defaultLauncher != null ? defaultLauncher.activityInfo.packageName : "";

        for (Map.Entry<String, Long> entry : appUsageMap.entrySet()) {
            long totalTimeInForeground = entry.getValue();

            if (totalTimeInForeground > 1000) { // filter less than 1 sec
                String packageName = entry.getKey();
                
                // Skip the home screen launcher
                if (packageName.equals(defaultLauncherPackage)) {
                    continue;
                }
                
                // Skip non-launchable apps
                android.content.Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
                if (launchIntent == null) {
                    continue;
                }

                try {
                    ApplicationInfo appInfo = pm.getApplicationInfo(packageName, PackageManager.GET_META_DATA);
                    String appName = pm.getApplicationLabel(appInfo).toString();
                    
                    JSONObject appObj = new JSONObject();
                    appObj.put("packageName", packageName);
                    appObj.put("appName", appName);
                    appObj.put("totalTimeInForeground", totalTimeInForeground);
                    appUsageList.add(appObj);

                } catch (PackageManager.NameNotFoundException e) {
                    // App uninstalled
                } catch (JSONException e) {
                    Log.e(TAG, "JSON error", e);
                }
            }
        }

        Collections.sort(appUsageList, new Comparator<JSONObject>() {
            @Override
            public int compare(JSONObject a, JSONObject b) {
                try {
                    long valA = a.getLong("totalTimeInForeground");
                    long valB = b.getLong("totalTimeInForeground");
                    return Long.compare(valB, valA);
                } catch (JSONException e) {
                    return 0;
                }
            }
        });

        JSONArray jsonArray = new JSONArray(appUsageList);
        return jsonArray.toString();
    }

    public int getAppOpenCount(String packageName) {
        UsageStatsManager usageStatsManager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) return 0;

        Calendar calendar = Calendar.getInstance();
        long endTime = calendar.getTimeInMillis();
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        long startTime = calendar.getTimeInMillis();

        UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
        UsageEvents.Event event = new UsageEvents.Event();
        int count = 0;

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event);
            if (event.getPackageName().equals(packageName)) {
                if (event.getEventType() == UsageEvents.Event.ACTIVITY_RESUMED) {
                    count++;
                }
            }
        }
        return count;
    }
}
