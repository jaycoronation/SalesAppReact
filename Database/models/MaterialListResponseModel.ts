export interface MaterialListResponseModel {
  success: number;
  message: string;
  totalRecords: number;
  data: MaterialListData[];
}

export interface MaterialListData {
  material_id: string;
  dept_id: string;
  material_name: string;
  unit: string;
  rate: string;
  is_active: string;
}
