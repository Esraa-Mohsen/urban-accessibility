import { Component } from '@angular/core';
import { DataService } from '../../services/data';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-senior-toggle',
  imports: [NgClass],
  templateUrl: './senior-toggle.html',
  styleUrl: './senior-toggle.scss',
})
export class SeniorToggle {
  constructor(public dataService: DataService) {}
}
