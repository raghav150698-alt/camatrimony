/**
 * Custom Client-Side Report Export Utility (CSV + Excel + PDF).
 * Lightweight, edge-compatible, and requires zero heavy external npm dependencies.
 */

interface ExportColumn {
  key: string;
  header: string;
}

/**
 * Generates and downloads a CSV file.
 */
export function exportToCSV(data: any[], columns: ExportColumn[], filename: string) {
  // Format headers
  const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");

  // Format rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        let val = row[col.key];
        if (val === undefined || val === null) val = "";

        // Convert objects/arrays to string
        if (typeof val === "object") {
          val = JSON.stringify(val);
        }

        // Escape quotes
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(",")
  );

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates and downloads an XML-formatted Excel spreadsheet.
 */
export function exportToExcel(data: any[], columns: ExportColumn[], filename: string) {
  let xml = `<?xml version="1.0" encoding="utf-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF" />
      <Interior ss:Color="#7B1E1E" ss:Pattern="Solid" />
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" />
    </Style>
    <Style ss:ID="Default">
      <Alignment ss:Vertical="Center" />
    </Style>
  </Styles>
  <Worksheet ss:Name="Sheet1">
    <Table>`;

  // Define Columns
  columns.forEach(() => {
    xml += '\n      <Column ss:Width="120" />';
  });

  // Headers Row
  xml += "\n      <Row ss:Height=\"25\">";
  columns.forEach((col) => {
    xml += `\n        <Cell ss:StyleID="Header"><Data ss:Type="String">${col.header}</Data></Cell>`;
  });
  xml += "\n      </Row>";

  // Data Rows
  data.forEach((row) => {
    xml += "\n      <Row ss:Height=\"20\">";
    columns.forEach((col) => {
      let val = row[col.key];
      if (val === undefined || val === null) val = "";

      const type = typeof val === "number" ? "Number" : "String";
      xml += `\n        <Cell ss:StyleID="Default"><Data ss:Type="${type}">${val}</Data></Cell>`;
    });
    xml += "\n      </Row>";
  });

  xml += `\n    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Initiates a clean print template layout for client-side window PDF printing.
 */
export function exportToPDF(data: any[], columns: ExportColumn[], title: string, filename: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const headersHtml = columns.map((col) => `<th>${col.header}</th>`).join("");

  const rowsHtml = data
    .map(
      (row) =>
        `<tr>${columns
          .map((col) => {
            const val = row[col.key];
            return `<td>${val !== undefined && val !== null ? val : ""}</td>`;
          })
          .join("")}</tr>`
    )
    .join("");

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7b1e1e; padding-bottom: 15px; margin-bottom: 25px; }
          .logo { font-size: 20px; font-weight: bold; color: #7b1e1e; letter-spacing: 0.5px; }
          .title { font-size: 18px; font-weight: bold; text-transform: uppercase; color: #1e293b; }
          .meta { font-size: 11px; color: #64748b; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          th { background-color: #7b1e1e; color: #ffffff; font-weight: bold; padding: 8px 10px; text-align: left; border: 1px solid #7b1e1e; }
          td { padding: 8px 10px; border: 1px solid #e2e8f0; text-align: left; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">CA MATRIMONY</div>
            <div class="title">${title}</div>
          </div>
          <div class="meta">
            Generated: ${timestamp}<br>
            Record Count: ${data.length}
          </div>
        </div>

        <table>
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          CA Matrimony BNCN Enterprise Portal Report. Confidential.
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
