import { useState, useEffect, type ChangeEvent } from 'react'
import './App.css'
import { Button } from './components/ui/button'
import Papa from 'papaparse'

interface CSVRow {
  capitulo: string
  orden: string
  pregunta: string
  respuesta: string
  a: string
  b: string
  c: string
  d: string
  e: string
}

interface Question {
  capitulo: string
  orden: string
  pregunta: string
  respuesta: string
  opciones: { key: string; text: string }[]
}

interface UserAnswer {
  questionIndex: number
  selectedAnswer: string
}

interface CSVFile {
  name: string
  data: CSVRow[]
}

const initialCsvFileNames = [
  'git-calvin-rodrigues.csv',
  'archivo-prueba.csv',
]

function App() {
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([])
  const [selectedFileName, setSelectedFileName] = useState('')
  const [chapters, setChapters] = useState<string[]>([])
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([])
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [isFinished, setIsFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setActiveCsvFile = (file: CSVFile) => {
    setCsvData(file.data)
    setSelectedFileName(file.name)
    setChapters(Array.from(new Set(file.data.map((row) => row.capitulo))).sort())
    setSelectedChapters(new Set())
    setGeneratedQuestions([])
    setUserAnswers([])
    setIsFinished(false)
    setError(null)
  }

  // Cargar el archivo CSV
  useEffect(() => {
    const loadCsvFile = (fileName: string): Promise<CSVFile> => {
      const csvUrl = `${import.meta.env.BASE_URL}${fileName}`

      return fetch(csvUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`)
          }
          return response.text()
        })
        .then((text) => new Promise((resolve, reject) => {
          Papa.parse<CSVRow>(text, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => resolve({ name: fileName, data: result.data }),
            error: reject,
          })
        }))
    }

    Promise.all(initialCsvFileNames.map(loadCsvFile))
      .then((files) => {
        setCsvFiles(files)
        setActiveCsvFile(files[0])
        setLoading(false)
      })
      .catch((err: Error) => {
        console.error('Error al cargar los archivos CSV:', err)
        setError(`Error al cargar los archivos: ${err.message}`)
        setLoading(false)
      })
  }, [])

  const handleFileChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedFile = csvFiles.find((file) => file.name === event.target.value)

    if (selectedFile) setActiveCsvFile(selectedFile)
  }

  // Toggle de capítulo seleccionado
  const toggleChapter = (chapter: string) => {
    const newSelected = new Set(selectedChapters)
    if (newSelected.has(chapter)) {
      newSelected.delete(chapter)
    } else {
      newSelected.add(chapter)
    }
    setSelectedChapters(newSelected)
  }

  // Generar preguntas aleatorias
  const generateQuestions = () => {
    const questions: Question[] = []
    
    selectedChapters.forEach((chapter) => {
      // Filtrar preguntas por capítulo
      const chapterQuestions = csvData.filter((row) => row.capitulo === chapter)
      
      // Formatear preguntas
      chapterQuestions.forEach((row) => {
        const opciones = [
          { key: 'a', text: row.a },
          { key: 'b', text: row.b },
          { key: 'c', text: row.c },
          { key: 'd', text: row.d },
          { key: 'e', text: row.e },
        ].filter((opcion) => opcion.text && opcion.text.trim() !== '')
        
        questions.push({
          capitulo: row.capitulo,
          orden: row.orden,
          pregunta: row.pregunta,
          respuesta: row.respuesta,
          opciones,
        })
      })
    })
    
    const sortedQuestions = questions.sort((firstQuestion, secondQuestion) => {
      const chapterOrder = firstQuestion.capitulo.localeCompare(secondQuestion.capitulo)

      if (chapterOrder !== 0) return chapterOrder

      return Number(firstQuestion.orden) - Number(secondQuestion.orden)
    })
    setGeneratedQuestions(sortedQuestions)
    setUserAnswers([])
    setIsFinished(false)
  }

  // Manejar selección de respuesta
  const handleAnswerSelection = (questionIndex: number, answer: string) => {
    if (isFinished) return
    
    const existingAnswerIndex = userAnswers.findIndex(
      (ua) => ua.questionIndex === questionIndex
    )
    
    if (existingAnswerIndex >= 0) {
      const newAnswers = [...userAnswers]
      newAnswers[existingAnswerIndex] = { questionIndex, selectedAnswer: answer }
      setUserAnswers(newAnswers)
    } else {
      setUserAnswers([...userAnswers, { questionIndex, selectedAnswer: answer }])
    }
  }

  // Finalizar examen
  const finishExam = () => {
    setIsFinished(true)
  }

  // Calcular respuestas correctas
  const getCorrectAnswersCount = () => {
    return userAnswers.filter((ua) => {
      const question = generatedQuestions[ua.questionIndex]
      return question && ua.selectedAnswer === question.respuesta
    }).length
  }

  // Verificar si una respuesta es correcta
  const isAnswerCorrect = (questionIndex: number) => {
    const userAnswer = userAnswers.find((ua) => ua.questionIndex === questionIndex)
    if (!userAnswer) return null
    
    const question = generatedQuestions[questionIndex]
    return userAnswer.selectedAnswer === question.respuesta
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Generador de Exámenes</h1>
      
      {/* Mostrar estado de carga */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-lg">Cargando preguntas...</p>
        </div>
      )}
      
      {/* Mostrar error si existe */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-4">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
          <p className="text-sm mt-2">Archivos iniciales: {initialCsvFileNames.join(', ')}</p>
        </div>
      )}
      
      {/* Paso 1: Selección de capítulos */}
      {!loading && generatedQuestions.length === 0 && (
        <div className="mb-8">
          <div className="mb-6 flex flex-col gap-3">
            <label htmlFor="csv-file" className="font-semibold">
              Archivo de preguntas:
            </label>
            <select
              id="csv-file"
              value={selectedFileName}
              onChange={handleFileChange}
              className="border rounded px-3 py-2"
              disabled={csvFiles.length === 0}
            >
              {csvFiles.map((file) => (
                <option key={file.name} value={file.name}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>
          <h2 className="text-xl font-semibold mb-4">1. Selecciona los capítulos:</h2>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {chapters.map((chapter) => (
              <Button
                key={chapter}
                onClick={() => toggleChapter(chapter)}
                variant={selectedChapters.has(chapter) ? 'default' : 'outline'}
                className="w-full"
              >
                {chapter}
              </Button>
            ))}
          </div>
          {/* Paso 2: Cantidad de preguntas por capítulo */}
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={generateQuestions}
              disabled={selectedChapters.size === 0}
            >
              Generar
            </Button>
          </div>
        </div>
      )}
      
      {/* Paso 3: Mostrar preguntas generadas */}
      {generatedQuestions.length > 0 && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              Examen generado ({generatedQuestions.length} preguntas)
            </h2>
            <Button
              onClick={() => {
                setGeneratedQuestions([])
                setUserAnswers([])
                setIsFinished(false)
              }}
              variant="outline"
              className="mb-4"
            >
              Volver a configurar
            </Button>
          </div>
          
          {/* Lista de preguntas */}
          <div className="space-y-6">
            {generatedQuestions.map((question, index) => {
              const userAnswer = userAnswers.find((ua) => ua.questionIndex === index)
              const isCorrect = isFinished ? isAnswerCorrect(index) : null
              
              return (
                <div
                  key={index}
                  className="border rounded-lg p-4"
                  style={{
                    borderColor: isFinished && isCorrect === false ? '#ef4444' : undefined,
                  }}
                >
                  <div className="mb-2 text-sm text-gray-500">
                    {question.capitulo}-{question.orden}
                  </div>
                  <h3
                    className="font-semibold mb-3"
                    style={{
                      color: isFinished && isCorrect === false ? '#ef4444' : undefined,
                    }}
                  >
                    {question.pregunta}
                  </h3>
                  
                  <div className="space-y-2">
                    {question.opciones.map((opcion) => (
                      <label
                        key={opcion.key}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                          isFinished ? 'cursor-not-allowed opacity-75' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={opcion.key}
                          checked={userAnswer?.selectedAnswer === opcion.key}
                          onChange={() => handleAnswerSelection(index, opcion.key)}
                          disabled={isFinished}
                          className="w-4 h-4"
                        />
                        <span>{opcion.key}) {opcion.text}</span>
                      </label>
                    ))}
                  </div>
                  
                  {/* Mostrar resultado */}
                  {isFinished && isCorrect !== null && (
                    <div className="mt-3 font-semibold">
                      {isCorrect ? (
                        <span className="text-green-600">✓ Correcta</span>
                      ) : (
                        <span className="text-red-600">✗ INCORRECTA</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Botón de finalizar */}
          {!isFinished && (
            <div className="mt-6">
              <Button onClick={finishExam} className="w-full">
                Terminar Examen
              </Button>
            </div>
          )}
          
          {/* Mostrar resultados finales */}
          {isFinished && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-xl font-bold mb-2">Resultados</h3>
              <p className="text-lg">
                Preguntas correctas: {getCorrectAnswersCount()} de {generatedQuestions.length}
              </p>
              <p className="text-lg">
                Porcentaje: {((getCorrectAnswersCount() / generatedQuestions.length) * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
