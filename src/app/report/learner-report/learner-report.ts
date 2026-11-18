import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Course } from '../../course-module/course.model';
import { Enrollment } from '../../course-module/enrollment.model';
import { CourseManagementService } from '../../services/course-management.service';
import { EnrollmentService } from '../../services/enrollment.service';
/* -------------------------------------------------------
   Learner Report Types
------------------------------------------------------- */
type LearnerFilter = | 'completed' | 'incompleted' | 'enrolled';
type ExportFormat = 'excel' | 'csv';

interface LearnerReportRow {
  userId: number;
  learner: string;
  role: string;
  department: string;
  registrationDate: string;
  lastActivity: string;
  lastLogin: string;

  completedCourses: number;
  incompleteCourses: number;
  enrolledCourses: number;
  assignedCourses: string;

  averageScore: string;
  studyTime: string;
  totalTimeOnPlatform: string;
}
/* -------------------------------------------------------
   Component
------------------------------------------------------- */
@Component({
  selector: 'app-learner-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './learner-report.html',
})
export class LearnerReport implements OnInit {
  private readonly courseService = inject(CourseManagementService);
  private readonly enrollmentService = inject(EnrollmentService);
  /* -------------------------------------------------------
     State
  ------------------------------------------------------- */
  readonly rows = signal<LearnerReportRow[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly searchText = signal('');
  readonly filterDropdownOpen = signal(false);
  readonly exportDropdownOpen = signal(false);
  readonly selectedFilter = signal<LearnerFilter | ''>('');
  readonly selectedLearner = signal<LearnerReportRow | null>(null);
  /* -------------------------------------------------------
     Filter Options
  ------------------------------------------------------- */
  readonly filterOptions: {
    label: string;
    value: LearnerFilter;
  }[] = [
    {
      label: 'Completed Courses',
      value: 'completed',
    },
    {
      label: 'Incompleted Courses',
      value: 'incompleted',
    },
    {
      label: 'Enrolled Courses',
      value: 'enrolled',
    },
  ];
  /* -------------------------------------------------------
     Computed Values
  ------------------------------------------------------- */
  readonly selectedFilterLabel = computed(() => {
    const filter = this.selectedFilter();
    return this.filterOptions.find(
      option => option.value === filter,
    )?.label ?? '';

  });
  readonly filteredRows = computed(() => {
    const search = this.searchText().trim().toLowerCase();
    const filter = this.selectedFilter();
    return this.rows().filter(row => {
      // Search learner information.
      const matchesSearch = !search ||
        row.learner.toLowerCase().includes(search) ||
        row.role.toLowerCase().includes(search) ||
        row.department.toLowerCase().includes(search);
      if (!matchesSearch) {
        return false;
      }
      // No filter selected.
      if (!filter) {
        return true;
      }
      // Completed courses.
      if (filter === 'completed') {
        return row.completedCourses > 0;
      }
      // Incompleted courses.
      if (filter === 'incompleted') {
        return row.incompleteCourses > 0;
      }
      // Enrolled courses.
      if (filter === 'enrolled') {
        return row.enrolledCourses > 0;
      }
      return true;
    });
  });
  /* -------------------------------------------------------
     Lifecycle
  ------------------------------------------------------- */
  ngOnInit(): void {
    this.loadLearnerReports();
  }
  /* -------------------------------------------------------
     Load Learner Reports
  ------------------------------------------------------- */
  loadLearnerReports(): void {
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
          this.enrollmentService.getEnrollments(course.id),
        );
        forkJoin(reportRequests).subscribe({
          next: (enrollmentResults: Enrollment[][]) => {
            const learnerMap = new Map< number,
              {
                learner: string;
                enrollments: Enrollment[];
              }
             >();
            // Group enrollments by learner ID.
            enrollmentResults.forEach(enrollments => {
             enrollments.forEach(enrollment => {
              const existing = learnerMap.get(enrollment.userId);
                if (existing) {
                  existing.enrollments.push(enrollment);
                } else {
                  learnerMap.set(enrollment.userId, { learner: enrollment.username || '—', enrollments: [enrollment], });
                }
              });
            });
            // Create learner report rows from actual enrollment data.
            const reportRows: LearnerReportRow[] = Array.from(
              learnerMap.entries(),
            ).map(([userId, learnerData]) => {
              return this.buildLearnerRow(
                userId,
                learnerData.learner,
                learnerData.enrollments,
              );
            });
            // Sort learners alphabetically.
            reportRows.sort((a, b) =>
              a.learner.localeCompare(b.learner),
            );
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
     Build Learner Report Row
  ------------------------------------------------------- */
  private buildLearnerRow(
    userId: number,
    learnerName: string,
    enrollments: Enrollment[],
  ): LearnerReportRow {
    const completedCourses = enrollments.filter(enrollment => enrollment.status === 'COMPLETED',).length;
    const incompleteCourses = enrollments.filter(enrollment => enrollment.status === 'IN_PROGRESS' || enrollment.status === 'NOT_STARTED',).length;
    const enrolledCourses = enrollments.length;
    // Average score from actual enrollment API responses.
    const validScores = enrollments
      .map(enrollment => enrollment.score)
      .filter(
        (score): score is number =>
          typeof score === 'number' &&
          Number.isFinite(score),
      );
    const averageScore = validScores.length > 0
      ? `${(
          validScores.reduce((total, score) => total + score, 0) /
          validScores.length
        ).toFixed(2)}%` : '—';
    return {
      userId,
      learner: learnerName,
      // These fields are not supplied by the enrollment API.
      role: 'Learner',
      department: '—',
      registrationDate: '—',
      lastActivity: '—',
      lastLogin: '—',
      completedCourses,
      incompleteCourses,
      enrolledCourses,
      // The existing APIs do not expose assigned course counts.
      assignedCourses: '—',
      averageScore,
      // The existing APIs do not expose study-time metrics.
      studyTime: '—',
      totalTimeOnPlatform: '—',
    };
  }
  /* -------------------------------------------------------
     Error Handling
  ------------------------------------------------------- */
  private handleLoadError(error: unknown): void {
    this.loading.set(false);
    const httpError = error as HttpErrorResponse;
    if (httpError?.status === 0) {
      this.errorMessage.set('Unable to load the Learner Report. Please check your internet connection and try again.',);
      return;
    }
    if (httpError?.status === 401) {
      this.errorMessage.set('Your session has expired. Please log in again.',);
      // Existing auth interceptor handles session cleanup
      // and redirects to the login page.
      return;
    }
    if (httpError?.status >= 500) {
      this.errorMessage.set('Something went wrong. Please try again later.',);
      return;
    }
    this.errorMessage.set('Unable to load the Learner Report. Please try again.',);
  }
  /* -------------------------------------------------------
     Search
  ------------------------------------------------------- */
  onSearchChange(value: string): void {
    this.searchText.set(value.slice(0, 100));
  }
  /* -------------------------------------------------------
     Filter Dropdown
  ------------------------------------------------------- */
  toggleFilterDropdown(): void {
    this.filterDropdownOpen.update(value => !value);
    this.exportDropdownOpen.set(false);
  }
  onFilterChange(value: string): void {
    const validFilters: LearnerFilter[] = ['completed','incompleted', 'enrolled',];
    if (
      value === '' ||
      validFilters.includes(value as LearnerFilter)
    ) {
      this.selectedFilter.set(value as LearnerFilter | '');
    }
  }
  applyFilter(): void {
    this.filterDropdownOpen.set(false);
  }
  clearFilter(): void {
    this.selectedFilter.set('');
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
    if (
      this.loading() ||
      this.filteredRows().length === 0
    ) {
      return;
    }
    try {
      const reportRows = this.filteredRows();
      if (format === 'csv') {
        this.exportCsv(reportRows);
      } else {
        this.exportExcel(reportRows);
      }
      this.exportDropdownOpen.set(false);
      this.errorMessage.set(null);
    } catch {
      this.errorMessage.set('Unable to export the Learner Report. Please try again.',);
    }
  }
  /* -------------------------------------------------------
     Export Headers
  ------------------------------------------------------- */
  private readonly exportHeaders = [
    'Learner',
    'Role',
    'Department',
    'Registration Date',
    'Last Activity',
    'Last Login',
    'Completed Courses',
    'Incomplete Courses',
    'Enrolled Courses',
    'Assigned Courses',
    'Average Score',
    'Study Time',
    'Total Time on Platform',
  ];
  private getExportValues(
    row: LearnerReportRow,
  ): (string | number)[] {
    return [
      row.learner,
      row.role,
      row.department,
      row.registrationDate,
      row.lastActivity,
      row.lastLogin,
      row.completedCourses,
      row.incompleteCourses,
      row.enrolledCourses,
      row.assignedCourses,
      row.averageScore,
      row.studyTime,
      row.totalTimeOnPlatform,
    ];
  }
  /* -------------------------------------------------------
     CSV Export
  ------------------------------------------------------- */
  private exportCsv(data: LearnerReportRow[]): void {
    const csvRows = [
      this.exportHeaders,
      ...data.map(row => this.getExportValues(row)),
    ];
    const csvContent = csvRows
      .map(row =>
        row.map(value => this.escapeCsv(value)).join(','),
      )
      .join('\r\n');
    const blob = new Blob(
      ['\uFEFF', csvContent],
      {
        type: 'text/csv;charset=utf-8;',
      },
    );
    this.downloadFile(blob,'learner-report.csv',);
  }
  private escapeCsv(value: string | number): string {
    const text = String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }
  /* -------------------------------------------------------
     Excel Export
     Excel-compatible Spreadsheet XML
  ------------------------------------------------------- */
  private exportExcel(data: LearnerReportRow[]): void {
    const escapeXml = (value: string | number): string =>
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    const tableRows = [ this.exportHeaders,...data.map(row => this.getExportValues(row)),];
    const xmlRows = tableRows.map((row, index) => {
      const cells = row.map(value => {
        const numeric = typeof value === 'number';
        return `
          <Cell>
            <Data ss:Type="${numeric ? 'Number' : 'String'}">
              ${escapeXml(value)}
            </Data>
          </Cell>
        `;
      }).join('');
      return `
        <Row ss:StyleID="${index === 0 ? 'Header' : 'Normal'}">
          ${cells}
        </Row>
      `;
    }).join('');
    const excelXml = `<?xml version="1.0"?>
      <?mso-application progid="Excel.Sheet"?>
      <Workbook
        xmlns="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
        <Styles>
          <Style ss:ID="Header">
            <Font ss:Bold="1"/>
            <Interior ss:Color="#DDEFF2" ss:Pattern="Solid"/>
          </Style>
          <Style ss:ID="Normal"/>
        </Styles>
        <Worksheet ss:Name="Learner Report">
          <Table>
            ${xmlRows}
          </Table>
        </Worksheet>
      </Workbook>
    `;
    const blob = new Blob(
      [excelXml],
      {
        type: 'application/vnd.ms-excel;charset=utf-8;',
      },
    );
    this.downloadFile( blob,'learner-report.xls',);
  }
  /* -------------------------------------------------------
     Download Helper
  ------------------------------------------------------- */
  private downloadFile(
    blob: Blob,
    fileName: string,
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
     Learner Preview
  ------------------------------------------------------- */
  previewLearner(row: LearnerReportRow): void {
    this.selectedLearner.set(row);
  }
  closePreview(): void {
    this.selectedLearner.set(null);
  }
}