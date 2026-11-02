using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using RuClaude.Core;

namespace RuClaude;

public sealed record CountryOption(string Code, string DisplayName);

public partial class MainWindow : Window
{
    private RuClaudeSettings _settings;
    private readonly DispatcherTimer _timer = new() { Interval = TimeSpan.FromSeconds(2) };
    private bool _initializing = true;

    public MainWindow()
    {
        InitializeComponent();
        _settings = RuClaudeStore.LoadSettings();
        BuildCountries();
        CountryPicker.SelectedValue = _settings.AllowedCountry;

        UpdateLanguage();
        UpdateStatus();
        _initializing = false;
        _timer.Tick += (_, _) => UpdateStatus();
        _timer.Start();
    }

    private void BuildCountries()
    {
        var options = CultureInfo.GetCultures(CultureTypes.SpecificCultures)
            .Select(c => { try { return new RegionInfo(c.Name); } catch { return null; } })
            .Where(r => r is not null && r.TwoLetterISORegionName.Length == 2)
            .GroupBy(r => r!.TwoLetterISORegionName)
            .Select(g => new CountryOption(g.Key, Russian && RussianCountries.Names.TryGetValue(g.Key, out string? translated)
                ? translated : g.First()!.EnglishName))
            .OrderBy(x => x.DisplayName, StringComparer.CurrentCulture)
            .ToList();
        if (!options.Any(x => x.Code == "UZ")) options.Add(new CountryOption("UZ", Russian ? "Узбекистан" : "Uzbekistan"));
        options.Insert(0, new CountryOption("", Russian ? "Не выбрано" : "Not selected"));
        CountryPicker.ItemsSource = options;
    }

    private bool Russian => _settings.Language == "ru";

    private void UpdateLanguage()
    {
        // Preserve the ISO country selection while re-localizing the visible names.
        string selectedCode = CountryPicker.SelectedValue as string ?? _settings.AllowedCountry;
        bool wasInitializing = _initializing;
        _initializing = true;
        BuildCountries();
        CountryPicker.SelectedValue = selectedCode;
        _initializing = wasInitializing;
        Subtitle.Text = Russian ? "Проверка страны IP для Claude" : "Country-based network filter";
        SwitchTitle.Text = Russian ? "Защита" : "Protection";
        SwitchSub.Text = Russian ? "Контроль публичного IP" : "Public IP country check";
        CountryLabel.Text = Russian ? "Разрешённая страна" : "Allowed country";
        SavedLabel.Text = Russian ? "Настройки сохраняются автоматически" : "Settings are saved automatically";
        StatusTitle.Text = Russian ? "Состояние фильтра" : "Firewall status";
        Footnote.Text = Russian ? "Служба работает в фоновом режиме" : "Service runs in the background";
        LanguageButton.Content = Russian ? "РУ" : "EN";
        LanguageButton.ToolTip = Russian ? "Switch to English" : "Переключить на русский";
        LanguageButton.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#EA7838"));
        ToggleButton.Content = _settings.Enabled ? "ON" : "OFF";
        ToggleButton.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(_settings.Enabled ? "#208C76" : "#C14C56"));
        UpdateStatus();
    }

    private void Save()
    {
        try { RuClaudeStore.SaveSettings(_settings); }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, Russian ? "Не удалось сохранить" : "Save failed", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void LanguageButton_Click(object sender, RoutedEventArgs e)
    {
        _settings.Language = Russian ? "en" : "ru";
        Save();
        UpdateLanguage();
    }
    private void ToggleButton_Click(object sender, RoutedEventArgs e)
    {
        if (!_settings.Enabled && string.IsNullOrEmpty(_settings.AllowedCountry))
        {
            StatusValue.Text = Russian ? "Сначала выберите страну" : "Select a country first";
            StatusValue.Foreground = Brushes.Orange;
            return;
        }
        _settings.Enabled = !_settings.Enabled;
        Save();
        UpdateLanguage();
    }
    private void CountryPicker_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_initializing || CountryPicker.SelectedItem is not CountryOption selected) return;
        _settings.AllowedCountry = selected.Code;
        if (string.IsNullOrEmpty(selected.Code)) _settings.Enabled = false;
        Save();
        UpdateLanguage();
    }
    private async void RefreshButton_Click(object sender, RoutedEventArgs e)
    {
        RefreshButton.IsEnabled = false;
        StatusValue.Text = Russian ? "Обновление IP..." : "Refreshing IP...";
        StatusValue.Foreground = Brushes.LightSkyBlue;
        try
        {
            await System.Threading.Tasks.Task.Run(RuClaudeStore.RequestRefresh);
            await System.Threading.Tasks.Task.Delay(1800);
            UpdateStatus();
        }
        catch (Exception ex)
        {
            StatusValue.Text = Russian ? "Не удалось обновить" : "Refresh failed";
            StatusDetail.Text = ex.Message;
        }
        finally { RefreshButton.IsEnabled = true; }
    }

    private void UpdateStatus()
    {
        if (StatusValue is null) return; // initialize component lifecycle
        RuClaudeStatus s = RuClaudeStore.LoadStatus();
        if (s.CheckedUtc == DateTime.MinValue || DateTime.UtcNow - s.CheckedUtc > TimeSpan.FromSeconds(35))
        {
            StatusValue.Text = Russian ? "Служба не отвечает" : "Service not responding";
            StatusValue.Foreground = Brushes.Orange;
            StatusDetail.Text = Russian ? "Запусти install.cmd от администратора." : "Run install.cmd as administrator.";
            IpValue.Text = "";
            return;
        }
        (string ru, string en, Brush color) = s.State switch
        {
            "allowed" => ("Доступ разрешён", "Traffic allowed", Brushes.LightGreen),
            "blocked" => ("Доступ заблокирован", "Traffic blocked", Brushes.OrangeRed),
            "disabled" => ("Защита выключена", "Protection disabled", Brushes.Orange),
            "error" => ("Ошибка проверки", "Check failed", Brushes.OrangeRed),
            _ => ("Запуск...", "Starting...", Brushes.Orange)
        };
        StatusValue.Text = Russian ? ru : en;
        StatusValue.Foreground = color;
        IpValue.Text = string.IsNullOrWhiteSpace(s.Ip) ? "" : $"IP: {s.Ip}     {(Russian ? "Страна" : "Country")}: {s.Country}";
        StatusDetail.Text = s.State == "error" ? s.Detail :
            (Russian ? "Последняя проверка: " : "Last check: ") + s.CheckedUtc.ToLocalTime().ToString("HH:mm:ss");
        // IP is the Windows service's observed route, which may differ from browser VPN/proxy routes.
    }
}
