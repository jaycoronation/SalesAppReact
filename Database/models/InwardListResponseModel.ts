export interface InwardListResponseModel {
  success: number;
  message: string;
  totalRecords: number;
  data: InwardListData[];
}

export interface InwardListData {
  inward_id: string;
  material_id: string;
  material_name: string;
  unit: string;
  dept_id: string;
  dept_name: string;
  month: string;
  year: string;
  qty: string;
  rate: string;
  value: string;
  remarks: string;
  created_at: string;
}
