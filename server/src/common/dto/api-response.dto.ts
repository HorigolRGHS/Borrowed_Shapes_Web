export class ApiResponseDto<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  path: string;
  timestamp: string;

  constructor(
    statusCode: number,
    success: boolean,
    message: string,
    data: T,
    path: string,
    timestamp: string,
  ) {
    this.statusCode = statusCode;
    this.success = success;
    this.message = message;
    this.data = data;
    this.path = path;
    this.timestamp = timestamp;
  }
}

export function okResponse<T>(
  message: string,
  data: T,
  path: string,
  timestamp: string = new Date().toISOString(),
): ApiResponseDto<T> {
  return new ApiResponseDto(200, true, message, data, path, timestamp);
}

export function errorResponse<T>(
  statusCode: number,
  message: string,
  path: string,
  data?: T,
  timestamp: string = new Date().toISOString(),
): ApiResponseDto<T> {
  return new ApiResponseDto(
    statusCode,
    false,
    message,
    data ?? (null as T),
    path,
    timestamp,
  );
}
