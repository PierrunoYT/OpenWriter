import { NextApiRequest, NextApiResponse } from 'next';
import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { slides, format } = req.body;

  if (!slides || !format) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    if (format === 'pdf') {
      const doc = new jsPDF();
      slides.forEach((slide: any, index: number) => {
        if (index > 0) {
          doc.addPage();
        }
        doc.text(slide.content, 10, 10);
        if (slide.image) {
          doc.addImage(slide.image, 'JPEG', 10, 20, 180, 160);
        }
      });
      const pdfData = doc.output('blob');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=slides.pdf');
      res.status(200).send(pdfData);
    } else if (format === 'pptx') {
      const pptx = new pptxgen();
      slides.forEach((slide: any) => {
        const slideObj = pptx.addSlide();
        slideObj.addText(slide.content, { x: 0.5, y: 0.5, fontSize: 18 });
        if (slide.image) {
          slideObj.addImage({ path: slide.image, x: 0.5, y: 1.5, w: 8, h: 4.5 });
        }
      });
      const pptxData = await pptx.write('blob');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', 'attachment; filename=slides.pptx');
      res.status(200).send(pptxData);
    } else {
      res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error) {
    console.error('Error exporting slides:', error);
    res.status(500).json({ error: 'Failed to export slides' });
  }
};

export default handler;
