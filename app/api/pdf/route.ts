import { NextRequest, NextResponse } from 'next/server';
import { readEntries } from '../../../lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/pdf called');
    
    const entries = await readEntries();
    console.log(`Generating PDF for ${entries.length} entries`);
    
    if (entries.length === 0) {
      return NextResponse.json({ error: 'No entries to generate PDF for' }, { status: 400 });
    }

    // Generate HTML for PDF
    const html = generatePDFHTML(entries);
    
    // Return HTML that can be printed or converted to PDF
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/pdf:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

function generatePDFHTML(entries: any[]) {
  const labelsPerRow = 4;
  const labelsPerCol = 6;
  const labelsPerPage = labelsPerRow * labelsPerCol;
  const totalPages = Math.ceil(entries.length / labelsPerPage);
  
  let pagesHTML = '';
  
  for (let page = 0; page < totalPages; page++) {
    const startIndex = page * labelsPerPage;
    const endIndex = Math.min(startIndex + labelsPerPage, entries.length);
    const pageEntries = entries.slice(startIndex, endIndex);
    
    pagesHTML += generatePageHTML(pageEntries, page + 1, totalPages);
    
    // Add page break (except for last page)
    if (page < totalPages - 1) {
      pagesHTML += '<div style="page-break-after: always;"></div>';
    }
  }
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Egg Labels - ${entries.length} Labels</title>
    <style>
        @media print {
            body { margin: 0; }
            .page { page-break-after: always; }
            .page:last-child { page-break-after: avoid; }
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
        }
        
        .page {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            padding: 20mm;
            box-sizing: border-box;
            background: white;
            position: relative;
        }
        
        .page-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        
        .page-title {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
        }
        
        .page-info {
            font-size: 14px;
            color: #666;
            margin: 5px 0 0 0;
        }
        
        .labels-grid {
            display: grid;
            grid-template-columns: repeat(${labelsPerRow}, 1fr);
            grid-template-rows: repeat(${labelsPerCol}, 1fr);
            gap: 15px;
            height: calc(100% - 100px);
        }
        
        .label {
            border: 2px solid #333;
            border-radius: 8px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            background: white;
            min-height: 120px;
        }
        
        .label-cage {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #333;
        }
        
        .label-name {
            font-size: 16px;
            margin-bottom: 8px;
            color: #333;
        }
        
        .label-egg-id {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
        }
        
        .label-qr {
            width: 60px;
            height: 60px;
            border: 1px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #999;
            background: #f8f9fa;
        }
        
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            z-index: 1000;
        }
        
        .print-button:hover {
            background: #0056b3;
        }
        
        @media print {
            .print-button { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">🖨️ Print PDF</button>
    
    ${pagesHTML}
    
    <script>
        // Auto-print when page loads (optional)
        // window.onload = function() { window.print(); }
    </script>
</body>
</html>`;
}

function generatePageHTML(entries: any[], pageNum: number, totalPages: number) {
  const labelsPerRow = 4;
  const labelsPerCol = 6;
  
  let labelsHTML = '';
  
  // Generate grid of labels
  for (let row = 0; row < labelsPerCol; row++) {
    for (let col = 0; col < labelsPerRow; col++) {
      const index = row * labelsPerRow + col;
      const entry = entries[index];
      
      if (entry) {
        labelsHTML += `
            <div class="label">
                <div class="label-cage">${entry.cage}</div>
                <div class="label-name">${entry.name}</div>
                <div class="label-egg-id">${entry.egg_id}</div>
                <div class="label-qr">QR</div>
            </div>`;
      } else {
        // Empty label placeholder
        labelsHTML += `
            <div class="label" style="border: 1px dashed #ccc; background: #f8f9fa;">
                <div style="color: #ccc; font-size: 12px;">Empty</div>
            </div>`;
      }
    }
  }
  
  return `
    <div class="page">
        <div class="page-header">
            <h1 class="page-title">Egg Labels</h1>
            <p class="page-info">Page ${pageNum} of ${totalPages} • ${entries.length} total labels</p>
        </div>
        <div class="labels-grid">
            ${labelsHTML}
        </div>
    </div>`;
}
