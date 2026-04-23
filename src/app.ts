import path from 'node:path';
import { fileURLToPath } from 'node:url';

import autoload from '@fastify/autoload';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

export function buildApp() {
  const app = Fastify({
    logger: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  void app.register(autoload, {
    dir: path.join(currentDir, 'plugins'),
    options: {
      prefix: '',
    },
    forceESM: true,
  });

  void app.register(autoload, {
    dir: path.join(currentDir, 'routes'),
    options: {
      prefix: '',
    },
    forceESM: true,
  });

  return app;
}
