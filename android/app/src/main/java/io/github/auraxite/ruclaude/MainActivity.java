package io.github.auraxite.ruclaude;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final String CLAUDE_PACKAGE = "com.anthropic.claude";
    private static final int BG = 0xFF101827, PANEL = 0xFF1B2940, FG = 0xFFF1F4FC, MUTED = 0xFFB0BED2, ACCENT = 0xFF7096FF, RED = 0xFFFF8892, GREEN = 0xFF7EDEC0;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private TextView status, observed, title, countryLabel;
    private Spinner countries;
    private Button checkButton, openButton, languageButton;
    private String[] countryCodes;
    private boolean loading = false, checking = false, english = false;
    private String observedCountry = "", observedIp = "";
    private long generation = 0;

    private String s(String ru, String en) { return english ? en : ru; }
    private int dp(int x){return (int)(getResources().getDisplayMetrics().density*x+.5f);}
    private GradientDrawable shape(int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
    private TextView text(String value,int size,int color){TextView v=new TextView(this);v.setText(value);v.setTextColor(color);v.setTextSize(size);v.setGravity(Gravity.CENTER_VERTICAL);return v;}
    private void pad(View v,int all){v.setPadding(dp(all),dp(all),dp(all),dp(all));}
    private LinearLayout.LayoutParams lp(int top){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.topMargin=dp(top);return p;}

    @Override public void onCreate(Bundle state){super.onCreate(state);prefs=getSharedPreferences("settings",MODE_PRIVATE);english=prefs.getBoolean("english",false);buildUi();}
    @Override protected void onResume(){super.onResume();invalidate(s("Требуется новая проверка перед запуском Claude.","A fresh check is required before opening Claude."));}
    @Override protected void onDestroy(){generation++;executor.shutdownNow();super.onDestroy();}

    private void buildUi(){
      loading=true;
      ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(BG);
      LinearLayout main=new LinearLayout(this);main.setOrientation(LinearLayout.VERTICAL);pad(main,20);scroll.addView(main);setContentView(scroll);
      LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);
      title=text("RuClaude",29,FG);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);top.addView(title,new LinearLayout.LayoutParams(0,-2,1));
      languageButton = languageChoice(english ? "EN" : "РУ");
      top.addView(languageButton,new LinearLayout.LayoutParams(dp(62),dp(44)));
      main.addView(top);
      main.addView(text(s("Защитный запуск Claude","Protected Claude launcher"),13,MUTED));
      status=text("",15,FG);status.setBackground(shape(PANEL,14));pad(status,15);main.addView(status,lp(18));
      countryLabel=text(s("Разрешённая страна","Allowed country"),15,FG);main.addView(countryLabel,lp(20));
      countries=new Spinner(this);countries.setBackground(shape(PANEL,10));pad(countries,6);main.addView(countries,lp(8));
      countryCodes=Locale.getISOCountries();Arrays.sort(countryCodes, Comparator.comparing(c->displayCountry(c),String.CASE_INSENSITIVE_ORDER));
      ArrayList<String> names=new ArrayList<>();names.add(s("Выберите страну…","Choose a country…"));for(String c:countryCodes) names.add(displayCountry(c)+" · "+c);
      countries.setAdapter(spinnerAdapter(names));
      String storedCountry=prefs.getString("country","");for(int i=0;i<countryCodes.length;i++)if(countryCodes[i].equals(storedCountry)){countries.setSelection(i+1);break;}
      observed=text("",13,MUTED);observed.setBackground(shape(PANEL,12));pad(observed,13);main.addView(observed,lp(16));
      checkButton=button(s("Проверить IP","Check IP"));main.addView(checkButton,lp(16));
      openButton=button(s("Запустить Claude","Launch Claude"));
      openButton.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF17885D));
      main.addView(openButton,lp(8));
      Button tipsButton = button(s("Советы", "Tips"));
      tipsButton.setTextSize(13);
      tipsButton.setBackgroundTintList(android.content.res.ColorStateList.valueOf(PANEL));
      main.addView(tipsButton, lp(20));
      tipsButton.setOnClickListener(v -> showTips());
      countries.setOnItemSelectedListener(listener(()->{prefs.edit().putString("country",selectedCountry()).apply();invalidate(s("Настройки изменены. Нажмите «Проверить IP».","Settings changed. Tap Check IP."));}));
      checkButton.setOnClickListener(v->verify(false));
      openButton.setOnClickListener(v->verify(true));
      languageButton.setOnClickListener(v->switchLanguage(!english));
      loading=false;checking=false;observedCountry="";observedIp="";observed.setText(s("Последняя проверка: ещё не выполнена","Last check: not yet performed"));invalidate(s("Проверьте IP перед запуском Claude.","Check IP before opening Claude."));
    }
    private AdapterView.OnItemSelectedListener listener(Runnable onChange){return new AdapterView.OnItemSelectedListener(){public void onItemSelected(AdapterView<?> p,View v,int pos,long id){if(!loading)onChange.run();}public void onNothingSelected(AdapterView<?> p){}};}
    private ArrayAdapter<String> spinnerAdapter(List<String> values){ArrayAdapter<String> a=new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,values);a.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);return a;}
    private Button languageChoice(String label){
      Button b = new Button(this);
      b.setText(label);
      b.setAllCaps(false);
      b.setTextSize(15);
      b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
      b.setTextColor(Color.WHITE);
      b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF344F80));
      b.setMinWidth(0); b.setMinimumWidth(0);
      b.setPadding(0,0,0,0);
      return b;
    }
    private void switchLanguage(boolean nextEnglish){
      if(english==nextEnglish)return;
      prefs.edit().putBoolean("english",nextEnglish).apply();
      generation++;
      english=nextEnglish;
      buildUi();
    }
    private void showTips(){
      String message = s(
        "• Перед запуском проверьте страну публичного IP.\n\n" +
        "• Убедитесь, что VPN действительно направляет трафик через нужную страну; используйте системный kill switch, если он доступен.\n\n" +
        "• При необходимости дополнительно проверьте утечки DNS, IPv6 и WebRTC.\n\n" +
        "• Следуйте правилам сервиса. RuClaude не является VPN и не гарантирует блокировку трафика Claude после запуска.",
        "• Check your public IP country before launching.\n\n" +
        "• Make sure your VPN routes traffic through the intended country; use a system-level kill switch if available.\n\n" +
        "• Consider checking DNS, IPv6 and WebRTC leaks separately.\n\n" +
        "• Follow the service terms. RuClaude is not a VPN and cannot guarantee blocking Claude traffic after launch."
      );
      new AlertDialog.Builder(this)
        .setTitle(s("Советы", "Tips"))
        .setMessage(message)
        .setPositiveButton(s("Закрыть", "Close"), null)
        .show();
    }
    private Button button(String label){Button b=new Button(this);b.setText(label);b.setTextColor(Color.WHITE);b.setAllCaps(false);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF355B9C));return b;}
    private String displayCountry(String code){return new Locale("",code).getDisplayCountry(english?Locale.ENGLISH:new Locale("ru"));}
    private String selectedCountry(){int i=countries.getSelectedItemPosition();return i>0?countryCodes[i-1]:"";}
    private void invalidate(String msg){generation++;checking=false;openButton.setEnabled(true);openButton.setText(s("Запустить Claude","Launch Claude"));status.setText("●  "+msg);status.setTextColor(RED);}
    private void verify(boolean launch){
      if(checking)return;
      String country=selectedCountry();
      if(country.isEmpty()){invalidate(s("Выберите страну.","Choose a country."));return;}
      checking=true;long task=++generation;status.setTextColor(MUTED);status.setText(s("Проверяем публичный IP…","Checking public IP…"));
      checkButton.setEnabled(false);openButton.setEnabled(false);
      executor.execute(()->{
        try{
          IpResult r=lookup();boolean valid=r.country.equals(country);
          handler.post(()->{
            if(task!=generation)return;
            checking=false;checkButton.setEnabled(true);openButton.setEnabled(true);
            observedCountry=r.country;observedIp=r.ip;
            observed.setText(s("IP: ","IP: ")+r.ip+"\n"+s("Страна: ","Country: ")+r.country+"\n"+s("Источник: ","Provider: ")+r.source);
            if(!valid){status.setTextColor(RED);status.setText(s("●  Страна IP не совпадает. Claude не запущен.","●  IP country mismatch. Claude not launched."));return;}
            status.setTextColor(GREEN);status.setText(s("●  Проверка пройдена.","●  Verification passed."));
            if(launch)launchClaude();
          });
        }catch(Exception ex){handler.post(()->{if(task!=generation)return;checking=false;checkButton.setEnabled(true);openButton.setEnabled(true);status.setTextColor(RED);status.setText(s("Проверка не удалась: ","Check failed: ")+ex.getMessage());});}
      });
    }
    private void launchClaude(){
      Intent intent=getPackageManager().getLaunchIntentForPackage(CLAUDE_PACKAGE);
      if(intent==null){new AlertDialog.Builder(this).setMessage(s("Официальное приложение Claude не найдено. Сначала установите его.","Claude app not installed. Please install it first."))
        .setPositiveButton("OK",null).show();return;}
      try{startActivity(intent);}catch(Exception e){status.setTextColor(RED);status.setText(s("Не удалось открыть Claude: ","Could not open Claude: ")+e.getMessage());}
    }
    private static class IpResult {String ip,country,source;IpResult(String i,String c,String s){ip=i;country=c;source=s;}}
    private IpResult lookup()throws Exception{Exception first=null;
      try{return parseWho(request("https://ipwho.is/"));}catch(Exception ex){first=ex;}
      try{return parseApi(request("https://ipapi.co/json/"));}catch(Exception ex){throw new Exception("IP services unavailable ("+first.getMessage()+"; "+ex.getMessage()+")");}
    }
    private JSONObject request(String target)throws Exception{
      HttpURLConnection c=(HttpURLConnection)new URL(target).openConnection();c.setRequestMethod("GET");c.setConnectTimeout(5000);c.setReadTimeout(5000);
      c.setRequestProperty("Accept","application/json");c.setRequestProperty("User-Agent","RuClaude-Android/1.0.0");
      try{if(c.getResponseCode()!=200)throw new Exception("HTTP "+c.getResponseCode());try(BufferedReader reader=new BufferedReader(new InputStreamReader(c.getInputStream(),java.nio.charset.StandardCharsets.UTF_8))){StringBuilder b=new StringBuilder();String l;while((l=reader.readLine())!=null){if(b.length()+l.length()>160000)throw new Exception("Large response");b.append(l);}return new JSONObject(b.toString());}}finally{c.disconnect();}
    }
    private IpResult parseWho(JSONObject o)throws Exception{
      if(!o.optBoolean("success"))throw new Exception("ipwho.is: "+o.optString("message","invalid"));
      String ip=o.optString("ip"),country=o.optString("country_code");
      if(ip.isEmpty()||country.length()!=2)throw new Exception("Invalid ipwho.is data");return new IpResult(ip,country.toUpperCase(Locale.ROOT),"ipwho.is");
    }
    private IpResult parseApi(JSONObject o)throws Exception{
      if(o.optBoolean("error"))throw new Exception("ipapi.co: "+o.optString("reason"));
      String ip=o.optString("ip"),country=o.optString("country_code");
      if(ip.isEmpty()||country.length()!=2)throw new Exception("Invalid ipapi.co data");return new IpResult(ip,country.toUpperCase(Locale.ROOT),"ipapi.co");
    }
}
