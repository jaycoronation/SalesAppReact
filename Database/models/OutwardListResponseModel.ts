export interface OutwardListResponseModel {
  success: number;
  message: string;
  totalRecords: number;
  data: OutwardListData[];
}

export interface OutwardListData {
  outward_id: string;
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
  issued_to: string;
  remarks: string;
  created_at: string;
}
