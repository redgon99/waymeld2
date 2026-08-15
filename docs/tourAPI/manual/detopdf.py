#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""폴더 안의 DOCX·XLSX 파일을 PDF로 일괄 변환합니다.

기본 동작
1. 실행 시 변환할 폴더를 선택합니다.
2. 선택한 폴더와 모든 하위 폴더의 .docx 및 .xlsx 파일을 찾습니다.
3. PDF는 각 원본 파일과 같은 폴더에 같은 이름으로 저장합니다.
4. 이미 PDF가 있으면 기본적으로 건너뜁니다.

필수 환경
- Windows
- Microsoft Word 및 Microsoft Excel 설치
- pywin32: py -m pip install pywin32

사용 예
    py docx_to_pdf_batch.py
    py docx_to_pdf_batch.py "C:\\문서"
    py docx_to_pdf_batch.py "C:\\문서" --no-recursive --overwrite
    py docx_to_pdf_batch.py "C:\\문서" --output "D:\\PDF결과"
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from pathlib import Path


SUPPORTED_EXTENSIONS = {".docx", ".xlsx"}
WD_EXPORT_FORMAT_PDF = 17
XL_TYPE_PDF = 0


@dataclass
class ConversionResult:
    converted: int = 0
    skipped: int = 0
    failed: int = 0
    errors: list[str] = field(default_factory=list)


def choose_folder() -> Path | None:
    """Tkinter 폴더 선택 창을 열어 입력 폴더를 반환합니다."""
    try:
        import tkinter as tk
        from tkinter import filedialog
    except ImportError:
        return None

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    selected = filedialog.askdirectory(
        title="DOCX 또는 XLSX 파일이 있는 폴더를 선택하세요"
    )
    root.destroy()
    return Path(selected) if selected else None


def show_message(title: str, message: str, *, error: bool = False) -> None:
    """GUI로 실행했을 때 결과 메시지를 표시합니다."""
    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        if error:
            messagebox.showerror(title, message)
        else:
            messagebox.showinfo(title, message)
        root.destroy()
    except Exception:
        pass


def is_inside(path: Path, parent: Path) -> bool:
    """path가 parent와 같거나 그 하위인지 확인합니다."""
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def collect_office_files(
    source_dir: Path,
    recursive: bool,
    output_dir: Path | None,
) -> list[Path]:
    paths = source_dir.rglob("*") if recursive else source_dir.iterdir()
    files: list[Path] = []
    output_is_separate_subfolder = (
        output_dir is not None
        and output_dir.resolve() != source_dir.resolve()
        and is_inside(output_dir, source_dir)
    )

    for path in paths:
        if (
            not path.is_file()
            or path.name.startswith("~$")
            or path.suffix.lower() not in SUPPORTED_EXTENSIONS
        ):
            continue

        # 별도 출력 폴더가 입력 폴더 안에 있으면 그 안의 원본 파일은 제외합니다.
        if output_is_separate_subfolder and is_inside(path, output_dir):
            continue

        files.append(path)

    return sorted(files, key=lambda item: str(item).lower())


def make_base_pdf_path(
    source_path: Path,
    source_dir: Path,
    output_dir: Path | None,
) -> Path:
    if output_dir is None:
        return source_path.with_suffix(".pdf")

    relative_path = source_path.relative_to(source_dir)
    return (output_dir / relative_path).with_suffix(".pdf")


