import { Component, OnInit } from '@angular/core';
import { DataService, Suggestion } from '../../services/data';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-suggestion-panel',
  imports: [CommonModule, TranslateModule],
  templateUrl: './suggestion-panel.html',
  styleUrl: './suggestion-panel.scss',
})
export class SuggestionPanel implements OnInit {
  suggestions: Suggestion[] = [];

  constructor(public dataService: DataService) {}
  
  ngOnInit() {
    this.suggestions = this.dataService.getSuggestions();
  }
}
