import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'vite'

const windows = process.platform === 'win32'
const python = windows ? '.venv/Scripts/python.exe' : '.venv/bin/python'
const env = { ...process.env, APP_ENV: 'development', SITE_URL: 'http://localhost:5173' }

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (!existsSync(python)) {
  run(windows ? 'py' : 'python3', ['-m', 'venv', '.venv'])
}
run(python, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', 'requirements.txt'])
run(python, ['manage.py', 'migrate', '--noinput'])

const vite = await createServer()
const backend = spawn(python, ['-m', 'waitress', '--listen=127.0.0.1:8011', 'family.wsgi:application'], {stdio: 'inherit', env})
backend.once('exit', async (code) => {
  await vite.close()
  process.exit(code ?? 0)
})
process.once('SIGINT', () => backend.kill())
process.once('SIGTERM', () => backend.kill())
try {
  await vite.listen()
  vite.printUrls()
} catch (error) {
  console.error(error.message)
  backend.kill()
  process.exit(1)
}