def build_conversion_jobs(
    source_files: list[Path],
    source_dir: Path,
    output_dir: Path | None,
) -> list[tuple[Path, Path]]:
    """원본과 PDF 경로를 만들고 동일 이름 충돌을 방지합니다."""
    base_paths = [
        make_base_pdf_path(path, source_dir, output_dir) for path in source_files
    ]
    name_counts: dict[tuple[str, str], int] = {}

    for pdf_path in base_paths:
        key = (str(pdf_path.parent).casefold(), pdf_path.stem.casefold())
        name_counts[key] = name_counts.get(key, 0) + 1

    jobs: list[tuple[Path, Path]] = []
    for source_path, pdf_path in zip(source_files, base_paths):
        key = (str(pdf_path.parent).casefold(), pdf_path.stem.casefold())
        if name_counts[key] > 1:
            # 예: 보고서.docx와 보고서.xlsx가 함께 있으면 서로 덮지 않도록 구분합니다.
            suffix_label = source_path.suffix.lower().lstrip(".")
            pdf_path = pdf_path.with_name(f"{source_path.stem}_{suffix_label}.pdf")
        jobs.append((source_path, pdf_path))

    return jobs


def export_docx(word: object, source_path: Path, pdf_path: Path) -> None:
    document = None
    try:
        document = word.Documents.Open(
            str(source_path.resolve()),
            ConfirmConversions=False,
            ReadOnly=True,
            AddToRecentFiles=False,
        )
        document.ExportAsFixedFormat(
            str(pdf_path.resolve()),
            WD_EXPORT_FORMAT_PDF,
        )
    finally:
        if document is not None:
            try:
                document.Close(SaveChanges=False)
            except Exception:
                pass


def export_xlsx(excel: object, source_path: Path, pdf_path: Path) -> None:
    workbook = None
    try:
        workbook = excel.Workbooks.Open(
            str(source_path.resolve()),
            UpdateLinks=0,
            ReadOnly=True,
            IgnoreReadOnlyRecommended=True,
        )
        # 통합문서의 보이는 워크시트를 기존 인쇄영역 설정에 따라 PDF로 내보냅니다.
        workbook.ExportAsFixedFormat(
            XL_TYPE_PDF,
            str(pdf_path.resolve()),
        )
    finally:
        if workbook is not None:
            try:
                workbook.Close(SaveChanges=False)
            except Exception:
                pass


