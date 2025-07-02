export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="h-10 bg-muted rounded w-1/3"></div>
          <div className="flex space-x-2">
            <div className="h-9 w-24 bg-muted rounded-md"></div>
            <div className="h-9 w-28 bg-muted rounded-md"></div>
            <div className="h-9 w-36 bg-muted rounded-md"></div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="space-y-4 rounded-lg border p-6">
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 bg-muted rounded-full"></div>
            <div className="h-6 w-48 bg-muted rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
            <div className="h-4 bg-muted rounded w-4/6"></div>
          </div>
        </div>

        {/* Key Points */}
        <div className="space-y-4 rounded-lg border p-6">
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 bg-muted rounded-full"></div>
            <div className="h-6 w-36 bg-muted rounded"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start">
                <div className="h-4 w-4 bg-muted rounded-full mt-1 mr-2"></div>
                <div className="h-4 bg-muted rounded w-full max-w-md"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="space-y-4 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 bg-muted rounded-full"></div>
              <div className="h-6 w-36 bg-muted rounded"></div>
            </div>
            <div className="h-6 w-20 bg-muted rounded-full"></div>
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-start space-x-3 rounded-lg border p-4">
                <div className="h-5 w-5 border-2 rounded mt-0.5"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
