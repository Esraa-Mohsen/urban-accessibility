import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-counter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="animate-count-up">{{ displayValue }}</span>
  `,
  styles: [``]
})
export class AnimatedCounter implements OnInit, OnChanges {
  @Input() value: number = 0;
  @Input() duration: number = 800; // ms
  @Input() prefix: string = '';
  @Input() suffix: string = '';
  @Input() decimals: number = 0;

  displayValue: string = '0';
  private currentValue: number = 0;

  ngOnInit() {
    this.animateToValue(this.value);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && !changes['value'].firstChange) {
      this.animateToValue(changes['value'].currentValue);
    }
  }

  private animateToValue(target: number) {
    const startTime = performance.now();
    const startValue = this.currentValue;
    const diff = target - startValue;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.duration, 1);
      
      // Easing function (ease-out-cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      this.currentValue = startValue + (diff * easeProgress);
      this.displayValue = this.formatValue(this.currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.currentValue = target;
        this.displayValue = this.formatValue(target);
      }
    };

    requestAnimationFrame(animate);
  }

  private formatValue(val: number): string {
    const formatted = val.toFixed(this.decimals);
    // Add thousand separators
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return this.prefix + parts.join('.') + this.suffix;
  }
}
