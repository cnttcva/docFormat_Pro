// File: src/services/docPageLayout.ts
import { getNodes, setAttr, W_NS, TWIPS_PER_CM } from './docUtils';

// Hàm xử lý lề, khổ giấy DOCX
export const formatPageStructure = (doc: Document, options: any) => {
  const sectPrsDoc = getNodes(doc, "sectPr");

  for (const sectPr of sectPrsDoc) {
    let pgSz = Array.from(sectPr.childNodes).find(
      n => n.nodeType === 1 && (n as Element).localName === "pgSz"
    ) as Element | undefined;

    if (!pgSz) {
      pgSz = doc.createElementNS(W_NS, "w:pgSz");
      if (sectPr.firstChild) {
        sectPr.insertBefore(pgSz, sectPr.firstChild);
      } else {
        sectPr.appendChild(pgSz);
      }
    }

    const orient =
      pgSz.getAttributeNS(W_NS, "orient") ||
      pgSz.getAttribute("w:orient");

    const wStr =
      pgSz.getAttributeNS(W_NS, "w") ||
      pgSz.getAttribute("w:w");

    const hStr =
      pgSz.getAttributeNS(W_NS, "h") ||
      pgSz.getAttribute("w:h");

    const w = parseInt(wStr || "0", 10);
    const h = parseInt(hStr || "0", 10);
    const isLandscape = orient === "landscape" || (w > 0 && h > 0 && w > h);

    if (isLandscape) {
      // A4 ngang: 29.7cm x 21cm
      setAttr(pgSz, "w", "16838");
      setAttr(pgSz, "h", "11906");
      setAttr(pgSz, "orient", "landscape");
    } else {
      // A4 dọc: 21cm x 29.7cm
      setAttr(pgSz, "w", "11906");
      setAttr(pgSz, "h", "16838");

      pgSz.removeAttributeNS(W_NS, "orient");
      pgSz.removeAttribute("w:orient");
    }

    let pgMar = Array.from(sectPr.childNodes).find(
      n => n.nodeType === 1 && (n as Element).localName === "pgMar"
    ) as Element | undefined;

    if (!pgMar) {
      pgMar = doc.createElementNS(W_NS, "w:pgMar");

      if (pgSz.nextSibling) {
        sectPr.insertBefore(pgMar, pgSz.nextSibling);
      } else {
        sectPr.appendChild(pgMar);
      }
    }

    setAttr(pgMar, "top", String(Math.round(options.margins.top * TWIPS_PER_CM)));
    setAttr(pgMar, "bottom", String(Math.round(options.margins.bottom * TWIPS_PER_CM)));
    setAttr(pgMar, "left", String(Math.round(options.margins.left * TWIPS_PER_CM)));
    setAttr(pgMar, "right", String(Math.round(options.margins.right * TWIPS_PER_CM)));

    // 720 twips = 1.27cm. Đây là khoảng cách header/footer chuẩn Word.
    setAttr(pgMar, "header", "720");
    setAttr(pgMar, "footer", "720");
    setAttr(pgMar, "gutter", "0");
  }
};