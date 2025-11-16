import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { FileLogger } from '../../src/infra/logging/FileLogger';

describe('FileLogger (integração com filesystem)', () => {
  it('deve criar diretório e arquivo diário e gravar linhas de log', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mercurius-logs-'));
    const logger = new FileLogger({
      directory: tmpDir,
      filePrefix: 'test-logger'
    });

    logger.info('test_info_log', { foo: 'bar' });
    logger.error('test_error_log', { answer: 42 });

    // aguarda flush assíncrono
    await new Promise((resolve) => setTimeout(resolve, 500));

    const files = await fs.readdir(tmpDir);
    expect(files.length).toBeGreaterThanOrEqual(1);

    const logFile = files[0]!;
    const content = await fs.readFile(path.join(tmpDir, logFile), 'utf8');

    expect(content).toContain('test_info_log');
    expect(content).toContain('test_error_log');
    expect(content).toContain('"foo":"bar"');
    expect(content).toContain('"answer":42');
  });
});


