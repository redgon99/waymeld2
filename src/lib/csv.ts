/**
 * 관리자 목록 CSV 내보내기.
 *
 * 내보내는 값에는 사용자가 입력한 텍스트(관리 메모, 여행 제목, 이메일)가
 * 섞여 있다. 두 가지를 반드시 처리해야 실제로 쓸 수 있는 파일이 나온다.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/**
 * Excel은 셀이 = + - @ 로 시작하면 수식으로 해석한다. 사용자가 넣은
 * 메모나 제목이 그대로 실행되지 않도록 작은따옴표를 앞에 붙여 무력화한다.
 * (CSV 수식 인젝션)
 */
function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function escapeCell(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  const text = neutralizeFormula(String(raw));
  // 큰따옴표는 두 번 써서 이스케이프하고, 구분자·줄바꿈이 있으면 감싼다
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(','));
  return [head, ...body].join('\r\n');
}

/**
 * Excel은 BOM이 없으면 UTF-8 CSV를 시스템 인코딩으로 읽어 한글이 깨진다.
 * 앞에 BOM을 붙여야 더블클릭으로 열었을 때 제대로 나온다.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** 파일명에 날짜를 붙여 여러 번 받아도 덮어쓰지 않게 한다 */
export function csvFilename(prefix: string): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  return `${prefix}_${stamp}.csv`;
}
