package com.runnin9.fxwidget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** 환율 받아오기 + 저장. 웹 버전(fx/index.html)과 같은 소스를 같은 순서로 시도합니다. */
final class Rates {
    private Rates() {}

    static final long MAX_KRW = 10_000_000_000_000L;
    private static final String PREFS = "fx";

    /** 1 USD = rate KRW */
    static final class Info {
        final double rate;
        final String source;
        final long updated;  // 환율 기준 시각
        final long fetched;  // 받아온 시각

        Info(double rate, String source, long updated, long fetched) {
            this.rate = rate; this.source = source; this.updated = updated; this.fetched = fetched;
        }
    }

    private interface Parser { double[] parse(JSONObject j) throws Exception; } // {rate, updatedMillis}

    private static final String[] NAMES = { "Coinbase", "ExchangeRate-API", "currency-api", "Frankfurter(ECB)" };
    private static final String[] URLS = {
        "https://api.coinbase.com/v2/exchange-rates?currency=USD",
        "https://open.er-api.com/v6/latest/USD",
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json",
        "https://api.frankfurter.app/latest?from=USD&to=KRW"
    };
    private static final Parser[] PARSERS = {
        j -> new double[] { Double.parseDouble(j.getJSONObject("data").getJSONObject("rates").getString("KRW")), System.currentTimeMillis() },
        j -> new double[] { j.getJSONObject("rates").getDouble("KRW"), j.getLong("time_last_update_unix") * 1000.0 },
        j -> new double[] { j.getJSONObject("usd").getDouble("krw"), parseDay(j.getString("date")) },
        j -> new double[] { j.getJSONObject("rates").getDouble("KRW"), parseDay(j.getString("date")) }
    };

    /** 네트워크에서 받아와 저장. 모두 실패하면 null. 메인 스레드에서 부르지 마세요. */
    static Info fetch(Context ctx) {
        for (int i = 0; i < URLS.length; i++) {
            try {
                double[] r = PARSERS[i].parse(new JSONObject(get(URLS[i])));
                if (!(r[0] > 100 && r[0] < 10000)) continue;
                long now = System.currentTimeMillis();
                Info info = new Info(r[0], NAMES[i], r[1] > 0 ? (long) r[1] : now, now);
                save(ctx, info);
                return info;
            } catch (Exception ignored) {
                // 다음 소스 시도
            }
        }
        return null;
    }

    private static String get(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(3000);
        c.setReadTimeout(3000);
        c.setUseCaches(false);
        try (InputStream in = c.getInputStream()) {
            if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } finally {
            c.disconnect();
        }
    }

    private static double parseDay(String s) throws Exception {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        return f.parse(s).getTime();
    }

    // ---------- 저장 ----------
    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static void save(Context ctx, Info info) {
        prefs(ctx).edit()
            .putString("rate", Double.toString(info.rate))
            .putString("source", info.source)
            .putLong("updated", info.updated)
            .putLong("fetched", info.fetched)
            .apply();
    }

    static Info cached(Context ctx) {
        SharedPreferences p = prefs(ctx);
        String rate = p.getString("rate", null);
        if (rate == null) return null;
        return new Info(Double.parseDouble(rate), p.getString("source", ""), p.getLong("updated", 0), p.getLong("fetched", 0));
    }

    static long amount(Context ctx) {
        return prefs(ctx).getLong("krw", 100_000L);
    }

    static void setAmount(Context ctx, long krw) {
        prefs(ctx).edit().putLong("krw", Math.max(0, Math.min(krw, MAX_KRW))).apply();
    }

    // ---------- 표시 ----------
    static String krw(long n) {
        return NumberFormat.getIntegerInstance(Locale.KOREA).format(n);
    }

    static String usd(double n) {
        NumberFormat f = NumberFormat.getNumberInstance(Locale.US);
        f.setMinimumFractionDigits(2);
        f.setMaximumFractionDigits(2);
        return f.format(n);
    }

    static String rateText(Info info) {
        return "1 USD = " + usd(info.rate) + "원";
    }

    /** 123456789 → "1억 2,345만 6,789원" */
    static String koreanUnits(long n) {
        if (n < 10_000) return "";
        long[] div = { 1_000_000_000_000L, 100_000_000L, 10_000L };
        String[] unit = { "조", "억", "만" };
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < div.length; i++) {
            long q = n / div[i];
            if (q > 0) { sb.append(krw(q)).append(unit[i]).append(' '); n -= q * div[i]; }
        }
        if (n > 0) sb.append(krw(n));
        return sb.toString().trim() + "원";
    }

    static String timeLabel(long ms) {
        Calendar d = Calendar.getInstance(), now = Calendar.getInstance();
        d.setTimeInMillis(ms);
        boolean today = d.get(Calendar.YEAR) == now.get(Calendar.YEAR) && d.get(Calendar.DAY_OF_YEAR) == now.get(Calendar.DAY_OF_YEAR);
        String hm = new SimpleDateFormat("HH:mm", Locale.KOREA).format(new Date(ms));
        return today ? "오늘 " + hm : new SimpleDateFormat("M/d ", Locale.KOREA).format(new Date(ms)) + hm;
    }
}
