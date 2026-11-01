import { generateText, type ToolSet } from 'ai';
import { describe, expect, it } from 'vitest';
import { netnestTools } from '../src/ai-sdk';

// Compile-time contract, checked by npm run typecheck (tsconfig includes test/): netnestTools() must be accepted
// wherever the AI SDK takes a ToolSet. 0.1.4 and earlier declared NetNestTools as an interface, which has no index
// signature, so the README and the vercel/ai tools registry example (generateText with tools: netnestTools()) did not
// compile. Never called: the function only has to type check.
export function compilesWithGenerateText() {
  return generateText({ model: 'openai/gpt-5-mini', tools: netnestTools({ apiKey: 'k' }), prompt: 'x' });
}

describe('NetNestTools and the AI SDK ToolSet', () => {
  it('is assignable to ToolSet', () => {
    const set: ToolSet = netnestTools({ apiKey: 'k', fetch: (async () => new Response('{}')) as never });
    expect(Object.keys(set)).toHaveLength(6);
  });
});
