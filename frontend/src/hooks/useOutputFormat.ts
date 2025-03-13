'use client';

import { useState } from 'react';
import { OutputFormat } from '@/types/app';

export default function useOutputFormat() {
  const [useStructuredOutput, setUseStructuredOutput] = useState<boolean>(false);
  const [outputFormat, setOutputFormat] = useState<string>('text');
  const [enableCaching, setEnableCaching] = useState<boolean>(true);
  
  // Common output formats
  const outputFormats: OutputFormat[] = [
    { id: 'text', name: 'Text (Default)' },
    { id: 'email', name: 'Email' },
    { id: 'summary', name: 'Summary' },
    { id: 'bullet-points', name: 'Bullet Points' },
    { id: 'json', name: 'JSON' },
    { id: 'markdown', name: 'Markdown' },
  ];

  return {
    useStructuredOutput,
    setUseStructuredOutput,
    outputFormat,
    setOutputFormat,
    enableCaching,
    setEnableCaching,
    outputFormats
  };
} 