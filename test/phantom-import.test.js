import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findings, lines } from './helpers.js';
import { jsPackageName } from '../src/rules/phantom-import.js';

const pkg = {
  name: 'my-app',
  dependencies: { react: '^18', '@tanstack/react-query': '^5' },
  devDependencies: { vitest: '^2', '@types/node': '^20' },
};

test('flags undeclared npm packages and nothing else', async () => {
  const res = await findings(
    {
      'package.json': pkg,
      'src/app.ts': lines(
        "import React from 'react';",
        "import { useQuery } from '@tanstack/react-query/build/modern';",
        "import fs from 'node:fs';",
        "import path from 'path';",
        "import { helper } from './helper';",
        "import Button from '@/components/Button';",
        "import { thing } from 'my-app/utils';",
        "import _ from 'lodash';",
        "const axios = require('axios');",
        "const lazy = await import('react-super-table');",
        "export * from '@acme/fake-sdk';",
        "// import nope from 'commented-out';",
      ),
    },
    'phantom-import',
  );
  assert.deepEqual(
    res.map((f) => [f.line, f.pkg]),
    [
      [8, 'lodash'],
      [9, 'axios'],
      [10, 'react-super-table'],
      [11, '@acme/fake-sdk'],
    ],
  );
});

test('severity follows the evidence: installed = transitive warn, not installed = error', async () => {
  const res = await findings(
    {
      'package.json': pkg,
      'node_modules/react/package.json': {},
      'node_modules/scheduler/package.json': {},
      'a.js': lines("import s from 'scheduler';", "import h from 'react-hallucinated-hooks';"),
    },
    'phantom-import',
  );
  assert.deepEqual(
    res.map((f) => [f.pkg, f.severity]),
    [
      ['scheduler', 'warn'],
      ['react-hallucinated-hooks', 'error'],
    ],
  );
});

test('ignores JSX text and strings that merely contain "from"', async () => {
  const res = await findings(
    {
      'package.json': pkg,
      'a.tsx': lines(
        '<select id="nc-from" className="select" />',
        'const KEYWORDS = new Set(["import", "from", "export"]);',
        '<p>Copied from "somewhere else"</p>',
        "import {",
        '  a,',
        '  b,',
        "} from 'multi-line-pkg';",
      ),
    },
    'phantom-import',
  );
  assert.deepEqual(res.map((f) => [f.line, f.pkg]), [[7, 'multi-line-pkg']]);
});

test('Python namespace families count as declared', async () => {
  const res = await findings(
    {
      'requirements.txt': lines('livekit-agents', 'google-cloud-storage'),
      'main.py': lines('from livekit.agents import cli', 'from google.cloud import storage', 'from api import AssistantFnc'),
    },
    'phantom-import',
  );
  assert.deepEqual(res.map((f) => f.pkg), ['api']);
});

test('says nothing when there is no package.json to compare with', async () => {
  const res = await findings({ 'a.js': "import x from 'whatever';" }, 'phantom-import');
  assert.equal(res.length, 0);
});

test('respects tsconfig paths and baseUrl', async () => {
  const res = await findings(
    {
      'package.json': pkg,
      'tsconfig.json': '{\n  // comment\n  "compilerOptions": { "baseUrl": "src", "paths": { "~lib/*": ["src/lib/*"], "config": ["src/config.ts"] } },\n}',
      'src/utils/date.ts': 'export const x = 1;',
      'src/app.ts': lines(
        "import a from '~lib/a';",
        "import cfg from 'config';",
        "import { x } from 'utils/date';",
        "import b from 'left-pad';",
      ),
    },
    'phantom-import',
  );
  assert.deepEqual(res.map((f) => f.pkg), ['left-pad']);
});

test('counts workspace packages and parent package.json in monorepos', async () => {
  const res = await findings(
    {
      'package.json': { name: 'root', private: true, devDependencies: { typescript: '5' } },
      'packages/core/package.json': { name: '@acme/core' },
      'packages/web/package.json': { name: '@acme/web', dependencies: { next: '15' } },
      'packages/web/page.tsx': lines("import { a } from '@acme/core';", "import ts from 'typescript';", "import n from 'next';", "import z from 'zod';"),
    },
    'phantom-import',
  );
  assert.deepEqual(res.map((f) => f.pkg), ['zod']);
});

test('allowImports config silences known aliases', async () => {
  const res = await findings(
    {
      'package.json': pkg,
      '.sloplintrc.json': { allowImports: ['virtual-alias'] },
      'a.js': "import v from 'virtual-alias';",
    },
    'phantom-import',
  );
  assert.equal(res.length, 0);
});

test('Python: stdlib, local modules, renamed dists and optional imports are fine', async () => {
  const res = await findings(
    {
      'requirements.txt': lines('Pillow>=10', 'scikit-learn==1.5', 'requests  # http', '-r dev.txt', 'git+https://x/y.git#egg=private_lib'),
      'app/utils.py': '',
      'app/main.py': lines(
        'import os, sys',
        'import json as j',
        'from PIL import Image',
        'from sklearn.linear_model import LinearRegression',
        'import requests',
        'from app.utils import thing',
        'from . import sibling',
        'import utils',
        'import private_lib',
        'from __future__ import annotations',
        'try:',
        '    import ujson as json',
        'except ImportError:',
        '    import json',
        'import numpy as np',
        'from langchain_magic import Agent',
      ),
    },
    'phantom-import',
  );
  assert.deepEqual(
    res.map((f) => [f.line, f.pkg]),
    [
      [15, 'numpy'],
      [16, 'langchain_magic'],
    ],
  );
});

test('Python: reads pyproject.toml (PEP 621 and Poetry)', async () => {
  const res = await findings(
    {
      'pyproject.toml': lines(
        '[project]',
        'name = "mypkg"',
        'dependencies = ["httpx>=0.27", "pydantic[email]"]',
        '[tool.poetry.group.dev.dependencies]',
        'pytest = "^8"',
      ),
      'src/mypkg/x.py': lines('import httpx', 'import pydantic', 'import pytest', 'import mypkg', 'import fastapi'),
    },
    'phantom-import',
  );
  assert.deepEqual(res.map((f) => f.pkg), ['fastapi']);
});

test('jsPackageName', () => {
  assert.equal(jsPackageName('lodash/fp'), 'lodash');
  assert.equal(jsPackageName('@scope/pkg/deep/path'), '@scope/pkg');
  assert.equal(jsPackageName('./x'), null);
  assert.equal(jsPackageName('node:fs'), null);
  assert.equal(jsPackageName('#internal'), null);
  assert.equal(jsPackageName('~/x'), null);
});
