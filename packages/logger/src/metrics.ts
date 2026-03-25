import type { Request, Response } from 'express';

export interface HistogramData {
  count: number;
  sum: number;
  min: number;
  max: number;
  buckets: Map<number, number>;
}

const DEFAULT_HISTOGRAM_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export class MetricsCollector {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, HistogramData>();
  private buckets: number[];

  constructor(buckets: number[] = DEFAULT_HISTOGRAM_BUCKETS) {
    this.buckets = buckets.sort((a, b) => a - b);
    this.initDefaults();
  }

  private initDefaults(): void {
    this.counters.set('http_requests_total', 0);
    this.counters.set('generation_jobs_total', 0);
    this.initHistogram('http_request_duration_ms');
    this.initHistogram('generation_job_duration_ms');
    this.gauges.set('active_websocket_connections', 0);
  }

  private initHistogram(name: string): void {
    this.histograms.set(name, {
      count: 0, sum: 0, min: Infinity, max: -Infinity,
      buckets: new Map(this.buckets.map((b) => [b, 0])),
    });
  }

  counter(name: string, increment = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + increment);
  }

  histogram(name: string, value: number): void {
    let h = this.histograms.get(name);
    if (!h) { this.initHistogram(name); h = this.histograms.get(name)!; }
    h.count++; h.sum += value;
    h.min = Math.min(h.min, value);
    h.max = Math.max(h.max, value);
    for (const bucket of this.buckets) {
      if (value <= bucket) { h.buckets.set(bucket, (h.buckets.get(bucket) || 0) + 1); }
    }
  }

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  getMetrics(): Record<string, unknown> {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([name, data]) => [name, {
          count: data.count, sum: data.sum,
          min: data.min === Infinity ? 0 : data.min,
          max: data.max === -Infinity ? 0 : data.max,
          buckets: Object.fromEntries(data.buckets),
        }]),
      ),
    };
  }

  toPrometheusText(): string {
    const lines: string[] = [];
    for (const [name, value] of this.counters) {
      lines.push('# TYPE ' + name + ' counter');
      lines.push(name + ' ' + value);
    }
    for (const [name, value] of this.gauges) {
      lines.push('# TYPE ' + name + ' gauge');
      lines.push(name + ' ' + value);
    }
    for (const [name, data] of this.histograms) {
      lines.push('# TYPE ' + name + ' histogram');
      for (const [bucket, count] of data.buckets) {
        lines.push(name + '_bucket{le="' + bucket + '"} ' + count);
      }
      lines.push(name + '_bucket{le="+Inf"} ' + data.count);
      lines.push(name + '_sum ' + data.sum);
      lines.push(name + '_count ' + data.count);
    }
    return lines.join('\n') + '\n';
  }
}

export const metrics = new MetricsCollector();

export function metricsHandler(_req: Request, res: Response): void {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics.toPrometheusText());
}
