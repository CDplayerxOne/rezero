import pymupdf

def extract_text_from_pdf(file_stream: bytes) -> dict[int, str]:
    """
    Extracts text from a PDF file using PyMuPDF.

    Args:
        file_path (str): The path to the PDF file.

    Returns:
        dict[int, str]: A dictionary mapping page numbers to the text on each page.
    """
    doc = pymupdf.open(stream=file_stream, filetype="pdf")
    text = {}
    for page in doc:
        assert page
        text[page.number] = page.get_text()
    doc.close()
    return text
