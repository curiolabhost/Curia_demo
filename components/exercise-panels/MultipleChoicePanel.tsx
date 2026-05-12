'use client'

import { useEffect, useState } from 'react'
import type { Exercise } from '@/lib/lessons'
import { SyntaxLine } from '@/lib/syntaxLine'

type MultipleChoicePanelProps = {
  exercise: Exercise
  onComplete: (correct: boolean) => void
}

type AnswerState = 'idle' | 'correct' | 'wrong'

export function MultipleChoicePanel({ exercise, onComplete }: MultipleChoicePanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')

  useEffect(() => {
    setSelectedId(null)
    setAnswerState('idle')
  }, [exercise])

  const options = exercise.options ?? []

  const handleSelect = (id: string) => {
    if (answerState === 'correct') return
    setSelectedId(id)
    if (answerState === 'wrong') setAnswerState('idle')
  }

  const handleCheck = () => {
    if (!selectedId) return
    if (selectedId === exercise.correctOptionId) {
      setAnswerState('correct')
    } else {
      setAnswerState('wrong')
    }
  }

  const cardClass = (id: string) => {
    const classes = ['mc-card']
    if (answerState === 'correct' && id === selectedId) classes.push('correct')
    else if (answerState === 'wrong' && id === selectedId) classes.push('wrong')
    else if (id === selectedId) classes.push('selected')
    return classes.join(' ')
  }

  return (
    <div className="panel-container">
      {exercise.codeSnippet ? (
        <pre className="mc-code-snippet">
          {exercise.codeSnippet.split('\n').map((line, i) => (
            <div key={i}>
              <SyntaxLine line={line} />
            </div>
          ))}
        </pre>
      ) : null}
      <div className="mc-grid">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={cardClass(option.id)}
            onClick={() => handleSelect(option.id)}
          >
            <div className="mc-card-label">{option.label}</div>
            {option.code ? (
              <div className="mc-card-code">{option.code}</div>
            ) : null}
          </button>
        ))}
      </div>

      {answerState !== 'correct' && selectedId ? (
        <button
          type="button"
          className="panel-check-btn"
          onClick={handleCheck}
        >
          Check answer
        </button>
      ) : null}

      {answerState === 'wrong' ? (
        <div className="panel-feedback wrong">Not quite — try again</div>
      ) : null}

      {answerState === 'correct' ? (
        <>
          <div className="panel-feedback correct">✓ Correct!</div>
          {exercise.explanation ? (
            <div className="panel-explanation">{exercise.explanation}</div>
          ) : null}
          <button
            type="button"
            className="panel-next-btn"
            onClick={() => onComplete(true)}
          >
            Next
          </button>
        </>
      ) : null}
    </div>
  )
}
