import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { LabelEntry } from './types';

export async function generateLabelPDF(entry: LabelEntry): Promise<Uint8Array> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      });

      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(result);
      });

      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(entry.link, {
        width: 200,
        margin: 2,
      });

      // Title (Name or Egg ID)
      const title = entry.name || entry.egg_id;
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text(title, { align: 'center' });

      doc.moveDown(0.5);

      // QR Code
      doc.image(qrDataUrl, {
        fit: [200, 200],
        align: 'center',
      });

      doc.moveDown(0.5);

      // Cage
      doc.fontSize(16)
         .font('Helvetica')
         .text(`Cage: ${entry.cage}`, { align: 'center' });

      doc.moveDown(0.3);

      // Egg ID
      doc.fontSize(14)
         .font('Helvetica')
         .text(`Egg ID: ${entry.egg_id}`, { align: 'center' });

      doc.moveDown(0.5);

      // Link (small text)
      doc.fontSize(10)
         .font('Helvetica')
         .text(entry.link, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
