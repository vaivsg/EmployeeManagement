import { HttpErrorResponse } from '@angular/common/http';
import { DYNAMIC_TYPE } from '@angular/compiler';
import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
import { SystemCpu } from './interface/system-cpu';
import { SystemHealth } from './interface/system-health';
import { DashboardService } from './service/dashboard.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  public traceList: any[] = [];
  public selectedTrace: any;
  public systemHealth: SystemHealth;
  public systemCpu: SystemCpu;
  public processUptime: string;
  public http200Traces: any[] = [];
  public http404Traces: any[] = [];
  public http400Traces: any[] = [];
  public http500Traces: any[] = [];
  public httpDefaultTraces: any[] = [];
  public timestamp: number;
  public pageSize=10;
  public page=1;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.getTraces();
    this.getCpuUsage();
    this.getSystemHealth();
    this.getProcessUptime(true);
  }

  private getTraces(): void {
    this.dashboardService.getHttpTraces().subscribe(
      (response: any) => {
        console.log(response.traces);
        this.processTraces(response.traces);
        this.initializeBarChart();
        this.initializePieChart();
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }

  private getCpuUsage(): void {
    this.dashboardService.getSystemCpu().subscribe(
      (response: SystemCpu) => {
        this.systemCpu = response;
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }

  private getSystemHealth(): void {
    this.dashboardService.getSystemHealth().subscribe(
      (response: SystemHealth) => {
        console.log(response);
        console.log(response.components?.db?.details?.database);
        this.systemHealth = response;
        this.systemHealth.components.diskSpace.details.free = this.formatBytes(
          this.systemHealth.components.diskSpace.details.free
        );
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }

  public onRefreshData(): void {
    this.http200Traces = [];
    this.http404Traces = [];
    this.http400Traces = [];
    this.http500Traces = [];
    this.httpDefaultTraces = [];
    this.getTraces();
    this.getCpuUsage();
    this.getSystemHealth();
    this.getProcessUptime(false);
  }

  private getProcessUptime(isUpdateTime: boolean): void {
    this.dashboardService.getProcessUptime().subscribe(
      (response: any) => {
        console.log(response);
        this.timestamp = Math.round(response.measurements[0].value);
        this.processUptime = this.formatUptime(this.timestamp);
        if (isUpdateTime) {
          this.updateTime();
        }
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }

  private processTraces(traces: any) {
    this.traceList = traces;
    this.traceList.forEach((trace) => {
      switch (trace.response.status) {
        case 200:
          this.http200Traces.push(trace);
          break;
        case 400:
          this.http400Traces.push(trace);
          break;
        case 404:
          this.http404Traces.push(trace);
          break;
        case 500:
          this.http500Traces.push(trace);
          break;
        default:
          this.httpDefaultTraces.push(trace);
      }
    });
  }

  private initializeBarChart(): Chart<'bar', number[], string> {
    const barChartElement = document.getElementById(
      'barchart'
    ) as HTMLCanvasElement;
    return new Chart(barChartElement, {
      type: 'bar',
      data: {
        labels: ['200', '404', '400', '500'],
        datasets: [
          {
            label: `Last 100 Requests as of ${this.formatDate(new Date())}`,
            data: [
              this.http200Traces.length,
              this.http404Traces.length,
              this.http400Traces.length,
              this.http500Traces.length,
            ],
            backgroundColor: [
              'rgba(40, 167, 69, 0.2)',
              'rgba(0, 123, 255, 0.2)',
              'rgba(253, 126, 20, 0.2)',
              'rgba(220, 53, 69, 0.2)',
            ],
            borderColor: [
              'rgba(40, 167, 69, 1)',
              'rgba(0, 123, 255, 1)',
              'rgba(253, 126, 20, 1)',
              'rgba(220, 53, 69, 1)',
            ],
            borderWidth: 3,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
          },
          plugins: {
            title: {
              display: true,
              text: `Last 100 Requests as of ${this.formatDate(new Date())}`,
            },
          },
        },
      },
    });
  }

  private initializePieChart(): Chart<'pie', number[], string> {
    const pieChartElement = document.getElementById(
      'piechart'
    ) as HTMLCanvasElement;
    return new Chart(pieChartElement, {
      type: 'pie',
      data: {
        labels: ['200', '404', '400', '500'],
        datasets: [
          {
            label: 'BarChart',
            data: [
              this.http200Traces.length,
              this.http404Traces.length,
              this.http400Traces.length,
              this.http500Traces.length,
            ],
            backgroundColor: [
              'rgba(40, 167, 69, 0.2)',
              'rgba(0, 123, 255, 0.2)',
              'rgba(253, 126, 20, 0.2)',
              'rgba(220, 53, 69, 0.2)',
            ],
            borderColor: [
              'rgba(40, 167, 69, 1)',
              'rgba(0, 123, 255, 1)',
              'rgba(253, 126, 20, 1)',
              'rgba(220, 53, 69, 1)',
            ],
            borderWidth: 3,
          },
        ],
      },
      options: {
        plugins: {
          title: {
                display: true,
                text: `Last 100 Requests as of ${this.formatDate(new Date())}`
            },
          legend: {
            display: true,
          },
        },
      },
    });
  }

  public onSelectTrace(trace: any): void {
    this.selectedTrace = trace;
    document.getElementById('trace-modal')?.click();
  }

  public exportTableToExcel(): void{
    const downloadLink=document.createElement('a');
    const dataType='application/vnd.ms-excel';
    const table=document.getElementById('httptrace-table');
    const tableHtml= table?.outerHTML.replace(/ /g,'%20');
    document.body.appendChild(downloadLink);
    downloadLink.href='data:'+dataType+' '+tableHtml;
    downloadLink.download='httptrace.xls';
    downloadLink.click();
  }

  public updateTime(): void {
    setInterval(() => {
      this.processUptime = this.formatUptime(this.timestamp + 1);
      this.timestamp++;
    }, 1000);
  }

  private formatUptime(timestamp: number): string {
    const hours = Math.floor(timestamp / 60 / 60);
    const minutes = Math.floor(timestamp / 60) - hours * 60;
    const seconds = timestamp % 60;
    return (
      hours.toString().padStart(2, '0') +
      'h' +
      minutes.toString().padStart(2, '0') +
      'm' +
      seconds.toString().padStart(2, '0') +
      's'
    );
  }

  private formatBytes(bytes: any): string {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const dm = 2 < 0 ? 0 : 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  private formatDate(date:Date):String{
    const dd = date.getDate() < 10 ? `0${date.getDate()}` : `${date.getDate()}`;
    const mm = date.getMonth() < 10 ? `0${date.getMonth()}` : `${date.getMonth()}`;
    const year=date.getFullYear();
    return `${mm}/${dd}/${year}`;
  }

}
