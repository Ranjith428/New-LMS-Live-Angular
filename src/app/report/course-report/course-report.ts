import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit,signal,} 
from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Course } from '../../course-module/course.model';
import { Enrollment } from '../../course-module/enrollment.model';
import { CourseManagementService } from '../../services/course-management.service';
import { EnrollmentService } from '../../services/enrollment.service';
/* -------------------------------------------------------
   Course Report Models
------------------------------------------------------- */
type FilterField = | 'category' | 'enrollments' | 'completionRate' | 'completedLearners' | 'learnersNotStarted';
type ExportFormat = 'excel' | 'csv';
interface CourseReportRow {
  id: number;
  courseTitle: string;
  courseCode: string;
  category: string;
  enrollments: number;
  completionRate: number;
  learners: number;
  completedLearners: number;
  learnersInProgress: number;
  learnersNotStarted: number;
  avgUserProgress: number;
  totalTimeSpent: string;
  certificatesIssued: string;
}
interface CourseWithOptionalReportFields extends Course {
  courseCode?: string;
  code?: string;
}
/* -------------------------------------------------------
   Component
------------------------------------------------------- */
@Component({
  selector: 'app-course-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './course-report.html',
  styleUrl: './course-report.css',
})
export class CourseReport implements OnInit {
  private readonly courseService = inject(CourseManagementService);
  private readonly enrollmentService = inject(EnrollmentService);
  /* -------------------------------------------------------
     State
  ------------------------------------------------------- */
  readonly rows = signal<CourseReportRow[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly searchText = signal('');
  readonly filterDropdownOpen = signal(false);
  readonly exportDropdownOpen = signal(false);
  readonly selectedFilterField = signal<FilterField | ''>('');
  readonly selectedFilterValue = signal('');
  /* -------------------------------------------------------
     Filter options
  ------------------------------------------------------- */
  readonly filterOptions: {
    label: string;
    value: FilterField; }[] = [
      { label: 'Category', value: 'category' },
      { label: 'Enrollments', value: 'enrollments' },
      { label: 'Completion Rate', value: 'completionRate' },
      { label: 'Completed Learners', value: 'completedLearners' },
      { label: 'Learners Not Started', value: 'learnersNotStarted' },
    ];
  /* -------------------------------------------------------
     Computed values
  ------------------------------------------------------- */
  readonly selectedFilterLabel = computed(() => {
    const field = this.selectedFilterField();
    return this.filterOptions.find(
      option => option.value === field
    )?.label ?? '';
  });
  readonly filterValues = computed<string[]>(() => {
    const field = this.selectedFilterField();
    if (!field) {
      return [];
    }
    const values = this.rows().map(row =>
      String(row[field])
    );
    return [...new Set(values)].sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );
  });
  readonly filteredRows = computed(() => {
    const search = this.searchText().trim().toLowerCase();
    const filterField = this.selectedFilterField();
    const filterValue = this.selectedFilterValue();
    return this.rows().filter(row => {
      // Search across course title, code and category.
      const matchesSearch =
        !search ||
        row.courseTitle.toLowerCase().includes(search) ||
        row.courseCode.toLowerCase().includes(search) ||
        row.category.toLowerCase().includes(search);
      if (!matchesSearch) {
        return false;
      }
      // No filter selected.
      if (!filterField || !filterValue) {
        return true;
      }
      // Selected filter.
      return String(row[filterField]) === filterValue;
    });
  });
  /* -------------------------------------------------------
     Lifecycle
  ------------------------------------------------------- */
  ngOnInit(): void {
    this.loadCourseReports();
  }
  /* -------------------------------------------------------
     Load Course Reports
  ------------------------------------------------------- */
  loadCourseReports(): void {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.courseService.getAllCourses().subscribe({
      next: (courses: Course[]) => {
        if (!courses || courses.length === 0) {
          this.rows.set([]);
          this.loading.set(false);
          return;
        }
        // Use the existing enrollment API for each course.
        const reportRequests = courses.map(course =>
          this.enrollmentService.getEnrollments(course.id)
        );
        forkJoin(reportRequests).subscribe({
          next: (enrollmentResults: Enrollment[][]) => {
            const reportRows = courses.map((course, index) => {
              const enrollments = enrollmentResults[index] ?? [];
              return this.buildReportRow(
                course,enrollments);
            });
            this.rows.set(reportRows);
            this.loading.set(false);
          },
          error: (error: unknown) => {
            this.handleLoadError(error);
          },
        });
      },
      error: (error: unknown) => {
        this.handleLoadError(error);
      },
    });
  }
  /* -------------------------------------------------------
     Build Report Row
  ------------------------------------------------------- */
  private buildReportRow(
    course: Course,
    enrollments: Enrollment[]
  ): CourseReportRow {

    const courseData = course as CourseWithOptionalReportFields;
    const totalLearners = enrollments.length;
    const completedLearners = enrollments.filter(enrollment => enrollment.status === 'COMPLETED').length;
    const learnersInProgress = enrollments.filter(enrollment => enrollment.status === 'IN_PROGRESS').length;
    const learnersNotStarted = enrollments.filter(enrollment => enrollment.status === 'NOT_STARTED').length;
    const completionRate = totalLearners > 0 ? Math.round( (completedLearners / totalLearners) * 100 ) : 0;
    // Average progress from the actual enrollment response.
    const validProgress = enrollments.map(enrollment => enrollment.progress).filter((progress): progress is number =>
          typeof progress === 'number' && Number.isFinite(progress) );
    const avgUserProgress = validProgress.length > 0 ? Math.round(validProgress.reduce((total, progress) => total + progress, 0 ) / validProgress.length) : 0;
    return {
      id: course.id, courseTitle: course.name ?? '',
      // The current Course interface does not define courseCode.
      // Use an actual returned API property if one exists.
      courseCode: courseData.courseCode ?? courseData.code ?? '—',
      category: course.categoryName ?? '—',
      enrollments: totalLearners,
      completionRate,
      learners: totalLearners,
      completedLearners,
      learnersInProgress,
      learnersNotStarted,
      avgUserProgress,
      // These two metrics are not supplied by the existing APIs.
      totalTimeSpent: '—',
      certificatesIssued: '—',
    };
  }
  /* -------------------------------------------------------
     Error Handling
  ------------------------------------------------------- */
  private handleLoadError(error: unknown): void {
    this.loading.set(false);
    const httpError = error as HttpErrorResponse;
    if (httpError?.status === 0) {
      this.errorMessage.set(
        'Unable to load the Course Report. Please check your internet connection and try again.'
      );
      return;
    }
    if (httpError?.status === 401) {
      this.errorMessage.set('Your session has expired. Please log in again.');
      // Existing auth interceptor handles session cleanup
      // and navigation to the login page.
      return;
    }
    if (httpError?.status >= 500) {
      this.errorMessage.set('Something went wrong. Please try again later.');
      return;
    }
    this.errorMessage.set('Unable to load the Course Report. Please try again.');
  }
  /* -------------------------------------------------------
     Search
  ------------------------------------------------------- */
  onSearchChange(value: string): void {this.searchText.set(value.slice(0, 100));
  }
  /* -------------------------------------------------------
     Filter Dropdown
  ------------------------------------------------------- */
  toggleFilterDropdown(): void {
    this.filterDropdownOpen.update(value => !value);
    this.exportDropdownOpen.set(false);
  }
  onFilterFieldChange(value: string): void {
    this.selectedFilterField.set(value as FilterField | '' );
    this.selectedFilterValue.set('');
  }
  applyFilter(): void {
    this.filterDropdownOpen.set(false);
  }
  clearFilter(): void {
    this.selectedFilterField.set('');
    this.selectedFilterValue.set('');
    this.filterDropdownOpen.set(false);
  }
  /* -------------------------------------------------------
     Export Dropdown
  ------------------------------------------------------- */
  toggleExportDropdown(): void {
    this.exportDropdownOpen.update(value => !value);
    this.filterDropdownOpen.set(false);
  }
  /* -------------------------------------------------------
     Export Report
  ------------------------------------------------------- */
  exportReport(format: ExportFormat): void {
    if (this.loading() || this.filteredRows().length === 0) {
     return;
    }
    try { const reportRows = this.filteredRows();
      if (format === 'csv') {
        this.exportCsv(reportRows);
      } else {
        this.exportExcel(reportRows);
      }
      this.exportDropdownOpen.set(false);
    } catch {
      this.errorMessage.set('Unable to export the Course Report. Please try again.');
    }
  }
  /* -------------------------------------------------------
     CSV Export
  ------------------------------------------------------- */
  private exportCsv(data: CourseReportRow[]): void {
    const headers = [
      'Course',
      'Course Code',
      'Category',
      'Enrollments',
      'Completion Rate',
      'Learners',
      'Completed Learners',
      'Learners in Progress',
      'Learners Not Started',
      'Avg. User Progress',
      'Total Time Spent',
      'Certificates Issued',
    ];
    const csvRows = data.map(row => [
      row.courseTitle,
      row.courseCode,
      row.category,
      row.enrollments,
      `${row.completionRate}%`,
      row.learners,
      row.completedLearners,
      row.learnersInProgress,
      row.learnersNotStarted,
      `${row.avgUserProgress}%`,
      row.totalTimeSpent,
      row.certificatesIssued,
    ]);
    const csvContent = [headers,...csvRows,] .map(row =>
        row.map(value => this.escapeCsv(value)).join(',')
      )
      .join('\r\n');
    const blob = new Blob(
      ['\uFEFF', csvContent],
      {
        type: 'text/csv;charset=utf-8;',
      }
    );
    this.downloadFile( blob,'course-report.csv' );
  }
  private escapeCsv(value: string | number): string {
    const text = String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }
  /* -------------------------------------------------------
     Excel Export
     Excel-compatible Spreadsheet XML
  ------------------------------------------------------- */
  private exportExcel(data: CourseReportRow[]): void {
    const headers = [
      'Course',
      'Course Code',
      'Category',
      'Enrollments',
      'Completion Rate',
      'Learners',
      'Completed Learners',
      'Learners in Progress',
      'Learners Not Started',
      'Avg. User Progress',
      'Total Time Spent',
      'Certificates Issued',
    ];
    const escapeXml = (value: string | number): string =>
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    const tableRows = [
       headers,
      ...data.map(row => [
        row.courseTitle,
        row.courseCode,
        row.category,
        row.enrollments,
        `${row.completionRate}%`,
        row.learners,
        row.completedLearners,
        row.learnersInProgress,
        row.learnersNotStarted,
        `${row.avgUserProgress}%`,
        row.totalTimeSpent,
        row.certificatesIssued,
      ]),
    ];
    const xmlRows = tableRows.map((row, index) => {
      const cells = row.map(value => {
        const numeric = typeof value === 'number';
        return `
          <Cell>
            <Data ss:Type="${numeric ? 'Number' : 'String'}">
              ${escapeXml(value)}
            </Data>
          </Cell> `;
      }).join('');
      return `
        <Row ss:StyleID="${index === 0 ? 'Header' : 'Normal'}">
          ${cells}
        </Row> `;
    }).join('');
    const excelXml = `<?xml version="1.0"?>
      <?mso-application progid="Excel.Sheet"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
        <Styles>
          <Style ss:ID="Header">
            <Font ss:Bold="1"/>
            <Interior ss:Color="#DDEFF2" ss:Pattern="Solid"/>
          </Style>
          <Style ss:ID="Normal"/>
        </Styles>
        <Worksheet ss:Name="Course Report">
          <Table>
            ${xmlRows}
          </Table>
        </Worksheet>
      </Workbook> `;
    const blob = new Blob(
      [excelXml],
      {
        type: 'application/vnd.ms-excel;charset=utf-8;',
      }
    );
    this.downloadFile(blob,'course-report.xls');
  }
  /* -------------------------------------------------------
     Download Helper
  ------------------------------------------------------- */
  private downloadFile(
    blob: Blob,
    fileName: string
  ): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
  /* -------------------------------------------------------
     Print Report
  ------------------------------------------------------- */
  printReport(): void {
    if (this.loading() || this.filteredRows().length === 0) {
      return;
    }
    try {
      const printWindow = window.open('','_blank','width=1200,height=800');
      if (!printWindow) {
        this.errorMessage.set('Unable to print the Course Report. Please try again.');
        return;
      }
      const headers = [
        'Course',
        'Course Code',
        'Category',
        'Enrollments',
        'Completion Rate',
        'Completed Learners',
        'Learners Not Started',
        'Total Time Spent',
        'Certificates Issued',
      ];
      const escapeHtml = (value: string | number): string =>
        String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      const tableHead = headers.map(header =>
        `<th>${escapeHtml(header)}</th>`
      ).join('');
      const tableBody = this.filteredRows().map(row => `
        <tr>
          <td>${escapeHtml(row.courseTitle)}</td>
          <td>${escapeHtml(row.courseCode)}</td>
          <td>${escapeHtml(row.category)}</td>
          <td>${row.enrollments}</td>
          <td>${row.completionRate}%</td>
          <td>${row.completedLearners}</td>
          <td>${row.learnersNotStarted}</td>
          <td>${escapeHtml(row.totalTimeSpent)}</td>
          <td>${escapeHtml(row.certificatesIssued)}</td>
        </tr>
      `).join('');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Course Report</title>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 25px;
              color: #333;
            }
            h2 {
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px 7px;
              text-align: left;
            }
            th {
              background: #f0f0f0;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background: #fafafa;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <h2>Course Report</h2>
          <table>
            <thead>
              <tr>${tableHead}</tr>
            </thead>
            <tbody>
              ${tableBody}
            </tbody>
          </table>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => {
      printWindow.print();
      };
    } catch {
      this.errorMessage.set('Unable to print the Course Report. Please try again.');
    }
  }
}
