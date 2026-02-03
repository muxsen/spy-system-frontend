export interface ISuccessResponse<T> {
  status: 'ok';
  data: T;
}

export interface IErrorResponse {
  status: 'error';
  message: string;
  code?: string;
}

export type UserRole = 'user' | 'admin';
