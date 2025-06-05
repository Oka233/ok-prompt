export class OperationCancelledError extends Error {
  constructor(message: string = '操作被用户取消') {
    super(message);
    this.name = 'OperationCancelledError';
    // 确保 instanceof 能正确工作
    Object.setPrototypeOf(this, OperationCancelledError.prototype);
  }
}
