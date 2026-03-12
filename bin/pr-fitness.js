#!/usr/bin/env node
import { program } from 'commander';

program
  .name('pr-fitness')
  .description('Get fit one PR at a time')
  .version('0.1.0');

program.parse();
