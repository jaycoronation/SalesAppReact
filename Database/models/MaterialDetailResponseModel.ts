export interface MaterialDetailResponseModel {
  success: number;
  message: string;
  data: MaterialDetailData;
}

export interface MaterialDetailData {
  material_id: string;
  dept_id: string;
  material_name: string;
  unit: string;
  rate: string;
  is_active: string;
  created_at: string;
  updated_at: string;
}
