import { CheckCircle, Circle, Loader } from 'lucide-react';

interface ExtractionProgressProps {
  totalPages: number;
  processedPages: number;
  currentPage: number;
  currentFile: string;
  savedQuestions: number;
}

export function ExtractionProgress({
  totalPages,
  processedPages,
  currentPage,
  currentFile,
  savedQuestions,
}: ExtractionProgressProps) {
  const progress = totalPages > 0 ? (processedPages / totalPages) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Extraction Progress
      </h3>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Processing: {currentFile}</span>
            <span>
              {processedPages} / {totalPages} pages
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {processedPages < totalPages ? (
            <>
              <Loader className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-gray-700">
                Processing page {currentPage}...
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-gray-700">All pages processed!</span>
            </>
          )}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Questions Saved:</span>
            <span className="font-semibold text-blue-600 text-lg">
              {savedQuestions}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
