import { describe, it, expect } from 'vitest'
import {
  findMatchingTemplates,
  findBestTemplate,
  applyMappings,
  getOperatorFromTemplate,
  convertJobWithTemplate,
  canTemplateHandleJob,
  getTemplateUsageStats,
  getDefaultTemplate,
} from '@/lib/templates/template-matcher'
import type { ControlMJob } from '@/types/controlm'
import type { ConversionTemplate } from '@/types/template'

// Test templates
const testTemplates: ConversionTemplate[] = [
  {
    id: 'bash-operator',
    name: 'Command to BashOperator',
    conditions: [
      { id: 'c1', field: 'JOB_TYPE', operator: 'equals', value: 'Command' },
    ],
    mappings: [
      { id: 'm1', source: 'JOBNAME', target: 'task_id', transform: 'lowercase' },
      { id: 'm2', source: 'CMDLINE', target: 'bash_command' },
    ],
    outputTemplate: '{{task_id}} = BashOperator(task_id="{{task_id}}", bash_command="{{{bash_command}}}")',
    isActive: true,
    isDefault: true,
    priority: 10,
  },
  {
    id: 'python-operator',
    name: 'Python to PythonOperator',
    conditions: [
      { id: 'c1', field: 'JOB_TYPE', operator: 'contains', value: 'python' },
      { id: 'c2', field: 'CMDLINE', operator: 'contains', value: '.py' },
    ],
    mappings: [
      { id: 'm1', source: 'JOBNAME', target: 'task_id', transform: 'lowercase' },
      { id: 'm2', source: 'CMDLINE', target: 'python_callable' },
    ],
    outputTemplate: '{{task_id}} = PythonOperator(task_id="{{task_id}}")',
    isActive: true,
    isDefault: false,
    priority: 20,
  },
  {
    id: 'file-sensor',
    name: 'FileWatcher to FileSensor',
    conditions: [
      { id: 'c1', field: 'JOB_TYPE', operator: 'equals', value: 'FileWatcher' },
    ],
    mappings: [
      { id: 'm1', source: 'JOBNAME', target: 'task_id', transform: 'lowercase' },
      { id: 'm2', source: 'PATH', target: 'filepath' },
    ],
    outputTemplate: '{{task_id}} = FileSensor(task_id="{{task_id}}", filepath="{{filepath}}")',
    isActive: true,
    isDefault: false,
    priority: 15,
  },
  {
    id: 'inactive-template',
    name: 'Inactive Template',
    conditions: [
      { id: 'c1', field: 'JOB_TYPE', operator: 'equals', value: 'Inactive' },
    ],
    mappings: [],
    outputTemplate: '',
    isActive: false,
    isDefault: false,
    priority: 5,
  },
]

// Test jobs
const commandJob: ControlMJob = {
  JOBNAME: 'TEST_JOB_001',
  JOB_TYPE: 'Command',
  FOLDER_NAME: 'TEST_FOLDER',
  APPLICATION: 'TEST_APP',
  CMDLINE: '/opt/scripts/run.sh',
}

const pythonJob: ControlMJob = {
  JOBNAME: 'PYTHON_ETL',
  JOB_TYPE: 'python',
  FOLDER_NAME: 'ETL_FOLDER',
  APPLICATION: 'ETL',
  CMDLINE: 'python3 /scripts/etl.py',
}

const fileWatcherJob: ControlMJob = {
  JOBNAME: 'WAIT_FOR_FILE',
  JOB_TYPE: 'FileWatcher',
  FOLDER_NAME: 'FILE_FOLDER',
  APPLICATION: 'FILE_APP',
  PATH: '/data/input/file.csv',
}

const unknownJob: ControlMJob = {
  JOBNAME: 'UNKNOWN_JOB',
  JOB_TYPE: 'CustomType',
  FOLDER_NAME: 'CUSTOM_FOLDER',
  APPLICATION: 'CUSTOM',
}

