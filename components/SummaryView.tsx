import { CheckCircle, Clock, FileText, ListChecks, Mail, Download, Calendar } from 'lucide-react';
import { Button } from './ui/button';

type SummaryData = {
  title: string;
  date: string;
  duration: string;
  participants: string[];
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    id: string;
    task: string;
    assignee: string;
    dueDate: string;
    completed: boolean;
  }>;
};

type SummaryViewProps = {
  data: SummaryData;
  onExportPDF: () => void;
  onSendEmail: () => void;
  onExportICS: () => void;
  className?: string;
};

export function SummaryView({
  data,
  onExportPDF,
  onSendEmail,
  onExportICS,
  className = '',
}: SummaryViewProps) {
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{data.title}</h1>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="mr-1.5 h-4 w-4" />
            <span>{data.date}</span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-1.5 h-4 w-4" />
            <span>{data.duration}</span>
          </div>
        </div>
        {data.participants.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {data.participants.map((participant, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium"
              >
                {participant}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onExportPDF}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={onSendEmail}>
          <Mail className="mr-2 h-4 w-4" />
          Send Email
        </Button>
        <Button variant="outline" size="sm" onClick={onExportICS}>
          <Calendar className="mr-2 h-4 w-4" />
          Add to Calendar
        </Button>
      </div>

      {/* Summary */}
      <div className="space-y-4 rounded-lg border p-6">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Meeting Summary</h2>
        </div>
        <p className="text-muted-foreground">{data.summary}</p>
      </div>

      {/* Key Points */}
      <div className="space-y-4 rounded-lg border p-6">
        <div className="flex items-center space-x-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Key Points</h2>
        </div>
        <ul className="space-y-2">
          {data.keyPoints.map((point, index) => (
            <li key={index} className="flex items-start">
              <CheckCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Items */}
      <div className="space-y-4 rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Action Items</h2>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {data.actionItems.length} items
          </span>
        </div>
        <div className="space-y-4">
          {data.actionItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start space-x-3 rounded-lg border p-4"
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => {}}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <p className={`${item.completed ? 'text-muted-foreground line-through' : ''}`}>
                  {item.task}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Assigned to {item.assignee}</span>
                  <span>•</span>
                  <span>Due {item.dueDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
