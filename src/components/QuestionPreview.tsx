import { QuestionRenderer } from './QuestionRenderer';
import { ExtractedQuestion } from '../lib/geminiExtractor';

interface QuestionPreviewProps {
  questions: ExtractedQuestion[];
  onRemove?: (index: number) => void;
}

export function QuestionPreview({ questions, onRemove }: QuestionPreviewProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Extracted Questions ({questions.length})
      </h3>
      {questions.map((question, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-medium text-gray-500">
              Question {index + 1}
            </span>
            {onRemove && (
              <button
                onClick={() => onRemove(index)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            )}
          </div>

          <div className="mb-4">
            <QuestionRenderer
              content={question.question_statement}
              className="text-gray-900 leading-relaxed"
            />
          </div>

          {question.options && question.options.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium text-gray-700">Options:</p>
              {question.options.map((option, optionIndex) => (
                <div
                  key={optionIndex}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-600">
                    {String.fromCharCode(65 + optionIndex)}.
                  </span>
                  <QuestionRenderer
                    content={typeof option === 'string' ? option : JSON.stringify(option)}
                    className="flex-1 text-gray-800"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs text-gray-600">
            <div>
              <span className="font-medium">Type:</span> {question.question_type}
            </div>
            <div>
              <span className="font-medium">Correct:</span> +{question.correct_marks}
            </div>
            <div>
              <span className="font-medium">Incorrect:</span> {question.incorrect_marks}
            </div>
            <div>
              <span className="font-medium">Skipped:</span> {question.skipped_marks}
            </div>
            <div>
              <span className="font-medium">Time:</span> {question.time_minutes} min
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
