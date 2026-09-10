import os
import tempfile
import requests
import pdfplumber
import olefile


class AttachmentError(Exception):
    """첨부파일 다운로드 및 파싱 처리 중 발생하는 예외 클래스"""
    pass


def download_and_extract(file_url: str, notice_id: str) -> str:
    """
    첨부파일 URL을 받아서 임시 파일로 다운로드 후 확장자(PDF, HWP, HWPX)에 맞춰
    텍스트를 추출하고, 임시 파일을 안전하게 삭제합니다.
    """
    if not file_url:
        return ""

    # 확장자 추정
    clean_url = file_url.split("?")[0].lower()
    ext = ""
    if clean_url.endswith(".pdf"):
        ext = ".pdf"
    elif clean_url.endswith(".hwp"):
        ext = ".hwp"
    elif clean_url.endswith(".hwpx"):
        ext = ".hwpx"
    else:
        # 확장자를 알 수 없는 경우 응답 헤더나 URL 기반 기본값 처리
        ext = ".tmp"

    temp_path = None
    extracted_text = ""

    try:
        # 1. 파일 다운로드 (임시 파일 생성)
        response = requests.get(file_url, timeout=30, stream=True)
        response.raise_for_status()

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    temp_file.write(chunk)
            temp_path = temp_file.name

        # 2. 확장자별 텍스트 파싱
        if ext == ".pdf":
            extracted_text = _parse_pdf(temp_path)
        elif ext in [".hwp", ".hwpx"]:
            extracted_text = _parse_hwp(temp_path)
        else:
            # 확장자 미지정 시 PDF 시도 후 실패 시 HWP 시도
            try:
                extracted_text = _parse_pdf(temp_path)
            except Exception:
                extracted_text = _parse_hwp(temp_path)

        return extracted_text

    except requests.RequestException as e:
        raise AttachmentError(f"파일 다운로드 실패 ({file_url}): {e}")
    except Exception as e:
        raise AttachmentError(f"첨부파일 파싱 실패 ({file_url}): {e}")

    finally:
        # 3. 임시 파일 생명주기 관리 (항상 삭제)
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


def _parse_pdf(file_path: str) -> str:
    """pdfplumber를 사용한 PDF 텍스트 및 표 추출"""
    text_runs = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_runs.append(page_text)
            
            # 표 형태 데이터도 텍스트로 보완 추출
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    filtered_row = [cell for cell in row if cell]
                    if filtered_row:
                        text_runs.append(" | ".join(filtered_row))

    return "\n".join(text_runs)


def _parse_hwp(file_path: str) -> str:
    """olefile을 이용한 HWP/HWPX 바이너리 내 BodyText 스트림 텍스트 추출"""
    text_runs = []
    if not olefile.isOleFile(file_path):
        # OLE 포맷이 아닌 경우 일반 텍스트 읽기 시도
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception:
            return ""

    ole = olefile.OleFileIO(file_path)
    dirs = ole.listdir()

    # BodyText 섹션 내의 스트림 탐색 및 추출
    for path in dirs:
        if path[0] == "BodyText":
            stream = ole.openstream(path)
            data = stream.read()
            
            # HWP UTF-16LE 인코딩 텍스트 바이트 디코딩 처리
            try:
                decoded = data.decode("utf-16le", errors="ignore")
                # 제어 문자 제거 및 정제
                cleaned = "".join(ch for ch in decoded if ch.isprintable() or ch in ["\n", "\r", "\t"])
                if cleaned.strip():
                    text_runs.append(cleaned)
            except Exception:
                continue

    ole.close()
    return "\n".join(text_runs)
