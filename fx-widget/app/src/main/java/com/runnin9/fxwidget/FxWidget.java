package com.runnin9.fxwidget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/** 바탕화면 위젯: 환율과 저장해 둔 원화 금액의 달러 환산을 보여줍니다. */
public class FxWidget extends AppWidgetProvider {
    static final String ACTION_REFRESH = "com.runnin9.fxwidget.REFRESH";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        refresh(ctx);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (ACTION_REFRESH.equals(intent.getAction())) refresh(ctx);
        else super.onReceive(ctx, intent);
    }

    /** 캐시로 먼저 그리고, 백그라운드에서 최신 환율을 받아 다시 그립니다. */
    private void refresh(Context ctx) {
        final Context app = ctx.getApplicationContext();
        render(app, true);
        final PendingResult pending = goAsync();
        new Thread(() -> {
            try {
                Rates.fetch(app);
                render(app, false);
            } finally {
                pending.finish();
            }
        }).start();
    }

    /** 모든 위젯 다시 그리기 (앱에서 금액을 바꿨을 때). */
    static void updateAll(Context ctx) {
        render(ctx.getApplicationContext(), false);
    }

    private static void render(Context ctx, boolean loading) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, FxWidget.class));
        if (ids.length == 0) return;

        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget);
        Rates.Info info = Rates.cached(ctx);
        long krw = Rates.amount(ctx);

        v.setTextViewText(R.id.w_krw, "₩" + Rates.krw(krw));
        if (info == null) {
            v.setTextViewText(R.id.w_usd, "$ –");
            v.setTextViewText(R.id.w_rate, loading ? "환율 불러오는 중…" : "환율을 불러오지 못했어요");
            v.setTextViewText(R.id.w_meta, loading ? "" : "↻ 를 눌러 다시 시도");
        } else {
            v.setTextViewText(R.id.w_usd, "$" + Rates.usd(krw / info.rate));
            v.setTextViewText(R.id.w_rate, Rates.rateText(info));
            boolean stale = System.currentTimeMillis() - info.fetched > 3 * 60 * 60 * 1000L;
            String meta = stale
                ? "저장된 환율 · " + Rates.timeLabel(info.fetched) + " 받음"
                : info.source + " · " + Rates.timeLabel(info.fetched);
            v.setTextViewText(R.id.w_meta, loading ? "갱신 중…" : meta);
        }

        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(ctx, 0, open, flags));
        Intent refresh = new Intent(ctx, FxWidget.class).setAction(ACTION_REFRESH);
        v.setOnClickPendingIntent(R.id.w_refresh, PendingIntent.getBroadcast(ctx, 1, refresh, flags));

        mgr.updateAppWidget(ids, v);
    }
}
