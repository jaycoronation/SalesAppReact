export interface DepartmentListResponseModel {
  success: number;
  message: string;
  totalRecords: number;
  data: DepartmentData[];
}

export interface DepartmentData {
  dept_id: string;
  dept_name: string;
  dept_code: string;
}
