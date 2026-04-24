import { Component, signal, effect, Inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { SeniorToggle } from './components/senior-toggle/senior-toggle';
import { DataService } from './services/data';
import { TranslateService } from '@ngx-translate/core';
import { DOCUMENT, CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Navbar, SeniorToggle, TranslateModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('urban-accessibility');
  public currentLang = signal('en');
  public sidebarOpen = signal(true);
  public themeMode = signal<'dark' | 'light'>('dark');
  public document: Document;

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  switchLang(lang: string) {
    this.currentLang.set(lang);
  }

  isLang(lang: string): boolean {
    return this.currentLang() === lang;
  }

  toggleTheme() {
    this.themeMode.update(m => m === 'dark' ? 'light' : 'dark');
  }

  isDark() {
    return this.themeMode() === 'dark';
  }

  constructor(
    private dataService: DataService,
    public translate: TranslateService,
    @Inject(DOCUMENT) doc: Document
  ) {
    this.document = doc;
    this.translate.setDefaultLang('en');
    this.translate.use('en');

    // Senior mode body class
    effect(() => {
      if (this.dataService.seniorMode()) {
        this.document.body.classList.add('senior-mode');
      } else {
        this.document.body.classList.remove('senior-mode');
      }
    });

    // Theme mode on html element
    effect(() => {
      const theme = this.themeMode();
      if (theme === 'light') {
        this.document.documentElement.classList.add('light-mode');
        this.document.documentElement.classList.remove('dark-mode');
      } else {
        this.document.documentElement.classList.remove('light-mode');
        this.document.documentElement.classList.add('dark-mode');
      }
    });

    // Language + RTL direction
    effect(() => {
      const lang = this.currentLang();
      this.translate.use(lang);
      this.document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      this.document.documentElement.lang = lang;
      if (lang === 'ar') {
        this.document.body.classList.add('font-arabic');
      } else {
        this.document.body.classList.remove('font-arabic');
      }
    });
  }
}