describe('Template Matcher', () => {
  describe('findMatchingTemplates', () => {
    it('should find templates matching a Command job', () => {
      const matches = findMatchingTemplates(commandJob, testTemplates)
      expect(matches.length).toBe(1)
      expect(matches[0].template.id).toBe('bash-operator')
    })

    it('should find templates matching a Python job', () => {
      const matches = findMatchingTemplates(pythonJob, testTemplates)
      expect(matches.length).toBe(1)
      expect(matches[0].template.id).toBe('python-operator')
    })

    it('should find templates matching a FileWatcher job', () => {
      const matches = findMatchingTemplates(fileWatcherJob, testTemplates)
      expect(matches.length).toBe(1)
      expect(matches[0].template.id).toBe('file-sensor')
    })

    it('should return empty array for non-matching job', () => {
      const matches = findMatchingTemplates(unknownJob, testTemplates)
      expect(matches.length).toBe(0)
    })

    it('should exclude inactive templates', () => {
      const inactiveJob: ControlMJob = {
        JOBNAME: 'INACTIVE_TEST',
        JOB_TYPE: 'Inactive',
        FOLDER_NAME: 'TEST',
        APPLICATION: 'TEST',
      }
      const matches = findMatchingTemplates(inactiveJob, testTemplates)
      expect(matches.length).toBe(0)
    })

    it('should sort matches by score (highest first)', () => {
      // Create templates where both can match
      const multiMatchTemplates: ConversionTemplate[] = [
        {
          ...testTemplates[0],
          id: 'low-priority',
          priority: 5,
          conditions: [{ id: 'c1', field: 'FOLDER_NAME', operator: 'contains', value: 'TEST' }],
        },
        {
          ...testTemplates[0],
          id: 'high-priority',
          priority: 20,
          conditions: [{ id: 'c1', field: 'FOLDER_NAME', operator: 'contains', value: 'TEST' }],
        },
      ]
      const matches = findMatchingTemplates(commandJob, multiMatchTemplates)
      expect(matches.length).toBe(2)
      expect(matches[0].template.id).toBe('high-priority')
    })
  })

  describe('findBestTemplate', () => {
    it('should return the best matching template', () => {
      const best = findBestTemplate(commandJob, testTemplates)
      expect(best).not.toBeNull()
      expect(best!.id).toBe('bash-operator')
    })

    it('should return null for non-matching job', () => {
      const best = findBestTemplate(unknownJob, testTemplates)
      expect(best).toBeNull()
    })
  })

  describe('applyMappings', () => {
    it('should extract values from job according to mappings', () => {
      const template = testTemplates[0] // bash-operator
      const params = applyMappings(commandJob, template)
      expect(params.task_id).toBe('test_job_001')
      expect(params.bash_command).toBe('/opt/scripts/run.sh')
    })

    it('should apply transforms to extracted values', () => {
      const template = testTemplates[0]
      const params = applyMappings({ ...commandJob, JOBNAME: 'MY_JOB_NAME' }, template)
      expect(params.task_id).toBe('my_job_name')
    })

    it('should include variables if present', () => {
      const jobWithVars: ControlMJob = {
        ...commandJob,
        VARIABLE: [
          { NAME: 'ENV', VALUE: 'production' },
          { NAME: 'DEBUG', VALUE: 'false' },
        ],
      }
      const params = applyMappings(jobWithVars, testTemplates[0])
      expect(params.variables).toHaveLength(2)
      expect(params.variables[0]).toEqual({ name: 'ENV', value: 'production' })
    })

    it('should generate task_id from job name if not mapped', () => {
      const templateNoTaskId: ConversionTemplate = {
        ...testTemplates[0],
        mappings: [{ id: 'm1', source: 'CMDLINE', target: 'bash_command' }],
      }
      const params = applyMappings(commandJob, templateNoTaskId)
      expect(params.task_id).toBe('test_job_001')
    })

    it('should handle special characters in job name for task_id', () => {
      // When template maps task_id directly, it uses the transform specified (lowercase only)
      const specialJob: ControlMJob = {
        ...commandJob,
        JOBNAME: 'JOB@123#TEST',
      }
      const params = applyMappings(specialJob, testTemplates[0])
      expect(params.task_id).toBe('job@123#test') // lowercase transform only
    })

    it('should sanitize task_id when not mapped by template', () => {
      // When template doesn't map task_id, the fallback sanitization applies
      const templateNoTaskId: ConversionTemplate = {
        ...testTemplates[0],
        mappings: [{ id: 'm1', source: 'CMDLINE', target: 'bash_command' }],
      }
      const specialJob: ControlMJob = {
        ...commandJob,
        JOBNAME: 'JOB@123#TEST',
      }
      const params = applyMappings(specialJob, templateNoTaskId)
      expect(params.task_id).toBe('job_123_test')
    })

    it('should prefix task_id starting with number when not mapped', () => {
      // Only applies to fallback task_id generation
      const templateNoTaskId: ConversionTemplate = {
        ...testTemplates[0],
        mappings: [{ id: 'm1', source: 'CMDLINE', target: 'bash_command' }],
      }
      const numericJob: ControlMJob = {
        ...commandJob,
        JOBNAME: '123_JOB',
      }
      const params = applyMappings(numericJob, templateNoTaskId)
      expect(params.task_id).toMatch(/^_/)
    })
  })

  describe('getOperatorFromTemplate', () => {
    it('should return operator type from template ID mapping', () => {
      expect(getOperatorFromTemplate(testTemplates[0])).toBe('BashOperator')
      expect(getOperatorFromTemplate(testTemplates[1])).toBe('PythonOperator')
      expect(getOperatorFromTemplate(testTemplates[2])).toBe('FileSensor')
    })

    it('should extract operator from output template if no mapping', () => {
      const customTemplate: ConversionTemplate = {
        ...testTemplates[0],
        id: 'custom-unknown',
        outputTemplate: 'task = CustomOperator()',
      }
      expect(getOperatorFromTemplate(customTemplate)).toBe('CustomOperator')
    })

    it('should default to BashOperator if nothing found', () => {
      const emptyTemplate: ConversionTemplate = {
        ...testTemplates[0],
        id: 'unknown-template',
        outputTemplate: 'task = something()',
      }
      expect(getOperatorFromTemplate(emptyTemplate)).toBe('BashOperator')
    })
  })

  describe('convertJobWithTemplate', () => {
    it('should convert a command job using template', () => {
      const result = convertJobWithTemplate(commandJob, testTemplates)
      expect(result.taskId).toBe('test_job_001')
      expect(result.operatorType).toBe('BashOperator')
      expect(result.matchScore).toBeGreaterThan(0)
    })

    it('should use default template for unmatched jobs', () => {
      const result = convertJobWithTemplate(unknownJob, testTemplates)
      expect(result.matchScore).toBe(0)
      expect(result.template.isDefault).toBe(true)
    })

    it('should extract parameters correctly', () => {
      const result = convertJobWithTemplate(commandJob, testTemplates)
      expect(result.params.bash_command).toBe('/opt/scripts/run.sh')
    })
  })

  describe('canTemplateHandleJob', () => {
    it('should return true for matching job', () => {
      expect(canTemplateHandleJob(commandJob, testTemplates[0])).toBe(true)
    })

    it('should return false for non-matching job', () => {
      expect(canTemplateHandleJob(unknownJob, testTemplates[0])).toBe(false)
    })
  })

  describe('getTemplateUsageStats', () => {
    it('should calculate usage stats for jobs', () => {
      const jobs = [commandJob, pythonJob, fileWatcherJob]
      const stats = getTemplateUsageStats(jobs, testTemplates)

      expect(stats.length).toBe(3)

      const bashStats = stats.find(s => s.templateId === 'bash-operator')
      expect(bashStats?.jobCount).toBe(1)

      const pythonStats = stats.find(s => s.templateId === 'python-operator')
      expect(pythonStats?.jobCount).toBe(1)

      const fileStats = stats.find(s => s.templateId === 'file-sensor')
      expect(fileStats?.jobCount).toBe(1)
    })
  })

  describe('getDefaultTemplate', () => {
    it('should return the default bash operator template', () => {
      const defaultTemplate = getDefaultTemplate()
      expect(defaultTemplate).toBeDefined()
      expect(defaultTemplate.id).toBe('bash-operator')
      expect(defaultTemplate.isDefault).toBe(true)
    })
  })

  describe('condition operators', () => {
    it('should handle equals operator', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        conditions: [{ id: 'c1', field: 'JOB_TYPE', operator: 'equals', value: 'Command' }],
      }
      const matches = findMatchingTemplates(commandJob, [template])
      expect(matches.length).toBe(1)
    })

    it('should handle not_equals operator', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        conditions: [{ id: 'c1', field: 'JOB_TYPE', operator: 'not_equals', value: 'Python' }],
      }
      const matches = findMatchingTemplates(commandJob, [template])
      expect(matches.length).toBe(1)
    })

    it('should handle contains operator', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        conditions: [{ id: 'c1', field: 'CMDLINE', operator: 'contains', value: 'run' }],
      }
      const matches = findMatchingTemplates(commandJob, [template])
      expect(matches.length).toBe(1)
    })

    it('should handle starts_with operator', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        conditions: [{ id: 'c1', field: 'CMDLINE', operator: 'starts_with', value: '/opt' }],
      }
      const matches = findMatchingTemplates(commandJob, [template])
      expect(matches.length).toBe(1)
    })

    it('should handle ends_with operator', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        conditions: [{ id: 'c1', field: 'CMDLINE', operator: 'ends_with', value: '.sh' }],
      }
      const matches = findMatchingTemplates(commandJob, [template])
      expect(matches.length).toBe(1)
    })

    it('should handle regex operator', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        conditions: [{ id: 'c1', field: 'JOBNAME', operator: 'regex', value: '^TEST_.*\\d+$' }],
      }
      const matches = findMatchingTemplates(commandJob, [template])
      expect(matches.length).toBe(1)
    })

    it('should handle is_empty operator', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        conditions: [{ id: 'c1', field: 'DESCRIPTION', operator: 'is_empty', value: '' }],
      }
      const matches = findMatchingTemplates(commandJob, [template])
      expect(matches.length).toBe(1)
    })

    it('should handle is_not_empty operator', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        conditions: [{ id: 'c1', field: 'JOBNAME', operator: 'is_not_empty', value: '' }],
      }
      const matches = findMatchingTemplates(commandJob, [template])
      expect(matches.length).toBe(1)
    })

    it('should be case insensitive by default', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        conditions: [{ id: 'c1', field: 'JOB_TYPE', operator: 'equals', value: 'COMMAND' }],
      }
      const matches = findMatchingTemplates(commandJob, [template])
      expect(matches.length).toBe(1)
    })

    it('should support case sensitive matching', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        conditions: [{ id: 'c1', field: 'JOB_TYPE', operator: 'equals', value: 'COMMAND', caseSensitive: true }],
      }
      const matches = findMatchingTemplates(commandJob, [template])
      expect(matches.length).toBe(0) // Should not match because case differs
    })
  })

  describe('mapping transforms', () => {
    it('should apply lowercase transform', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        mappings: [{ id: 'm1', source: 'JOBNAME', target: 'task_id', transform: 'lowercase' }],
      }
      const params = applyMappings({ ...commandJob, JOBNAME: 'MY_JOB' }, template)
      expect(params.task_id).toBe('my_job')
    })

    it('should apply uppercase transform', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        mappings: [{ id: 'm1', source: 'JOBNAME', target: 'label', transform: 'uppercase' }],
      }
      const params = applyMappings({ ...commandJob, JOBNAME: 'my_job' }, template)
      expect(params.label).toBe('MY_JOB')
    })

    it('should apply trim transform', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        mappings: [{ id: 'm1', source: 'CMDLINE', target: 'command', transform: 'trim' }],
      }
      const params = applyMappings({ ...commandJob, CMDLINE: '  spaced  ' }, template)
      expect(params.command).toBe('spaced')
    })

    it('should use defaultValue when source is empty', () => {
      const template: ConversionTemplate = {
        ...testTemplates[0],
        mappings: [{ id: 'm1', source: 'MISSING_FIELD', target: 'value', defaultValue: 'default_value' }],
      }
      const params = applyMappings(commandJob, template)
      expect(params.value).toBe('default_value')
    })
  })
})
