export type TallyImportRow = {
  productName: string;
  brandName: string;
  quantity: number;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  message?: string;
};

export type TallyImport = {
  id: string;
  fileName: string;
  warehouse: { id: string; name: string; code: string };
  importedBy: { id: string; name: string };
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  rows: TallyImportRow[];
  createdAt: string;
};
