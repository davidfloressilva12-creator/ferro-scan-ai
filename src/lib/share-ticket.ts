import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { TicketSale } from "@/components/ThermalTicket";

/**
 * Convierte el nodo del ticket a PDF y lo comparte vía Web Share API.
 * Si la compartición de archivos no está disponible, descarga el PDF.
 */
export async function shareTicketPdf(node: HTMLElement, sale: TicketSale, phone?: string) {
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");

  // 80mm = ~80 * 2.83 pt; calcular alto proporcional
  const pdfWidth = 80; // mm
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({ unit: "mm", format: [pdfWidth, pdfHeight] });
  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

  const filename = `ticket-${sale.doc_full}.pdf`;
  const blob = pdf.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });

  const shareText = `${sale.doc_type === "factura" ? "Factura" : "Boleta"} ${sale.doc_full} — Total S/ ${sale.total.toFixed(2)}`;

  // 1) Web Share API con archivo
  if ((navigator as any).canShare?.({ files: [file] })) {
    try {
      await (navigator as any).share({
        files: [file],
        title: filename,
        text: shareText,
      });
      return;
    } catch (e) {
      // usuario canceló o falló: fallback
    }
  }

  // 2) Fallback: descarga + abrir wa.me
  pdf.save(filename);
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  }
}
