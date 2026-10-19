package com.amaarschool.saas;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long lastBackPressTime = 0L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null && webView.canGoBack() && !isRootRoute(webView.getUrl())) {
                    webView.goBack();
                    return;
                }

                long now = System.currentTimeMillis();
                if (now - lastBackPressTime < 2000L) {
                    finish();
                } else {
                    lastBackPressTime = now;
                    Toast.makeText(
                        MainActivity.this,
                        "অ্যাপ থেকে বের হতে আবার ব্যাক চাপুন",
                        Toast.LENGTH_SHORT
                    ).show();
                }
            }
        });
    }

    private boolean isRootRoute(String url) {
        if (url == null || url.isEmpty()) return true;
        if (url.endsWith("offline.html")) return true;
        try {
            Uri uri = Uri.parse(url);
            String path = uri.getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) return true;
            String normalized = path.endsWith("/") && path.length() > 1
                ? path.substring(0, path.length() - 1)
                : path;
            return "/login".equals(normalized)
                || "/register".equals(normalized)
                || "/dashboard".equals(normalized)
                || "/guardian".equals(normalized)
                || "/super-admin/dashboard".equals(normalized)
                || "/super-admin/login".equals(normalized);
        } catch (Exception e) {
            return false;
        }
    }
}
