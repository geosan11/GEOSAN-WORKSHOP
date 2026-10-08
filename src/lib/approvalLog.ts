export interface ApprovalLine {
  line_id: string;
  at: string;
  actor: string;
  action: 'approved' | 'rejected';
  task_id: string;
  packet_id: string | null;
  reason: string | null;
}

// In-memory demo store for approval lines
const approvalLines: ApprovalLine[] = [];

export function appendApprovalLine(line: Omit<ApprovalLine, 'line_id' | 'at'>) {
  const newLine: ApprovalLine = {
    ...line,
    line_id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    at: new Date().toISOString()
  };
  approvalLines.push(newLine);
  return newLine;
}

export function getApprovalLines(taskId: string): ApprovalLine[] {
  return approvalLines.filter(l => l.task_id === taskId);
}
