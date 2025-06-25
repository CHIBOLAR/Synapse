// ESLint configuration for Synapse MVP
// Security-focused rules for production-ready code

export default {
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true
  },
  
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:security/recommended'
  ],
  
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  
  plugins: [
    'react',
    'security'
  ],
  
  rules: {
    // Security rules (critical for production)
    'security/detect-object-injection': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-unsafe-regex': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    
    // React rules
    'react/prop-types': 'warn',
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/no-danger': 'error',  // Prevent dangerouslySetInnerHTML
    'react/no-danger-with-children': 'error',
    'react/jsx-no-script-url': 'error',
    'react/jsx-no-target-blank': 'error',
    
    // General code quality
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    
    // Modern JavaScript
    'arrow-spacing': 'error',
    'block-spacing': 'error',
    'brace-style': ['error', '1tbs'],
    'comma-dangle': ['error', 'es5'],
    'comma-spacing': 'error',
    'eol-last': 'error',
    'indent': ['error', 2, { SwitchCase: 1 }],
    'key-spacing': 'error',
    'keyword-spacing': 'error',
    'no-multiple-empty-lines': ['error', { max: 2 }],
    'no-trailing-spaces': 'error',
    'object-curly-spacing': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'space-before-blocks': 'error',
    'space-in-parens': ['error', 'never'],
    
    // Performance
    'no-await-in-loop': 'warn',
    'no-constant-condition': 'error',
    'no-unreachable': 'error',
    
    // Best practices
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines': ['warn', 300],
    'max-params': ['warn', 4],
    'no-magic-numbers': ['warn', { 
      ignore: [-1, 0, 1, 2, 100, 1000],
      ignoreArrayIndexes: true 
    }],
    
    // Error prevention
    'no-undef': 'error',
    'no-undefined': 'error',
    'valid-typeof': 'error',
    'array-callback-return': 'error',
    'consistent-return': 'error',
    'default-case': 'error',
    'eqeqeq': ['error', 'always'],
    'no-empty-function': 'warn',
    'no-lonely-if': 'error',
    'no-return-assign': 'error',
    'no-return-await': 'error',
    'no-throw-literal': 'error',
    'no-unneeded-ternary': 'error',
    'no-useless-return': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'radix': 'error',
    'require-await': 'error',
    'yoda': 'error'
  },
  
  settings: {
    react: {
      version: 'detect'
    }
  },
  
  overrides: [
    // Test files
    {
      files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
      env: {
        jest: true
      },
      rules: {
        'no-magic-numbers': 'off',
        'max-lines': 'off'
      }
    },
    
    // Configuration files
    {
      files: ['*.config.js', '*.config.mjs', '.eslintrc.js'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off'
      }
    },
    
    // Frontend files
    {
      files: ['static/**/*.js', 'static/**/*.jsx'],
      env: {
        browser: true,
        node: false
      },
      rules: {
        'no-console': 'error'  // Stricter for frontend
      }
    },
    
    // Backend files
    {
      files: ['src/**/*.js'],
      env: {
        node: true,
        browser: false
      },
      rules: {
        'no-console': 'warn'  // Allow logging in backend
      }
    }
  ]
};
