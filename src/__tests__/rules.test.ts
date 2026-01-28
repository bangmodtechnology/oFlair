import { describe, it, expect } from 'vitest'
import { Rules, RULE_CHAINS } from '@/lib/converter/rules'

describe('Rules', () => {
  describe('lowercase', () => {
    it('should convert string to lowercase', () => {
      expect(Rules.lowercase('HELLO')).toBe('hello')
      expect(Rules.lowercase('Hello World')).toBe('hello world')
      expect(Rules.lowercase('123ABC')).toBe('123abc')
    })
  })

  describe('uppercase', () => {
    it('should convert string to uppercase', () => {
      expect(Rules.uppercase('hello')).toBe('HELLO')
      expect(Rules.uppercase('Hello World')).toBe('HELLO WORLD')
    })
  })

  describe('pythonVariableSafe', () => {
    it('should convert to valid Python variable name', () => {
      expect(Rules.pythonVariableSafe('JOB_NAME')).toBe('job_name')
      expect(Rules.pythonVariableSafe('Job-Name')).toBe('job_name')
      expect(Rules.pythonVariableSafe('Job Name')).toBe('job_name')
    })

    it('should handle strings starting with numbers', () => {
      expect(Rules.pythonVariableSafe('123job')).toBe('_123job')
      expect(Rules.pythonVariableSafe('1_test')).toBe('_1_test')
    })

    it('should remove consecutive underscores', () => {
      expect(Rules.pythonVariableSafe('job__name')).toBe('job_name')
      expect(Rules.pythonVariableSafe('job___name___test')).toBe('job_name_test')
    })

    it('should remove leading and trailing underscores', () => {
      expect(Rules.pythonVariableSafe('_job_name_')).toBe('job_name')
      expect(Rules.pythonVariableSafe('__test__')).toBe('test')
    })

    it('should handle special characters', () => {
      expect(Rules.pythonVariableSafe('job@name#test')).toBe('job_name_test')
      expect(Rules.pythonVariableSafe('job.name.test')).toBe('job_name_test')
    })

    it('should return default for empty result', () => {
      expect(Rules.pythonVariableSafe('###')).toBe('unnamed_task')
      expect(Rules.pythonVariableSafe('___')).toBe('unnamed_task')
    })
  })

  describe('escapeQuotes', () => {
    it('should escape single quotes', () => {
      expect(Rules.escapeQuotes("it's")).toBe("it\\'s")
    })

    it('should escape double quotes', () => {
      expect(Rules.escapeQuotes('say "hello"')).toBe('say \\"hello\\"')
    })

    it('should escape backslashes', () => {
      expect(Rules.escapeQuotes('path\\to\\file')).toBe('path\\\\to\\\\file')
    })

    it('should escape backticks', () => {
      expect(Rules.escapeQuotes('`command`')).toBe('\\`command\\`')
    })
  })

  describe('prefix', () => {
    it('should add prefix with underscore', () => {
      expect(Rules.prefix('task', 'ctm')).toBe('ctm_task')
    })

    it('should return original if no prefix', () => {
      expect(Rules.prefix('task', '')).toBe('task')
    })
  })

  describe('suffix', () => {
    it('should add suffix with underscore', () => {
      expect(Rules.suffix('task', 'dag')).toBe('task_dag')
    })

    it('should return original if no suffix', () => {
      expect(Rules.suffix('task', '')).toBe('task')
    })
  })

  describe('replace', () => {
    it('should replace occurrences', () => {
      expect(Rules.replace('hello-world-test', '-', '_')).toBe('hello_world_test')
    })

    it('should return original if no from pattern', () => {
      expect(Rules.replace('hello', '', 'x')).toBe('hello')
    })

    it('should handle multiple occurrences', () => {
      expect(Rules.replace('a.b.c.d', '.', '/')).toBe('a/b/c/d')
    })
  })

  describe('trim', () => {
    it('should trim whitespace', () => {
      expect(Rules.trim('  hello  ')).toBe('hello')
      expect(Rules.trim('\t\nhello\n\t')).toBe('hello')
    })
  })

  describe('lookup', () => {
    it('should return mapped value', () => {
      const mapping = { Command: 'BashOperator', FileWatcher: 'FileSensor' }
      expect(Rules.lookup('Command', mapping)).toBe('BashOperator')
      expect(Rules.lookup('FileWatcher', mapping)).toBe('FileSensor')
    })

    it('should return original if not found', () => {
      const mapping = { Command: 'BashOperator' }
      expect(Rules.lookup('Unknown', mapping)).toBe('Unknown')
    })
  })

  describe('apply', () => {
    it('should apply single rule', () => {
      expect(Rules.apply('HELLO', { type: 'lowercase' })).toBe('hello')
      expect(Rules.apply('hello', { type: 'uppercase' })).toBe('HELLO')
    })

    it('should handle undefined value', () => {
      expect(Rules.apply(undefined, { type: 'lowercase' })).toBe('')
    })

    it('should apply default for undefined value', () => {
      expect(Rules.apply(undefined, { type: 'default', params: { value: 'default' } })).toBe('default')
    })

    it('should apply prefix with params', () => {
      expect(Rules.apply('task', { type: 'prefix', params: { prefix: 'ctm' } })).toBe('ctm_task')
    })

    it('should apply replace with params', () => {
      expect(Rules.apply('a-b-c', { type: 'replace', params: { from: '-', to: '_' } })).toBe('a_b_c')
    })
  })

  describe('applyChain', () => {
    it('should apply multiple rules in sequence', () => {
      const rules = [
        { type: 'trim' as const },
        { type: 'lowercase' as const },
        { type: 'python_variable_safe' as const },
      ]
      expect(Rules.applyChain('  HELLO WORLD  ', rules)).toBe('hello_world')
    })

    it('should handle empty value', () => {
      expect(Rules.applyChain('', [{ type: 'lowercase' }])).toBe('')
    })
  })
})

describe('RULE_CHAINS', () => {
  describe('taskId', () => {
    it('should convert job name to valid task ID', () => {
      expect(Rules.applyChain('JOB_001', RULE_CHAINS.taskId)).toBe('job_001')
      expect(Rules.applyChain('My-Job-Name', RULE_CHAINS.taskId)).toBe('my_job_name')
    })
  })

  describe('dagId', () => {
    it('should convert folder name to valid DAG ID', () => {
      expect(Rules.applyChain('BATCH_FOLDER', RULE_CHAINS.dagId)).toBe('batch_folder_dag')
      expect(Rules.applyChain('ETL-Jobs', RULE_CHAINS.dagId)).toBe('etl_jobs_dag')
    })
  })

  describe('bashCommand', () => {
    it('should trim and escape bash commands', () => {
      expect(Rules.applyChain("  echo 'hello'  ", RULE_CHAINS.bashCommand)).toBe("echo \\'hello\\'")
    })
  })
})
