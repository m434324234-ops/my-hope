import { useState, useEffect } from 'react';
import { supabase, Exam, Course, Question } from './lib/supabase';
import { PDFUploader, PDFFileInfo } from './components/PDFUploader';
import { QuestionPreview } from './components/QuestionPreview';
import { ExtractionProgress } from './components/ExtractionProgress';
import { convertPDFToPNG } from './lib/pdfConverter';
import { GeminiAPIManager, ExtractedQuestion } from './lib/geminiExtractor';
import { FileText, Settings, Save } from 'lucide-react';

function App() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);

  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedPart, setSelectedPart] = useState<string>('');

  const [pdfFiles, setPdfFiles] = useState<PDFFileInfo[]>([]);
  const [geminiKeys, setGeminiKeys] = useState<string[]>(['']);
  const [autoSave, setAutoSave] = useState(false);

  const [questionType, setQuestionType] = useState('MCQ');
  const [correctMarks, setCorrectMarks] = useState(4);
  const [incorrectMarks, setIncorrectMarks] = useState(-1);
  const [skippedMarks, setSkippedMarks] = useState(0);
  const [partialMarks, setPartialMarks] = useState(0);
  const [timeMinutes, setTimeMinutes] = useState(3);

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [processedPages, setProcessedPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [savedQuestions, setSavedQuestions] = useState(0);

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      loadCourses(selectedExam);
    } else {
      setCourses([]);
      setSelectedCourse('');
    }
  }, [selectedExam]);

  useEffect(() => {
    if (selectedCourse) {
      loadSlots(selectedCourse);
      loadParts(selectedCourse);
    } else {
      setSlots([]);
      setParts([]);
      setSelectedSlot('');
      setSelectedPart('');
    }
  }, [selectedCourse]);

  const loadExams = async () => {
    const { data, error } = await supabase.from('exams').select('*').order('name');
    if (!error && data) setExams(data);
  };

  const loadCourses = async (examId: string) => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('exam_id', examId)
      .order('name');
    if (!error && data) setCourses(data);
  };

  const loadSlots = async (courseId: string) => {
    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .eq('course_id', courseId)
      .order('name');
    if (!error && data) setSlots(data);
  };

  const loadParts = async (courseId: string) => {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('course_id', courseId)
      .order('name');
    if (!error && data) setParts(data);
  };

  const handleAddGeminiKey = () => {
    setGeminiKeys([...geminiKeys, '']);
  };

  const handleRemoveGeminiKey = (index: number) => {
    setGeminiKeys(geminiKeys.filter((_, i) => i !== index));
  };

  const handleGeminiKeyChange = (index: number, value: string) => {
    const newKeys = [...geminiKeys];
    newKeys[index] = value;
    setGeminiKeys(newKeys);
  };

  const saveQuestion = async (question: ExtractedQuestion, year: number) => {
    const questionData: Question = {
      question_type: question.question_type,
      question_statement: question.question_statement,
      options: question.options || undefined,
      course_id: selectedCourse,
      slot: selectedSlot || undefined,
      part: selectedPart || undefined,
      year: year,
      categorized: false,
      correct_marks: question.correct_marks,
      incorrect_marks: question.incorrect_marks,
      skipped_marks: question.skipped_marks,
      partial_marks: question.partial_marks,
      time_minutes: question.time_minutes,
    };

    const { error } = await supabase.from('questions').insert(questionData);
    if (error) {
      console.error('Error saving question:', error);
      throw error;
    }
  };

  const handleStartExtraction = async () => {
    if (!selectedCourse) {
      alert('Please select a course');
      return;
    }

    if (pdfFiles.length === 0) {
      alert('Please upload at least one PDF file');
      return;
    }

    const validKeys = geminiKeys.filter((key) => key.trim().length > 0);
    if (validKeys.length === 0) {
      alert('Please add at least one Gemini API key');
      return;
    }

    setIsProcessing(true);
    setExtractedQuestions([]);
    setSavedQuestions(0);

    const geminiManager = new GeminiAPIManager(validKeys);
    let allExtractedQuestions: ExtractedQuestion[] = [];

    let totalPagesCount = 0;
    for (const pdfFile of pdfFiles) {
      const pages = await convertPDFToPNG(pdfFile.file);
      totalPagesCount += pages.length;
    }
    setTotalPages(totalPagesCount);
    setProcessedPages(0);

    try {
      for (const pdfFile of pdfFiles) {
        setCurrentFile(pdfFile.file.name);
        const pages = await convertPDFToPNG(pdfFile.file);

        for (const page of pages) {
          setCurrentPage(page.pageNumber);

          const questions = await geminiManager.extractQuestionsFromImage(
            page.imageDataUrl,
            {
              question_type: questionType,
              correct_marks: correctMarks,
              incorrect_marks: incorrectMarks,
              skipped_marks: skippedMarks,
              partial_marks: partialMarks,
              time_minutes: timeMinutes,
            }
          );

          if (autoSave) {
            for (const question of questions) {
              await saveQuestion(question, pdfFile.year);
              setSavedQuestions((prev) => prev + 1);
            }
          }

          allExtractedQuestions = [...allExtractedQuestions, ...questions];
          setExtractedQuestions(allExtractedQuestions);
          setProcessedPages((prev) => prev + 1);
        }
      }

      alert('Extraction completed successfully!');
    } catch (error) {
      console.error('Extraction error:', error);
      alert('Error during extraction: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSave = async () => {
    if (!selectedCourse) {
      alert('Please select a course');
      return;
    }

    if (extractedQuestions.length === 0) {
      alert('No questions to save');
      return;
    }

    try {
      setSavedQuestions(0);
      for (const question of extractedQuestions) {
        const pdfFile = pdfFiles[0];
        await saveQuestion(question, pdfFile.year);
        setSavedQuestions((prev) => prev + 1);
      }
      alert('All questions saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving questions: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              PDF Question Extractor
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Exam
              </label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose exam...</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedExam}
              >
                <option value="">Choose course...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Slot (Optional)
              </label>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedCourse}
              >
                <option value="">Choose slot...</option>
                {slots.map((slot) => (
                  <option key={slot.id} value={slot.name}>
                    {slot.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Part (Optional)
              </label>
              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedCourse}
              >
                <option value="">Choose part...</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.name}>
                    {part.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Question Settings
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>MCQ</option>
                  <option>MSQ</option>
                  <option>NAT</option>
                  <option>SUB</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correct Marks
                </label>
                <input
                  type="number"
                  value={correctMarks}
                  onChange={(e) => setCorrectMarks(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incorrect Marks
                </label>
                <input
                  type="number"
                  value={incorrectMarks}
                  onChange={(e) => setIncorrectMarks(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skipped Marks
                </label>
                <input
                  type="number"
                  value={skippedMarks}
                  onChange={(e) => setSkippedMarks(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partial Marks
                </label>
                <input
                  type="number"
                  value={partialMarks}
                  onChange={(e) => setPartialMarks(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time (minutes)
                </label>
                <input
                  type="number"
                  value={timeMinutes}
                  onChange={(e) => setTimeMinutes(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Gemini API Keys
              </h2>
              <button
                onClick={handleAddGeminiKey}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Key
              </button>
            </div>

            <div className="space-y-2">
              {geminiKeys.map((key, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => handleGeminiKeyChange(index, e.target.value)}
                    placeholder="Enter Gemini API Key"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {geminiKeys.length > 1 && (
                    <button
                      onClick={() => handleRemoveGeminiKey(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mb-6">
            <PDFUploader files={pdfFiles} onFilesChange={setPdfFiles} />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Auto-save to database
              </span>
            </label>

            <div className="flex gap-3">
              {!autoSave && extractedQuestions.length > 0 && !isProcessing && (
                <button
                  onClick={handleManualSave}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
                >
                  <Save className="h-5 w-5" />
                  Save to Database
                </button>
              )}

              <button
                onClick={handleStartExtraction}
                disabled={isProcessing}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isProcessing ? 'Processing...' : 'Start Extraction'}
              </button>
            </div>
          </div>
        </div>

        {isProcessing && (
          <div className="mb-8">
            <ExtractionProgress
              totalPages={totalPages}
              processedPages={processedPages}
              currentPage={currentPage}
              currentFile={currentFile}
              savedQuestions={savedQuestions}
            />
          </div>
        )}

        {extractedQuestions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <QuestionPreview questions={extractedQuestions} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