def convert_all(
    source_dir: Path,
    *,
    output_dir: Path | None,
    recursive: bool,
    overwrite: bool,
    office_visible: bool,
) -> ConversionResult:
    source_files = collect_office_files(source_dir, recursive, output_dir)
    if not source_files:
        raise RuntimeError("선택한 폴더에서 DOCX 또는 XLSX 파일을 찾지 못했습니다.")

    jobs = build_conversion_jobs(source_files, source_dir, output_dir)
    result = ConversionResult()
    pending_jobs: list[tuple[Path, Path]] = []
    total = len(jobs)

    for index, (source_path, pdf_path) in enumerate(jobs, start=1):
        print(f"[{index}/{total}] {source_path}")
        if pdf_path.exists() and not overwrite:
            print(f"  건너뜀: PDF가 이미 있습니다 -> {pdf_path}")
            result.skipped += 1
        else:
            pending_jobs.append((source_path, pdf_path))

    if not pending_jobs:
        return result

    try:
        import pythoncom
        from win32com.client import DispatchEx
    except ImportError as exc:
        raise RuntimeError(
            "pywin32가 설치되어 있지 않습니다.\n"
            "명령 프롬프트에서 다음 명령을 실행하세요:\n\n"
            "py -m pip install pywin32"
        ) from exc

    word = None
    excel = None
    word_start_error: str | None = None
    excel_start_error: str | None = None
    need_word = any(path.suffix.lower() == ".docx" for path, _ in pending_jobs)
    need_excel = any(path.suffix.lower() == ".xlsx" for path, _ in pending_jobs)

    pythoncom.CoInitialize()
    try:
        if need_word:
            try:
                word = DispatchEx("Word.Application")
                word.Visible = office_visible
                word.DisplayAlerts = 0
            except Exception as exc:
                word_start_error = (
                    "Microsoft Word를 실행할 수 없습니다. "
                    f"Word 설치 상태를 확인하세요. ({type(exc).__name__}: {exc})"
                )

        if need_excel:
            try:
                excel = DispatchEx("Excel.Application")
                excel.Visible = office_visible
                excel.DisplayAlerts = False
                excel.AskToUpdateLinks = False
                excel.EnableEvents = False
            except Exception as exc:
                excel_start_error = (
                    "Microsoft Excel을 실행할 수 없습니다. "
                    f"Excel 설치 상태를 확인하세요. ({type(exc).__name__}: {exc})"
                )

        for source_path, pdf_path in pending_jobs:
            try:
                pdf_path.parent.mkdir(parents=True, exist_ok=True)
                extension = source_path.suffix.lower()

                if extension == ".docx":
                    if word is None:
                        raise RuntimeError(word_start_error or "Word 실행에 실패했습니다.")
                    export_docx(word, source_path, pdf_path)
                elif extension == ".xlsx":
                    if excel is None:
                        raise RuntimeError(excel_start_error or "Excel 실행에 실패했습니다.")
                    export_xlsx(excel, source_path, pdf_path)
                else:
                    raise RuntimeError(f"지원하지 않는 파일 형식입니다: {extension}")

                if not pdf_path.exists():
                    raise RuntimeError("변환 후 PDF 파일이 생성되지 않았습니다.")

                print(f"  완료: {pdf_path}")
                result.converted += 1
            except Exception as exc:
                message = f"{source_path} -> {type(exc).__name__}: {exc}"
                print(f"  실패: {message}", file=sys.stderr)
                result.errors.append(message)
                result.failed += 1
    finally:
        if word is not None:
            try:
                word.Quit()
            except Exception:
                pass
        if excel is not None:
            try:
                excel.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()

    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="폴더 안의 DOCX·XLSX 파일을 PDF로 일괄 변환합니다."
    )
    parser.add_argument(
        "folder",
        nargs="?",
        help="DOCX·XLSX 파일이 있는 폴더. 생략하면 폴더 선택 창이 열립니다.",
    )
    parser.add_argument(
        "-o",
        "--output",
        help="PDF 출력 폴더. 생략하면 각 원본 파일과 같은 폴더에 저장합니다.",
    )
    parser.add_argument(
        "--no-recursive",
        action="store_true",
        help="하위 폴더는 변환하지 않습니다.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="같은 이름의 PDF가 있으면 덮어씁니다.",
    )
    parser.add_argument(
        "--visible",
        action="store_true",
        help="변환 중 Microsoft Word·Excel 창을 표시합니다.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    gui_mode = not bool(args.folder)

    source_dir = Path(args.folder).expanduser() if args.folder else choose_folder()
    if source_dir is None:
        print("폴더 선택이 취소되었습니다.")
        return 0

    source_dir = source_dir.resolve()
    if not source_dir.is_dir():
        message = f"유효한 폴더가 아닙니다:\n{source_dir}"
        print(message, file=sys.stderr)
        if gui_mode:
            show_message("오류", message, error=True)
        return 1

    output_dir = Path(args.output).expanduser().resolve() if args.output else None

    try:
        result = convert_all(
            source_dir,
            output_dir=output_dir,
            recursive=not args.no_recursive,
            overwrite=args.overwrite,
            office_visible=args.visible,
        )
    except RuntimeError as exc:
        message = str(exc)
        print(message, file=sys.stderr)
        if gui_mode:
            show_message("Office 문서 → PDF 변환 오류", message, error=True)
        return 1

    summary = (
        "DOCX·XLSX → PDF 변환이 끝났습니다.\n\n"
        f"변환 완료: {result.converted}개\n"
        f"건너뜀: {result.skipped}개\n"
        f"실패: {result.failed}개"
    )
    if result.errors:
        summary += "\n\n실패한 파일은 명령 프롬프트의 오류 내용을 확인하세요."

    print("\n" + summary)
    if gui_mode:
        show_message("변환 완료", summary, error=result.failed > 0)

    return 2 if result.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
