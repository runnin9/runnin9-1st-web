package com.runnin9.fxwidget;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

/** 금액 입력 화면. 여기서 입력한 금액이 위젯에 표시됩니다. */
public class MainActivity extends Activity {
    private EditText krwEdit;
    private TextView usdText, unitText, rateText, metaText;
    private Button refreshBtn;
    private final Handler main = new Handler(Looper.getMainLooper());
    private long krw;
    private boolean formatting, loading;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        krwEdit = findViewById(R.id.krw);
        usdText = findViewById(R.id.usd);
        unitText = findViewById(R.id.units);
        rateText = findViewById(R.id.rate);
        metaText = findViewById(R.id.meta);
        refreshBtn = findViewById(R.id.refresh);

        krw = Rates.amount(this);
        setKrwText();

        krwEdit.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) {}
            @Override public void onTextChanged(CharSequence s, int a, int b, int c) {}
            @Override public void afterTextChanged(Editable s) {
                if (formatting) return;
                String digits = s.toString().replaceAll("[^0-9]", "");
                if (digits.length() > 14) digits = digits.substring(0, 14);
                krw = digits.isEmpty() ? 0 : Math.min(Long.parseLong(digits), Rates.MAX_KRW);
                setKrwText();
                onAmountChanged();
            }
        });

        int[] chipIds = { R.id.add1, R.id.add5, R.id.add10, R.id.add100, R.id.clear };
        long[] chipVals = { 10_000, 50_000, 100_000, 1_000_000, 0 };
        for (int i = 0; i < chipIds.length; i++) {
            final long add = chipVals[i];
            findViewById(chipIds[i]).setOnClickListener(v -> {
                krw = add == 0 ? 0 : Math.min(krw + add, Rates.MAX_KRW);
                setKrwText();
                onAmountChanged();
            });
        }

        refreshBtn.setOnClickListener(v -> loadRate());
        render();
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadRate();
    }

    /** 콤마를 넣어 다시 쓰고 커서는 끝으로. */
    private void setKrwText() {
        formatting = true;
        String text = krw == 0 ? "" : Rates.krw(krw);
        if (!text.equals(krwEdit.getText().toString())) {
            krwEdit.setText(text);
            krwEdit.setSelection(text.length());
        }
        formatting = false;
    }

    private void onAmountChanged() {
        Rates.setAmount(this, krw);
        FxWidget.updateAll(this);
        render();
    }

    private void loadRate() {
        if (loading) return;
        loading = true;
        refreshBtn.setEnabled(false);
        metaText.setText("최신 환율 받는 중…");
        new Thread(() -> {
            Rates.Info info = Rates.fetch(getApplicationContext());
            main.post(() -> {
                loading = false;
                refreshBtn.setEnabled(true);
                render();
                if (info == null) {
                    metaText.setText(Rates.cached(this) == null
                        ? "환율을 불러오지 못했어요. 인터넷 연결을 확인해 주세요."
                        : "오프라인 · 저장된 환율 사용 중");
                }
                FxWidget.updateAll(this);
            });
        }).start();
    }

    private void render() {
        Rates.Info info = Rates.cached(this);
        unitText.setText(Rates.koreanUnits(krw));
        if (info == null) {
            usdText.setText("$ –");
            rateText.setText("환율 불러오는 중…");
            if (!loading) metaText.setText("");
            return;
        }
        usdText.setText("$" + Rates.usd(krw / info.rate));
        rateText.setText(Rates.rateText(info));
        if (!loading) metaText.setText(info.source + " · " + Rates.timeLabel(info.fetched) + " 받음");
    }
}
