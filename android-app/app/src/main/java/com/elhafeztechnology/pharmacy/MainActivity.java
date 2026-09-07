package com.elhafeztechnology.pharmacy;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.text.InputType;
import android.view.View;
import android.view.MotionEvent;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Button;
import android.widget.TextView;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.net.URI;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 6201;
    private static final int STORAGE_PERMISSION_REQUEST = 6202;
    private static final String PREFS = "elhafez_pharmacy_android";
    private static final String PREF_URL = "web_app_url";
    private static final String PREF_CODE = "activation_code";
    private static final String PREF_COMPANY = "company_name";

    private WebView webView;
    private WebView printWebView;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private View activationPanel;
    private EditText activationCode;
    private TextView activationError;
    private Button activationButton;
    private ProgressBar activationProgress;
    private ValueCallback<Uri[]> filePathCallback;
    private String currentBaseUrl;
    private boolean refreshAllowed = true;
    private boolean refreshGestureStartedAtTop = false;
    private boolean refreshGestureActive = false;
    private int activationRetryCount = 0;

    private String pendingDownloadUrl;
    private String pendingDownloadUserAgent;
    private String pendingDownloadDisposition;
    private String pendingDownloadMime;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.parseColor("#063F49"));
        getWindow().setNavigationBarColor(Color.parseColor("#063F49"));
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        progressBar = findViewById(R.id.progressBar);
        activationPanel = findViewById(R.id.activationPanel);
        activationCode = findViewById(R.id.activationCode);
        activationError = findViewById(R.id.activationError);
        activationButton = findViewById(R.id.activationButton);
        activationProgress = findViewById(R.id.activationProgress);

        configureWebView();
        configurePullToRefresh();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    this::handleSystemBack
            );
        }

        activationButton.setOnClickListener(v -> activateCompany());
        activationCode.setOnEditorActionListener((v, actionId, event) -> { activateCompany(); return true; });

        String saved = getSharedPreferences(PREFS, MODE_PRIVATE).getString(PREF_URL, "");
        String savedCode = getSharedPreferences(PREFS, MODE_PRIVATE).getString(PREF_CODE, "");
        if (!savedCode.isEmpty()) activationCode.setText(savedCode);
        if (savedCode.isEmpty()) {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().remove(PREF_URL).remove(PREF_COMPANY).apply();
            showActivationPanel();
        } else {
            // Never trust a previously saved Railway URL as the source of truth.
            // Railway domains can be regenerated/re-routed; resolve the company code
            // through Owner Control Center on every cold start before opening the tenant.
            String owner = ownerCenterUrl();
            if (!isUsableAppUrl(owner)) {
                showActivationPanel();
                showActivationError("عنوان Owner Control Center غير مضبوط في نسخة التطبيق.");
            } else {
                showActivationPanel();
                activationProgress.setVisibility(View.VISIBLE);
                activationButton.setEnabled(false);
                final String code = savedCode.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
                new Thread(() -> resolveActivation(owner, code)).start();
            }
        }
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setTextZoom(100);
        settings.setDefaultTextEncodingName("UTF-8");
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSaveFormData(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }
        settings.setUserAgentString(settings.getUserAgentString() + " ElhafezPharmacyAndroid/7.0.45");

        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
        }

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                stopRefreshing();
                progressBar.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
                super.onPageFinished(view, url);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                WebView popup = new WebView(MainActivity.this);
                popup.getSettings().setJavaScriptEnabled(true);
                popup.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView child, WebResourceRequest request) {
                        routePopup(child, request.getUrl());
                        return true;
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView child, String url) {
                        routePopup(child, Uri.parse(url));
                        return true;
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    Intent chooser = params.createIntent();
                    chooser.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException e) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this, "لا يوجد مدير ملفات متاح.", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            pendingDownloadUrl = url;
            pendingDownloadUserAgent = userAgent;
            pendingDownloadDisposition = contentDisposition;
            pendingDownloadMime = mimeType;
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P
                    && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, STORAGE_PERMISSION_REQUEST);
            } else {
                startDownload(url, userAgent, contentDisposition, mimeType);
            }
        });
    }

    private void routePopup(WebView child, Uri uri) {
        if (uri != null && isSameHost(uri.toString(), currentBaseUrl)) {
            webView.loadUrl(uri.toString());
        } else if (uri != null) {
            openExternal(uri);
        }
        child.destroy();
    }

    private void configurePullToRefresh() {
        swipeRefresh.setColorSchemeColors(Color.parseColor("#087486"), Color.parseColor("#C69226"));
        swipeRefresh.setProgressBackgroundColorSchemeColor(Color.WHITE);
        // Facebook-style pull refresh: scrolling can reach the top freely, but refresh only
        // arms when a NEW gesture starts while the page is already at the top.
        swipeRefresh.setDistanceToTriggerSync(dp(138));
        swipeRefresh.setSlingshotDistance(dp(112));
        swipeRefresh.setProgressViewOffset(false, dp(8), dp(64));

        webView.setOnTouchListener((v, event) -> {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    refreshGestureActive = true;
                    refreshGestureStartedAtTop = refreshAllowed && !webView.canScrollVertically(-1);
                    break;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    refreshGestureActive = false;
                    // Delay reset until SwipeRefreshLayout has finished processing ACTION_UP.
                    swipeRefresh.postDelayed(() -> refreshGestureStartedAtTop = false, 80);
                    break;
                default:
                    break;
            }
            return false; // Never consume WebView touch/scroll events.
        });

        swipeRefresh.setOnChildScrollUpCallback((parent, child) ->
                !refreshAllowed
                        || !refreshGestureStartedAtTop
                        || webView.canScrollVertically(-1)
        );

        swipeRefresh.setOnRefreshListener(() -> {
            if (!refreshAllowed || !refreshGestureStartedAtTop) {
                stopRefreshing();
                return;
            }
            if (!hasInternet()) {
                stopRefreshing();
                Toast.makeText(this, "لا يوجد اتصال بالإنترنت.", Toast.LENGTH_SHORT).show();
                return;
            }
            webView.evaluateJavascript(
                    "(function(){try{return !!(window.__ELHAFEZ_ANDROID_REFRESH__&&window.__ELHAFEZ_ANDROID_REFRESH__());}catch(e){return false;}})()",
                    value -> {
                        if (!"true".equalsIgnoreCase(value)) {
                            // Avoid a hard WebView reload unless the web runtime is unavailable.
                            webView.reload();
                        } else {
                            swipeRefresh.postDelayed(this::stopRefreshing, 4000);
                        }
                    }
            );
        });
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void stopRefreshing() {
        if (swipeRefresh != null) swipeRefresh.setRefreshing(false);
    }

    private boolean handleNavigation(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (scheme.equals("intent")) return openIntentUri(uri.toString());
        if (scheme.equals("tel") || scheme.equals("mailto") || scheme.equals("sms") || scheme.equals("smsto") || scheme.equals("whatsapp")) {
            return openExternal(uri);
        }
        if (scheme.equals("http") || scheme.equals("https")) {
            if (isSameHost(uri.toString(), currentBaseUrl)) return false;
            return openExternal(uri);
        }
        if (scheme.equals("blob") || scheme.equals("data") || scheme.equals("about")) return false;
        return openExternal(uri);
    }

    private boolean openIntentUri(String raw) {
        try {
            Intent intent = Intent.parseUri(raw, Intent.URI_INTENT_SCHEME);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "تعذر فتح التطبيق المطلوب.", Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    private boolean openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception e) {
            Toast.makeText(this, "تعذر فتح الرابط على الجهاز.", Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    private void loadApp(String url) {
        currentBaseUrl = normalizeUrl(url);
        webView.loadUrl(currentBaseUrl);
    }

    private void showActivationPanel() {
        runOnUiThread(() -> {
            activationPanel.setVisibility(View.VISIBLE);
            swipeRefresh.setEnabled(false);
            webView.setVisibility(View.INVISIBLE);
            progressBar.setVisibility(View.GONE);
            activationError.setVisibility(View.GONE);
            activationCode.requestFocus();
        });
    }

    private void hideActivationPanel() {
        runOnUiThread(() -> {
            activationPanel.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
            swipeRefresh.setEnabled(true);
            activationProgress.setVisibility(View.GONE);
            activationButton.setEnabled(true);
        });
    }

    private boolean isActivationVisible() {
        return activationPanel != null && activationPanel.getVisibility() == View.VISIBLE;
    }

    private String ownerCenterUrl() {
        return normalizeUrl(BuildConfig.OWNER_CENTER_URL == null ? "" : BuildConfig.OWNER_CENTER_URL.trim());
    }

    private void activateCompany() {
        String raw = activationCode.getText() == null ? "" : activationCode.getText().toString();
        final String code = raw.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
        if (!code.matches("PH-[A-Z0-9]{6,12}")) {
            showActivationError("اكتب كود التفعيل بالشكل PH-XXXXXXXX");
            return;
        }
        String owner = ownerCenterUrl();
        if (!isUsableAppUrl(owner)) {
            showActivationError("عنوان Owner Control Center غير مضبوط في نسخة التطبيق.");
            return;
        }
        activationError.setVisibility(View.GONE);
        activationProgress.setVisibility(View.VISIBLE);
        activationButton.setEnabled(false);
        new Thread(() -> resolveActivation(owner, code)).start();
    }

    private void resolveActivation(String owner, String code) {
        HttpURLConnection conn = null;
        try {
            String encoded = URLEncoder.encode(code, StandardCharsets.UTF_8.name());
            URL url = new URL(owner + "/api/vendor/mobile/resolve/" + encoded + "?product=PHARMAFLOW");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(12000);
            conn.setReadTimeout(12000);
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("User-Agent", "ElhafezPharmacyAndroid/7.0.45");
            int status = conn.getResponseCode();
            BufferedReader reader = new BufferedReader(new InputStreamReader(
                    status >= 200 && status < 300 ? conn.getInputStream() : conn.getErrorStream(), StandardCharsets.UTF_8));
            StringBuilder body = new StringBuilder();
            String line; while ((line = reader.readLine()) != null) body.append(line);
            JSONObject json = body.length() > 0 ? new JSONObject(body.toString()) : new JSONObject();
            if (status < 200 || status >= 300) {
                String error = json.optString("error", "activation_failed");
                String message = activationMessage(error, json.optString("message", ""));
                if ("company_not_ready".equals(error) && activationRetryCount < 6) {
                    activationRetryCount++;
                    final int retry = activationRetryCount;
                    runOnUiThread(() -> {
                        showActivationError(message + "\nجاري إعادة المحاولة تلقائيًا… (" + retry + "/6)");
                        new Handler(Looper.getMainLooper()).postDelayed(
                                () -> new Thread(() -> resolveActivation(owner, code)).start(), 8000L);
                    });
                    return;
                }
                runOnUiThread(() -> showActivationError(message));
                return;
            }
            String runtimeUrl = json.optString("runtimeUrl", "");
            String company = json.optString("companyName", "");
            if (!isUsableAppUrl(runtimeUrl)) {
                runOnUiThread(() -> showActivationError("نسخة الشركة لم تصبح جاهزة بعد. حاول بعد اكتمال تجهيز Railway."));
                return;
            }
            activationRetryCount = 0;
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                    .putString(PREF_URL, normalizeUrl(runtimeUrl))
                    .putString(PREF_CODE, code)
                    .putString(PREF_COMPANY, company)
                    .apply();
            runOnUiThread(() -> {
                hideActivationPanel();
                loadApp(runtimeUrl);
                Toast.makeText(MainActivity.this, company.isEmpty() ? "تم تفعيل الصيدلية." : "تم الربط بـ " + company, Toast.LENGTH_SHORT).show();
            });
        } catch (Exception e) {
            runOnUiThread(() -> showActivationError("تعذر الاتصال بمركز المالك. تحقق من الإنترنت وحاول مرة أخرى."));
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private String activationMessage(String error, String serverMessage) {
        if ("company_not_found".equals(error)) return "كود التفعيل غير صحيح أو غير موجود.";
        if ("company_inactive".equals(error)) return "اشتراك الشركة غير نشط. راجع Owner Control Center.";
        if ("company_not_ready".equals(error)) return serverMessage.isEmpty() ? "نسخة الشركة لم تجهز على Railway بعد." : serverMessage;
        if ("maintenance_mode".equals(error)) return serverMessage.isEmpty() ? "النظام تحت الصيانة حاليًا." : serverMessage;
        if ("too_many_attempts".equals(error)) return "محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.";
        return "تعذر تفعيل الشركة. راجع الكود وحالة الاشتراك.";
    }

    private void showActivationError(String message) {
        activationProgress.setVisibility(View.GONE);
        activationButton.setEnabled(true);
        activationError.setText(message);
        activationError.setVisibility(View.VISIBLE);
    }

    private void resetCompanyBinding() {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().remove(PREF_URL).remove(PREF_CODE).remove(PREF_COMPANY).apply();
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();
        webView.stopLoading();
        webView.loadUrl("about:blank");
        currentBaseUrl = "";
        activationCode.setText("");
        showActivationPanel();
    }

    private boolean isUsableAppUrl(String url) {
        if (url == null || url.trim().isEmpty() || url.contains("YOUR-PHARMACY-RAILWAY-DOMAIN")) return false;
        try {
            URI uri = URI.create(normalizeUrl(url));
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null;
        } catch (Exception e) {
            return false;
        }
    }

    private String normalizeUrl(String url) {
        String out = url == null ? "" : url.trim();
        while (out.endsWith("/")) out = out.substring(0, out.length() - 1);
        return out;
    }

    private boolean isSameHost(String candidate, String base) {
        try {
            URI a = URI.create(candidate);
            URI b = URI.create(base);
            return a.getHost() != null && b.getHost() != null && a.getHost().equalsIgnoreCase(b.getHost());
        } catch (Exception e) {
            return false;
        }
    }

    private void startDownload(String url, String userAgent, String contentDisposition, String mimeType) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
            request.setTitle(fileName);
            request.setDescription("Elhafez Pharmacy");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            if (mimeType != null && !mimeType.isEmpty()) request.setMimeType(mimeType);
            if (userAgent != null) request.addRequestHeader("User-Agent", userAgent);
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null) request.addRequestHeader("Cookie", cookie);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            manager.enqueue(request);
            Toast.makeText(this, "بدأ تنزيل الملف.", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "تعذر تنزيل الملف.", Toast.LENGTH_SHORT).show();
        }
    }

    private boolean hasInternet() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        Network network = cm.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(network);
        return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && filePathCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == STORAGE_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED && pendingDownloadUrl != null) {
                startDownload(pendingDownloadUrl, pendingDownloadUserAgent, pendingDownloadDisposition, pendingDownloadMime);
            } else {
                Toast.makeText(this, "يلزم إذن التخزين لتنزيل الملف على هذا الإصدار من أندرويد.", Toast.LENGTH_LONG).show();
            }
            pendingDownloadUrl = null;
        }
    }

    private void handleSystemBack() {
        if (isActivationVisible()) { finish(); return; }
        if (webView == null) {
            finish();
            return;
        }
        webView.evaluateJavascript(
                "(function(){try{return !!(window.__ELHAFEZ_ANDROID_BACK__&&window.__ELHAFEZ_ANDROID_BACK__());}catch(e){return false;}})()",
                value -> {
                    if ("true".equalsIgnoreCase(value)) return;
                    if (webView.canGoBack()) webView.goBack();
                    else finish();
                }
        );
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            handleSystemBack();
        } else {
            super.onBackPressed();
        }
    }

    private void printHtmlInternal(String title, String html) {
        runOnUiThread(() -> {
            try {
                if (printWebView != null) {
                    printWebView.stopLoading();
                    printWebView.destroy();
                }
                printWebView = new WebView(MainActivity.this);
                printWebView.getSettings().setJavaScriptEnabled(false);
                printWebView.getSettings().setDefaultTextEncodingName("UTF-8");
                printWebView.setWebViewClient(new WebViewClient() {
                    private boolean started = false;
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        if (started) return;
                        started = true;
                        PrintManager manager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        if (manager == null) {
                            Toast.makeText(MainActivity.this, "خدمة الطباعة غير متاحة.", Toast.LENGTH_SHORT).show();
                            return;
                        }
                        String jobName = (title == null || title.trim().isEmpty()) ? "Elhafez Pharmacy" : title.trim();
                        PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(jobName);
                        boolean isA4 = html != null && (html.contains("size:A4") || html.contains("size: A4"));
                        PrintAttributes.Builder printBuilder = new PrintAttributes.Builder()
                                .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                                .setMediaSize(isA4 ? PrintAttributes.MediaSize.ISO_A4 : PrintAttributes.MediaSize.UNKNOWN_PORTRAIT);
                        if (!isA4) printBuilder.setMinMargins(PrintAttributes.Margins.NO_MARGINS);
                        PrintAttributes attrs = printBuilder.build();
                        manager.print(jobName, adapter, attrs);
                    }
                });
                printWebView.loadDataWithBaseURL(currentBaseUrl, html == null ? "" : html, "text/html", "UTF-8", null);
            } catch (Exception e) {
                Toast.makeText(MainActivity.this, "تعذر فتح الطباعة.", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private final class AndroidBridge {
        @JavascriptInterface
        public void setRefreshEnabled(boolean enabled) {
            runOnUiThread(() -> {
                // Do not toggle SwipeRefreshLayout itself during an active WebView gesture.
                // Toggling the parent view mid-touch can cancel the WebView gesture and make
                // scrolling/taps appear frozen. The child-scroll callback reads this flag instead.
                refreshAllowed = enabled;
                if (!enabled && swipeRefresh != null && swipeRefresh.isRefreshing()) {
                    swipeRefresh.setRefreshing(false);
                }
            });
        }

        @JavascriptInterface
        public void refreshDone() {
            runOnUiThread(MainActivity.this::stopRefreshing);
        }

        @JavascriptInterface
        public void printHtml(String title, String html) {
            printHtmlInternal(title, html);
        }

        @JavascriptInterface
        public void resetCompany() {
            runOnUiThread(MainActivity.this::resetCompanyBinding);
        }

        @JavascriptInterface
        public void shareText(String title, String text) {
            runOnUiThread(() -> {
                try {
                    Intent share = new Intent(Intent.ACTION_SEND);
                    share.setType("text/plain");
                    share.putExtra(Intent.EXTRA_SUBJECT, title == null ? "Elhafez Pharmacy" : title);
                    share.putExtra(Intent.EXTRA_TEXT, text == null ? "" : text);
                    startActivity(Intent.createChooser(share, "مشاركة عبر"));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "تعذر فتح المشاركة.", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override
    protected void onDestroy() {
        if (printWebView != null) {
            printWebView.stopLoading();
            printWebView.destroy();
            printWebView = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.removeJavascriptInterface("AndroidBridge");
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        super.onDestroy();
    }
}
