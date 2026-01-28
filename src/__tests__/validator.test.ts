import { describe, it, expect } from 'vitest'
import { validateDAG, validatePythonSyntax, validateGeneratedDAG } from '@/lib/converter/validator'
import type { AirflowDAG, GeneratedDAG } from '@/types/airflow'

describe('Validator', () => {
  describe('validateDAG', () => {
    it('should validate a correct DAG', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        description: 'Test DAG',
        schedule: 'None',
        tags: ['test'],
        tasks: [
          { taskId: 'task_a', operatorType: 'BashOperator', params: { bash_command: 'echo hello' } },
          { taskId: 'task_b', operatorType: 'BashOperator', params: { bash_command: 'echo world' } },
        ],
        dependencies: [
          { upstream: 'task_a', downstream: 'task_b' },
        ],
      }

      const result = validateDAG(dag)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing DAG ID', () => {
      const dag: AirflowDAG = {
        dagId: '',
        tasks: [],
        dependencies: [],
      }

      const result = validateDAG(dag)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_DAG_ID')).toBe(true)
    })

    it('should detect invalid DAG ID', () => {
      const dag: AirflowDAG = {
        dagId: '123-invalid',
        tasks: [],
        dependencies: [],
      }

      const result = validateDAG(dag)
      expect(result.errors.some(e => e.code === 'INVALID_DAG_ID')).toBe(true)
    })

    it('should detect Python reserved keyword as DAG ID', () => {
      const dag: AirflowDAG = {
        dagId: 'class',
        tasks: [],
        dependencies: [],
      }

      const result = validateDAG(dag)
      expect(result.errors.some(e => e.code === 'RESERVED_DAG_ID')).toBe(true)
    })

    it('should detect missing task ID', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        tasks: [
          { taskId: '', operatorType: 'BashOperator', params: {} },
        ],
        dependencies: [],
      }

      const result = validateDAG(dag)
      expect(result.errors.some(e => e.code === 'MISSING_TASK_ID')).toBe(true)
    })

    it('should detect invalid task ID', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        tasks: [
          { taskId: 'invalid-task-id', operatorType: 'BashOperator', params: {} },
        ],
        dependencies: [],
      }

      const result = validateDAG(dag)
      expect(result.errors.some(e => e.code === 'INVALID_TASK_ID')).toBe(true)
    })

    it('should detect duplicate task IDs', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        tasks: [
          { taskId: 'same_task', operatorType: 'BashOperator', params: {} },
          { taskId: 'same_task', operatorType: 'BashOperator', params: {} },
        ],
        dependencies: [],
      }

      const result = validateDAG(dag)
      expect(result.errors.some(e => e.code === 'DUPLICATE_TASK_ID')).toBe(true)
    })

    it('should detect missing upstream task in dependency', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        tasks: [
          { taskId: 'task_a', operatorType: 'BashOperator', params: {} },
        ],
        dependencies: [
          { upstream: 'nonexistent', downstream: 'task_a' },
        ],
      }

      const result = validateDAG(dag)
      expect(result.errors.some(e => e.code === 'MISSING_UPSTREAM_TASK')).toBe(true)
    })

    it('should detect missing downstream task in dependency', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        tasks: [
          { taskId: 'task_a', operatorType: 'BashOperator', params: {} },
        ],
        dependencies: [
          { upstream: 'task_a', downstream: 'nonexistent' },
        ],
      }

      const result = validateDAG(dag)
      expect(result.errors.some(e => e.code === 'MISSING_DOWNSTREAM_TASK')).toBe(true)
    })

    it('should detect self dependency', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        tasks: [
          { taskId: 'task_a', operatorType: 'BashOperator', params: {} },
        ],
        dependencies: [
          { upstream: 'task_a', downstream: 'task_a' },
        ],
      }

      const result = validateDAG(dag)
      expect(result.errors.some(e => e.code === 'SELF_DEPENDENCY')).toBe(true)
    })

    it('should detect circular dependencies', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        tasks: [
          { taskId: 'task_a', operatorType: 'BashOperator', params: {} },
          { taskId: 'task_b', operatorType: 'BashOperator', params: {} },
          { taskId: 'task_c', operatorType: 'BashOperator', params: {} },
        ],
        dependencies: [
          { upstream: 'task_a', downstream: 'task_b' },
          { upstream: 'task_b', downstream: 'task_c' },
          { upstream: 'task_c', downstream: 'task_a' },
        ],
      }

      const result = validateDAG(dag)
      expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true)
    })

    it('should warn when no tasks defined', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        tasks: [],
        dependencies: [],
      }

      const result = validateDAG(dag)
      expect(result.warnings.some(w => w.code === 'NO_TASKS')).toBe(true)
    })

    it('should warn about Airflow reserved task IDs', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        tasks: [
          { taskId: 'dag', operatorType: 'BashOperator', params: {} },
        ],
        dependencies: [],
      }

      const result = validateDAG(dag)
      expect(result.warnings.some(w => w.code === 'AIRFLOW_RESERVED_TASK_ID')).toBe(true)
    })

    it('should warn about missing bash_command', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        tasks: [
          { taskId: 'task_a', operatorType: 'BashOperator', params: {} },
        ],
        dependencies: [],
      }

      const result = validateDAG(dag)
      expect(result.warnings.some(w => w.code === 'MISSING_BASH_COMMAND')).toBe(true)
    })

    it('should warn about missing filepath for FileSensor', () => {
      const dag: AirflowDAG = {
        dagId: 'test_dag',
        tasks: [
          { taskId: 'task_a', operatorType: 'FileSensor', params: {} },
        ],
        dependencies: [],
      }

      const result = validateDAG(dag)
      expect(result.warnings.some(w => w.code === 'MISSING_FILEPATH')).toBe(true)
    })
  })

  describe('validatePythonSyntax', () => {
    it('should validate correct Python code', () => {
      const code = `
from airflow import DAG
from datetime import datetime

with DAG('test') as dag:
    pass
      `
      const errors = validatePythonSyntax(code)
      expect(errors.filter(e => e.type === 'error')).toHaveLength(0)
    })

    it('should detect double colon syntax error', () => {
      const code = `
def test()::
    pass
      `
      const errors = validatePythonSyntax(code)
      expect(errors.some(e => e.code === 'DOUBLE_COLON')).toBe(true)
    })

    it('should warn about tab characters', () => {
      const code = "def test():\n\treturn True"
      const errors = validatePythonSyntax(code)
      expect(errors.some(e => e.code === 'TAB_CHARACTER')).toBe(true)
    })

    it('should detect unclosed multiline string', () => {
      const code = `
"""
This is a docstring without closing
      `
      const errors = validatePythonSyntax(code)
      expect(errors.some(e => e.code === 'UNCLOSED_STRING')).toBe(true)
    })
  })

  describe('validateGeneratedDAG', () => {
    it('should validate both structure and syntax', () => {
      const generatedDag: GeneratedDAG = {
        filename: 'test_dag.py',
        content: `
from airflow import DAG
with DAG('test_dag') as dag:
    pass
        `,
        dag: {
          dagId: 'test_dag',
          tasks: [
            { taskId: 'task_a', operatorType: 'BashOperator', params: { bash_command: 'echo test' } },
          ],
          dependencies: [],
        },
      }

      const result = validateGeneratedDAG(generatedDag)
      expect(result.valid).toBe(true)
    })

    it('should combine structure and syntax errors', () => {
      const generatedDag: GeneratedDAG = {
        filename: 'test_dag.py',
        content: `
def test()::
    pass
        `,
        dag: {
          dagId: '',
          tasks: [],
          dependencies: [],
        },
      }

      const result = validateGeneratedDAG(generatedDag)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
