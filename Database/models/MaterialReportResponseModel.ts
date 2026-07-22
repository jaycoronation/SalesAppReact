export interface MaterialReportResponseModel {
  success: number;
  message: string;
  dept_name: string;
  month: number;
  year: number;
  data: MaterialReportData[];
}

export interface MaterialReportData {
  material_id: string;
  material_name: string;
  unit: string;
  rate: string;
  opening_qty: string;
  opening_value: string;
  inward_qty: string;
  inward_value: string;
  outward_qty: string;
  outward_value: string;
  closing_qty: string;
  closing_value: string;
}
